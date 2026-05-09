import type {
  TransactionImportDefaultsDTO,
  TransactionImportMappingDTO,
  TransactionImportPreviewRequestDTO,
  TransactionImportPreviewResponseDTO,
  TransactionImportRowStatus,
  TransactionImportSourceFormat,
} from '@expenses/api';

export interface ImportDraftValidationInput {
  source: string;
  sourceFormat?: TransactionImportSourceFormat;
  sourceFilename?: string;
  mapping: TransactionImportMappingDTO;
  defaults: Pick<TransactionImportDefaultsDTO, 'accountId' | 'typeStrategy' | 'fixedType' | 'currency'>;
}

export interface ImportStatusPresentation {
  label: string;
  description: string;
  tone: 'success' | 'danger' | 'muted' | 'warning';
}

export interface CommitDisabledReasonInput {
  preview: TransactionImportPreviewResponseDTO | null;
  approvedRowCount: number;
  previewLoading: boolean;
  commitLoading: boolean;
}

export interface BuildImportPreviewRequestInput {
  source: string;
  sourceFormat?: TransactionImportSourceFormat;
  sourceFilename?: string;
  mapping: TransactionImportMappingDTO;
  defaults: TransactionImportDefaultsDTO;
}

export interface ReadImportSourceFileResult {
  source: string;
  sourceFormat: TransactionImportSourceFormat;
  sourceFilename?: string;
}

export interface ImportedSourceFileSelectionState {
  formIssues: string[];
  formSource: string;
  sourceFileError: string | null;
  sourceFilename?: string;
  sourceFormat: TransactionImportSourceFormat;
}

export interface ImportedSourceFileErrorState {
  formSource: string;
  sourceFileError: string;
  sourceFilename?: string;
  sourceFormat: 'csv';
}

type ImportReadableFile = Pick<Blob, 'text'> & {
  arrayBuffer?: () => Promise<ArrayBuffer>;
  name?: string;
  type?: string;
};

