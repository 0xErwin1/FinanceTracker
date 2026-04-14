import type { Response } from 'supertest';
import { Helper } from '.';
import type { CreateTransactionRequest } from '../../src/types/request/trsactions';
import { genericFactory } from '../factories';
import type { RequestOptions } from '../types';

export class TransactionHelper extends Helper {
  private endpoint = '/api/transactions';

  public async createTransaction(body: CreateTransactionRequest, options: RequestOptions): Promise<Response> {
    const request = this.request.post(this.endpoint).set(genericFactory.buildHeader());

    if (!options.notIncludeToken) {
      request.set('Cookie', this.cookieMock);
    }

    return await request.send(body);
  }
}
