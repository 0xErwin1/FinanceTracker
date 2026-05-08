import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse } from 'csv-parse/sync';
import { logger } from '../lib';

const DEFAULT_CSV_ROW_LIMIT = 500;
const DELIMITER_CANDIDATES = [',', ';', '\t', '|'] as const;

export interface ParseCSVTextOptions {
  rowLimit?: number;
}

export interface ParsedCSVTextResult {
  delimiter: string;
  hasHeader: boolean;
  headers: string[];
  rows: Array<Record<string, string>>;
  rowCount: number;
}

export class CSVParserError extends Error {
  public readonly code: 'EMPTY_SOURCE' | 'INVALID_CSV' | 'ROW_LIMIT_EXCEEDED';

  constructor(code: 'EMPTY_SOURCE' | 'INVALID_CSV' | 'ROW_LIMIT_EXCEEDED', message: string, cause?: unknown) {
    super(message, cause ? { cause } : undefined);
    this.name = 'CSVParserError';
    this.code = code;
  }
}

export function parseCSVText(source: string, options: ParseCSVTextOptions = {}): ParsedCSVTextResult {
  const trimmedSource = source.trim();

  if (!trimmedSource) {
    throw new CSVParserError('EMPTY_SOURCE', 'CSV source is empty.');
  }

  const delimiter = detectDelimiter(trimmedSource);
  const matrix = parseCSVMatrix(trimmedSource, delimiter);
  const firstRow = matrix[0] ?? [];

  if (matrix.length === 0 || firstRow.length === 0) {
    throw new CSVParserError('EMPTY_SOURCE', 'CSV source is empty.');
  }

  const hasHeader = looksLikeHeader(firstRow);
  const headers = hasHeader ? normalizeHeaders(firstRow) : buildSyntheticHeaders(firstRow.length);
  const dataRows = hasHeader ? matrix.slice(1) : matrix;
  const rowLimit = options.rowLimit ?? DEFAULT_CSV_ROW_LIMIT;

  if (dataRows.length > rowLimit) {
    throw new CSVParserError(
      'ROW_LIMIT_EXCEEDED',
      `CSV row limit exceeded. Maximum supported rows: ${rowLimit}.`,
    );
  }

  const rows = dataRows.map((row) => toRowRecord(headers, row));

  return {
    delimiter,
    hasHeader,
    headers,
    rows,
    rowCount: rows.length,
  };
}

export async function parseCSV<T extends object>(filePath: string): Promise<T[]> {
  try {
    const csvFile = await fs.promises.readFile(path.join(__dirname, filePath), 'utf8');

    const data: T[] = parse(csvFile, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ',',
      trim: true,
    });

    return data;
  } catch (err) {
    logger.error({ err });

    throw err;
  }
}

function detectDelimiter(source: string): string {
  const firstLine = source.split(/\r?\n/u).find((line) => line.trim().length > 0) ?? source;

  const rankedCandidates = DELIMITER_CANDIDATES.map((candidate) => ({
    candidate,
    count: countDelimiterOccurrences(firstLine, candidate),
  })).sort((left, right) => right.count - left.count);

  return rankedCandidates[0]?.count ? rankedCandidates[0].candidate : ',';
}

function countDelimiterOccurrences(line: string, delimiter: string): number {
  return line.split(delimiter).length - 1;
}

function parseCSVMatrix(source: string, delimiter: string): string[][] {
  try {
    return parse(source, {
      bom: true,
      columns: false,
      delimiter,
      skip_empty_lines: true,
      trim: true,
    }) as string[][];
  } catch (err) {
    throw new CSVParserError('INVALID_CSV', 'CSV source could not be parsed.', err);
  }
}

function looksLikeHeader(row: string[]): boolean {
  if (row.length === 0) {
    return false;
  }

  const normalizedCells = row.map((cell) => cell.trim());

  if (normalizedCells.some((cell) => cell.length === 0)) {
    return false;
  }

  if (new Set(normalizedCells.map((cell) => cell.toLowerCase())).size !== normalizedCells.length) {
    return false;
  }

  return normalizedCells.every((cell) => /[a-z]/iu.test(cell) && !isNumericLike(cell) && !isDateLike(cell));
}

function isNumericLike(value: string): boolean {
  return /^[-+]?\d+(?:[.,]\d+)?$/u.test(value);
}

function isDateLike(value: string): boolean {
  return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/u.test(value) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/u.test(value);
}

function normalizeHeaders(row: string[]): string[] {
  return row.map((cell, index) => {
    const value = cell.trim();

    return value.length > 0 ? value : `column_${index + 1}`;
  });
}

function buildSyntheticHeaders(columnCount: number): string[] {
  return Array.from({ length: columnCount }, (_, index) => `column_${index + 1}`);
}

function toRowRecord(headers: string[], row: string[]): Record<string, string> {
  return headers.reduce<Record<string, string>>((record, header, index) => {
    record[header] = row[index] ?? '';

    return record;
  }, {});
}
