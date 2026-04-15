import type { CategoryDTO, FinancialGoalDTO, SessionDTO, TransactionDTO } from '..';

export interface UserDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  deletedAt?: Date | null;
  sessions?: SessionDTO[];
  transactions?: TransactionDTO[];
  categories?: CategoryDTO[];
  financialGoals?: FinancialGoalDTO[];
}

/**
 * Internal representation that includes the password hash.
 * Only used within the backend service layer -- never exposed via API.
 */
export interface UserWithPassword extends UserDTO {
  password: string;
}
