import { publicProcedure } from '@expenses/api';
import { z } from 'zod';
import { userService } from '../../services';
import { mapServiceError } from '../errors';
import { isAuthenticated } from '../protected';

const registerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(1),
});

export const userRouter = {
  register: publicProcedure.input(registerSchema).mutation(async ({ input }) => {
    try {
      const { password: _, ...user } = await userService.createUser(input);
      return user;
    } catch (error) {
      mapServiceError(error);
    }
  }),

  me: publicProcedure.use(isAuthenticated).query(async ({ ctx }) => {
    try {
      const user = await userService.getUser({ id: ctx.userId });
      return user;
    } catch (error) {
      mapServiceError(error);
    }
  }),
};
