import type { CurrencyEnum, TransactionType } from '../../enums';

export type TransactionImportTypeStrategy = 'signed_amount' | 'fixed_type';

export type TransactionImportSourceFormat = 'csv' | 'bank_pdf_text';

export type TransactionImportField =
  | 'date'
  | 'amount'
  | 'debit'
  | 'credit'
  | 'description'
  | 'externalReference';

export type TransactionImportRowStatus = 'ready' | 'invalid' | 'duplicate' | 'review-required';

export type TransactionImportIssueCode =
  | 'parser_error'
  | 'mapping_required'
  | 'invalid_date'
  | 'invalid_amount'
  | 'category_type_mismatch'
  | 'duplicate_in_file'
  | 'duplicate_existing'
  | 'review_required'
  | 'row_limit_exceeded'
  | 'pdf_no_text'
  | 'pdf_unsupported_layout'
  | 'pdf_size_exceeded';

export interface TransactionImportMappingDTO {
  date?: string;
  amount?: string;
  debit?: string;
  credit?: string;
  description?: string;
  externalReference?: string;
}

export interface TransactionImportDefaultsDTO {
  accountId: string;
  currency: CurrencyEnum;
  categoryId?: string | null;
  typeStrategy: TransactionImportTypeStrategy;
  fixedType?: TransactionType | null;
}

export interface TransactionImportIssueDTO {
  code: TransactionImportIssueCode;
  message: string;
  field?: TransactionImportField;
  rowNumber?: number;
}

export interface TransactionImportNormalizedRowDTO {
  date: string | null;
  amount: number | null;
  description: string | null;
  externalReference: string | null;
  type: TransactionType | null;
}

export interface TransactionImportPreviewRowDTO {
  rowNumber: number;
  status: TransactionImportRowStatus;
  issues: TransactionImportIssueDTO[];
  normalized: TransactionImportNormalizedRowDTO;
  raw: Record<string, string>;
  fingerprint?: string;
}

export interface TransactionImportPreviewSummaryDTO {
  ready: number;
  invalid: number;
  duplicate: number;
  reviewRequired: number;
  total: number;
}

export interface TransactionImportPreviewRequestDTO {
  source: string;
  sourceFormat?: TransactionImportSourceFormat;
  sourceFilename?: string;
  mapping?: TransactionImportMappingDTO;
  defaults: TransactionImportDefaultsDTO;
}

export interface TransactionImportPreviewResponseDTO {
  delimiter: string;
  hasHeader: boolean;
  headers: string[];
  mapping: TransactionImportMappingDTO;
  rows: TransactionImportPreviewRowDTO[];
  summary: TransactionImportPreviewSummaryDTO;
  parserIssues: TransactionImportIssueDTO[];
}

export interface TransactionImportCommitRowDTO {
  rowNumber: number;
  fingerprint: string;
  normalized: TransactionImportNormalizedRowDTO;
  categoryId?: string | null;
}

export interface TransactionImportCommitRequestDTO {
  accountId: string;
  idempotencyKey: string;
  sourceFormat?: TransactionImportSourceFormat;
  approvedRows: TransactionImportCommitRowDTO[];
}

export interface TransactionImportCommitResponseDTO {
  batchId: string;
  createdTransactionIds: string[];
  createdCount: number;
}
