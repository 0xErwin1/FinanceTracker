import type {
  TransactionImportCommitRequestDTO,
  TransactionImportCommitResponseDTO,
  TransactionImportCommitRowDTO,
  TransactionImportPreviewRequestDTO,
  TransactionImportPreviewResponseDTO,
  TransactionImportPreviewRowDTO,
} from '@expenses/api';
import { type ComputedRef, computed, ref } from 'vue';
import { trpc } from '@/api/trpc';

type ApprovalState = Record<number, boolean>;

interface CommitApprovedRowsOptions {
  accountId: string;
  categoryId?: string | null;
  idempotencyKey?: string;
}

interface UseTransactionImportReturn {
  preview: ComputedRef<TransactionImportPreviewResponseDTO | null>;
  previewLoading: ComputedRef<boolean>;
  previewError: ComputedRef<Error | null>;
  commitResult: ComputedRef<TransactionImportCommitResponseDTO | null>;
  commitLoading: ComputedRef<boolean>;
  commitError: ComputedRef<Error | null>;
  approvalState: ComputedRef<ApprovalState>;
  approvedPreviewRows: ComputedRef<TransactionImportPreviewRowDTO[]>;
  requestPreview: (input: TransactionImportPreviewRequestDTO) => Promise<TransactionImportPreviewResponseDTO>;
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

function buildCommitRows(
  rows: TransactionImportPreviewRowDTO[],
  approvals: ApprovalState,
  categoryId?: string | null,
): TransactionImportCommitRowDTO[] {
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
      normalized: row.normalized,
      categoryId,
    }));
}

function createImportIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `import-${Date.now()}`;
}

export function useTransactionImport(): UseTransactionImportReturn {
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
    preview.value = null;
    previewError.value = null;
    approvalState.value = {};
    commitResult.value = null;
    commitError.value = null;
  }

  async function requestPreview(
    input: TransactionImportPreviewRequestDTO,
  ): Promise<TransactionImportPreviewResponseDTO> {
    previewLoading.value = true;
    previewError.value = null;
    commitResult.value = null;
    commitError.value = null;

    try {
      const result = await trpc.transaction.importPreview.mutate(input);

      preview.value = result;
      approvalState.value = buildApprovalState(result.rows);

      return result;
    } catch (error) {
      preview.value = null;
      approvalState.value = {};

      const normalizedError = error instanceof Error ? error : new Error(String(error));
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

    const approvedRows = buildCommitRows(preview.value.rows, approvalState.value, options.categoryId);

    if (approvedRows.length === 0) {
      throw new Error('Approve at least one import row before committing.');
    }

    commitLoading.value = true;
    commitError.value = null;

    const payload: TransactionImportCommitRequestDTO = {
      accountId: options.accountId,
      approvedRows,
      idempotencyKey: options.idempotencyKey ?? createImportIdempotencyKey(),
    };

    try {
      const result = await trpc.transaction.importCommit.mutate(payload);
      commitResult.value = result;

      return result;
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      commitError.value = normalizedError;

      throw normalizedError;
    } finally {
      commitLoading.value = false;
    }
  }

  return {
    preview: computed(() => preview.value),
    previewLoading: computed(() => previewLoading.value),
    previewError: computed(() => previewError.value),
    commitResult: computed(() => commitResult.value),
    commitLoading: computed(() => commitLoading.value),
    commitError: computed(() => commitError.value),
    approvalState: computed(() => approvalState.value),
    approvedPreviewRows,
    requestPreview,
    commitApprovedRows,
    setRowApproved,
    toggleRowApproval,
    clear,
  };
}
