import type {
  TransactionImportDefaultsDTO,
  TransactionImportMappingDTO,
  TransactionImportPreviewRequestDTO,
  TransactionImportPreviewResponseDTO,
  TransactionImportRowStatus,
} from '@expenses/api';

export interface ImportDraftValidationInput {
  source: string;
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
  mapping: TransactionImportMappingDTO;
  defaults: TransactionImportDefaultsDTO;
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

export async function readImportSourceFile(file: Pick<Blob, 'text'>): Promise<string> {
  try {
    return await file.text();
  } catch {
    throw new Error('The selected CSV file could not be read. Try pasting the CSV text instead.');
  }
}

export function buildImportPreviewRequest(
  input: BuildImportPreviewRequestInput,
): TransactionImportPreviewRequestDTO {
  return {
    defaults: {
      accountId: input.defaults.accountId,
      categoryId: normalizeOptionalField(input.defaults.categoryId) ?? null,
      currency: input.defaults.currency,
      fixedType:
        input.defaults.typeStrategy === 'fixed_type' ? (input.defaults.fixedType ?? null) : null,
      typeStrategy: input.defaults.typeStrategy,
    },
    mapping: {
      amount: normalizeOptionalField(input.mapping.amount),
      credit: normalizeOptionalField(input.mapping.credit),
      date: normalizeOptionalField(input.mapping.date),
      debit: normalizeOptionalField(input.mapping.debit),
      description: normalizeOptionalField(input.mapping.description),
      externalReference: normalizeOptionalField(input.mapping.externalReference),
    },
    source: input.source,
  };
}

export function validateImportDraft(input: ImportDraftValidationInput): string[] {
  const issues: string[] = [];

  if (input.source.trim().length === 0) {
    issues.push('CSV source is required before generating a preview.');
  }

  if (input.defaults.accountId.trim().length === 0) {
    issues.push('Choose an active destination account.');
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
