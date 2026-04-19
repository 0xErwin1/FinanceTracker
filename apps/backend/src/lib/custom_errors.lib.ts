import { StatusCodes } from 'http-status-codes';
import { ApiError, FinancialGoalsType, TransactionType } from '../enums';
import type { CustomError } from '../types/generic';

const customErrors: CustomError[] = [];

customErrors[ApiError.Auth.BAD_AUTH] = {
  message: 'Bad auth',
  showMessage: {
    EN: 'Incorrect email/password',
    ES: 'Email o contraseña incorrectos',
  },
  HTTPStatusCode: StatusCodes.BAD_REQUEST,
};

customErrors[ApiError.Auth.UNAUTHORIZED] = {
  message: 'Unauthorized',
  showMessage: {
    EN: 'Unauthorized',
    ES: 'No autorizado',
  },
  HTTPStatusCode: StatusCodes.UNAUTHORIZED,
};

customErrors[ApiError.Auth.BAD_EMAIL_FORMAT] = {
  message: 'Bad email format',
  showMessage: {
    EN: 'Email is not valid',
    ES: 'Email no es válido',
  },
  HTTPStatusCode: StatusCodes.BAD_REQUEST,
};

customErrors[ApiError.Auth.EXPIRED_TOKEN] = {
  message: 'Expired token',
  showMessage: {
    EN: 'Your session has expired',
    ES: 'Su sesión ha expirado',
  },
  HTTPStatusCode: StatusCodes.UNAUTHORIZED,
};

customErrors[ApiError.Auth.NEED_BE_LOGGED_IN] = {
  message: 'You need to be logged in',
  showMessage: {
    EN: 'You need to be logged in',
    ES: 'Debe estar conectado',
  },
  HTTPStatusCode: StatusCodes.UNAUTHORIZED,
};

// Server
customErrors[ApiError.Server.TOO_FEW_PARAMS] = {
  message: 'Too few parameters',
  showMessage: {
    EN: 'Too few parameters',
    ES: 'Faltan parametros',
  },
  HTTPStatusCode: StatusCodes.BAD_REQUEST,
};

customErrors[ApiError.Server.NOT_FOUND] = {
  message: 'Not found',
  showMessage: {
    EN: 'Not found',
    ES: 'Recurso no encontrado',
  },
  HTTPStatusCode: StatusCodes.NOT_FOUND,
};

customErrors[ApiError.Server.PARAMS_REQUIRED] = {
  message: 'Some body parameters are missing or are incorrect',
  showMessage: {
    EN: 'Some body parameters are missing or are incorrect',
    ES: 'Faltan o son incorrectos algunos parametros de la solicitud',
  },
  HTTPStatusCode: StatusCodes.UNPROCESSABLE_ENTITY,
};

// User
customErrors[ApiError.User.USER_DOES_NOT_EXIST] = {
  message: 'User does not exist',
  showMessage: {
    EN: 'User does not exist',
    ES: 'El usuario no existe',
  },
  HTTPStatusCode: StatusCodes.NOT_FOUND,
};

customErrors[ApiError.User.WRONG_PASSWORD] = {
  message: 'Wrong password',
  showMessage: {
    EN: 'Wrong password',
    ES: 'Contraseña incorrecta',
  },
  HTTPStatusCode: StatusCodes.UNAUTHORIZED,
};

customErrors[ApiError.User.PASSWORD_TOO_SHORT] = {
  message: 'Password has to be at least 6 characters long',
  showMessage: {
    EN: 'Password has to be at least 6 characters long',
    ES: 'La contraseña debe tener un largo de al menos 6',
  },
  HTTPStatusCode: StatusCodes.BAD_REQUEST,
};

customErrors[ApiError.User.USER_ALREADY_EXISTS] = {
  message: 'User already exists',
  showMessage: {
    EN: 'User already exists',
    ES: 'El usuario ya existe',
  },
  HTTPStatusCode: StatusCodes.CONFLICT,
};

