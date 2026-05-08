import type { TransactionImportCommitRequestDTO, TransactionImportPreviewRequestDTO } from '@expenses/api';
import { TRPCError } from '@trpc/server';
import { Between } from 'typeorm';
import { transactionImportService, transactionService } from '../services';
import { mapServiceError } from '../trpc/errors';

export const transactionController = {
  async create(
    input: { mode: 'single'; transaction: any } | { mode: 'batch'; transactions: any[] },
    userId: string,
  ) {
    try {
      if (input.mode === 'single') {
        return await transactionService.createTransaction({
          ...input.transaction,
          userId,
        });
      }

      return await transactionService.createTransactionByArray(
        input.transactions.map((tx) => ({
          ...tx,
          userId,
        })),
      );
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getById(input: { id: string }, userId: string) {
    try {
      const transaction = await transactionService.getTransaction(
        {
          id: input.id,
          userId,
        },
        ['category', 'account', 'counterpartyAccount'],
      );

      if (!transaction) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Transaction not found' });
      }

      return transaction;
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getAll(
    input: { type?: any; dateFrom?: string; dateTo?: string; accountId?: string },
    userId: string,
  ) {
    try {
      const where: Record<string, any> = { userId };
      if (input.type) where.type = input.type;
      if (input.accountId) where.accountId = input.accountId;
      if (input.dateFrom || input.dateTo) {
        where.date = Between(input.dateFrom ?? '1970-01-01', input.dateTo ?? '2999-12-31');
      }

      return await transactionService.getAllTransactions(where, [
        'category',
        'account',
        'counterpartyAccount',
      ]);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getBalance(input: { dateFrom?: string; dateTo?: string }, userId: string) {
    try {
      return await transactionService.getBalance(userId, input.dateFrom, input.dateTo);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async update(
    input: {
      id: string;
      type?: any;
      amount?: number;
      currency?: any;
      categoryId?: string | null;
      accountId?: string | null;
      date?: string;
      note?: string | null;
      exchangeRate?: number | null;
    },
    userId: string,
  ) {
    try {
      const { id, ...data } = input;
      return await transactionService.updateTransaction(data, { id, userId });
    } catch (error) {
      mapServiceError(error);
    }
  },

  async delete(input: { id: string }, userId: string) {
    try {
      await transactionService.deleteTransaction(input.id, userId);
      return { success: true };
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getMonthsAndYears(userId: string) {
    try {
      return await transactionService.getMonthsAndYears(userId);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getTotalSavings(userId: string) {
    try {
      const totalSavings = await transactionService.getTotalSavings(userId);
      return { totalSavings };
    } catch (error) {
      mapServiceError(error);
    }
  },

  async setGoal(input: { id: string; goalId: string }, userId: string) {
    try {
      await transactionService.setGoalIdInTransaction(input.id, input.goalId, userId);
      return { success: true };
    } catch (error) {
      mapServiceError(error);
    }
  },

  async createTransfer(
    input: {
      sourceAccountId: string;
      destinationAccountId: string;
      amount: number;
      currency: any;
      date: string;
      note?: string;
    },
    userId: string,
  ) {
    try {
      return await transactionService.createTransfer({ ...input, userId });
    } catch (error) {
      mapServiceError(error);
    }
  },

  async importPreview(input: TransactionImportPreviewRequestDTO, userId: string) {
    try {
      return await transactionImportService.importPreview(input, userId);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async importCommit(input: TransactionImportCommitRequestDTO, userId: string) {
    try {
      return await transactionImportService.importCommit(input, userId);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async updateTransfer(
    input: {
      transactionId: string;
      sourceAccountId: string;
      destinationAccountId: string;
      amount: number;
      currency: any;
      date: string;
      note?: string;
    },
    userId: string,
  ) {
    try {
      return await transactionService.updateTransfer({ ...input, userId });
    } catch (error) {
      mapServiceError(error);
    }
  },
};
