import type { AccountOwnership, CurrencyEnum } from '@expenses/api';
import { accountService } from '../services';
import { mapServiceError } from '../trpc/errors';

export const accountController = {
  async createInstitution(input: { name: string; code?: string }, userId: string) {
    try {
      return await accountService.createInstitution({ ...input, userId });
    } catch (error) {
      mapServiceError(error);
    }
  },

  async updateInstitution(input: { id: string; name: string; code?: string }, userId: string) {
    try {
      return await accountService.updateInstitution({ ...input, userId });
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getInstitutions(userId: string) {
    try {
      return await accountService.getInstitutions(userId);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async deleteInstitution(input: { id: string }, userId: string) {
    try {
      return await accountService.deleteInstitution({ ...input, userId });
    } catch (error) {
      mapServiceError(error);
    }
  },

  async create(
    input: {
      name: string;
      currency: CurrencyEnum;
      institutionId?: string;
      kind: 'checking' | 'savings' | 'cash' | 'credit';
      ownership: AccountOwnership;
    },
    userId: string,
  ) {
    try {
      return await accountService.createAccount({ ...input, userId });
    } catch (error) {
      mapServiceError(error);
    }
  },

  async update(
    input: {
      id: string;
      name: string;
      institutionId?: string;
      kind: 'checking' | 'savings' | 'cash' | 'credit';
      ownership: AccountOwnership;
    },
    userId: string,
  ) {
    try {
      return await accountService.updateAccount({ ...input, userId });
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getAll(userId: string) {
    try {
      return await accountService.getAllAccounts(userId);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getActive(input: { currency?: CurrencyEnum }, userId: string) {
    try {
      return await accountService.getActiveAccounts(userId, input.currency);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async archive(input: { id: string }, userId: string) {
    try {
      return await accountService.archiveAccount(input.id, userId);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getDeletionState(input: { id: string }, userId: string) {
    try {
      return await accountService.getAccountDeletionState(input.id, userId);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async delete(input: { id: string }, userId: string) {
    try {
      return await accountService.deleteAccount(input.id, userId);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getSummaries(userId: string) {
    try {
      return await accountService.getAccountSummaries(userId);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getValuationSnapshot(userId: string) {
    try {
      return await accountService.getAccountValuationSnapshot(userId);
    } catch (error) {
      mapServiceError(error);
    }
  },
};
