import {
  CurrencyEnum,
  type TransactionImportCommitRequestDTO,
  type TransactionImportPreviewRequestDTO,
  type TransactionImportPreviewResponseDTO,
  TransactionType,
} from '../../../../packages/api/src/client';

describe('transaction import DTO exports', () => {
  it('keeps preview request payloads JSON-serializable for browser clients', () => {
    const payload: TransactionImportPreviewRequestDTO = {
      source: 'Date,Amount,Description\n2026-05-01,-14.5,Coffee',
      mapping: {
        date: 'Date',
        amount: 'Amount',
        description: 'Description',
      },
      defaults: {
        accountId: 'account-1',
        currency: CurrencyEnum.USD,
        categoryId: 'category-1',
        typeStrategy: 'signed_amount',
      },
    };

    expect(JSON.parse(JSON.stringify(payload))).toEqual({
      source: 'Date,Amount,Description\n2026-05-01,-14.5,Coffee',
      mapping: {
        date: 'Date',
        amount: 'Amount',
        description: 'Description',
      },
      defaults: {
        accountId: 'account-1',
        currency: 'USD',
        categoryId: 'category-1',
        typeStrategy: 'signed_amount',
      },
    });
  });

  it('supports preview and commit DTOs with machine-readable statuses', () => {
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
  });
});
