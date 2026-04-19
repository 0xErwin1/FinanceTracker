import type { TransactionType } from '../../enums';
import type { RedisMetadata } from '.';

export interface TransactionMetadata {
  type?: TransactionType;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
}

export class TransactionsRedisMetadata<T> implements RedisMetadata<T, TransactionMetadata> {
  readonly object: T;
  readonly metadata: TransactionMetadata;

  constructor(object: T, metadata: TransactionMetadata) {
    this.object = object;
    this.metadata = metadata;
  }
}
