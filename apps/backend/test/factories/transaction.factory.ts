import { CurrencyEnum, MonthEnum, TransactionType } from '../../src/enums';
import { type BodyRequest, CreateTransactionRequest } from '../../src/types/request/trsactions';

const transaction: CreateTransactionRequest = new CreateTransactionRequest({
  amount: 0,
  day: 1,
  note: 'Note Example',
  currency: CurrencyEnum.UYU,
  userId: '',
  month: MonthEnum.JANUARY,
  type: TransactionType.INCOME,
  year: 2023,
});

function buildTransaction(attributes: Partial<BodyRequest>): CreateTransactionRequest {
  return Object.assign({}, transaction, attributes);
}

export const transactionFactory = {
  transaction,
  buildTransaction,
};
