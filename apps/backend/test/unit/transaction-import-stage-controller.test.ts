jest.mock('../../src/services', () => ({
  transactionImportService: {
    importCommit: jest.fn(),
    importPreview: jest.fn(),
  },
  transactionImportStagingService: {
    stageImport: jest.fn(),
  },
  transactionService: {
    createTransaction: jest.fn(),
    createTransactionByArray: jest.fn(),
  },
}));

jest.mock('../../src/trpc/errors', () => ({
  mapServiceError: jest.fn((error: unknown) => {
    throw error;
  }),
}));

import { transactionController } from '../../src/controllers';
import {
  transactionImportService,
  transactionImportStagingService,
  transactionService,
} from '../../src/services';

const mockedTransactionImportService = jest.mocked(transactionImportService);
const mockedTransactionImportStagingService = jest.mocked(transactionImportStagingService);
const mockedTransactionService = jest.mocked(transactionService);

describe('transactionController.stageImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedTransactionImportStagingService.stageImport.mockResolvedValue({
      importSessionId: 'session-1',
      sourceFormat: 'csv',
      sourceFilename: 'statement.csv',
      byteSize: 49,
      delimiter: ',',
      hasHeader: true,
      headers: ['Date', 'Description', 'Amount'],
      parserIssues: [],
    });
  });

  it('delegates stage uploads to the staging service with the authenticated user id', async () => {
    await expect(
      transactionController.stageImport(
        {
          contentType: 'text/csv',
          payload: Buffer.from('Date,Description,Amount\n2026-05-08,Coffee,-12.50', 'utf8'),
          sourceFilename: 'statement.csv',
          userId: 'request-user',
        },
        'authenticated-user',
      ),
    ).resolves.toEqual({
      importSessionId: 'session-1',
      sourceFormat: 'csv',
      sourceFilename: 'statement.csv',
      byteSize: 49,
      delimiter: ',',
      hasHeader: true,
      headers: ['Date', 'Description', 'Amount'],
      parserIssues: [],
    });

    expect(mockedTransactionImportStagingService.stageImport).toHaveBeenCalledWith({
      contentType: 'text/csv',
      payload: Buffer.from('Date,Description,Amount\n2026-05-08,Coffee,-12.50', 'utf8'),
      sourceFilename: 'statement.csv',
      userId: 'authenticated-user',
    });
  });

  it('does not touch preview, commit, or transaction-write services during upload staging', async () => {
    await transactionController.stageImport(
      {
        contentType: 'application/pdf',
        payload: Buffer.from('%PDF-1.7', 'utf8'),
        sourceFilename: 'statement.pdf',
        userId: 'request-user',
      },
      'authenticated-user',
    );

    expect(mockedTransactionImportService.importPreview).not.toHaveBeenCalled();
    expect(mockedTransactionImportService.importCommit).not.toHaveBeenCalled();
    expect(mockedTransactionService.createTransaction).not.toHaveBeenCalled();
    expect(mockedTransactionService.createTransactionByArray).not.toHaveBeenCalled();
  });
});
