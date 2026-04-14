import { z } from 'zod';
import { publicProcedure } from '@expenses/api';
import { isAuthenticated } from '../protected';
import { userService } from '../../services';
import { mapServiceError } from '../errors';

const registerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(1),
});

export const userRouter = {
  register: publicProcedure.input(registerSchema).mutation(async ({ input }) => {
    try {
      const user = await userService.createUser(input);
      return user;
    } catch (error) {
      mapServiceError(error);
    }
  }),

  me: publicProcedure.use(isAuthenticated).query(async ({ ctx }) => {
    try {
      const user = await userService.getUser({ userId: ctx.userId });
      return user;
    } catch (error) {
      mapServiceError(error);
    }
  }),
};
