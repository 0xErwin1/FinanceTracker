import { createHash } from 'node:crypto';
import {
  type CategoryDTO,
  type CurrencyEnum,
  type TransactionDTO,
  type TransactionImportDefaultsDTO,
  type TransactionImportIssueDTO,
  type TransactionImportMappingDTO,
  type TransactionImportNormalizedRowDTO,
  type TransactionImportPreviewRequestDTO,
  type TransactionImportPreviewResponseDTO,
  type TransactionImportPreviewRowDTO,
  type TransactionImportPreviewSummaryDTO,
  TransactionType,
} from '@expenses/api';
import { TRPCError } from '@trpc/server';
import { AppDataSource } from '../data-source';
import { Transaction } from '../entities';
import { CSVParserError, type ParsedCSVTextResult, parseCSVText } from '../utils/csv.util';
import { accountService } from './account.service';
import { categoryService } from './category.service';

const HEADER_ALIASES: Record<keyof TransactionImportMappingDTO, string[]> = {
  amount: ['amount', 'importe', 'monto', 'total', 'netamount'],
  credit: ['credit', 'abono', 'deposit', 'moneyin', 'inflow'],
  date: ['date', 'bookingdate', 'bookedon', 'transactiondate', 'posteddate', 'fecha'],
  debit: ['debit', 'cargo', 'withdrawal', 'moneyout', 'outflow'],
  description: ['description', 'details', 'detail', 'memo', 'concept', 'concepto', 'note'],
  externalReference: ['reference', 'externalreference', 'ref', 'id', 'identifier'],
};

type RequiredImportField = 'date' | 'description';

interface ResolvedImportPreviewMapping extends TransactionImportMappingDTO {
  date: string;
  description: string;
}

interface FingerprintInput {
  userId: string;
  accountId: string;
  currency: CurrencyEnum;
  normalized: {
    date: string;
    amount: number;
    description: string;
    externalReference: string | null;
    type: TransactionType;
  };
}

interface EvaluatePreviewRowInput {
  rowNumber: number;
  raw: Record<string, string>;
  mapping: ResolvedImportPreviewMapping;
  defaults: TransactionImportDefaultsDTO;
  userId: string;
  defaultCategory: CategoryDTO | null;
  existingFingerprints: Set<string>;
  fileFingerprints: Set<string>;
}

export class TransactionImportMappingError extends Error {
  readonly issues: TransactionImportIssueDTO[];

  constructor(issues: TransactionImportIssueDTO[]) {
    super(issues.map((issue) => issue.message).join(' '));
    this.name = 'TransactionImportMappingError';
    this.issues = issues;
  }
}

export function resolveImportPreviewMapping(
  headers: string[],
  mapping: TransactionImportMappingDTO = {},
): ResolvedImportPreviewMapping {
  const resolved: TransactionImportMappingDTO = {};
  const issues: TransactionImportIssueDTO[] = [];

  for (const field of Object.keys(HEADER_ALIASES) as Array<keyof TransactionImportMappingDTO>) {
    const explicitHeader = mapping[field]?.trim();

    if (explicitHeader) {
      if (!headers.includes(explicitHeader)) {
        issues.push({
          code: 'mapping_required',
          field,
          message: `Mapped column '${explicitHeader}' for '${field}' was not found in the CSV headers.`,
        });

        continue;
      }

      resolved[field] = explicitHeader;
      continue;
    }

    const inferredHeader = inferHeader(headers, HEADER_ALIASES[field]);

    if (inferredHeader) {
      resolved[field] = inferredHeader;
    }
  }

  for (const requiredField of ['date', 'description'] as RequiredImportField[]) {
    if (!resolved[requiredField]) {
      issues.push({
        code: 'mapping_required',
        field: requiredField,
        message: `A '${requiredField}' column is required for import preview.`,
      });
    }
  }

  if (!resolved.amount && !resolved.debit && !resolved.credit) {
    issues.push({
      code: 'mapping_required',
      field: 'amount',
      message: "Provide an 'amount' column or a debit/credit column pair for import preview.",
    });
  }

  if (issues.length > 0) {
    throw new TransactionImportMappingError(issues);
  }

  return resolved as ResolvedImportPreviewMapping;
}

export function buildImportFingerprint(input: FingerprintInput): string {
  const payload = [
    input.userId,
    input.accountId,
    input.normalized.date,
    input.normalized.type,
    input.normalized.amount.toFixed(2),
    input.currency,
    normalizeDescription(input.normalized.description),
    normalizeReference(input.normalized.externalReference),
  ].join('|');

  return createHash('sha256').update(payload).digest('hex');
}

