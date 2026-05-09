import {
  CurrencyEnum,
  type TransactionImportPreviewResponseDTO,
  type TransactionImportStageResponseDTO,
  TransactionType,
} from '@expenses/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const importPreviewFromSessionMutate = vi.fn();
const importCommitFromSessionMutate = vi.fn();
const fetchMock = vi.fn<typeof fetch>();

vi.mock('@/api/trpc', () => ({
  trpc: {
    transaction: {
      importPreviewFromSession: { mutate: importPreviewFromSessionMutate },
      importCommitFromSession: { mutate: importCommitFromSessionMutate },
    },
  },
}));

function makeStageResponse(
  overrides: Partial<TransactionImportStageResponseDTO> = {},
): TransactionImportStageResponseDTO {
  return {
    byteSize: 128,
    delimiter: ',',
    hasHeader: true,
    headers: ['Date', 'Description', 'Amount'],
    importSessionId: 'session-1',
    parserIssues: [],
    sourceFilename: 'statement.csv',
    sourceFormat: 'csv',
    ...overrides,
  };
}

function makePreviewResponse(
  overrides: Partial<TransactionImportPreviewResponseDTO> = {},
): TransactionImportPreviewResponseDTO {
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
    ...overrides,
  };
}

describe('useTransactionImport', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', fetchMock);
    importPreviewFromSessionMutate.mockReset();
    importCommitFromSessionMutate.mockReset();
    fetchMock.mockReset();
  });

  it('uploads a file, stores the staged session metadata, and previews via the staged session id', async () => {
    const stageResponse = makeStageResponse();
    const preview = makePreviewResponse();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(stageResponse), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );
    importPreviewFromSessionMutate.mockResolvedValue(preview);

    const { useTransactionImport } = await import('./useTransactionImport');
    const transactionImport = useTransactionImport();
    const file = new File(['Date,Description,Amount'], 'statement.csv', { type: 'text/csv' });

    const staged = await transactionImport.stageSourceFile(file);

    const result = await transactionImport.requestPreview({
      defaults: {
        accountId: 'account-1',
        currency: CurrencyEnum.USD,
        typeStrategy: 'signed_amount',
      },
      mapping: {
        amount: 'Amount',
        date: 'Date',
        description: 'Description',
      },
    });

    expect(staged).toEqual(stageResponse);
    expect(fetchMock).toHaveBeenCalledWith('/api/transactions/import/stage', {
      body: file,
      credentials: 'include',
      headers: {
        'Content-Type': 'text/csv',
        'X-Import-Filename': 'statement.csv',
      },
      method: 'POST',
    });
    expect(transactionImport.stagedUpload.value).toEqual(stageResponse);
    expect(transactionImport.importSessionId.value).toBe('session-1');
    expect(result).toEqual(preview);
    expect(transactionImport.preview.value).toEqual(preview);
    expect(importPreviewFromSessionMutate).toHaveBeenCalledWith({
      defaults: {
        accountId: 'account-1',
        categoryId: null,
        currency: CurrencyEnum.USD,
        fixedType: null,
        typeStrategy: 'signed_amount',
      },
      importSessionId: 'session-1',
      mapping: {
        amount: 'Amount',
        date: 'Date',
        description: 'Description',
      },
    });
    expect(transactionImport.approvalState.value).toEqual({
      2: true,
      3: false,
      4: false,
      5: true,
    });
    expect(transactionImport.approvedPreviewRows.value.map((row) => row.rowNumber)).toEqual([2, 5]);
  });

  it('commits only the rows that remain approved locally', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(makeStageResponse()), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );
    const preview = makePreviewResponse();
    importPreviewFromSessionMutate.mockResolvedValue(preview);
    importCommitFromSessionMutate.mockResolvedValue({
      batchId: 'batch-1',
      createdCount: 1,
      createdTransactionIds: ['tx-1'],
    });

    const { useTransactionImport } = await import('./useTransactionImport');
    const transactionImport = useTransactionImport();

    await transactionImport.stageSourceFile(
      new File(['Date,Description,Amount'], 'statement.csv', { type: 'text/csv' }),
    );

    await transactionImport.requestPreview({
      defaults: {
        accountId: 'account-1',
        categoryId: 'category-1',
        currency: CurrencyEnum.USD,
        typeStrategy: 'signed_amount',
      },
      mapping: {
        amount: 'Amount',
        date: 'Date',
        description: 'Description',
      },
    });

    transactionImport.setRowApproved(2, false);

    const result = await transactionImport.commitApprovedRows({
      accountId: 'account-1',
      categoryId: 'category-1',
      idempotencyKey: 'batch-1',
    });

    expect(importCommitFromSessionMutate).toHaveBeenCalledWith({
      accountId: 'account-1',
      approvedRows: [
        {
          categoryId: 'category-1',
          fingerprint: 'review-row',
          rowNumber: 5,
        },
      ],
      importSessionId: 'session-1',
      idempotencyKey: 'batch-1',
    });
    expect(result).toEqual({
      batchId: 'batch-1',
      createdCount: 1,
      createdTransactionIds: ['tx-1'],
    });
  });

  it('replaces approval state when a later preview returns a different staged result set', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(makeStageResponse()), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );
    importPreviewFromSessionMutate.mockResolvedValue(makePreviewResponse());

    const replacementPreview = makePreviewResponse({
      rows: [
        {
          rowNumber: 8,
          status: 'duplicate',
          issues: [{ code: 'duplicate_existing', message: 'Already imported.', rowNumber: 8 }],
          normalized: {
            amount: 22,
            date: '2026-05-12',
            description: 'Duplicate replacement row',
            externalReference: 'duplicate-replacement',
            type: TransactionType.EXPENSE,
          },
          raw: {
            Amount: '-22.00',
            Date: '2026-05-12',
            Description: 'Duplicate replacement row',
          },
          fingerprint: 'replacement-row',
        },
      ],
      summary: {
        duplicate: 1,
        invalid: 0,
        ready: 0,
        reviewRequired: 0,
        total: 1,
      },
    });

    let secondPreviewPending = false;
    let resolveSecondPreview: (preview: TransactionImportPreviewResponseDTO) => void = () => {
      throw new Error('Expected the second preview request to remain pending.');
    };

    const { useTransactionImport } = await import('./useTransactionImport');
    const transactionImport = useTransactionImport();

    await transactionImport.stageSourceFile(
      new File(['Date,Description,Amount'], 'statement.csv', { type: 'text/csv' }),
    );

    await transactionImport.requestPreview({
      defaults: {
        accountId: 'account-1',
        currency: CurrencyEnum.USD,
        typeStrategy: 'signed_amount',
      },
      mapping: {
        amount: 'Amount',
        date: 'Date',
        description: 'Description',
      },
    });

    expect(transactionImport.approvedPreviewRows.value.map((row) => row.rowNumber)).toEqual([2, 5]);

    importPreviewFromSessionMutate.mockImplementationOnce(
      () =>
        new Promise<TransactionImportPreviewResponseDTO>((resolve) => {
          secondPreviewPending = true;
          resolveSecondPreview = resolve;
        }),
    );

    const secondPreviewPromise = transactionImport.requestPreview({
      defaults: {
        accountId: 'account-1',
        currency: CurrencyEnum.USD,
        typeStrategy: 'signed_amount',
      },
      mapping: {
        amount: 'Amount',
        date: 'Date',
        description: 'Description',
      },
    });

    expect(transactionImport.previewLoading.value).toBe(true);
    expect(transactionImport.approvalState.value).toEqual({});
    expect(transactionImport.approvedPreviewRows.value).toEqual([]);

    if (!secondPreviewPending) {
      throw new Error('Expected the second preview request to remain pending.');
    }

    resolveSecondPreview(replacementPreview);

    await secondPreviewPromise;

    expect(transactionImport.approvalState.value).toEqual({ 8: false });
    expect(transactionImport.approvedPreviewRows.value).toEqual([]);
  });

  it('branches for staged PDF uploads without sending CSV mapping fields', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify(
          makeStageResponse({
            headers: [],
            importSessionId: 'session-pdf',
            sourceFilename: 'statement.pdf',
            sourceFormat: 'bank_pdf_text',
          }),
        ),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        },
      ),
    );
    const preview = makePreviewResponse();
    importPreviewFromSessionMutate.mockResolvedValue(preview);
    importCommitFromSessionMutate.mockResolvedValue({
      batchId: 'batch-2',
      createdCount: 2,
      createdTransactionIds: ['tx-2', 'tx-3'],
    });

    const { useTransactionImport } = await import('./useTransactionImport');
    const transactionImport = useTransactionImport();

    await transactionImport.stageSourceFile(new File(['%PDF'], 'statement.pdf', { type: 'application/pdf' }));

    await transactionImport.requestPreview({
      defaults: {
        accountId: 'account-1',
        currency: CurrencyEnum.USD,
        typeStrategy: 'signed_amount',
      },
    });

    await transactionImport.commitApprovedRows({
      accountId: 'account-1',
      idempotencyKey: 'batch-2',
    });

    expect(importPreviewFromSessionMutate).toHaveBeenCalledWith({
      defaults: {
        accountId: 'account-1',
        categoryId: null,
        currency: CurrencyEnum.USD,
        fixedType: null,
        typeStrategy: 'signed_amount',
      },
      importSessionId: 'session-pdf',
    });
    expect(importCommitFromSessionMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'account-1',
        idempotencyKey: 'batch-2',
        importSessionId: 'session-pdf',
      }),
    );
  });

  it('surfaces staged upload failures and clears the staged session state', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Unsupported statement upload.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 415,
      }),
    );

    const { useTransactionImport } = await import('./useTransactionImport');
    const transactionImport = useTransactionImport();

    await expect(
      transactionImport.stageSourceFile(new File(['bad'], 'statement.txt', { type: 'text/plain' })),
    ).rejects.toThrow('Unsupported statement upload.');

    expect(transactionImport.stagedUpload.value).toBeNull();
    expect(transactionImport.importSessionId.value).toBeNull();
    expect(transactionImport.stageError.value?.message).toBe('Unsupported statement upload.');
  });
});
