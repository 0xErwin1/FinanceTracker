import { CurrencyEnum, type TransactionImportPreviewResponseDTO, TransactionType } from '@expenses/api';
import { describe, expect, it } from 'vitest';
import {
  applyImportedSourceFileError,
  applyImportedSourceFileSelection,
  buildImportPreviewRequest,
  getCommitDisabledReason,
  getImportPreviewErrorMessage,
  getImportSourceGuidance,
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
      sourceFormat: 'csv',
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
      sourceFormat: 'csv',
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
      sourceFormat: 'csv',
    });

    expect(signedAmountIssues).toEqual([]);
    expect(splitAmountIssues).toEqual([]);
  });

  it('reads uploaded CSV files without changing their contents', async () => {
    const csvText = 'Date;Description;Amount\n2026-05-08;Coffee;-12.50\n';
    const file = new File([csvText], 'statement.csv', { type: 'text/csv' });

    await expect(readImportSourceFile(file)).resolves.toEqual({
      source: csvText,
      sourceFilename: 'statement.csv',
      sourceFormat: 'csv',
    });
  });

  it('reads uploaded PDF files as base64 while preserving the original filename', async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const file = new File([pdfBytes], 'statement.pdf', { type: 'application/pdf' });

    await expect(readImportSourceFile(file)).resolves.toEqual({
      source: 'JVBERg==',
      sourceFilename: 'statement.pdf',
      sourceFormat: 'bank_pdf_text',
    });
  });

  it('derives PDF upload state that hides the CSV editor and clears prior file errors', () => {
    expect(
      applyImportedSourceFileSelection({
        source: 'JVBERg==',
        sourceFilename: 'statement.pdf',
        sourceFormat: 'bank_pdf_text',
      }),
    ).toEqual({
      formIssues: [],
      formSource: 'JVBERg==',
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
      formSource: '',
      sourceFileError: 'The selected PDF file could not be read. Try choosing the bank statement again.',
      sourceFilename: undefined,
      sourceFormat: 'csv',
    });
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
        source: source.source,
        sourceFilename: source.sourceFilename,
        sourceFormat: source.sourceFormat,
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
      sourceFilename: 'statement.csv',
      sourceFormat: 'csv',
    });
  });

  it('omits CSV-only mapping requirements when the source is a bank PDF', () => {
    const issues = validateImportDraft({
      defaults: {
        accountId: 'account-1',
        currency: CurrencyEnum.USD,
        typeStrategy: 'signed_amount',
      },
      mapping: {},
      source: 'JVBERg==',
      sourceFilename: 'statement.pdf',
      sourceFormat: 'bank_pdf_text',
    });

    expect(issues).toEqual([]);
  });

  it('builds PDF preview requests with source metadata and without CSV mappings', () => {
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
        source: 'JVBERg==',
        sourceFilename: 'statement.pdf',
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
      source: 'JVBERg==',
      sourceFilename: 'statement.pdf',
      sourceFormat: 'bank_pdf_text',
    });
  });

  it('surfaces a clear error when the selected CSV file cannot be read', async () => {
    const unreadableFile = {
      name: 'statement.csv',
      text: async () => {
        throw new Error('disk failure');
      },
    };

    await expect(readImportSourceFile(unreadableFile)).rejects.toThrow(
      'The selected CSV file could not be read. Try pasting the CSV text instead.',
    );
  });

  it('rejects unsupported upload extensions with a format-aware message', async () => {
    const file = new File(['irrelevant'], 'statement.txt', { type: 'text/plain' });

    await expect(readImportSourceFile(file)).rejects.toThrow(
      'Only CSV and PDF statement files are supported for transaction imports.',
    );
  });

  it('describes PDF uploads as text-only statement imports without OCR support', () => {
    expect(getImportSourceGuidance('bank_pdf_text')).toBe(
      'PDF statement imports require selectable text. Scanned PDFs and OCR are not supported.',
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