async function importPreview(
  input: TransactionImportPreviewRequestDTO,
  userId: string,
): Promise<TransactionImportPreviewResponseDTO> {
  await accountService.getPostingAccount(input.defaults.accountId, userId, input.defaults.currency);

  const parsed = safelyParseSource(input.source, input.mapping);

  if (parsed.parserIssues.length > 0) {
    return parsed.response;
  }

  let mapping: ResolvedImportPreviewMapping;

  try {
    mapping = resolveImportPreviewMapping(parsed.response.headers, input.mapping);
  } catch (error) {
    if (error instanceof TransactionImportMappingError) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: error.issues.map((issue) => issue.message).join(' '),
        cause: error,
      });
    }

    throw error;
  }

  const defaultCategory = await loadDefaultCategory(input.defaults, userId);
  const existingTransactions = await AppDataSource.getRepository(Transaction).find({
    where: {
      accountId: input.defaults.accountId,
      currency: input.defaults.currency,
      userId,
    },
  });

  const existingFingerprints = new Set(
    existingTransactions
      .map((transaction) => fingerprintExistingTransaction(transaction))
      .filter((fingerprint): fingerprint is string => fingerprint !== null),
  );
  const fileFingerprints = new Set<string>();
  const rowNumberOffset = parsed.response.hasHeader ? 2 : 1;

  const rows = parsed.rows.map((row, index) =>
    evaluatePreviewRow({
      defaultCategory,
      defaults: input.defaults,
      existingFingerprints,
      fileFingerprints,
      mapping,
      raw: row,
      rowNumber: index + rowNumberOffset,
      userId,
    }),
  );

  return {
    ...parsed.response,
    mapping,
    rows,
    summary: summarizePreviewRows(rows),
  };
}

function safelyParseSource(
  source: string,
  mapping: TransactionImportMappingDTO | undefined,
): {
  rows: ParsedCSVTextResult['rows'];
  parserIssues: TransactionImportIssueDTO[];
  response: TransactionImportPreviewResponseDTO;
} {
  try {
    const parsed = parseCSVText(source);

    return {
      parserIssues: [],
      response: {
        delimiter: parsed.delimiter,
        hasHeader: parsed.hasHeader,
        headers: parsed.headers,
        mapping: mapping ?? {},
        parserIssues: [],
        rows: [],
        summary: createEmptySummary(),
      },
      rows: parsed.rows,
    };
  } catch (error) {
    if (!(error instanceof CSVParserError)) {
      throw error;
    }

    const issue = toParserIssue(error);

    return {
      parserIssues: [issue],
      response: {
        delimiter: ',',
        hasHeader: false,
        headers: [],
        mapping: mapping ?? {},
        parserIssues: [issue],
        rows: [],
        summary: createEmptySummary(),
      },
      rows: [],
    };
  }
}

async function loadDefaultCategory(
  defaults: TransactionImportDefaultsDTO,
  userId: string,
): Promise<CategoryDTO | null> {
  if (!defaults.categoryId) {
    return null;
  }

  const category = await categoryService.getCategory({ id: defaults.categoryId, userId });

  if (!category) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'The selected default category was not found for this user.',
    });
  }

  return category;
}

function fingerprintExistingTransaction(transaction: TransactionDTO): string | null {
  if (!transaction.accountId || !transaction.note) {
    return null;
  }

  return buildImportFingerprint({
    accountId: transaction.accountId,
    currency: transaction.currency,
    normalized: {
      amount: transaction.amount,
      date: transaction.date,
      description: transaction.note,
      externalReference: null,
      type: transaction.type,
    },
    userId: transaction.userId,
  });
}

function evaluatePreviewRow(input: EvaluatePreviewRowInput): TransactionImportPreviewRowDTO {
  const issues: TransactionImportIssueDTO[] = [];
  const normalized = normalizePreviewRow(input.raw, input.mapping, input.defaults, input.rowNumber, issues);
  let fingerprint: string | undefined;

  if (normalized.type && input.defaultCategory && input.defaultCategory.type !== normalized.type) {
    issues.push({
      code: 'category_type_mismatch',
      message: `Category '${input.defaultCategory.name}' is for ${input.defaultCategory.type} transactions, not ${normalized.type}.`,
      rowNumber: input.rowNumber,
    });
  }

  if (normalized.date && normalized.amount !== null && normalized.description && normalized.type) {
    fingerprint = buildImportFingerprint({
      accountId: input.defaults.accountId,
      currency: input.defaults.currency,
      normalized: {
        amount: normalized.amount,
        date: normalized.date,
        description: normalized.description,
        externalReference: normalized.externalReference,
        type: normalized.type,
      },
      userId: input.userId,
    });

    if (input.existingFingerprints.has(fingerprint)) {
      issues.push({
        code: 'duplicate_existing',
        message: 'This row already matches an existing transaction for the selected account.',
        rowNumber: input.rowNumber,
      });
    } else if (input.fileFingerprints.has(fingerprint)) {
      issues.push({
        code: 'duplicate_in_file',
        message: 'This row duplicates another row in the same import preview.',
        rowNumber: input.rowNumber,
      });
    } else {
      input.fileFingerprints.add(fingerprint);
    }
  }

  return {
    fingerprint,
    issues,
    normalized,
    raw: input.raw,
    rowNumber: input.rowNumber,
    status: resolveRowStatus(issues),
  };
}

