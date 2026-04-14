import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse } from 'csv-parse/sync';
import { logger } from '../lib';

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
