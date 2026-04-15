export interface BudgetDTO {
  id: string;
  categoryId: string;
  userId: string;
  month: string;
  amount: number;
  alertThreshold: number | null;
  createdAt: Date;
}

export interface BudgetAlert {
  budget: BudgetDTO;
  spent: number;
  percentage: number;
  isOverBudget: boolean;
  isNearLimit: boolean;
}
