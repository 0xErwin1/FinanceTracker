import { CurrencyEnum, FinancialGoalsType, MonthEnum } from '../../src/enums';
import { CreateFinancialGoal, type CreateFinancialGoalBody } from '../../src/types/request/financial_goal';

const financialGoal: CreateFinancialGoal = new CreateFinancialGoal({
  name: 'Finacial goal example',
  note: 'Note Example',
  currency: CurrencyEnum.EUR,
  userId: '',
  month: MonthEnum.JANUARY,
  targetAmount: 0,
  type: FinancialGoalsType.SAVING,
  year: 2023,
});

function buildFinancialGoal(attributes: Partial<CreateFinancialGoalBody>): CreateFinancialGoal {
  return Object.assign({}, financialGoal, attributes);
}

export const financialGoalFactory = {
  financialGoal,
  buildFinancialGoal,
};
