import { publicProcedure } from '@expenses/api';
import { z } from 'zod';
import { authController } from '../../controllers';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = {
  login: publicProcedure.input(loginSchema).mutation(({ input, ctx }) =>
    authController.login(input.email, input.password, ctx.req.sessionID!),
  ),

  logout: publicProcedure.mutation(({ ctx }) =>
    authController.logout(ctx.req.sessionID!),
  ),
};
