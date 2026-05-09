import { CurrencyEnum, type TransactionImportPreviewResponseDTO, TransactionType } from '@expenses/api';
import { describe, expect, it } from 'vitest';
import {
  applyImportedSourceFileError,
  applyImportedSourceFileSelection,
  buildImportPreviewRequest,
  getCommitDisabledReason,
  getCsvHeaderOptions,
  getImportPreviewErrorMessage,
  getImportSourceGuidance,
  getImportStatusPresentation,
  shouldShowCsvMappingControls,
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
      importSessionId: '',
      mapping: {},
      sourceFormat: 'csv',
    });

    expect(issues).toEqual([
      'Select a staged CSV or PDF upload before generating a preview.',
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
      importSessionId: 'session-csv',
      mapping: {
        amount: 'Amount',
        date: 'Date',
        description: 'Description',
      },
      sourceFormat: 'csv',
    });

    const splitAmountIssues = validateImportDraft({
      defaults: {
        accountId: 'account-1',
        currency: CurrencyEnum.USD,
        fixedType: TransactionType.EXPENSE,
        typeStrategy: 'fixed_type',
      },
      importSessionId: 'session-csv',
      mapping: {
        credit: 'Money In',
        date: 'Date',
        debit: 'Money Out',
        description: 'Description',
      },
      sourceFormat: 'csv',
    });

    expect(signedAmountIssues).toEqual([]);
    expect(splitAmountIssues).toEqual([]);
  });

  it('stores staged upload metadata and clears prior file errors', () => {
    expect(
      applyImportedSourceFileSelection({
        byteSize: 2048,
        delimiter: ',',
        hasHeader: true,
        headers: ['Date', 'Description', 'Amount'],
        importSessionId: 'session-csv',
        parserIssues: [],
        sourceFilename: 'statement.pdf',
        sourceFormat: 'bank_pdf_text',
      }),
    ).toEqual({
      formIssues: [],
      sourceFileError: null,
      sourceFilename: 'statement.pdf',
      sourceFormat: 'bank_pdf_text',
    });
  });

  it('resets back to CSV-safe state when an uploaded file cannot be read', () => {
    expect(
      applyImportedSourceFileError(
        'The selected PDF file could not be read. Try choosing the bank statement again.',
      ),
    ).toEqual({
      sourceFileError: 'The selected PDF file could not be read. Try choosing the bank statement again.',
      sourceFilename: undefined,
      sourceFormat: 'csv',
    });
  });

  it('builds staged CSV preview requests while normalizing optional fields', () => {
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
        importSessionId: 'session-csv',
        sourceFormat: 'csv',
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
      importSessionId: 'session-csv',
    });
  });

  it('omits CSV-only mapping requirements when the source is a bank PDF', () => {
    const issues = validateImportDraft({
      defaults: {
        accountId: 'account-1',
        currency: CurrencyEnum.USD,
        typeStrategy: 'signed_amount',
      },
      importSessionId: 'session-pdf',
      mapping: {},
      sourceFormat: 'bank_pdf_text',
    });

    expect(issues).toEqual([]);
  });

  it('builds PDF preview requests without CSV mappings', () => {
    expect(
      buildImportPreviewRequest({
        defaults: {
          accountId: 'account-1',
          currency: CurrencyEnum.USD,
          fixedType: TransactionType.EXPENSE,
          typeStrategy: 'fixed_type',
        },
        mapping: {
          amount: 'Amount',
          credit: 'Credit',
          date: 'Date',
          debit: 'Debit',
          description: 'Description',
          externalReference: 'Reference',
        },
        importSessionId: 'session-pdf',
        sourceFormat: 'bank_pdf_text',
      }),
    ).toEqual({
      defaults: {
        accountId: 'account-1',
        categoryId: null,
        currency: CurrencyEnum.USD,
        fixedType: TransactionType.EXPENSE,
        typeStrategy: 'fixed_type',
      },
      importSessionId: 'session-pdf',
    });
  });

  it('provides blank-first dropdown options from detected CSV headers', () => {
    expect(getCsvHeaderOptions(['Date', 'Description', 'Amount'])).toEqual([
      { label: 'Select a column', value: '' },
      { label: 'Date', value: 'Date' },
      { label: 'Description', value: 'Description' },
      { label: 'Amount', value: 'Amount' },
    ]);
  });

  it('describes PDF uploads as text-only statement imports without OCR support', () => {
    expect(getImportSourceGuidance('bank_pdf_text')).toBe(
      'PDF statement imports require selectable text. Scanned PDFs and OCR are not supported.',
    );
  });

  it('describes CSV uploads without suggesting an editable textarea', () => {
    expect(getImportSourceGuidance('csv')).toBe(
      'Select a bank export to load its contents. Map the detected CSV columns below.',
    );
  });

  it('prefixes backend preview failures with PDF-specific context for statement imports', () => {
    expect(
      getImportPreviewErrorMessage(
        new Error(
          'The uploaded PDF does not contain selectable text. Scanned PDFs and OCR are not supported.',
        ),
        'bank_pdf_text',
      ),
    ).toBe(
      'PDF statement preview failed. The uploaded PDF does not contain selectable text. Scanned PDFs and OCR are not supported.',
    );
  });

  it('shows CSV mapping controls only for staged CSV sessions', () => {
    expect(shouldShowCsvMappingControls('csv')).toBe(true);
    expect(shouldShowCsvMappingControls('bank_pdf_text')).toBe(false);
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

  it('blocks commit when the preview is otherwise clean but no rows remain approved', () => {
    const reason = getCommitDisabledReason({
      approvedRowCount: 0,
      commitLoading: false,
      preview: makePreviewResponse(),
      previewLoading: false,
    });

    expect(reason).toBe('Approve at least one preview row before committing.');
  });
});
