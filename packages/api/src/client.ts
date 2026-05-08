/**
 * Client-safe exports from @expenses/api.
 *
 * This entry point re-exports ONLY enums and type definitions.
 * It does NOT depend on @trpc/server and is safe for browser use.
 *
 * The Vite config aliases @expenses/api to this file so that
 * the frontend never pulls in server-side tRPC code.
 */

export { CurrencyEnum } from './enums/currency.enum';
export { FinancialGoalsType } from './enums/financial_goals.enum';
export { TransactionType } from './enums/transaction_type.enum';
export type {
  AccountDTO,
  AccountKind,
  AccountOwnership,
  AccountSummaryDTO,
  FxRateDTO,
  InstitutionDTO,
  ValuationCoverage,
  ValuationSnapshotDTO,
} from './types/account/model';
export type { BudgetAlert, BudgetDTO } from './types/budget/model';
export type { CategoryDTO } from './types/category/model';
export type { FinancialGoalDTO } from './types/financial_goal/model';
export type { InstallmentObligationDTO, InstallmentPlanDTO } from './types/installment_plan/model';
export type { RecurringTransactionDTO } from './types/recurring_transaction/model';
export type { SessionDTO } from './types/session/model';
export type {
  TransactionImportCommitRequestDTO,
  TransactionImportCommitResponseDTO,
  TransactionImportCommitRowDTO,
  TransactionImportDefaultsDTO,
  TransactionImportField,
  TransactionImportIssueCode,
  TransactionImportIssueDTO,
  TransactionImportMappingDTO,
  TransactionImportNormalizedRowDTO,
  TransactionImportPreviewRequestDTO,
  TransactionImportPreviewResponseDTO,
  TransactionImportPreviewRowDTO,
  TransactionImportPreviewSummaryDTO,
  TransactionImportRowStatus,
  TransactionImportTypeStrategy,
} from './types/transaction/import';
export type { TransactionDTO } from './types/transaction/model';
export type { UserDTO, UserValuationPreferencesDTO, UserWithPassword } from './types/user/model';
