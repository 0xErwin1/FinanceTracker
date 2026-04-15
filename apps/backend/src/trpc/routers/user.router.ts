import { publicProcedure } from '@expenses/api';
import { z } from 'zod';
import { userService } from '../../services';
import { mapServiceError } from '../errors';
import { isAuthenticated } from '../protected';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const registerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: passwordSchema,
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

/** Strip password hash from the user entity before returning via API. */
function stripPassword(user: { password: string; [k: string]: any }) {
  const { password: _, ...safe } = user;
  return safe;
}

export const userRouter = {
  register: publicProcedure.input(registerSchema).mutation(async ({ input }) => {
    try {
      const user = await userService.createUser(input);
      return stripPassword(user);
    } catch (error) {
      mapServiceError(error);
    }
  }),

  me: publicProcedure.use(isAuthenticated).query(async ({ ctx }) => {
    try {
      const user = await userService.getUser({ id: ctx.userId });

      if (!user) {
        throw new Error('User not found');
      }

      return stripPassword(user);
    } catch (error) {
      mapServiceError(error);
    }
  }),

  updateProfile: publicProcedure.use(isAuthenticated).input(updateProfileSchema).mutation(async ({ input, ctx }) => {
    try {
      const user = await userService.updateProfile(ctx.userId, input);
      return stripPassword(user);
    } catch (error) {
      mapServiceError(error);
    }
  }),

  changePassword: publicProcedure.use(isAuthenticated).input(changePasswordSchema).mutation(async ({ input, ctx }) => {
    try {
      await userService.changePassword(ctx.userId, input.currentPassword, input.newPassword);
      return { success: true };
    } catch (error) {
      mapServiceError(error);
    }
  }),
};
