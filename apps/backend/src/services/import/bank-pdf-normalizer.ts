import type { ParsedCSVTextResult } from '../../utils/csv.util';

const CANONICAL_HEADERS = ['Date', 'Description', 'Amount'] as const;
const SUPPORTED_HEADER_SIGNATURE = ['date', 'description', 'amount'] as const;
const ROW_DELIMITER_PATTERN = /\s{2,}/u;
const DATE_TOKEN_PATTERN = /^(?:\d{2}[/-]\d{2}[/-]\d{4}|\d{4}[/-]\d{2}[/-]\d{2})$/u;

export class BankPdfNormalizationError extends Error {
  readonly code = 'pdf_unsupported_layout';

  constructor(message = 'The uploaded PDF statement layout is not supported for preview import.') {
    super(message);
    this.name = 'BankPdfNormalizationError';
  }
}

export function normalizeBankPdfText(sourceText: string): ParsedCSVTextResult {
  const lines = sourceText
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const headerIndex = lines.findIndex((line) => isSupportedHeader(splitColumns(line)));

  if (headerIndex === -1) {
    throw new BankPdfNormalizationError();
  }

  const rowLines = lines.slice(headerIndex + 1);

  if (rowLines.length === 0) {
    throw new BankPdfNormalizationError();
  }

  const rows = rowLines.map((line) => normalizeStatementRow(line));

  return {
    delimiter: ',',
    hasHeader: true,
    headers: [...CANONICAL_HEADERS],
    rowCount: rows.length,
    rows,
  };
}

function splitColumns(line: string): string[] {
  return line.split(ROW_DELIMITER_PATTERN).map((column) => column.trim());
}

function isSupportedHeader(columns: string[]): boolean {
  if (columns.length !== SUPPORTED_HEADER_SIGNATURE.length) {
    return false;
  }

  return columns.every((column, index) => normalizeHeaderToken(column) === SUPPORTED_HEADER_SIGNATURE[index]);
}

function normalizeHeaderToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/gu, '');
}

function normalizeStatementRow(line: string): Record<(typeof CANONICAL_HEADERS)[number], string> {
  const columns = splitColumns(line);

  if (columns.length !== CANONICAL_HEADERS.length) {
    throw new BankPdfNormalizationError();
  }

  const [date, description, amount] = columns;

  if (!DATE_TOKEN_PATTERN.test(date) || description.length === 0 || amount.length === 0) {
    throw new BankPdfNormalizationError();
  }

  return {
    Amount: amount,
    Date: date,
    Description: description,
  };
}
