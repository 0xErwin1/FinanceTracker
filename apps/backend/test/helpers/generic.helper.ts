import type supertest from 'supertest';

type RequestAgent = ReturnType<typeof supertest>;

export abstract class Helper {
  readonly request: RequestAgent;
  readonly cookieMock: string;

  constructor(request: RequestAgent, cookieMock: string) {
    this.request = request;
    this.cookieMock = cookieMock;
  }
}