// Transaction
customErrors[ApiError.Transaction.TRANSACTION_AND_GOAL_NOT_SAME_TYPE] = {
  message: 'Transaction and goal are not of the same type.',
  showMessage: {
    EN: `Transaction and goal are not of the same type. (${FinancialGoalsType.SPEND_LESS} == ${TransactionType.EXPENSE} || ${FinancialGoalsType.SAVING} == ${TransactionType.SAVING})`,
    ES: `La transacción y el objetivo no son del mismo tipo. (${FinancialGoalsType.SPEND_LESS} == ${TransactionType.EXPENSE} || ${FinancialGoalsType.SAVING} == ${TransactionType.SAVING})`,
  },
  HTTPStatusCode: StatusCodes.CONFLICT,
};

customErrors[ApiError.Transaction.TRANSACTION_AND_GOAL_NOT_SAME_CURENCY] = {
  message: 'Transaction and goal are not of the same currency.',
  showMessage: {
    EN: 'Transaction and goal are not of the same currency.',
    ES: 'La transacción y la objetivo no tienen la misma moneda',
  },
  HTTPStatusCode: StatusCodes.CONFLICT,
};

customErrors[ApiError.Transaction.TRANSACTION_AND_CATEGORY_NOT_SAME_TYPE] = {
  message: 'Transaction and category are not of the same type.',
  showMessage: {
    EN: 'Transaction and category are not of the same type.',
    ES: 'La transacción y la categoría no son del mismo tipo.',
  },
  HTTPStatusCode: StatusCodes.CONFLICT,
};

customErrors[ApiError.Transaction.TRANSACTION_NOT_EXIST] = {
  message: 'Transaction not exist',
  showMessage: {
    EN: 'Transaction not exist',
    ES: 'La transacción no existe',
  },
  HTTPStatusCode: StatusCodes.NOT_FOUND,
};

customErrors[ApiError.Transaction.ACCOUNT_REQUIRED] = {
  message: 'Account is required for transactions',
  showMessage: {
    EN: 'Account is required for transactions',
    ES: 'La cuenta es obligatoria para las transacciones',
  },
  HTTPStatusCode: StatusCodes.BAD_REQUEST,
};

customErrors[ApiError.Transaction.ACCOUNT_INVALID] = {
  message: 'Account is invalid for this user',
  showMessage: {
    EN: 'Account is invalid for this user',
    ES: 'La cuenta no es válida para este usuario',
  },
  HTTPStatusCode: StatusCodes.BAD_REQUEST,
};

customErrors[ApiError.Transaction.ACCOUNT_CURRENCY_MISMATCH] = {
  message: 'Account currency does not match transaction currency',
  showMessage: {
    EN: 'Account currency does not match transaction currency',
    ES: 'La moneda de la cuenta no coincide con la moneda de la transacción',
  },
  HTTPStatusCode: StatusCodes.CONFLICT,
};

customErrors[ApiError.Transaction.TRANSFER_ACCOUNT_REQUIRED] = {
  message: 'Transfer requires source and destination accounts',
  showMessage: {
    EN: 'Transfer requires source and destination accounts',
    ES: 'La transferencia requiere cuentas de origen y destino',
  },
  HTTPStatusCode: StatusCodes.BAD_REQUEST,
};

customErrors[ApiError.Transaction.TRANSFER_ACCOUNTS_MUST_DIFFER] = {
  message: 'Transfer accounts must differ',
  showMessage: {
    EN: 'Transfer accounts must differ',
    ES: 'Las cuentas de transferencia deben ser distintas',
  },
  HTTPStatusCode: StatusCodes.BAD_REQUEST,
};

customErrors[ApiError.Transaction.TRANSFER_CURRENCY_MISMATCH] = {
  message: 'Transfer accounts must use the same currency',
  showMessage: {
    EN: 'Transfer accounts must use the same currency',
    ES: 'Las cuentas de transferencia deben usar la misma moneda',
  },
  HTTPStatusCode: StatusCodes.CONFLICT,
};

