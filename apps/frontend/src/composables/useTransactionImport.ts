import type {
  TransactionImportApprovedRowRefDTO,
  TransactionImportCommitFromSessionRequestDTO,
  TransactionImportCommitResponseDTO,
  TransactionImportPreviewFromSessionRequestDTO,
  TransactionImportPreviewResponseDTO,
  TransactionImportPreviewRowDTO,
  TransactionImportStageResponseDTO,
} from '@expenses/api';
import { type ComputedRef, computed, ref } from 'vue';
import { trpc } from '@/api/trpc';

type ApprovalState = Record<number, boolean>;

interface CommitApprovedRowsOptions {
  accountId: string;
  categoryId?: string | null;
  idempotencyKey?: string;
}

type RequestPreviewOptions = Omit<TransactionImportPreviewFromSessionRequestDTO, 'importSessionId'>;

function normalizeOptionalField(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizePreviewOptions(input: RequestPreviewOptions): RequestPreviewOptions {
  return {
    defaults: {
      accountId: input.defaults.accountId,
      categoryId: normalizeOptionalField(input.defaults.categoryId) ?? null,
      currency: input.defaults.currency,
      fixedType: input.defaults.typeStrategy === 'fixed_type' ? (input.defaults.fixedType ?? null) : null,
      typeStrategy: input.defaults.typeStrategy,
    },
    ...(input.mapping
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

function resolveUploadContentType(file: Pick<File, 'name' | 'type'>): string {
  const providedContentType = file.type.trim();

  if (providedContentType.length > 0) {
    return providedContentType;
  }

  return file.name.trim().toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/csv';
}

interface UseTransactionImportReturn {
  stagedUpload: ComputedRef<TransactionImportStageResponseDTO | null>;
  importSessionId: ComputedRef<string | null>;
  stageLoading: ComputedRef<boolean>;
  stageError: ComputedRef<Error | null>;
  preview: ComputedRef<TransactionImportPreviewResponseDTO | null>;
  previewLoading: ComputedRef<boolean>;
  previewError: ComputedRef<Error | null>;
  commitResult: ComputedRef<TransactionImportCommitResponseDTO | null>;
  commitLoading: ComputedRef<boolean>;
  commitError: ComputedRef<Error | null>;
  approvalState: ComputedRef<ApprovalState>;
  approvedPreviewRows: ComputedRef<TransactionImportPreviewRowDTO[]>;
  stageSourceFile: (file: File) => Promise<TransactionImportStageResponseDTO>;
  requestPreview: (input: RequestPreviewOptions) => Promise<TransactionImportPreviewResponseDTO>;
  commitApprovedRows: (options: CommitApprovedRowsOptions) => Promise<TransactionImportCommitResponseDTO>;
  setRowApproved: (rowNumber: number, approved: boolean) => void;
  toggleRowApproval: (rowNumber: number) => void;
  clear: () => void;
}

function canApproveImportRow(row: TransactionImportPreviewRowDTO): boolean {
  return row.status === 'ready' || row.status === 'review-required';
}

function buildApprovalState(rows: TransactionImportPreviewRowDTO[]): ApprovalState {
  return rows.reduce<ApprovalState>((state, row) => {
    state[row.rowNumber] = canApproveImportRow(row);
    return state;
  }, {});
}

function buildApprovedRowRefs(
  rows: TransactionImportPreviewRowDTO[],
  approvals: ApprovalState,
  categoryId?: string | null,
): TransactionImportApprovedRowRefDTO[] {
  return rows
    .filter((row) => approvals[row.rowNumber] === true)
    .filter(canApproveImportRow)
    .filter((row) => row.fingerprint !== undefined)
    .filter(
      (row) =>
        row.normalized.amount !== null &&
        row.normalized.date !== null &&
        row.normalized.description !== null &&
        row.normalized.type !== null,
    )
    .map((row) => ({
      rowNumber: row.rowNumber,
      fingerprint: row.fingerprint as string,
      categoryId,
    }));
}

function createImportIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `import-${Date.now()}`;
}

function clearPreviewState(
  preview: { value: TransactionImportPreviewResponseDTO | null },
  previewLoading: { value: boolean },
  previewError: { value: Error | null },
  approvalState: { value: ApprovalState },
  commitResult: { value: TransactionImportCommitResponseDTO | null },
  commitError: { value: Error | null },
): void {
  preview.value = null;
  previewLoading.value = false;
  previewError.value = null;
  approvalState.value = {};
  commitResult.value = null;
  commitError.value = null;
}

async function readStageResponse(
  response: Response,
): Promise<TransactionImportStageResponseDTO | { message?: string }> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return (await response.json()) as TransactionImportStageResponseDTO | { message?: string };
  }

  return {};
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function getStageErrorMessage(
  payload: TransactionImportStageResponseDTO | { message?: string },
): string | undefined {
  return 'message' in payload ? payload.message : undefined;
}

export function useTransactionImport(): UseTransactionImportReturn {
  const stagedUpload = ref<TransactionImportStageResponseDTO | null>(null);
  const stageLoading = ref(false);
  const stageError = ref<Error | null>(null);

  const preview = ref<TransactionImportPreviewResponseDTO | null>(null);
  const previewLoading = ref(false);
  const previewError = ref<Error | null>(null);

  const commitResult = ref<TransactionImportCommitResponseDTO | null>(null);
  const commitLoading = ref(false);
  const commitError = ref<Error | null>(null);

  const approvalState = ref<ApprovalState>({});

  const approvedPreviewRows = computed(() => {
    if (preview.value === null) {
      return [];
    }

    return preview.value.rows.filter((row) => approvalState.value[row.rowNumber] === true);
  });

  function setRowApproved(rowNumber: number, approved: boolean): void {
    approvalState.value = {
      ...approvalState.value,
      [rowNumber]: approved,
    };
  }

  function toggleRowApproval(rowNumber: number): void {
    setRowApproved(rowNumber, approvalState.value[rowNumber] !== true);
  }

  function clear(): void {
    stagedUpload.value = null;
    stageError.value = null;
    clearPreviewState(preview, previewLoading, previewError, approvalState, commitResult, commitError);
  }

  async function stageSourceFile(file: File): Promise<TransactionImportStageResponseDTO> {
    stageLoading.value = true;
    stageError.value = null;

    clearPreviewState(preview, previewLoading, previewError, approvalState, commitResult, commitError);

    try {
      const response = await fetch('/api/transactions/import/stage', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': resolveUploadContentType(file),
          'X-Import-Filename': file.name,
        },
        body: file,
      });

      const payload = await readStageResponse(response);

      if (!response.ok) {
        throw new Error(getStageErrorMessage(payload) ?? 'Unable to stage import upload.');
      }

      stagedUpload.value = payload as TransactionImportStageResponseDTO;

      return stagedUpload.value;
    } catch (error) {
      stagedUpload.value = null;

      const normalizedError = normalizeError(error);
      stageError.value = normalizedError;

      throw normalizedError;
    } finally {
      stageLoading.value = false;
    }
  }

  async function requestPreview(input: RequestPreviewOptions): Promise<TransactionImportPreviewResponseDTO> {
    if (stagedUpload.value === null) {
      throw new Error('Upload a CSV or PDF statement before generating a preview.');
    }

    previewLoading.value = true;
    previewError.value = null;
    commitResult.value = null;
    commitError.value = null;
    preview.value = null;
    approvalState.value = {};

    try {
      const normalizedInput = normalizePreviewOptions(input);

      const payload: TransactionImportPreviewFromSessionRequestDTO = {
        ...normalizedInput,
        importSessionId: stagedUpload.value.importSessionId,
      };

      const result = await trpc.transaction.importPreviewFromSession.mutate(payload);

      preview.value = result;
      approvalState.value = buildApprovalState(result.rows);

      return result;
    } catch (error) {
      preview.value = null;
      approvalState.value = {};

      const normalizedError = normalizeError(error);
      previewError.value = normalizedError;

      throw normalizedError;
    } finally {
      previewLoading.value = false;
    }
  }

  async function commitApprovedRows(
    options: CommitApprovedRowsOptions,
  ): Promise<TransactionImportCommitResponseDTO> {
    if (preview.value === null) {
      throw new Error('Run an import preview before committing rows.');
    }

    if (stagedUpload.value === null) {
      throw new Error('Upload a CSV or PDF statement before committing rows.');
    }

    const approvedRows = buildApprovedRowRefs(preview.value.rows, approvalState.value, options.categoryId);

    if (approvedRows.length === 0) {
      throw new Error('Approve at least one import row before committing.');
    }

    commitLoading.value = true;
    commitError.value = null;

    const payload: TransactionImportCommitFromSessionRequestDTO = {
      accountId: options.accountId,
      approvedRows,
      importSessionId: stagedUpload.value.importSessionId,
      idempotencyKey: options.idempotencyKey ?? createImportIdempotencyKey(),
    };

    try {
      const result = await trpc.transaction.importCommitFromSession.mutate(payload);
      commitResult.value = result;

      return result;
    } catch (error) {
      const normalizedError = normalizeError(error);
      commitError.value = normalizedError;

      throw normalizedError;
    } finally {
      commitLoading.value = false;
    }
  }

  return {
    stagedUpload: computed(() => stagedUpload.value),
    importSessionId: computed(() => stagedUpload.value?.importSessionId ?? null),
    stageLoading: computed(() => stageLoading.value),
    stageError: computed(() => stageError.value),
    preview: computed(() => preview.value),
    previewLoading: computed(() => previewLoading.value),
    previewError: computed(() => previewError.value),
    commitResult: computed(() => commitResult.value),
    commitLoading: computed(() => commitLoading.value),
    commitError: computed(() => commitError.value),
    approvalState: computed(() => approvalState.value),
    approvedPreviewRows,
    stageSourceFile,
    requestPreview,
    commitApprovedRows,
    setRowApproved,
    toggleRowApproval,
    clear,
  };
}