function normalizePreviewRow(
  raw: Record<string, string>,
  mapping: ResolvedImportPreviewMapping,
  defaults: TransactionImportDefaultsDTO,
  rowNumber: number,
  issues: TransactionImportIssueDTO[],
): TransactionImportNormalizedRowDTO {
  const date = parsePreviewDate(raw[mapping.date], rowNumber, issues);
  const description = parseDescription(raw[mapping.description], rowNumber, issues);
  const externalReference = parseOptionalText(
    mapping.externalReference ? raw[mapping.externalReference] : undefined,
  );
  const amountResult = parsePreviewAmount(raw, mapping, defaults, rowNumber, issues);

  return {
    amount: amountResult.amount,
    date,
    description,
    externalReference,
    type: amountResult.type,
  };
}

function parsePreviewDate(
  value: string | undefined,
  rowNumber: number,
  issues: TransactionImportIssueDTO[],
): string | null {
  const trimmed = value?.trim() ?? '';

  if (!trimmed) {
    issues.push({
      code: 'invalid_date',
      field: 'date',
      message: 'Date is required.',
      rowNumber,
    });

    return null;
  }

  const normalized = normalizeDate(trimmed);

  if (!normalized) {
    issues.push({
      code: 'invalid_date',
      field: 'date',
      message: `Date '${trimmed}' is not in a supported format.`,
      rowNumber,
    });

    return null;
  }

  return normalized;
}

function parseDescription(
  value: string | undefined,
  rowNumber: number,
  issues: TransactionImportIssueDTO[],
): string | null {
  const normalized = parseOptionalText(value);

  if (!normalized) {
    issues.push({
      code: 'mapping_required',
      field: 'description',
      message: 'Description is required for each imported row.',
      rowNumber,
    });

    return null;
  }

  return normalized;
}

function parsePreviewAmount(
  raw: Record<string, string>,
  mapping: TransactionImportMappingDTO,
  defaults: TransactionImportDefaultsDTO,
  rowNumber: number,
  issues: TransactionImportIssueDTO[],
): Pick<TransactionImportNormalizedRowDTO, 'amount' | 'type'> {
  if (mapping.amount) {
    return parseSingleAmount(raw[mapping.amount], defaults, rowNumber, issues);
  }

  return parseDebitCreditAmount(raw, mapping, defaults, rowNumber, issues);
}

function parseSingleAmount(
  value: string | undefined,
  defaults: TransactionImportDefaultsDTO,
  rowNumber: number,
  issues: TransactionImportIssueDTO[],
): Pick<TransactionImportNormalizedRowDTO, 'amount' | 'type'> {
  const parsedAmount = parseAmountValue(value);

  if (parsedAmount === null) {
    issues.push({
      code: 'invalid_amount',
      field: 'amount',
      message: 'Amount is missing or invalid.',
      rowNumber,
    });

    return { amount: null, type: null };
  }

  if (defaults.typeStrategy === 'fixed_type') {
    return {
      amount: Math.abs(parsedAmount),
      type: defaults.fixedType ?? null,
    };
  }

  if (parsedAmount === 0) {
    issues.push({
      code: 'review_required',
      field: 'amount',
      message: 'Zero-value rows require manual review before import.',
      rowNumber,
    });

    return { amount: 0, type: null };
  }

  return {
    amount: Math.abs(parsedAmount),
    type: parsedAmount < 0 ? TransactionType.EXPENSE : TransactionType.INCOME,
  };
}

function parseDebitCreditAmount(
  raw: Record<string, string>,
  mapping: TransactionImportMappingDTO,
  defaults: TransactionImportDefaultsDTO,
  rowNumber: number,
  issues: TransactionImportIssueDTO[],
): Pick<TransactionImportNormalizedRowDTO, 'amount' | 'type'> {
  const debitRaw = mapping.debit ? raw[mapping.debit] : undefined;
  const creditRaw = mapping.credit ? raw[mapping.credit] : undefined;
  const debit = parseAmountValue(debitRaw);
  const credit = parseAmountValue(creditRaw);
  const hasDebit = debitRaw?.trim().length ? debit !== null : false;
  const hasCredit = creditRaw?.trim().length ? credit !== null : false;

  if (!hasDebit && !hasCredit) {
    issues.push({
      code: 'invalid_amount',
      field: 'amount',
      message: 'Each row needs a debit, credit, or amount value.',
      rowNumber,
    });

    return { amount: null, type: null };
  }

  if (hasDebit && hasCredit) {
    issues.push({
      code: 'review_required',
      field: 'amount',
      message: 'Rows with both debit and credit values require manual review.',
      rowNumber,
    });

    return {
      amount: debit ?? credit,
      type: defaults.typeStrategy === 'fixed_type' ? (defaults.fixedType ?? null) : null,
    };
  }

  const amount = Math.abs(debit ?? credit ?? 0);

  if (defaults.typeStrategy === 'fixed_type') {
    return {
      amount,
      type: defaults.fixedType ?? null,
    };
  }

  return {
    amount,
    type: hasDebit ? TransactionType.EXPENSE : TransactionType.INCOME,
  };
}

