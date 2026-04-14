import { body, param, query } from 'express-validator';
import { CurrencyEnum, MonthEnum, TransactionType } from '../enums';
import { dayHelper } from '../helpers';

const createTransaction = [
  body('transactions', 'Transactions array must not be empty')
    .if(body('transactions').exists())
    .isArray({ min: 1 })
    .withMessage('Transactions array must contain at least one transaction'),
  body('transactions', 'Please enter a transactions').if(body('type').not().exists()).isArray(),
  body('type', `Please enter a type: ${Object.values(TransactionType).join('|')}`)
    .if(body('transactions').not().exists())
    .isIn(Object.values(TransactionType))
    .notEmpty()
    .trim(),
  body('amount', 'Please enter an amount').if(body('transactions').not().exists()).notEmpty().trim(),
  body('currency', 'Please enter a currency')
    .if(body('transactions').not().exists())
    .isIn(Object.values(CurrencyEnum)),
  body('note', 'Please enter a note').if(body('transactions').not().exists()).optional().notEmpty().trim(),
  body('day', 'Please enter a day')
    .if(body('transactions').not().exists())
    .optional()
    .isInt({ min: 1, max: 31 })
    .custom(
      (value: number, { req }) =>
        value > 0 && value <= dayHelper.getMaxDayByMonth(req.body.month, req.body.year),
    )
    .trim(),
  body('month', 'Please enter a month')
    .if(body('transactions').not().exists())
    .isIn(Object.values(MonthEnum))
    .trim(),
  body('year', 'Please enter a year')
    .if(body('transactions').not().exists())
    .isInt({ min: 2000, max: new Date().getFullYear() })
    .trim(),
  body('exchangeRate', 'Please enter a exchangeRate')
    .if(body('currency').custom((value) => value === CurrencyEnum.USD || value === CurrencyEnum.EUR))
    .isNumeric()
    .trim(),
  body('goalId', 'Please enter a goal id').optional().isUUID(),
  body('categoryId', 'Please enter a categoryId or category')
    .if(body('transactions').not().exists())
    .if(body('category').not().exists())
    .isUUID(),
  body('category', 'Please enter a categoryId or category')
    .if(body('transactions').not().exists())
    .if(body('categoryId').not().exists())
    .isObject(),
  body('category.type', 'Please enter a category type, and make it equal to the transaction type.')
    .if(body('category').exists())
    .optional()
    .isIn(Object.values(TransactionType))
    .custom((value: TransactionType, { req }) => value === req.body.type),
  body('category.name', 'Please enter a name').if(body('category').exists()).isString().trim(),

  // Batch transaction wildcard chains (guarded by transactions array existence)
  body('transactions.*.type', `Please enter a type: ${Object.values(TransactionType).join('|')}`)
    .if(body('transactions').exists())
    .isIn(Object.values(TransactionType)),

  body('transactions.*.amount', 'Please enter a amount')
    .if(body('transactions').exists())
    .notEmpty()
    .isNumeric(),

  body('transactions.*.currency', 'Please enter a currency')
    .if(body('transactions').exists())
    .isIn(Object.values(CurrencyEnum)),

  body('transactions.*.exchangeRate', 'Please enter a exchange rate')
    .if(body('transactions').exists())
    .if(
      body('transactions.*.currency').custom(
        (value: string) => value === CurrencyEnum.USD || value === CurrencyEnum.EUR,
      ),
    )
    .isNumeric(),

  body('transactions.*.month', `Please enter a month: ${Object.values(MonthEnum).join(' | ')}`)
    .if(body('transactions').exists())
    .isIn(Object.values(MonthEnum)),

  body('transactions.*.day', 'Please enter a valid day')
    .if(body('transactions').exists())
    .isInt({ min: 1, max: 31 })
    .custom((value: number, { req, path }) => {
      const match = path.match(/transactions\[(\d+)\]/);
      if (!match) return true;

      const index = Number.parseInt(match[1], 10);
      const transaction = req.body.transactions?.[index];

      if (!transaction) return true;

      return value > 0 && value <= dayHelper.getMaxDayByMonth(transaction.month, transaction.year);
    }),

  body('transactions.*.year', 'Please enter a year > 2000')
    .if(body('transactions').exists())
    .isInt({ min: 2000 }),

  body('transactions.*.categoryId', 'Please enter a categoryId or category')
    .if(body('transactions').exists())
    .if(body('transactions.*.category').not().exists())
    .isUUID(),

  body('transactions.*.category', 'Please enter a categoryId or category')
    .if(body('transactions').exists())
    .if(body('transactions.*.categoryId').not().exists())
    .isObject(),

  body('transactions.*.category.type', 'Transaction and category are not of the same type.')
    .if(body('transactions').exists())
    .if(body('transactions.*.category').exists())
    .optional()
    .isIn(Object.values(TransactionType))
    .custom((value: TransactionType, { req, path }) => {
      const match = path.match(/transactions\[(\d+)\]/);
      if (!match) return true;

      const index = Number.parseInt(match[1], 10);
      const transaction = req.body.transactions?.[index];

      return value === transaction?.type;
    }),

  body('transactions.*.category.name', 'Please enter a category name.')
    .if(body('transactions').exists())
    .if(body('transactions.*.category').exists())
    .isString()
    .trim(),
];

const getTransaction = [
  query('month').optional().isIn(Object.values(MonthEnum)),
  query('day')
    .optional()
    .isInt({ min: 1, max: 31 })
    .custom((value, { req }) => {
      if (req.body?.month) {
        return value > 0 && value <= dayHelper.getMaxDayByMonth(req.body.month, req.body?.year);
      }
    }),
  query('year').optional().isInt({ min: 2000 }),
  query('type').optional().isIn(Object.values(TransactionType)),
];

const setGoalInTransaction = [
  param('transactionId').isUUID(),
  body('goalId', 'Please enter a goal id').isUUID(),
];

const transactionIdInParam = [param('transactionId').isUUID()];

export const transactionValidation = {
  createTransaction,
  getTransaction,
  setGoalInTransaction,
  transactionIdInParam,
};
