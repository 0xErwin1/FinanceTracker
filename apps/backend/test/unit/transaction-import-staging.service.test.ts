import {
  IMPORT_SESSION_TTL_SECONDS,
  TransactionImportStagingService,
  TransactionImportStagingValidationError,
} from '../../src/services/transaction-import-staging.service';

interface MemoryStoreCall {
  key: string;
  ttlSeconds?: number;
  value?: string;
}

function createMemoryStore() {
  const values = new Map<string, string>();
  const setCalls: MemoryStoreCall[] = [];
  const expireCalls: MemoryStoreCall[] = [];
  const deleteCalls: MemoryStoreCall[] = [];

  return {
    deleteCalls,
    expireCalls,
    setCalls,
    values,
    store: {
      async delete(key: string) {
        deleteCalls.push({ key });
        const deleted = values.delete(key);

        return deleted ? 1 : 0;
      },
      async expire(key: string, ttlSeconds: number) {
        expireCalls.push({ key, ttlSeconds });

        return values.has(key);
      },
      async get(key: string) {
        return values.get(key) ?? null;
      },
      async set(key: string, value: string, ttlSeconds: number) {
        setCalls.push({ key, ttlSeconds, value });
        values.set(key, value);
      },
    },
  };
}

describe('TransactionImportStagingService', () => {
  it('rejects empty payloads and oversized uploads before touching Redis', async () => {
    const memory = createMemoryStore();
    const service = new TransactionImportStagingService({
      generateImportSessionId: () => 'session-1',
      store: memory.store,
    });

    await expect(
      service.stageImport({
        contentType: 'text/csv',
        payload: Buffer.alloc(0),
        sourceFilename: 'statement.csv',
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({
      message: 'Import payload cannot be empty.',
      statusCode: 400,
    });

    await expect(
      service.stageImport({
        contentType: 'text/csv',
        payload: Buffer.alloc(8 * 1024 * 1024 + 1, 'x'),
        sourceFilename: 'statement.csv',
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({
      message: 'Import uploads cannot exceed 8 MB.',
      statusCode: 413,
    });

    expect(memory.setCalls).toEqual([]);
  });

  it('stages CSV imports with parsed metadata and refreshes TTL on load', async () => {
    const memory = createMemoryStore();
    const service = new TransactionImportStagingService({
      generateImportSessionId: () => 'session-1',
      store: memory.store,
    });

    const response = await service.stageImport({
      contentType: 'text/csv; charset=utf-8',
      payload: Buffer.from('Date,Description,Amount\n2026-05-08,Coffee,-12.50', 'utf8'),
      sourceFilename: 'statement.csv',
      userId: 'user-1',
    });

    expect(response).toEqual({
      importSessionId: 'session-1',
      sourceFormat: 'csv',
      sourceFilename: 'statement.csv',
      byteSize: 48,
      delimiter: ',',
      hasHeader: true,
      headers: ['Date', 'Description', 'Amount'],
      parserIssues: [],
    });

    expect(memory.setCalls).toEqual([
      expect.objectContaining({
        key: 'import:session:user-1:session-1',
        ttlSeconds: IMPORT_SESSION_TTL_SECONDS,
      }),
    ]);

    const loaded = await service.getSession('user-1', 'session-1');

    expect(loaded).toMatchObject({
      importSessionId: 'session-1',
      sourceFormat: 'csv',
      sourceFilename: 'statement.csv',
      byteSize: 48,
      metadata: {
        delimiter: ',',
        hasHeader: true,
        headers: ['Date', 'Description', 'Amount'],
        parserIssues: [],
      },
      payload: {
        encoding: 'base64',
      },
      userId: 'user-1',
      version: 1,
    });

    expect(memory.expireCalls).toEqual([
      {
        key: 'import:session:user-1:session-1',
        ttlSeconds: IMPORT_SESSION_TTL_SECONDS,
      },
    ]);
  });

  it('stages PDF imports without CSV header metadata', async () => {
    const memory = createMemoryStore();
    const service = new TransactionImportStagingService({
      generateImportSessionId: () => 'session-pdf',
      store: memory.store,
    });

    const response = await service.stageImport({
      contentType: 'application/pdf',
      payload: Buffer.from('%PDF-1.7', 'utf8'),
      sourceFilename: 'statement.pdf',
      userId: 'user-1',
    });

    expect(response).toEqual({
      importSessionId: 'session-pdf',
      sourceFormat: 'bank_pdf_text',
      sourceFilename: 'statement.pdf',
      byteSize: 8,
      delimiter: ',',
      hasHeader: false,
      headers: [],
      parserIssues: [],
    });
  });

  it('keeps parser issues in staged CSV sessions instead of failing the upload', async () => {
    const memory = createMemoryStore();
    const service = new TransactionImportStagingService({
      generateImportSessionId: () => 'session-invalid-csv',
      store: memory.store,
    });

    const response = await service.stageImport({
      contentType: 'text/csv',
      payload: Buffer.from('Date,Description,Amount\n"unterminated', 'utf8'),
      sourceFilename: 'statement.csv',
      userId: 'user-1',
    });

    expect(response).toMatchObject({
      importSessionId: 'session-invalid-csv',
      sourceFormat: 'csv',
      hasHeader: false,
      headers: [],
      parserIssues: [
        {
          code: 'parser_error',
          message: 'CSV source could not be parsed.',
        },
      ],
    });

    await expect(service.getSession('user-1', 'session-invalid-csv')).resolves.toMatchObject({
      metadata: {
        parserIssues: [
          {
            code: 'parser_error',
            message: 'CSV source could not be parsed.',
          },
        ],
      },
    });
  });

  it('rejects unsupported content types and PDFs without a .pdf filename', async () => {
    const memory = createMemoryStore();
    const service = new TransactionImportStagingService({
      generateImportSessionId: () => 'session-1',
      store: memory.store,
    });

    await expect(
      service.stageImport({
        contentType: 'application/json',
        payload: Buffer.from('{}', 'utf8'),
        sourceFilename: 'statement.json',
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({
      message: 'Unsupported import content type.',
      statusCode: 415,
    });

    await expect(
      service.stageImport({
        contentType: 'application/pdf',
        payload: Buffer.from('%PDF-1.7', 'utf8'),
        sourceFilename: 'statement.txt',
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({
      message: 'PDF imports must include the original .pdf filename.',
      statusCode: 400,
    });

    expect(memory.setCalls).toEqual([]);
  });

  it('returns null for foreign-session lookups because keys are user-scoped', async () => {
    const memory = createMemoryStore();
    const service = new TransactionImportStagingService({
      generateImportSessionId: () => 'session-1',
      store: memory.store,
    });

    await service.stageImport({
      contentType: 'text/csv',
      payload: Buffer.from('Date,Description,Amount\n2026-05-08,Coffee,-12.50', 'utf8'),
      sourceFilename: 'statement.csv',
      userId: 'user-1',
    });

    await expect(service.getSession('user-2', 'session-1')).resolves.toBeNull();
    expect(memory.expireCalls).toEqual([]);
  });

  it('rejects stored payloads that do not match the staged-session schema', async () => {
    const memory = createMemoryStore();
    memory.values.set(
      'import:session:user-1:session-1',
      JSON.stringify({
        importSessionId: 'session-1',
        sourceFormat: 'csv',
        userId: 'user-1',
        version: 1,
      }),
    );

    const service = new TransactionImportStagingService({
      generateImportSessionId: () => 'session-1',
      store: memory.store,
    });

    await expect(service.getSession('user-1', 'session-1')).rejects.toBeInstanceOf(
      TransactionImportStagingValidationError,
    );
  });

  it('rejects stored payloads that are not valid JSON', async () => {
    const memory = createMemoryStore();
    memory.values.set('import:session:user-1:session-1', '{not-json');

    const service = new TransactionImportStagingService({
      generateImportSessionId: () => 'session-1',
      store: memory.store,
    });

    await expect(service.getSession('user-1', 'session-1')).rejects.toBeInstanceOf(
      TransactionImportStagingValidationError,
    );
  });

  it('deletes staged sessions with the same scoped Redis key used during staging', async () => {
    const memory = createMemoryStore();
    const service = new TransactionImportStagingService({
      generateImportSessionId: () => 'session-1',
      store: memory.store,
    });

    await service.stageImport({
      contentType: 'text/csv',
      payload: Buffer.from('Date,Description,Amount\n2026-05-08,Coffee,-12.50', 'utf8'),
      sourceFilename: 'statement.csv',
      userId: 'user-1',
    });

    await expect(service.deleteSession('user-1', 'session-1')).resolves.toBe(true);
    expect(memory.deleteCalls).toEqual([{ key: 'import:session:user-1:session-1' }]);
    await expect(service.getSession('user-1', 'session-1')).resolves.toBeNull();
  });

  it('returns false when deleting a missing staged session', async () => {
    const memory = createMemoryStore();
    const service = new TransactionImportStagingService({
      generateImportSessionId: () => 'session-1',
      store: memory.store,
    });

    await expect(service.deleteSession('user-1', 'missing-session')).resolves.toBe(false);
    expect(memory.deleteCalls).toEqual([{ key: 'import:session:user-1:missing-session' }]);
  });
});