function summarizePreviewRows(rows: TransactionImportPreviewRowDTO[]): TransactionImportPreviewSummaryDTO {
  return rows.reduce<TransactionImportPreviewSummaryDTO>((summary, row) => {
    summary.total += 1;

    switch (row.status) {
      case 'ready':
        summary.ready += 1;
        break;
      case 'invalid':
        summary.invalid += 1;
        break;
      case 'duplicate':
        summary.duplicate += 1;
        break;
      case 'review-required':
        summary.reviewRequired += 1;
        break;
    }

    return summary;
  }, createEmptySummary());
}

function createEmptySummary(): TransactionImportPreviewSummaryDTO {
  return {
    duplicate: 0,
    invalid: 0,
    ready: 0,
    reviewRequired: 0,
    total: 0,
  };
}

function resolveRowStatus(issues: TransactionImportIssueDTO[]): TransactionImportPreviewRowDTO['status'] {
  const issueCodes = new Set(issues.map((issue) => issue.code));

  if (
    issueCodes.has('invalid_date') ||
    issueCodes.has('invalid_amount') ||
    issueCodes.has('mapping_required') ||
    issueCodes.has('category_type_mismatch')
  ) {
    return 'invalid';
  }

  if (issueCodes.has('duplicate_existing') || issueCodes.has('duplicate_in_file')) {
    return 'duplicate';
  }

  if (issueCodes.has('review_required')) {
    return 'review-required';
  }

  return 'ready';
}

function inferHeader(headers: string[], aliases: string[]): string | undefined {
  const normalizedAliases = new Set(aliases.map(normalizeHeaderName));

  return headers.find((header) => normalizedAliases.has(normalizeHeaderName(header)));
}

function normalizeHeaderName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/gu, '');
}

function normalizeDate(value: string): string | null {
  const isoMatch = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/u);

  if (isoMatch) {
    return formatDateParts(isoMatch[1], isoMatch[2], isoMatch[3]);
  }

  const slashMatch = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/u);

  if (!slashMatch) {
    return null;
  }

  const first = Number.parseInt(slashMatch[1] ?? '', 10);
  const second = Number.parseInt(slashMatch[2] ?? '', 10);
  const year = slashMatch[3] ?? '';

  if (first > 12) {
    return formatDateParts(year, String(second), String(first));
  }

  return formatDateParts(year, String(first), String(second));
}

function formatDateParts(year: string, month: string, day: string): string | null {
  const normalizedYear = year.padStart(4, '0');
  const normalizedMonth = month.padStart(2, '0');
  const normalizedDay = day.padStart(2, '0');
  const candidate = `${normalizedYear}-${normalizedMonth}-${normalizedDay}`;
  const timestamp = Date.parse(`${candidate}T00:00:00Z`);

  return Number.isNaN(timestamp) ? null : candidate;
}

function parseAmountValue(value: string | undefined): number | null {
  const trimmed = value?.trim() ?? '';

  if (!trimmed) {
    return null;
  }

  const sanitized = trimmed.replace(/[^\d,.-]/gu, '');

  if (!sanitized) {
    return null;
  }

  const normalized = normalizeDecimalSeparators(sanitized);
  const parsed = Number.parseFloat(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDecimalSeparators(value: string): string {
  const lastComma = value.lastIndexOf(',');
  const lastDot = value.lastIndexOf('.');

  if (lastComma === -1 && lastDot === -1) {
    return value;
  }

  if (lastComma > lastDot) {
    return value.replace(/\./gu, '').replace(',', '.');
  }

  return value.replace(/,/gu, '');
}

function parseOptionalText(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';

  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\s+/gu, ' ');
}

function normalizeDescription(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').toLowerCase();
}

function normalizeReference(value: string | null): string {
  return value?.trim().toLowerCase() ?? '';
}

function toParserIssue(error: CSVParserError): TransactionImportIssueDTO {
  return {
    code: error.code === 'ROW_LIMIT_EXCEEDED' ? 'row_limit_exceeded' : 'parser_error',
    message: error.message,
  };
}

export const transactionImportService = {
  importPreview,
};
