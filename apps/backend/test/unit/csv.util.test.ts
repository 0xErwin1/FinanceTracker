import { CSVParserError, parseCSVText } from '../../src/utils/csv.util';

describe('parseCSVText', () => {
  it('detects comma-delimited files with explicit headers', () => {
    const result = parseCSVText('Date,Amount,Description\n2026-05-01,-14.50,Coffee');

    expect(result).toEqual({
      delimiter: ',',
      hasHeader: true,
      headers: ['Date', 'Amount', 'Description'],
      rows: [
        {
          Date: '2026-05-01',
          Amount: '-14.50',
          Description: 'Coffee',
        },
      ],
      rowCount: 1,
    });
  });

  it('detects semicolon-delimited files and trims surrounding blank lines', () => {
    const result = parseCSVText('\nDate;Amount;Description\n2026-05-01;-14.50;Coffee\n');

    expect(result.delimiter).toBe(';');
    expect(result.headers).toEqual(['Date', 'Amount', 'Description']);
    expect(result.rows[0]).toEqual({
      Date: '2026-05-01',
      Amount: '-14.50',
      Description: 'Coffee',
    });
  });

  it('synthesizes headers when the file starts directly with data rows', () => {
    const result = parseCSVText('2026-05-01,-14.50,Coffee\n2026-05-02,-20.00,Groceries');

    expect(result.hasHeader).toBe(false);
    expect(result.headers).toEqual(['column_1', 'column_2', 'column_3']);
    expect(result.rows[1]).toEqual({
      column_1: '2026-05-02',
      column_2: '-20.00',
      column_3: 'Groceries',
    });
  });

  it('rejects payloads that exceed the configured row limit', () => {
    expect(() =>
      parseCSVText('Date,Amount\n2026-05-01,-14.50\n2026-05-02,-20.00', {
        rowLimit: 1,
      }),
    ).toThrow(CSVParserError);

    expect(() =>
      parseCSVText('Date,Amount\n2026-05-01,-14.50\n2026-05-02,-20.00', {
        rowLimit: 1,
      }),
    ).toThrow('row limit');
  });

  it('wraps malformed csv content in parser-specific errors', () => {
    expect(() => parseCSVText('Date,Amount\n"unterminated,-14.50')).toThrow(CSVParserError);
  });

  it('rejects blank CSV sources before parsing begins', () => {
    expect(() => parseCSVText('   ')).toThrow('empty');
  });
});
