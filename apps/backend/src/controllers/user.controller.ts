import type { CurrencyEnum } from '@expenses/api';
import { TRPCError } from '@trpc/server';
import { userService } from '../services';
import { mapServiceError } from '../trpc/errors';

function stripPassword(user: { password: string; [k: string]: any }) {
  const { password: _, ...safe } = user;
  return safe;
}

export const userController = {
  async register(input: { email: string; firstName: string; lastName: string; password: string }) {
    try {
      const user = await userService.createUser(input);
      return stripPassword(user);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async me(userId: string) {
    try {
      const user = await userService.getUser({ id: userId });

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      return stripPassword(user);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async updateProfile(userId: string, input: { firstName?: string; lastName?: string; email?: string }) {
    try {
      const user = await userService.updateProfile(userId, input);
      return stripPassword(user);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async changePassword(userId: string, input: { currentPassword: string; newPassword: string }) {
    try {
      await userService.changePassword(userId, input.currentPassword, input.newPassword);
      return { success: true };
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getValuationPreferences(userId: string) {
    try {
      return await userService.getValuationPreferences(userId);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async updateValuationPreferences(
    userId: string,
    input: { reportingCurrency: CurrencyEnum | null; valuationFreshnessDays: number },
  ) {
    try {
      return await userService.updateValuationPreferences(userId, input);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async listFxRates(userId: string) {
    try {
      return await userService.listFxRates(userId);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async createFxRate(
    userId: string,
    input: {
      baseCurrency: CurrencyEnum;
      quoteCurrency: CurrencyEnum;
      rate: number;
      effectiveDate: string;
      sourceLabel: string;
    },
  ) {
    try {
      return await userService.createFxRate({ ...input, userId });
    } catch (error) {
      mapServiceError(error);
    }
  },

  async updateFxRate(
    userId: string,
    input: { id: string; rate: number; effectiveDate: string; sourceLabel: string },
  ) {
    try {
      return await userService.updateFxRate({ ...input, userId });
    } catch (error) {
      mapServiceError(error);
    }
  },

  async deleteFxRate(userId: string, input: { id: string }) {
    try {
      return await userService.deleteFxRate(input.id, userId);
    } catch (error) {
      mapServiceError(error);
    }
  },
};
