import type { StatusCodes } from 'http-status-codes';

class ShowMessage {
  declare EN: string;
  declare ES: string;
}

class CustomError {
  declare message: string;
  declare showMessage: ShowMessage;
  declare HTTPStatusCode: StatusCodes;
}

export { CustomError, ShowMessage };
