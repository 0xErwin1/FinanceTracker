import type { CategoryDTO, FinancialGoalDTO, SessionDTO, TransactionDTO } from '..';

export interface UserDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  deletedAt?: Date | null;
  sessions?: SessionDTO[];
  transactions?: TransactionDTO[];
  categories?: CategoryDTO[];
  financialGoals?: FinancialGoalDTO[];
}