customErrors[ApiError.Transaction.TRANSFER_GOAL_NOT_ALLOWED] = {
  message: 'Transfers cannot be linked to financial goals',
  showMessage: {
    EN: 'Transfers cannot be linked to financial goals',
    ES: 'Las transferencias no pueden vincularse a objetivos financieros',
  },
  HTTPStatusCode: StatusCodes.CONFLICT,
};

customErrors[ApiError.Transaction.TRANSFER_NOT_EXIST] = {
  message: 'Transfer not exist',
  showMessage: {
    EN: 'Transfer not exist',
    ES: 'La transferencia no existe',
  },
  HTTPStatusCode: StatusCodes.NOT_FOUND,
};

customErrors[ApiError.Transaction.TRANSFER_PAIR_INVALID] = {
  message: 'Transfer pair is invalid',
  showMessage: {
    EN: 'Transfer pair is invalid',
    ES: 'El par de transferencia no es válido',
  },
  HTTPStatusCode: StatusCodes.CONFLICT,
};

customErrors[ApiError.Account.ACCOUNT_NOT_EXIST] = {
  message: 'Account not exist',
  showMessage: {
    EN: 'Account not exist',
    ES: 'La cuenta no existe',
  },
  HTTPStatusCode: StatusCodes.NOT_FOUND,
};

customErrors[ApiError.Account.ACCOUNT_ARCHIVED] = {
  message: 'Account is archived',
  showMessage: {
    EN: 'Account is archived',
    ES: 'La cuenta está archivada',
  },
  HTTPStatusCode: StatusCodes.BAD_REQUEST,
};

customErrors[ApiError.Account.INSTITUTION_NOT_EXIST] = {
  message: 'Institution not exist',
  showMessage: {
    EN: 'Institution not exist',
    ES: 'La institución no existe',
  },
  HTTPStatusCode: StatusCodes.NOT_FOUND,
};

customErrors[ApiError.Account.INSTITUTION_IN_USE] = {
  message: 'Institution is still linked to one or more accounts',
  showMessage: {
    EN: 'Institution is still linked to one or more accounts',
    ES: 'La institución todavía está vinculada a una o más cuentas',
  },
  HTTPStatusCode: StatusCodes.CONFLICT,
};

customErrors[ApiError.Account.ACCOUNT_IN_USE] = {
  message: 'Account is still linked to one or more records',
  showMessage: {
    EN: 'Account is still linked to one or more records',
    ES: 'La cuenta todavía está vinculada a uno o más registros',
  },
  HTTPStatusCode: StatusCodes.CONFLICT,
};

// Category
customErrors[ApiError.Category.CATEGORY_NOT_EXIST] = {
  message: 'Category not exist',
  showMessage: {
    EN: 'Category not exist',
    ES: 'La categoria no existe',
  },
  HTTPStatusCode: StatusCodes.NOT_FOUND,
};

customErrors[ApiError.Category.CANNOT_DELETE_CATEGORY_TRANSACTIONS] = {
  message: 'Cannot delete a category with transactions',
  showMessage: {
    EN: 'Cannot delete a category with transactions, try with the query `?deleteTransactions=true` to delete all transactions.',
    ES: 'No se puede eliminar una categoría con transacciones, pruebe con la query `?deleteTransactions=true` para eliminar todas las transacciones',
  },
  HTTPStatusCode: StatusCodes.CONFLICT,
};

customErrors[ApiError.Category.CATEGORY_TYPE_MISMATCH] = {
  message: 'Category type does not match transaction type',
  showMessage: {
    EN: 'Category type does not match transaction type',
    ES: 'El tipo de categoría no coincide con el tipo de transacción',
  },
  HTTPStatusCode: StatusCodes.BAD_REQUEST,
};

// Financial Goal
customErrors[ApiError.FinancialGoal.FINANCIAL_GOAL_NOT_EXIST] = {
  message: 'Financial goal not exist.',
  showMessage: {
    EN: 'Financial goal not exist.',
    ES: 'El objetivo financiero no existe',
  },
  HTTPStatusCode: StatusCodes.NOT_FOUND,
};

