import {
  CurrencyEnum,
  type TransactionImportApprovedRowRefDTO,
  type TransactionImportCommitFromSessionRequestDTO,
  type TransactionImportCommitRequestDTO,
  type TransactionImportPreviewFromSessionRequestDTO,
  type TransactionImportPreviewRequestDTO,
  type TransactionImportPreviewResponseDTO,
  type TransactionImportSourceFormat,
  type TransactionImportStageResponseDTO,
  TransactionType,
} from '../../../../packages/api/src/client';

describe('transaction import DTO exports', () => {
  it('keeps preview request payloads JSON-serializable for browser clients', () => {
    const payload: TransactionImportPreviewRequestDTO = {
      source: 'JVBERi0xLjQKJcTl8uXr',
      sourceFilename: 'statement.pdf',
      sourceFormat: 'bank_pdf_text',
      defaults: {
        accountId: 'account-1',
        currency: CurrencyEnum.USD,
        categoryId: 'category-1',
        typeStrategy: 'signed_amount',
      },
    };

    expect(JSON.parse(JSON.stringify(payload))).toEqual({
      source: 'JVBERi0xLjQKJcTl8uXr',
      sourceFilename: 'statement.pdf',
      sourceFormat: 'bank_pdf_text',
      defaults: {
        accountId: 'account-1',
        currency: 'USD',
        categoryId: 'category-1',
        typeStrategy: 'signed_amount',
      },
    });
  });

  it('supports staged session DTOs without removing the legacy inline contract', () => {
    const stageResponse: TransactionImportStageResponseDTO = {
      importSessionId: 'session-1',
      sourceFormat: 'csv',
      sourceFilename: 'statement.csv',
      byteSize: 128,
      delimiter: ',',
      hasHeader: true,
      headers: ['Date', 'Amount', 'Description'],
      parserIssues: [],
    };

    const previewFromSession: TransactionImportPreviewFromSessionRequestDTO = {
      importSessionId: 'session-1',
      defaults: {
        accountId: 'account-1',
        currency: CurrencyEnum.USD,
        typeStrategy: 'signed_amount',
      },
      mapping: {
        date: 'Date',
        amount: 'Amount',
        description: 'Description',
      },
    };

    const approvedRow: TransactionImportApprovedRowRefDTO = {
      rowNumber: 2,
      fingerprint: 'fp-1',
      categoryId: 'category-1',
    };

    const commitFromSession: TransactionImportCommitFromSessionRequestDTO = {
      importSessionId: stageResponse.importSessionId,
      accountId: 'account-1',
      idempotencyKey: 'batch-1',
      approvedRows: [approvedRow],
    };

    const legacyPreview: TransactionImportPreviewRequestDTO = {
      source: 'Date,Description,Amount\n2026-05-08,Coffee,-12.50',
      defaults: {
        accountId: 'account-1',
        currency: CurrencyEnum.USD,
        typeStrategy: 'signed_amount',
      },
    };

    const legacyCommit: TransactionImportCommitRequestDTO = {
      accountId: 'account-1',
      idempotencyKey: 'batch-1',
      approvedRows: [
        {
          ...approvedRow,
          normalized: {
            date: '2026-05-08',
            amount: -12.5,
            description: 'Coffee',
            externalReference: null,
            type: TransactionType.EXPENSE,
          },
        },
      ],
    };

    expect(JSON.parse(JSON.stringify(stageResponse))).toEqual({
      importSessionId: 'session-1',
      sourceFormat: 'csv',
      sourceFilename: 'statement.csv',
      byteSize: 128,
      delimiter: ',',
      hasHeader: true,
      headers: ['Date', 'Amount', 'Description'],
      parserIssues: [],
    });

    expect(previewFromSession.importSessionId).toBe(stageResponse.importSessionId);
    expect(commitFromSession.approvedRows).toEqual([approvedRow]);
    expect(legacyPreview.source).toContain('Coffee');
    expect(legacyCommit.approvedRows[0]?.normalized.type).toBe(TransactionType.EXPENSE);
  });

  it('supports preview and commit DTOs with machine-readable statuses', () => {
    const sourceFormat: TransactionImportSourceFormat = 'bank_pdf_text';
    const preview: TransactionImportPreviewResponseDTO = {
      delimiter: ',',
      hasHeader: true,
      headers: ['Date', 'Amount', 'Description'],
      mapping: {
        date: 'Date',
        amount: 'Amount',
        description: 'Description',
      },
      rows: [
        {
          rowNumber: 2,
          status: 'ready',
          issues: [],
          normalized: {
            date: '2026-05-01',
            amount: -14.5,
            description: 'Coffee',
            externalReference: null,
            type: TransactionType.EXPENSE,
          },
          raw: {
            Date: '2026-05-01',
            Amount: '-14.5',
            Description: 'Coffee',
          },
        },
      ],
      summary: {
        ready: 1,
        invalid: 0,
        duplicate: 0,
        reviewRequired: 0,
        total: 1,
      },
      parserIssues: [],
    };
    const commit: TransactionImportCommitRequestDTO = {
      accountId: 'account-1',
      idempotencyKey: 'batch-1',
      sourceFormat,
      approvedRows: [
        {
          rowNumber: 2,
          fingerprint: 'fp-1',
          normalized: preview.rows[0].normalized,
          categoryId: 'category-1',
        },
      ],
    };

    expect(preview.rows[0].status).toBe('ready');
    expect(sourceFormat).toBe('bank_pdf_text');
    expect<readonly string[]>([
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
    ]).toContain('pdf_unsupported_layout');
    expect(commit.approvedRows[0]).toEqual({
      rowNumber: 2,
      fingerprint: 'fp-1',
      normalized: {
        date: '2026-05-01',
        amount: -14.5,
        description: 'Coffee',
        externalReference: null,
        type: TransactionType.EXPENSE,
      },
      categoryId: 'category-1',
    });
    expect(commit.sourceFormat).toBe('bank_pdf_text');
  });
});
