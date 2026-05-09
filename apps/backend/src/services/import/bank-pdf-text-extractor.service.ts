import { dirname, join, sep } from 'node:path';
import type { PDFPageProxy, TextItem } from 'pdfjs-dist/types/src/display/api';

const DEFAULT_PDF_PAGE_LIMIT = 20;
const DEFAULT_PDF_SIZE_LIMIT_BYTES = 8 * 1024 * 1024;
const DEFAULT_PDF_TEXT_LENGTH_LIMIT = 100_000;
const LINE_Y_TOLERANCE = 2;

export interface ExtractBankPdfTextOptions {
  pageLimit?: number;
  sizeLimitBytes?: number;
  textLengthLimit?: number;
}

export interface ExtractedBankPdfText {
  pageCount: number;
  text: string;
}

interface PositionedTextItem {
  str: string;
  x: number;
  y: number;
}

interface TextLineBucket {
  items: PositionedTextItem[];
  y: number;
}

export class BankPdfTextExtractionError extends Error {
  readonly code: 'pdf_no_text' | 'pdf_size_exceeded';

  constructor(code: 'pdf_no_text' | 'pdf_size_exceeded', message: string) {
    super(message);
    this.name = 'BankPdfTextExtractionError';
    this.code = code;
  }
}

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

let pdfJsModule: PdfJsModule | null = null;

function loadPdfJsModule() {
  pdfJsModule ??= require('pdfjs-dist/legacy/build/pdf.mjs') as PdfJsModule;

  return pdfJsModule;
}

function getStandardFontDataUrl(): string {
  return `${join(dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts')}${sep}`;
}

export async function extractBankPdfText(
  pdfBytes: Uint8Array,
  options: ExtractBankPdfTextOptions = {},
): Promise<ExtractedBankPdfText> {
  const pageLimit = options.pageLimit ?? DEFAULT_PDF_PAGE_LIMIT;
  const sizeLimitBytes = options.sizeLimitBytes ?? DEFAULT_PDF_SIZE_LIMIT_BYTES;
  const textLengthLimit = options.textLengthLimit ?? DEFAULT_PDF_TEXT_LENGTH_LIMIT;

  if (pdfBytes.byteLength > sizeLimitBytes) {
    throw new BankPdfTextExtractionError(
      'pdf_size_exceeded',
      `PDF imports cannot exceed ${sizeLimitBytes} bytes before extraction.`,
    );
  }

  const { getDocument } = loadPdfJsModule();
  const loadingTask = getDocument({
    data: pdfBytes,
    standardFontDataUrl: getStandardFontDataUrl(),
    useWorkerFetch: false,
  });

  try {
    const document = await loadingTask.promise;

    if (document.numPages > pageLimit) {
      throw new BankPdfTextExtractionError(
        'pdf_size_exceeded',
        `PDF imports cannot exceed ${pageLimit} page for preview extraction.`,
      );
    }

    const pages: string[] = [];
    let extractedLength = 0;

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);

      try {
        const pageLines = await extractPageLines(page);

        if (pageLines.length === 0) {
          continue;
        }

        const pageText = pageLines.join('\n');
        extractedLength += pageText.length;

        if (extractedLength > textLengthLimit) {
          throw new BankPdfTextExtractionError(
            'pdf_size_exceeded',
            `PDF imports cannot exceed ${textLengthLimit} extracted characters for preview extraction.`,
          );
        }

        pages.push(pageText);
      } finally {
        page.cleanup();
      }
    }

    const text = pages.join('\n\n').trim();

    if (text.length === 0) {
      throw new BankPdfTextExtractionError(
        'pdf_no_text',
        'The uploaded PDF does not contain selectable text. Scanned PDFs and OCR are not supported.',
      );
    }

    return {
      pageCount: document.numPages,
      text,
    };
  } finally {
    await loadingTask.destroy();
  }
}

async function extractPageLines(page: PDFPageProxy): Promise<string[]> {
  const textContent = await page.getTextContent();
  const positionedItems: PositionedTextItem[] = [];

  for (const item of textContent.items) {
    if (!('str' in item) || !Array.isArray(item.transform)) {
      continue;
    }

    const textItem = item as TextItem;
    const str = normalizePdfTextChunk(textItem.str);

    if (str.length === 0) {
      continue;
    }

    positionedItems.push({
      str,
      x: textItem.transform[4] ?? 0,
      y: textItem.transform[5] ?? 0,
    });
  }

  return buildLinesFromTextItems(positionedItems);
}

function buildLinesFromTextItems(items: PositionedTextItem[]): string[] {
  const buckets: TextLineBucket[] = [];

  const sortedItems = [...items].sort((left, right) => {
    if (Math.abs(left.y - right.y) <= LINE_Y_TOLERANCE) {
      return left.x - right.x;
    }

    return right.y - left.y;
  });

  for (const item of sortedItems) {
    const bucket = buckets.find((candidate) => Math.abs(candidate.y - item.y) <= LINE_Y_TOLERANCE);

    if (bucket) {
      bucket.items.push(item);
      continue;
    }

    buckets.push({
      items: [item],
      y: item.y,
    });
  }

  return buckets
    .sort((left, right) => right.y - left.y)
    .map((bucket) =>
      bucket.items
        .sort((left, right) => left.x - right.x)
        .map((item) => item.str)
        .join('  ')
        .trim(),
    )
    .filter((line) => line.length > 0);
}

function normalizePdfTextChunk(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}
