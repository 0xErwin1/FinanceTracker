/**
 * Client-safe exports from @expenses/api.
 *
 * This entry point re-exports ONLY enums and type definitions.
 * It does NOT depend on @trpc/server and is safe for browser use.
 *
 * The Vite config aliases @expenses/api to this file so that
 * the frontend never pulls in server-side tRPC code.
 */
export { TransactionType } from './enums/transaction_type.enum';
export { CurrencyEnum } from './enums/currency.enum';
export { FinancialGoalsType } from './enums/financial_goals.enum';

export type { UserDTO, UserWithPassword } from './types/user/model';
export type { SessionDTO } from './types/session/model';
export type { CategoryDTO } from './types/category/model';
export type {
  AccountDTO,
  AccountKind,
  AccountOwnership,
  AccountSummaryDTO,
  InstitutionDTO,
} from './types/account/model';
export type { TransactionDTO } from './types/transaction/model';
export type { FinancialGoalDTO } from './types/financial_goal/model';
export type { BudgetDTO, BudgetAlert } from './types/budget/model';
export type { RecurringTransactionDTO } from './types/recurring_transaction/model';
export type { InstallmentPlanDTO, InstallmentObligationDTO } from './types/installment_plan/model';
