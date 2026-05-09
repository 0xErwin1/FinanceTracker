import {
  BankPdfNormalizationError,
  normalizeBankPdfText,
} from '../../src/services/import/bank-pdf-normalizer';

describe('bank PDF normalizer', () => {
  it('normalizes a supported statement layout into canonical preview rows', () => {
    const normalized = normalizeBankPdfText(`
Bank Statement
Date  Description  Amount
08/05/2026  Coffee Shop  -12.50
09/05/2026  Salary  2000.00
`);

    expect(normalized).toEqual({
      delimiter: ',',
      hasHeader: true,
      headers: ['Date', 'Description', 'Amount'],
      rowCount: 2,
      rows: [
        {
          Amount: '-12.50',
          Date: '08/05/2026',
          Description: 'Coffee Shop',
        },
        {
          Amount: '2000.00',
          Date: '09/05/2026',
          Description: 'Salary',
        },
      ],
    });
  });

  it('rejects ambiguous statement layouts instead of guessing columns', () => {
    expect(() =>
      normalizeBankPdfText(`
Bank Statement
Date Description Amount
08/05/2026 Coffee Shop -12.50
`),
    ).toThrow(BankPdfNormalizationError);

    try {
      normalizeBankPdfText(`
Bank Statement
Date Description Amount
08/05/2026 Coffee Shop -12.50
`);
    } catch (error) {
      expect(error).toMatchObject({
        code: 'pdf_unsupported_layout',
        message: 'The uploaded PDF statement layout is not supported for preview import.',
      } satisfies Partial<BankPdfNormalizationError>);
    }
  });
});