function resolveImportSourceFormat(
  file: Pick<ImportReadableFile, 'name' | 'type'>,
): TransactionImportSourceFormat {
  const filename = file.name?.trim().toLowerCase() ?? '';
  const mimeType = file.type?.trim().toLowerCase() ?? '';

  if (filename.endsWith('.pdf') || mimeType === 'application/pdf') {
    return 'bank_pdf_text';
  }

  if (filename.endsWith('.csv') || mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel') {
    return 'csv';
  }

  throw new Error('Only CSV and PDF statement files are supported for transaction imports.');
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

const IMPORT_STATUS_PRESENTATION: Record<TransactionImportRowStatus, ImportStatusPresentation> = {
  ready: {
    label: 'Ready',
    description: 'Ready to include in the final commit.',
    tone: 'success',
  },
  invalid: {
    label: 'Invalid',
    description: 'Requires mapping or data fixes before it can be committed.',
    tone: 'danger',
  },
  duplicate: {
    label: 'Duplicate',
    description: 'Already exists in this file or in your transaction history.',
    tone: 'muted',
  },
  'review-required': {
    label: 'Review required',
    description: 'Needs explicit approval before it can be committed.',
    tone: 'warning',
  },
};

function hasSignedAmountMapping(mapping: TransactionImportMappingDTO): boolean {
  return typeof mapping.amount === 'string' && mapping.amount.trim().length > 0;
}

function hasSplitAmountMapping(mapping: TransactionImportMappingDTO): boolean {
  return (
    typeof mapping.debit === 'string' &&
    mapping.debit.trim().length > 0 &&
    typeof mapping.credit === 'string' &&
    mapping.credit.trim().length > 0
  );
}

function normalizeOptionalField(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function readImportSourceFile(file: ImportReadableFile): Promise<ReadImportSourceFileResult> {
  const sourceFormat = resolveImportSourceFormat(file);

  try {
    if (sourceFormat === 'bank_pdf_text') {
      if (typeof file.arrayBuffer !== 'function') {
        throw new Error('The selected PDF file could not be read. Try choosing the bank statement again.');
      }

      const source = encodeBase64(new Uint8Array(await file.arrayBuffer()));

      return {
        source,
        sourceFilename: file.name,
        sourceFormat,
      };
    }

    return {
      source: await file.text(),
      sourceFilename: file.name,
      sourceFormat,
    };
  } catch {
    if (sourceFormat === 'bank_pdf_text') {
      throw new Error('The selected PDF file could not be read. Try choosing the bank statement again.');
    }

    throw new Error('The selected CSV file could not be read. Try pasting the CSV text instead.');
  }
}

export function applyImportedSourceFileSelection(
  result: ReadImportSourceFileResult,
): ImportedSourceFileSelectionState {
  return {
    formIssues: [],
    formSource: result.source,
    sourceFileError: null,
    sourceFilename: result.sourceFilename,
    sourceFormat: result.sourceFormat,
  };
}

export function applyImportedSourceFileError(message: string): ImportedSourceFileErrorState {
  return {
    formSource: '',
    sourceFileError: message,
    sourceFilename: undefined,
    sourceFormat: 'csv',
  };
}

export function getImportSourceGuidance(sourceFormat: TransactionImportSourceFormat = 'csv'): string {
  if (sourceFormat === 'bank_pdf_text') {
    return 'PDF statement imports require selectable text. Scanned PDFs and OCR are not supported.';
  }

  return 'Select a bank export to load its contents. CSV files stay editable below.';
}

export function getImportPreviewErrorMessage(
  error: Error | null,
  sourceFormat: TransactionImportSourceFormat = 'csv',
): string | null {
  if (error === null) {
    return null;
  }

  if (sourceFormat === 'bank_pdf_text') {
    return `PDF statement preview failed. ${error.message}`;
  }

  return error.message;
}

export function buildImportPreviewRequest(
  input: BuildImportPreviewRequestInput,
): TransactionImportPreviewRequestDTO {
  const sourceFormat = input.sourceFormat ?? 'csv';

  return {
    defaults: {
      accountId: input.defaults.accountId,
      categoryId: normalizeOptionalField(input.defaults.categoryId) ?? null,
      currency: input.defaults.currency,
      fixedType: input.defaults.typeStrategy === 'fixed_type' ? (input.defaults.fixedType ?? null) : null,
      typeStrategy: input.defaults.typeStrategy,
    },
    source: input.source,
    sourceFilename: normalizeOptionalField(input.sourceFilename),
    sourceFormat,
    ...(sourceFormat === 'csv'
      ? {
          mapping: {
            amount: normalizeOptionalField(input.mapping.amount),
            credit: normalizeOptionalField(input.mapping.credit),
            date: normalizeOptionalField(input.mapping.date),
            debit: normalizeOptionalField(input.mapping.debit),
            description: normalizeOptionalField(input.mapping.description),
            externalReference: normalizeOptionalField(input.mapping.externalReference),
          },
        }
      : {}),
  };
}

export function validateImportDraft(input: ImportDraftValidationInput): string[] {
  const issues: string[] = [];
  const sourceFormat = input.sourceFormat ?? 'csv';

  if (input.source.trim().length === 0) {
    issues.push(
      sourceFormat === 'bank_pdf_text'
        ? 'Select a PDF statement before generating a preview.'
        : 'CSV source is required before generating a preview.',
    );
  }

  if (input.defaults.accountId.trim().length === 0) {
    issues.push('Choose an active destination account.');
  }

  if (sourceFormat === 'bank_pdf_text') {
    return issues;
  }

  if (!input.mapping.date?.trim()) {
    issues.push('Map the CSV date column before previewing.');
  }

  if (!input.mapping.description?.trim()) {
    issues.push('Map the CSV description column before previewing.');
  }

  if (!hasSignedAmountMapping(input.mapping) && !hasSplitAmountMapping(input.mapping)) {
    issues.push('Map either a signed amount column or both debit and credit columns.');
  }

  return issues;
}

export function getImportStatusPresentation(status: TransactionImportRowStatus): ImportStatusPresentation {
  return IMPORT_STATUS_PRESENTATION[status];
}

export function getCommitDisabledReason(input: CommitDisabledReasonInput): string | null {
  if (input.previewLoading) {
    return 'Wait for the preview to finish before committing.';
  }

  if (input.commitLoading) {
    return 'Commit in progress.';
  }

  if (input.preview === null) {
    return 'Generate a preview before committing rows.';
  }

  if (input.preview.summary.invalid > 0) {
    return 'Resolve every invalid row before committing the import.';
  }

  if (input.approvedRowCount === 0) {
    return 'Approve at least one preview row before committing.';
  }

  return null;
}
