import { publicProcedure } from '@expenses/api';
import { z } from 'zod';
import { accountController } from '../../controllers';
import { CurrencyEnum } from '../../enums';
import { isAuthenticated } from '../protected';

const createInstitutionSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).optional(),
});

const updateInstitutionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  code: z.string().optional(),
});

const accountKindSchema = z.enum(['checking', 'savings', 'cash', 'credit']);
const accountOwnershipSchema = z.enum(['self', 'third_party', 'custodial']);

const createAccountSchema = z.object({
  name: z.string().min(1),
  currency: z.nativeEnum(CurrencyEnum),
  kind: accountKindSchema,
  ownership: accountOwnershipSchema,
  institutionId: z.string().uuid().optional(),
});

const updateAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  kind: accountKindSchema,
  ownership: accountOwnershipSchema,
  institutionId: z.string().uuid().optional(),
});

const accountIdSchema = z.object({
  id: z.string().uuid(),
});

const activeAccountsSchema = z.object({
  currency: z.nativeEnum(CurrencyEnum).optional(),
});

export const accountRouter = {
  createInstitution: publicProcedure
    .use(isAuthenticated)
    .input(createInstitutionSchema)
    .mutation(({ input }) => accountController.createInstitution(input)),

  updateInstitution: publicProcedure
    .use(isAuthenticated)
    .input(updateInstitutionSchema)
    .mutation(({ input }) => accountController.updateInstitution(input)),

  getInstitutions: publicProcedure.use(isAuthenticated).query(() => accountController.getInstitutions()),

  deleteInstitution: publicProcedure
    .use(isAuthenticated)
    .input(accountIdSchema)
    .mutation(({ input }) => accountController.deleteInstitution(input)),

  create: publicProcedure
    .use(isAuthenticated)
    .input(createAccountSchema)
    .mutation(({ input, ctx }) => accountController.create(input, ctx.userId)),

  update: publicProcedure
    .use(isAuthenticated)
    .input(updateAccountSchema)
    .mutation(({ input, ctx }) => accountController.update(input, ctx.userId)),

  getAll: publicProcedure.use(isAuthenticated).query(({ ctx }) => accountController.getAll(ctx.userId)),

  getActive: publicProcedure
    .use(isAuthenticated)
    .input(activeAccountsSchema)
    .query(({ input, ctx }) => accountController.getActive(input, ctx.userId)),

  archive: publicProcedure
    .use(isAuthenticated)
    .input(accountIdSchema)
    .mutation(({ input, ctx }) => accountController.archive(input, ctx.userId)),

  getDeletionState: publicProcedure
    .use(isAuthenticated)
    .input(accountIdSchema)
    .query(({ input, ctx }) => accountController.getDeletionState(input, ctx.userId)),

  delete: publicProcedure
    .use(isAuthenticated)
    .input(accountIdSchema)
    .mutation(({ input, ctx }) => accountController.delete(input, ctx.userId)),

  getSummaries: publicProcedure
    .use(isAuthenticated)
    .query(({ ctx }) => accountController.getSummaries(ctx.userId)),

  getValuationSnapshot: publicProcedure
    .use(isAuthenticated)
    .query(({ ctx }) => accountController.getValuationSnapshot(ctx.userId)),
};
