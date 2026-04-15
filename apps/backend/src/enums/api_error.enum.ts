export namespace ApiError {
  export enum Auth {
    GENERIC = 1000,
    EXPIRED_TOKEN = 1001,
    BAD_AUTH = 1002,
    UNAUTHORIZED = 1003,
    BAD_EMAIL_FORMAT = 1004,
    NEED_BE_LOGGED_IN = 1005,
  }

  export enum Server {
    GENERIC = 2000,
    TOO_FEW_PARAMS = 2001,
    PARAMS_REQUIRED = 2002,
    NOT_FOUND = 2003,
  }

  export enum User {
    GENERIC = 3000,
    USER_DOES_NOT_EXIST = 3001,
    WRONG_PASSWORD = 3002,
    PASSWORD_TOO_SHORT = 3003,
    USER_ALREADY_EXISTS = 3004,
  }

  export enum Transaction {
    GENERIC = 4000,
    TRANSACTION_NOT_EXIST = 4001,
    TRANSACTION_AND_CATEGORY_NOT_SAME_TYPE = 4002,
    TRANSACTION_AND_GOAL_NOT_SAME_CURENCY = 4003,
    TRANSACTION_AND_GOAL_NOT_SAME_TYPE = 4004,
  }

  export enum Category {
    GENERIC = 5000,
    CATEGORY_NOT_EXIST = 5001,
    CANNOT_DELETE_CATEGORY_TRANSACTIONS = 5002,
  }

  export enum FinancialGoal {
    GENERIC = 6000,
    FINANCIAL_GOAL_NOT_EXIST = 6001,
  }

  export namespace Budget {
    export const BUDGET_NOT_EXIST = 7001;
    export const BUDGET_ALREADY_EXISTS = 7002;
    export const CATEGORY_NOT_FOUND = 7003;
  }

  export namespace RecurringTransaction {
    export const GENERIC = 8000;
    export const NOT_EXIST = 8001;
    export const INVALID_DAY_OF_MONTH = 8002;
    export const CATEGORY_NOT_FOUND = 8003;
  }
}
