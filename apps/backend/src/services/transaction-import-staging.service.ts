import { randomUUID } from 'node:crypto';
import type {
  TransactionImportDefaultsDTO,
  TransactionImportField,
  TransactionImportIssueCode,
  TransactionImportIssueDTO,
  TransactionImportMappingDTO,
  TransactionImportSourceFormat,
  TransactionImportStageResponseDTO,
} from '@expenses/api';
import { z } from 'zod';
import { config } from '../config';
import { CurrencyEnum, TransactionType } from '../enums';
import { redisClient } from '../redis';
import { CSVParserError, parseCSVText } from '../utils/csv.util';

export const IMPORT_SESSION_TTL_SECONDS = 60 * 60;
export const MAX_STAGE_IMPORT_BYTES = 8 * 1024 * 1024;

const SUPPORTED_CSV_CONTENT_TYPES = new Set(['application/csv', 'application/vnd.ms-excel', 'text/csv']);
const SUPPORTED_PDF_CONTENT_TYPES = new Set(['application/pdf']);

const transactionImportIssueCodes = [
  'parser_error',
  'mapping_required',
  'invalid_date',
  'invalid_amount',
  'category_type_mismatch',
  'duplicate_in_file',
  'duplicate_existing',
  'review_required',
  'row_limit_exceeded',
  'pdf_no_text',
  'pdf_unsupported_layout',
  'pdf_size_exceeded',
] as const satisfies readonly TransactionImportIssueCode[];

const transactionImportFields = [
  'date',
  'amount',
  'debit',
  'credit',
  'description',
  'externalReference',
] as const satisfies readonly TransactionImportField[];

const transactionImportIssueSchema = z.object({
  code: z.enum(transactionImportIssueCodes),
  field: z.enum(transactionImportFields).optional(),
  message: z.string(),
  rowNumber: z.number().int().positive().optional(),
});

const transactionImportMappingSchema = z.object({
  amount: z.string().min(1).optional(),
  credit: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  debit: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  externalReference: z.string().min(1).optional(),
});

const transactionImportDefaultsSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  currency: z.nativeEnum(CurrencyEnum),
  fixedType: z.nativeEnum(TransactionType).nullable().optional(),
  typeStrategy: z.enum(['signed_amount', 'fixed_type']),
});

const stagedTransactionImportSessionSchema = z.object({
  byteSize: z.number().int().nonnegative(),
  importSessionId: z.string().min(1),
  latestPreview: z
    .object({
      defaults: transactionImportDefaultsSchema,
      mapping: transactionImportMappingSchema,
    })
    .optional(),
  metadata: z.object({
    delimiter: z.string(),
    hasHeader: z.boolean(),
    headers: z.array(z.string()),
    parserIssues: z.array(transactionImportIssueSchema),
  }),
  payload: z.object({
    data: z.string().min(1),
    encoding: z.literal('base64'),
  }),
  sourceFilename: z.string().min(1).optional(),
  sourceFormat: z.enum(['csv', 'bank_pdf_text']),
  userId: z.string().min(1),
  version: z.literal(1),
});

export interface TransactionImportStageInput {
  contentType?: string;
  payload: Buffer;
  sourceFilename?: string;
  userId: string;
}

export interface TransactionImportStagedSession {
  byteSize: number;
  importSessionId: string;
  latestPreview?: {
    defaults: TransactionImportDefaultsDTO;
    mapping: TransactionImportMappingDTO;
  };
  metadata: {
    delimiter: string;
    hasHeader: boolean;
    headers: string[];
    parserIssues: TransactionImportIssueDTO[];
  };
  payload: {
    data: string;
    encoding: 'base64';
  };
  sourceFilename?: string;
  sourceFormat: TransactionImportSourceFormat;
  userId: string;
  version: 1;
}

interface TransactionImportStagingStore {
  delete(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<boolean>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

interface TransactionImportStagingServiceOptions {
  generateImportSessionId?: () => string;
  store?: TransactionImportStagingStore;
}

const testSessionStore = new Map<string, string>();

export class TransactionImportStagingError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'TransactionImportStagingError';
  }
}

export class TransactionImportStagingValidationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'TransactionImportStagingValidationError';
  }
}

function createDefaultStore(): TransactionImportStagingStore {
  if (config.env === 'TEST') {
    return {
      async delete(key) {
        return testSessionStore.delete(key) ? 1 : 0;
      },
      async expire() {
        return true;
      },
      async get(key) {
        return testSessionStore.get(key) ?? null;
      },
      async set(key, value) {
        testSessionStore.set(key, value);
      },
    };
  }

  return {
    async delete(key) {
      return redisClient.del(key);
    },
    async expire(key, ttlSeconds) {
      const expire = (
        redisClient as { expire?: (redisKey: string, seconds: number) => Promise<boolean | number> }
      ).expire;

      if (!expire) {
        return true;
      }

      const result = await expire.call(redisClient, key, ttlSeconds);

      return Boolean(result);
    },
    async get(key) {
      return redisClient.get(key);
    },
    async set(key, value, ttlSeconds) {
      await redisClient.set(key, value, { EX: ttlSeconds });
    },
  };
}

function normalizeContentType(contentType?: string): string {
  return contentType?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}

function resolveSourceFormat(contentType?: string): TransactionImportSourceFormat {
  const normalizedContentType = normalizeContentType(contentType);

  if (SUPPORTED_CSV_CONTENT_TYPES.has(normalizedContentType)) {
    return 'csv';
  }

  if (SUPPORTED_PDF_CONTENT_TYPES.has(normalizedContentType)) {
    return 'bank_pdf_text';
  }

  throw new TransactionImportStagingError('Unsupported import content type.', 415);
}

