import { StatusCodes } from 'http-status-codes';
import 'jest';
import supertest from 'supertest';
import { App } from '../../../../src/app';
import { ApiError, CurrencyEnum, MonthEnum, TransactionType } from '../../../../src/enums';
import { redisClient } from '../../../../src/redis';
import { CategoryHelper, TransactionHelper, UserHelper, databaseHelper } from '../../../helpers';

describe('/api/transactions (batch)', () => {
  const app: App = new App();
  const request = supertest(app.server);
  const userHelper: UserHelper = new UserHelper(request);
  const categoryHelper: CategoryHelper = new CategoryHelper(request, userHelper.cookieMock);
  const transactionHelper: TransactionHelper = new TransactionHelper(request, userHelper.cookieMock);

  beforeAll(async () => {
    await app.connectToDatabase();
    await databaseHelper.destoryDatabase();
    await userHelper.createUserFromCSV();
    await categoryHelper.createUserFromCSV(userHelper.userIdMock);
    await redisClient.set(`user:${userHelper.sessionIdMock}`, userHelper.userIdMock);
  });

  function buildBatchBody(overrides: Record<string, unknown>[] = [{}]): {
    transactions: Record<string, unknown>[];
  } {
    const defaults = {
      type: TransactionType.EXPENSE,
      amount: 100,
      currency: CurrencyEnum.UYU,
      month: MonthEnum.JANUARY,
      day: 15,
      year: 2024,
      categoryId: categoryHelper.categoryIdByType.get(TransactionType.EXPENSE),
    };

    return {
      transactions: overrides.map((override) => ({ ...defaults, ...override })),
    };
  }

  describe('SC-V1: Valid batch transaction passes validation', () => {
    it('should return 200 when all transactions in the batch are valid', async () => {
      const response = await transactionHelper.createTransaction(buildBatchBody() as any, {
        notIncludeToken: false,
      });

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.result).toBeTruthy();
    });

    it('should return 200 when multiple valid transactions are in the batch', async () => {
      const response = await transactionHelper.createTransaction(
        buildBatchBody([
          { type: TransactionType.EXPENSE, amount: 100 },
          {
            type: TransactionType.INCOME,
            amount: 200,
            categoryId: categoryHelper.categoryIdByType.get(TransactionType.INCOME),
          },
        ]) as any,
        { notIncludeToken: false },
      );

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.result).toBeTruthy();
    });
  });

  describe('SC-V2: Invalid batch transaction returns structured errors', () => {
    it('should return 422 when a transaction has an invalid type', async () => {
      const response = await transactionHelper.createTransaction(
        buildBatchBody([{ type: 'INVALID_TYPE' }]) as any,
        { notIncludeToken: false },
      );

      expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(response.body.result).toBeFalsy();
      expect(response.body.errorCode).toBe(ApiError.Server.PARAMS_REQUIRED);
      expect(response.body.data).toBeDefined();
      const paths = response.body.data.map((e: any) => e.path);
      expect(paths.some((p: string) => p.includes('type'))).toBeTruthy();
    });

    it('should return 422 when a transaction has a non-numeric amount', async () => {
      const response = await transactionHelper.createTransaction(
        buildBatchBody([{ amount: 'not-a-number' }]) as any,
        { notIncludeToken: false },
      );

      expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(response.body.result).toBeFalsy();
      expect(response.body.errorCode).toBe(ApiError.Server.PARAMS_REQUIRED);
      expect(response.body.data).toBeDefined();
      const paths = response.body.data.map((e: any) => e.path);
      expect(paths.some((p: string) => p.includes('amount'))).toBeTruthy();
    });

    it('should return 422 when a transaction has an invalid currency', async () => {
      const response = await transactionHelper.createTransaction(
        buildBatchBody([{ currency: 'BITCOIN' }]) as any,
        { notIncludeToken: false },
      );

      expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(response.body.result).toBeFalsy();
      expect(response.body.errorCode).toBe(ApiError.Server.PARAMS_REQUIRED);
      expect(response.body.data).toBeDefined();
      const paths = response.body.data.map((e: any) => e.path);
      expect(paths.some((p: string) => p.includes('currency'))).toBeTruthy();
    });

    it('should return 422 when USD transaction has no exchangeRate', async () => {
      const response = await transactionHelper.createTransaction(
        buildBatchBody([{ currency: CurrencyEnum.USD }]) as any,
        { notIncludeToken: false },
      );

      expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(response.body.result).toBeFalsy();
      expect(response.body.errorCode).toBe(ApiError.Server.PARAMS_REQUIRED);
      expect(response.body.data).toBeDefined();
      const paths = response.body.data.map((e: any) => e.path);
      expect(paths.some((p: string) => p.includes('exchangeRate'))).toBeTruthy();
    });

    it('should return 422 when EUR transaction has no exchangeRate', async () => {
      const response = await transactionHelper.createTransaction(
        buildBatchBody([{ currency: CurrencyEnum.EUR }]) as any,
        { notIncludeToken: false },
      );

      expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(response.body.result).toBeFalsy();
      expect(response.body.errorCode).toBe(ApiError.Server.PARAMS_REQUIRED);
      expect(response.body.data).toBeDefined();
      const paths = response.body.data.map((e: any) => e.path);
      expect(paths.some((p: string) => p.includes('exchangeRate'))).toBeTruthy();
    });

    it('should return 422 when a transaction has an invalid month', async () => {
      const response = await transactionHelper.createTransaction(
        buildBatchBody([{ month: 'NOTAMONTH' }]) as any,
        { notIncludeToken: false },
      );

      expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(response.body.result).toBeFalsy();
      expect(response.body.errorCode).toBe(ApiError.Server.PARAMS_REQUIRED);
      expect(response.body.data).toBeDefined();
      const paths = response.body.data.map((e: any) => e.path);
      expect(paths.some((p: string) => p.includes('month'))).toBeTruthy();
    });

    it('should return 422 when a transaction has an invalid day (out of range)', async () => {
      const response = await transactionHelper.createTransaction(buildBatchBody([{ day: 32 }]) as any, {
        notIncludeToken: false,
      });

      expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(response.body.result).toBeFalsy();
      expect(response.body.errorCode).toBe(ApiError.Server.PARAMS_REQUIRED);
      expect(response.body.data).toBeDefined();
      const paths = response.body.data.map((e: any) => e.path);
      expect(paths.some((p: string) => p.includes('day'))).toBeTruthy();
    });

    it('should return 422 when a transaction has year < 2000', async () => {
      const response = await transactionHelper.createTransaction(buildBatchBody([{ year: 1999 }]) as any, {
        notIncludeToken: false,
      });

      expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(response.body.result).toBeFalsy();
      expect(response.body.errorCode).toBe(ApiError.Server.PARAMS_REQUIRED);
      expect(response.body.data).toBeDefined();
      const paths = response.body.data.map((e: any) => e.path);
      expect(paths.some((p: string) => p.includes('year'))).toBeTruthy();
    });

    it('should return 422 when multiple transactions have different errors', async () => {
      const response = await transactionHelper.createTransaction(
        buildBatchBody([{ type: 'INVALID' }, { amount: 'not-a-number' }]) as any,
        { notIncludeToken: false },
      );

      expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(response.body.result).toBeFalsy();
      expect(response.body.errorCode).toBe(ApiError.Server.PARAMS_REQUIRED);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBeTruthy();
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      const paths = response.body.data.map((e: any) => e.path);
      expect(paths.some((p: string) => p.includes('type'))).toBeTruthy();
      expect(paths.some((p: string) => p.includes('amount'))).toBeTruthy();
    });
  });

  describe('SC-V3: Edge cases', () => {
    it('should return 422 when transactions is an empty array', async () => {
      const response = await transactionHelper.createTransaction({ transactions: [] } as any, {
        notIncludeToken: false,
      });

      expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(response.body.result).toBeFalsy();
      expect(response.body.errorCode).toBe(ApiError.Server.PARAMS_REQUIRED);
    });

    it('should return 422 when a transaction is missing the month field', async () => {
      const body = buildBatchBody();
      (body.transactions[0] as any).month = undefined;

      const response = await transactionHelper.createTransaction(body as any, { notIncludeToken: false });

      expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(response.body.result).toBeFalsy();
      expect(response.body.errorCode).toBe(ApiError.Server.PARAMS_REQUIRED);
      expect(response.body.data).toBeDefined();
      const paths = response.body.data.map((e: any) => e.path);
      expect(paths.some((p: string) => p.includes('month'))).toBeTruthy();
    });

    it('should return 422 when a transaction is missing the amount field', async () => {
      const body = buildBatchBody();
      (body.transactions[0] as any).amount = undefined;

      const response = await transactionHelper.createTransaction(body as any, { notIncludeToken: false });

      expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(response.body.result).toBeFalsy();
      expect(response.body.errorCode).toBe(ApiError.Server.PARAMS_REQUIRED);
      expect(response.body.data).toBeDefined();
      const paths = response.body.data.map((e: any) => e.path);
      expect(paths.some((p: string) => p.includes('amount'))).toBeTruthy();
    });
  });
});