customErrors[ApiError.FinancialGoal.CANNOT_DELETE_GOAL_WITH_TRANSACTIONS] = {
  message: 'Cannot delete a financial goal with linked transactions',
  showMessage: {
    EN: 'Cannot delete a financial goal with linked transactions. Unlink transactions first.',
    ES: 'No se puede eliminar un objetivo financiero con transacciones vinculadas. Desvincule las transacciones primero.',
  },
  HTTPStatusCode: StatusCodes.CONFLICT,
};

// Budget
customErrors[ApiError.Budget.BUDGET_NOT_EXIST] = {
  message: 'Budget not exist',
  showMessage: {
    EN: 'Budget not exist',
    ES: 'El presupuesto no existe',
  },
  HTTPStatusCode: StatusCodes.NOT_FOUND,
};

customErrors[ApiError.Budget.BUDGET_ALREADY_EXISTS] = {
  message: 'Budget already exists for this category and month',
  showMessage: {
    EN: 'Budget already exists for this category and month',
    ES: 'Ya existe un presupuesto para esta categoría y mes',
  },
  HTTPStatusCode: StatusCodes.CONFLICT,
};

customErrors[ApiError.Budget.CATEGORY_NOT_FOUND] = {
  message: 'Category not found',
  showMessage: {
    EN: 'Category not found',
    ES: 'Categoría no encontrada',
  },
  HTTPStatusCode: StatusCodes.NOT_FOUND,
};

// RecurringTransaction
customErrors[ApiError.RecurringTransaction.NOT_EXIST] = {
  message: 'Recurring transaction not exist',
  showMessage: {
    EN: 'Recurring transaction not exist',
    ES: 'La transacción recurrente no existe',
  },
  HTTPStatusCode: StatusCodes.NOT_FOUND,
};

customErrors[ApiError.RecurringTransaction.INVALID_DAY_OF_MONTH] = {
  message: 'Day of month must be between 1 and 31',
  showMessage: {
    EN: 'Day of month must be between 1 and 31',
    ES: 'El día del mes debe estar entre 1 y 31',
  },
  HTTPStatusCode: StatusCodes.BAD_REQUEST,
};

customErrors[ApiError.RecurringTransaction.CATEGORY_NOT_FOUND] = {
  message: 'Category not found',
  showMessage: {
    EN: 'Category not found',
    ES: 'Categoría no encontrada',
  },
  HTTPStatusCode: StatusCodes.NOT_FOUND,
};

// Installment
customErrors[ApiError.Installment.NOT_EXIST] = {
  message: 'Installment plan not exist',
  showMessage: {
    EN: 'Installment plan not exist',
    ES: 'El plan de cuotas no existe',
  },
  HTTPStatusCode: StatusCodes.NOT_FOUND,
};

customErrors[ApiError.Installment.INVALID_INSTALLMENTS_COUNT] = {
  message: 'Installments count must be at least 2',
  showMessage: {
    EN: 'Installments count must be at least 2',
    ES: 'La cantidad de cuotas debe ser al menos 2',
  },
  HTTPStatusCode: StatusCodes.BAD_REQUEST,
};

customErrors[ApiError.Installment.OBLIGATION_ALREADY_PAID] = {
  message: 'Obligation is already paid',
  showMessage: {
    EN: 'Obligation is already paid',
    ES: 'La obligación ya está paga',
  },
  HTTPStatusCode: StatusCodes.CONFLICT,
};

customErrors[ApiError.Installment.OBLIGATION_NOT_FOUND] = {
  message: 'Obligation not found',
  showMessage: {
    EN: 'Obligation not found',
    ES: 'Obligación no encontrada',
  },
  HTTPStatusCode: StatusCodes.NOT_FOUND,
};

customErrors[ApiError.Installment.OBLIGATION_NOT_PENDING] = {
  message: 'Obligation is not in PENDING status',
  showMessage: {
    EN: 'Obligation is not in PENDING status',
    ES: 'La obligación no está en estado PENDIENTE',
  },
  HTTPStatusCode: StatusCodes.CONFLICT,
};

export { customErrors };