function buildCsvStageMetadata(payload: Buffer): TransactionImportStageResponseDTO {
  try {
    const parsed = parseCSVText(payload.toString('utf8'));

    return {
      byteSize: payload.length,
      delimiter: parsed.delimiter,
      hasHeader: parsed.hasHeader,
      headers: parsed.headers,
      importSessionId: '',
      parserIssues: [],
      sourceFormat: 'csv',
    };
  } catch (error) {
    if (!(error instanceof CSVParserError)) {
      throw error;
    }

    return {
      byteSize: payload.length,
      delimiter: ',',
      hasHeader: false,
      headers: [],
      importSessionId: '',
      parserIssues: [toParserIssue(error)],
      sourceFormat: 'csv',
    };
  }
}

function buildPdfStageMetadata(payload: Buffer): TransactionImportStageResponseDTO {
  return {
    byteSize: payload.length,
    delimiter: ',',
    hasHeader: false,
    headers: [],
    importSessionId: '',
    parserIssues: [],
    sourceFormat: 'bank_pdf_text',
  };
}

function toParserIssue(error: CSVParserError): TransactionImportIssueDTO {
  return {
    code: error.code === 'ROW_LIMIT_EXCEEDED' ? 'row_limit_exceeded' : 'parser_error',
    message: error.message,
  };
}

export class TransactionImportStagingService {
  private readonly generateImportSessionId: () => string;
  private readonly store: TransactionImportStagingStore;

  constructor(options: TransactionImportStagingServiceOptions = {}) {
    this.generateImportSessionId = options.generateImportSessionId ?? randomUUID;
    this.store = options.store ?? createDefaultStore();
  }

  buildSessionKey(userId: string, importSessionId: string): string {
    return `import:session:${userId}:${importSessionId}`;
  }

  async stageImport(input: TransactionImportStageInput): Promise<TransactionImportStageResponseDTO> {
    if (!Buffer.isBuffer(input.payload) || input.payload.length === 0) {
      throw new TransactionImportStagingError('Import payload cannot be empty.', 400);
    }

    if (input.payload.length > MAX_STAGE_IMPORT_BYTES) {
      throw new TransactionImportStagingError('Import uploads cannot exceed 8 MB.', 413);
    }

    const sourceFormat = resolveSourceFormat(input.contentType);

    if (sourceFormat === 'bank_pdf_text' && !input.sourceFilename?.trim().toLowerCase().endsWith('.pdf')) {
      throw new TransactionImportStagingError('PDF imports must include the original .pdf filename.', 400);
    }

    const importSessionId = this.generateImportSessionId();
    const stageResponse =
      sourceFormat === 'csv' ? buildCsvStageMetadata(input.payload) : buildPdfStageMetadata(input.payload);

    const response: TransactionImportStageResponseDTO = {
      ...stageResponse,
      importSessionId,
      sourceFilename: input.sourceFilename?.trim() || undefined,
    };

    const session: TransactionImportStagedSession = {
      byteSize: response.byteSize,
      importSessionId,
      metadata: {
        delimiter: response.delimiter,
        hasHeader: response.hasHeader,
        headers: response.headers,
        parserIssues: response.parserIssues,
      },
      payload: {
        data: input.payload.toString('base64'),
        encoding: 'base64',
      },
      sourceFilename: response.sourceFilename,
      sourceFormat,
      userId: input.userId,
      version: 1,
    };

    await this.saveSession(session);

    return response;
  }

  async getSession(userId: string, importSessionId: string): Promise<TransactionImportStagedSession | null> {
    const key = this.buildSessionKey(userId, importSessionId);
    const stored = await this.store.get(key);

    if (!stored) {
      return null;
    }

    const session = parseStoredSession(stored);

    await this.store.expire(key, IMPORT_SESSION_TTL_SECONDS);

    return session;
  }

  async deleteSession(userId: string, importSessionId: string): Promise<boolean> {
    const deleted = await this.store.delete(this.buildSessionKey(userId, importSessionId));

    return deleted > 0;
  }

  async saveLatestPreview(
    userId: string,
    importSessionId: string,
    latestPreview: NonNullable<TransactionImportStagedSession['latestPreview']>,
  ): Promise<TransactionImportStagedSession | null> {
    const session = await this.getSession(userId, importSessionId);

    if (!session) {
      return null;
    }

    const updatedSession: TransactionImportStagedSession = {
      ...session,
      latestPreview,
    };

    await this.saveSession(updatedSession);

    return updatedSession;
  }

  private async saveSession(session: TransactionImportStagedSession): Promise<void> {
    await this.store.set(
      this.buildSessionKey(session.userId, session.importSessionId),
      JSON.stringify(session),
      IMPORT_SESSION_TTL_SECONDS,
    );
  }
}

function parseStoredSession(stored: string): TransactionImportStagedSession {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stored);
  } catch (error) {
    throw new TransactionImportStagingValidationError('Stored import session JSON is invalid.', {
      cause: error,
    });
  }

  const result = stagedTransactionImportSessionSchema.safeParse(parsed);

  if (!result.success) {
    throw new TransactionImportStagingValidationError(
      'Stored import session payload does not match the expected schema.',
      {
        cause: result.error,
      },
    );
  }

  return result.data;
}

export const transactionImportStagingService = new TransactionImportStagingService();
