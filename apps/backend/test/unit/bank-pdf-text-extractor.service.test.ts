jest.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  getDocument: jest.fn(),
}));

import {
  type BankPdfTextExtractionError,
  extractBankPdfText,
} from '../../src/services/import/bank-pdf-text-extractor.service';

const { getDocument } = require('pdfjs-dist/legacy/build/pdf.mjs') as {
  getDocument: jest.Mock;
};

function createMockPage(items: Array<{ str: string; transform: number[] }> = []) {
  return {
    cleanup: jest.fn(),
    getTextContent: jest.fn().mockResolvedValue({ items }),
  };
}

function mockPdfDocument(pages: Array<ReturnType<typeof createMockPage>>) {
  const destroy = jest.fn().mockResolvedValue(undefined);
  const document = {
    getPage: jest.fn((pageNumber: number) => Promise.resolve(pages[pageNumber - 1])),
    numPages: pages.length,
  };

  getDocument.mockReturnValue({
    destroy,
    promise: Promise.resolve(document),
  });

  return { destroy, document };
}

describe('bank PDF text extractor', () => {
  beforeEach(() => {
    getDocument.mockReset();
  });

  it('extracts text lines from supported text PDFs', async () => {
    mockPdfDocument([
      createMockPage([
        { str: 'Date', transform: [1, 0, 0, 1, 72, 720] },
        { str: 'Description', transform: [1, 0, 0, 1, 160, 720] },
        { str: 'Amount', transform: [1, 0, 0, 1, 320, 720] },
        { str: '08/05/2026', transform: [1, 0, 0, 1, 72, 700] },
        { str: 'Coffee Shop', transform: [1, 0, 0, 1, 160, 700] },
        { str: '-12.50', transform: [1, 0, 0, 1, 320, 700] },
      ]),
    ]);

    await expect(extractBankPdfText(new Uint8Array([1, 2, 3]))).resolves.toEqual({
      pageCount: 1,
      text: 'Date  Description  Amount\n08/05/2026  Coffee Shop  -12.50',
    });
  });

  it('rejects PDFs that have no extractable text content', async () => {
    mockPdfDocument([createMockPage()]);

    await expect(extractBankPdfText(new Uint8Array([1, 2, 3]))).rejects.toMatchObject({
      code: 'pdf_no_text',
      message: 'The uploaded PDF does not contain selectable text. Scanned PDFs and OCR are not supported.',
    } satisfies Partial<BankPdfTextExtractionError>);
  });

  it('rejects PDFs that exceed the configured page limit', async () => {
    mockPdfDocument([createMockPage(), createMockPage()]);

    await expect(extractBankPdfText(new Uint8Array([1, 2, 3]), { pageLimit: 1 })).rejects.toMatchObject({
      code: 'pdf_size_exceeded',
      message: 'PDF imports cannot exceed 1 page for preview extraction.',
    } satisfies Partial<BankPdfTextExtractionError>);
  });

  it('rejects PDFs whose extracted text exceeds the configured limit', async () => {
    mockPdfDocument([
      createMockPage([{ str: 'Date  Description  Amount', transform: [1, 0, 0, 1, 72, 720] }]),
    ]);

    await expect(
      extractBankPdfText(new Uint8Array([1, 2, 3]), { textLengthLimit: 10 }),
    ).rejects.toMatchObject({
      code: 'pdf_size_exceeded',
      message: 'PDF imports cannot exceed 10 extracted characters for preview extraction.',
    } satisfies Partial<BankPdfTextExtractionError>);
  });

  it('rejects PDFs whose byte size exceeds the configured limit', async () => {
    const pdfBytes = new Uint8Array(64);

    await expect(extractBankPdfText(pdfBytes, { sizeLimitBytes: 32 })).rejects.toMatchObject({
      code: 'pdf_size_exceeded',
      message: 'PDF imports cannot exceed 32 bytes before extraction.',
    } satisfies Partial<BankPdfTextExtractionError>);
  });
});
