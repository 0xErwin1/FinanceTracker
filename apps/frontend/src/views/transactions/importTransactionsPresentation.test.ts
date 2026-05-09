import { CurrencyEnum, type TransactionImportPreviewResponseDTO, TransactionType } from '@expenses/api';
import { describe, expect, it } from 'vitest';
import {
  buildImportPreviewRequest,
  getCommitDisabledReason,
  getImportStatusPresentation,
  readImportSourceFile,
  validateImportDraft,
} from './importTransactionsPresentation';

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
          externalReference: null,
          type: TransactionType.EXPENSE,
        },
        raw: {
          Amount: '-12.50',
          Date: '2026-05-08',
          Description: 'Coffee',
        },
        fingerprint: 'row-1',
      },
    ],
    summary: {
      duplicate: 0,
      invalid: 0,
      ready: 1,
      reviewRequired: 0,
      total: 1,
    },
    ...overrides,
  };
}

describe('import transactions presentation helpers', () => {
  it('requires source, account, date, description, and an amount mapping before preview', () => {
    const issues = validateImportDraft({
      defaults: {
        accountId: '',
        currency: CurrencyEnum.USD,
        typeStrategy: 'signed_amount',
      },
      mapping: {},
      source: '   ',
    });

    expect(issues).toEqual([
      'CSV source is required before generating a preview.',
      'Choose an active destination account.',
      'Map the CSV date column before previewing.',
      'Map the CSV description column before previewing.',
      'Map either a signed amount column or both debit and credit columns.',
    ]);
  });

  it('allows either a signed amount mapping or a debit/credit pair', () => {
    const signedAmountIssues = validateImportDraft({
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
      source: 'Date,Description,Amount',
    });

    const splitAmountIssues = validateImportDraft({
      defaults: {
        accountId: 'account-1',
        currency: CurrencyEnum.USD,
        fixedType: TransactionType.EXPENSE,
        typeStrategy: 'fixed_type',
      },
      mapping: {
        credit: 'Money In',
        date: 'Date',
        debit: 'Money Out',
        description: 'Description',
      },
      source: 'Date,Description,Money Out,Money In',
    });

    expect(signedAmountIssues).toEqual([]);
    expect(splitAmountIssues).toEqual([]);
  });

  it('reads uploaded CSV files without changing their contents', async () => {
    const csvText = 'Date;Description;Amount\n2026-05-08;Coffee;-12.50\n';
    const file = new File([csvText], 'statement.csv', { type: 'text/csv' });

    await expect(readImportSourceFile(file)).resolves.toBe(csvText);
  });

  it('builds preview requests from uploaded file contents while normalizing optional fields', async () => {
    const csvText = 'Date,Description,Amount\n2026-05-08,Coffee,-12.50';
    const file = new File([csvText], 'statement.csv', { type: 'text/csv' });
    const source = await readImportSourceFile(file);

    expect(
      buildImportPreviewRequest({
        defaults: {
          accountId: 'account-1',
          categoryId: '   ',
          currency: CurrencyEnum.USD,
          fixedType: TransactionType.EXPENSE,
          typeStrategy: 'fixed_type',
        },
        mapping: {
          amount: 'Amount',
          credit: '   ',
          date: 'Date',
          debit: '   ',
          description: 'Description',
          externalReference: '   ',
        },
        source,
      }),
    ).toEqual({
      defaults: {
        accountId: 'account-1',
        categoryId: null,
        currency: CurrencyEnum.USD,
        fixedType: TransactionType.EXPENSE,
        typeStrategy: 'fixed_type',
      },
      mapping: {
        amount: 'Amount',
        credit: undefined,
        date: 'Date',
        debit: undefined,
        description: 'Description',
        externalReference: undefined,
      },
      source: csvText,
    });
  });

  it('surfaces a clear error when the selected CSV file cannot be read', async () => {
    const unreadableFile = {
      text: async () => {
        throw new Error('disk failure');
      },
    };

    await expect(readImportSourceFile(unreadableFile)).rejects.toThrow(
      'The selected CSV file could not be read. Try pasting the CSV text instead.',
    );
  });

  it('maps import statuses to user-facing labels and tones', () => {
    expect(getImportStatusPresentation('ready')).toEqual({
      description: 'Ready to include in the final commit.',
      label: 'Ready',
      tone: 'success',
    });
    expect(getImportStatusPresentation('review-required')).toEqual({
      description: 'Needs explicit approval before it can be committed.',
      label: 'Review required',
      tone: 'warning',
    });
  });

  it('blocks commit while invalid rows remain in the preview', () => {
    const reason = getCommitDisabledReason({
      approvedRowCount: 1,
      commitLoading: false,
      preview: makePreviewResponse({
        rows: [
          {
            rowNumber: 2,
            status: 'invalid',
            issues: [{ code: 'invalid_date', message: 'Invalid date.', rowNumber: 2 }],
            normalized: {
              amount: 12.5,
              date: null,
              description: 'Coffee',
              externalReference: null,
              type: TransactionType.EXPENSE,
            },
            raw: {
              Amount: '-12.50',
              Date: 'bad-date',
              Description: 'Coffee',
            },
          },
        ],
        summary: {
          duplicate: 0,
          invalid: 1,
          ready: 0,
          reviewRequired: 0,
          total: 1,
        },
      }),
      previewLoading: false,
    });

    expect(reason).toBe('Resolve every invalid row before committing the import.');
  });

  it('allows commit once the preview is clean and at least one row is approved', () => {
    const reason = getCommitDisabledReason({
      approvedRowCount: 1,
      commitLoading: false,
      preview: makePreviewResponse(),
      previewLoading: false,
    });

    expect(reason).toBeNull();
  });
});
