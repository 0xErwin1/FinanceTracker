import { CurrencyEnum, type TransactionImportPreviewResponseDTO, TransactionType } from '@expenses/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const importPreviewMutate = vi.fn();
const importCommitMutate = vi.fn();

vi.mock('@/api/trpc', () => ({
  trpc: {
    transaction: {
      importPreview: { mutate: importPreviewMutate },
      importCommit: { mutate: importCommitMutate },
    },
  },
}));

function makePreviewResponse(): TransactionImportPreviewResponseDTO {
  return {
    delimiter: ',',
    hasHeader: true,
    headers: ['Date', 'Description', 'Amount'],
    mapping: {
      amount: 'Amount',
      date: 'Date',
      description: 'Description',
    },
    parserIssues: [],
    rows: [
      {
        rowNumber: 2,
        status: 'ready',
        issues: [],
        normalized: {
          amount: 12.5,
          date: '2026-05-08',
          description: 'Coffee',
          externalReference: 'coffee-1',
          type: TransactionType.EXPENSE,
        },
        raw: {
          Amount: '-12.50',
          Date: '2026-05-08',
          Description: 'Coffee',
        },
        fingerprint: 'ready-row',
      },
      {
        rowNumber: 3,
        status: 'invalid',
        issues: [{ code: 'invalid_amount', message: 'Amount is invalid.', rowNumber: 3 }],
        normalized: {
          amount: null,
          date: '2026-05-09',
          description: 'Broken amount',
          externalReference: null,
          type: TransactionType.EXPENSE,
        },
        raw: {
          Amount: 'oops',
          Date: '2026-05-09',
          Description: 'Broken amount',
        },
      },
      {
        rowNumber: 4,
        status: 'duplicate',
        issues: [{ code: 'duplicate_existing', message: 'Already imported.', rowNumber: 4 }],
        normalized: {
          amount: 40,
          date: '2026-05-10',
          description: 'Groceries',
          externalReference: 'groceries-1',
          type: TransactionType.EXPENSE,
        },
        raw: {
          Amount: '-40.00',
          Date: '2026-05-10',
          Description: 'Groceries',
        },
        fingerprint: 'duplicate-row',
      },
      {
        rowNumber: 5,
        status: 'review-required',
        issues: [{ code: 'review_required', message: 'Needs confirmation.', rowNumber: 5 }],
        normalized: {
          amount: 2000,
          date: '2026-05-11',
          description: 'Salary',
          externalReference: null,
          type: TransactionType.INCOME,
        },
        raw: {
          Amount: '2000.00',
          Date: '2026-05-11',
          Description: 'Salary',
        },
        fingerprint: 'review-row',
      },
    ],
    summary: {
      duplicate: 1,
      invalid: 1,
      ready: 1,
      reviewRequired: 1,
      total: 4,
    },
  };
}

describe('useTransactionImport', () => {
  beforeEach(() => {
    vi.resetModules();
    importPreviewMutate.mockReset();
    importCommitMutate.mockReset();
  });

  it('stores preview results and auto-approves only eligible rows', async () => {
    const preview = makePreviewResponse();
    importPreviewMutate.mockResolvedValue(preview);

    const { useTransactionImport } = await import('./useTransactionImport');
    const transactionImport = useTransactionImport();

    const result = await transactionImport.requestPreview({
      defaults: {
        accountId: 'account-1',
        currency: CurrencyEnum.USD,
        typeStrategy: 'signed_amount',
      },
      source: 'Date,Description,Amount\n2026-05-08,Coffee,-12.50',
    });

    expect(result).toEqual(preview);
    expect(transactionImport.preview.value).toEqual(preview);
    expect(transactionImport.approvalState.value).toEqual({
      2: true,
      3: false,
      4: false,
      5: true,
    });
    expect(transactionImport.approvedPreviewRows.value.map((row) => row.rowNumber)).toEqual([2, 5]);
  });

  it('commits only the rows that remain approved locally', async () => {
    const preview = makePreviewResponse();
    importPreviewMutate.mockResolvedValue(preview);
    importCommitMutate.mockResolvedValue({
      batchId: 'batch-1',
      createdCount: 1,
      createdTransactionIds: ['tx-1'],
    });

    const { useTransactionImport } = await import('./useTransactionImport');
    const transactionImport = useTransactionImport();

    await transactionImport.requestPreview({
      defaults: {
        accountId: 'account-1',
        categoryId: 'category-1',
        currency: CurrencyEnum.USD,
        typeStrategy: 'signed_amount',
      },
      source: 'Date,Description,Amount\n2026-05-08,Coffee,-12.50',
    });

    transactionImport.setRowApproved(2, false);

    const result = await transactionImport.commitApprovedRows({
      accountId: 'account-1',
      categoryId: 'category-1',
      idempotencyKey: 'batch-1',
    });

    expect(importCommitMutate).toHaveBeenCalledWith({
      accountId: 'account-1',
      approvedRows: [
        {
          categoryId: 'category-1',
          fingerprint: 'review-row',
          normalized: preview.rows[3]?.normalized,
          rowNumber: 5,
        },
      ],
      idempotencyKey: 'batch-1',
      sourceFormat: 'csv',
    });
    expect(result).toEqual({
      batchId: 'batch-1',
      createdCount: 1,
      createdTransactionIds: ['tx-1'],
    });
  });

  it('reuses the preview source format when committing bank PDF rows', async () => {
    const preview = makePreviewResponse();
    importPreviewMutate.mockResolvedValue(preview);
    importCommitMutate.mockResolvedValue({
      batchId: 'batch-2',
      createdCount: 2,
      createdTransactionIds: ['tx-2', 'tx-3'],
    });

    const { useTransactionImport } = await import('./useTransactionImport');
    const transactionImport = useTransactionImport();

    await transactionImport.requestPreview({
      defaults: {
        accountId: 'account-1',
        currency: CurrencyEnum.USD,
        typeStrategy: 'signed_amount',
      },
      source: 'JVBERg==',
      sourceFilename: 'statement.pdf',
      sourceFormat: 'bank_pdf_text',
    });

    await transactionImport.commitApprovedRows({
      accountId: 'account-1',
      idempotencyKey: 'batch-2',
    });

    expect(importCommitMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'account-1',
        idempotencyKey: 'batch-2',
        sourceFormat: 'bank_pdf_text',
      }),
    );
  });
});
