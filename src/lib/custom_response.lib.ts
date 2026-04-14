import { customErrors } from '.';
import type { ShowMessage } from '../types/generic';

export class CustomResponse<T extends object | string> {
  readonly data: T | undefined;
  readonly result: boolean;
  readonly message: string | null;
  readonly showMessage: ShowMessage | null;
  readonly errorCode: number | undefined;

  constructor(result: boolean, data?: T, errorCode?: number) {
    this.data = data;
    this.result = result;

    if (result) {
      this.message = null;
      this.showMessage = null;
      this.errorCode = undefined;

      return;
    }

    if (errorCode) {
      this.message = customErrors[errorCode].message;
      this.showMessage = customErrors[errorCode].showMessage;
      this.errorCode = errorCode;

      return;
    }

    this.message = null;
    this.showMessage = null;
    this.errorCode = undefined;
  }
}
