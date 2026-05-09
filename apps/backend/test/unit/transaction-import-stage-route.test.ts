jest.mock('@trpc/server/adapters/express', () => ({
  createExpressMiddleware: jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}));

jest.mock('../../src/trpc', () => ({
  appRouter: {},
  createContext: jest.fn(),
}));

jest.mock('../../src/services', () => ({
  middlewareService: {
    authorization: jest.fn(
      (
        req: { headers?: Record<string, string> },
        res: { locals: Record<string, string> },
        next: () => void,
      ) => {
        if (req.headers?.authorization === 'Bearer test-user') {
          res.locals.userId = 'user-1';
        }

        next();
      },
    ),
  },
}));

jest.mock('../../src/controllers', () => ({
  transactionController: {
    stageImport: jest.fn(),
  },
}));

jest.mock('../../src/lib', () => ({
  logger: {
    error: jest.fn(),
  },
}));

import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { App } from '../../src/app';
import { transactionController } from '../../src/controllers';
import { logger } from '../../src/lib';

const mockedController = jest.mocked(transactionController);
const mockedLogger = jest.mocked(logger);

async function startTestServer(): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const app = new App();
  const server = createServer(app.server);

  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });

  const address = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
  };
}

describe('POST /api/transactions/import/stage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedController.stageImport.mockResolvedValue({
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

  it('requires authentication before staging uploads', async () => {
    const server = await startTestServer();

    try {
      const response = await fetch(`${server.baseUrl}/api/transactions/import/stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/csv',
          'X-Import-Filename': 'statement.csv',
        },
        body: 'Date,Description,Amount\n2026-05-08,Coffee,-12.50',
      });

      expect(response.status).toBe(401);
      expect(mockedController.stageImport).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it('passes the raw authenticated upload through to the controller without JSON inflation', async () => {
    const server = await startTestServer();

    try {
      const response = await fetch(`${server.baseUrl}/api/transactions/import/stage`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-user',
          'Content-Type': 'text/csv; charset=utf-8',
          'X-Import-Filename': 'statement.csv',
        },
        body: 'Date,Description,Amount\n2026-05-08,Coffee,-12.50',
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        importSessionId: 'session-1',
        sourceFormat: 'csv',
        sourceFilename: 'statement.csv',
        byteSize: 49,
        delimiter: ',',
        hasHeader: true,
        headers: ['Date', 'Description', 'Amount'],
        parserIssues: [],
      });

      expect(mockedController.stageImport).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'text/csv; charset=utf-8',
          payload: Buffer.from('Date,Description,Amount\n2026-05-08,Coffee,-12.50', 'utf8'),
          sourceFilename: 'statement.csv',
        }),
        'user-1',
      );
    } finally {
      await server.close();
    }
  });

  it('rejects uploads above the raw body limit for both CSV and PDF requests', async () => {
    const oversizedBody = 'x'.repeat(8 * 1024 * 1024 + 1);
    const server = await startTestServer();

    try {
      const csvResponse = await fetch(`${server.baseUrl}/api/transactions/import/stage`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-user',
          'Content-Type': 'text/csv',
          'X-Import-Filename': 'statement.csv',
        },
        body: oversizedBody,
      });

      const pdfResponse = await fetch(`${server.baseUrl}/api/transactions/import/stage`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-user',
          'Content-Type': 'application/pdf',
          'X-Import-Filename': 'statement.pdf',
        },
        body: oversizedBody,
      });

      expect(csvResponse.status).toBe(413);
      expect(pdfResponse.status).toBe(413);
      expect(mockedController.stageImport).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  }, 15000);

  it('does not echo raw request payloads when the controller fails unexpectedly', async () => {
    const payloadSnippet = 'sensitive,csv,payload';
    mockedController.stageImport.mockRejectedValue(new Error('stage_failed'));

    const server = await startTestServer();

    try {
      const response = await fetch(`${server.baseUrl}/api/transactions/import/stage`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-user',
          'Content-Type': 'text/csv',
          'X-Import-Filename': 'statement.csv',
        },
        body: payloadSnippet,
      });

      expect(response.status).toBe(500);
      expect(JSON.stringify(mockedLogger.error.mock.calls)).not.toContain(payloadSnippet);
    } finally {
      await server.close();
    }
  });
});
