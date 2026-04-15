import { publicProcedure } from '@expenses/api';
import { z } from 'zod';
import { userController } from '../../controllers';
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

export const userRouter = {
  register: publicProcedure.input(registerSchema).mutation(({ input }) =>
    userController.register(input),
  ),

  me: publicProcedure.use(isAuthenticated).query(({ ctx }) =>
    userController.me(ctx.userId),
  ),

  updateProfile: publicProcedure.use(isAuthenticated).input(updateProfileSchema).mutation(({ input, ctx }) =>
    userController.updateProfile(ctx.userId, input),
  ),

  changePassword: publicProcedure.use(isAuthenticated).input(changePasswordSchema).mutation(({ input, ctx }) =>
    userController.changePassword(ctx.userId, input),
  ),
};
