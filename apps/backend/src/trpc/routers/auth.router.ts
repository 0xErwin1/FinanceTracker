import { publicProcedure } from '@expenses/api';
import { z } from 'zod';
import { authService } from '../../services';
import { mapServiceError } from '../errors';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = {
  login: publicProcedure.input(loginSchema).mutation(async ({ input, ctx }) => {
    try {
      const user = await authService.login(input.email, input.password, ctx.req.sessionID!);
      return user;
    } catch (error) {
      mapServiceError(error);
    }
  }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    try {
      await authService.logout(ctx.req.sessionID!);
      return { success: true };
    } catch (error) {
      mapServiceError(error);
    }
  }),
};
