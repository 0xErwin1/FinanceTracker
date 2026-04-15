import { TRPCError } from '@trpc/server';
import { authService } from '../services';
import { mapServiceError } from '../trpc/errors';

export const authController = {
  async login(email: string, password: string, sessionId: string) {
    try {
      return await authService.login(email, password, sessionId);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async logout(sessionId: string) {
    try {
      await authService.logout(sessionId);
      return { success: true };
    } catch (error) {
      mapServiceError(error);
    }
  },
};
