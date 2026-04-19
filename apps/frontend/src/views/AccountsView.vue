<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  Archive,
  Building2,
  ChevronRight,
  Landmark,
  Loader2,
  PencilLine,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-vue-next';
import { CurrencyEnum } from '@expenses/api';
import { trpc } from '@/api/trpc';
import ResponsivePageHeader from '@/components/base/ResponsivePageHeader.vue';
import { useAccounts } from '@/composables/useAccounts';
import { useToast } from '@/composables/useToast';
import { formatCurrency, formatDate } from '@/utils/format';
import {
  buildAccountDeletionState,
  buildBankingSuccessToast,
  buildInstitutionRows,
  buildInstitutionDeletionState,
  createAccountDraft,
  createInstitutionDraft,
  createInstitutionSelectLabel,
  describeAccountOwnership,
  formatAccountOwnership,
  normalizeInstitutionCode,
  populateAccountDraft,
  populateInstitutionDraft,
  resolveCardScopedPanelLayout,
  validateAccountDraft,
  validateInstitutionDraft,
} from './accounts/bankingManagement';

const router = useRouter();

const { accounts, summaries, institutions, loading, refetch } = useAccounts();
const { showToast } = useToast();

const activeSection = ref<'accounts' | 'institutions'>('accounts');

const accountForm = ref(createAccountDraft());
const institutionForm = ref(createInstitutionDraft());

const editingAccountId = ref<string | null>(null);
const editingInstitutionId = ref<string | null>(null);
const pendingAccountDeletionId = ref<string | null>(null);
const pendingInstitutionDeletionId = ref<string | null>(null);

const accountSubmitting = ref(false);
const institutionSubmitting = ref(false);
const accountDeleteReviewing = ref(false);
const accountDeleting = ref(false);
const institutionDeleting = ref(false);
const accountError = ref<string | null>(null);
const institutionError = ref<string | null>(null);
const accountDeleteError = ref<string | null>(null);
const institutionDeleteError = ref<string | null>(null);

type AccountDeletionCheck = Awaited<ReturnType<typeof trpc.account.getDeletionState.query>>;

const pendingAccountDeletionCheck = ref<AccountDeletionCheck | null>(null);

const fieldClass =
  'w-full rounded-base border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent-gold';

const accountRows = computed(() =>
  accounts.value.map((account) => ({
    account,
    summary: summaries.value.find((summary) => summary.accountId === account.id),
  })),
);

const institutionRows = computed(() => buildInstitutionRows(institutions.value, accounts.value));

const accountCardLayout = resolveCardScopedPanelLayout(true);

const pendingAccountDeletionRow = computed(() => {
  if (!pendingAccountDeletionId.value) {
    return null;
  }

  return accountRows.value.find((row) => row.account.id === pendingAccountDeletionId.value) ?? null;
});

const pendingAccountDeletionState = computed(() => {
  if (!pendingAccountDeletionRow.value || !pendingAccountDeletionCheck.value) {
    return null;
  }

  return buildAccountDeletionState(
    pendingAccountDeletionRow.value.account,
    pendingAccountDeletionCheck.value,
  );
});

const pendingInstitutionDeletionRow = computed(() => {
  if (!pendingInstitutionDeletionId.value) {
    return null;
  }

  return (
    institutionRows.value.find((row) => row.institution.id === pendingInstitutionDeletionId.value) ?? null
  );
});

const pendingInstitutionDeletionState = computed(() => {
  if (!pendingInstitutionDeletionRow.value) {
    return null;
  }

  return buildInstitutionDeletionState(pendingInstitutionDeletionRow.value);
});

const activeAccountsCount = computed(
  () => accounts.value.filter((account) => account.archivedAt === null).length,
);

const archivedAccountsCount = computed(
  () => accounts.value.filter((account) => account.archivedAt !== null).length,
);

const linkedInstitutionsCount = computed(
  () => institutionRows.value.filter((row) => row.linkedAccounts > 0).length,
);

const accountSubmitLabel = computed(() =>
  accountSubmitting.value
    ? editingAccountId.value
      ? 'Saving account...'
      : 'Creating account...'
    : editingAccountId.value
      ? 'Save account'
      : 'Create account',
);

const institutionSubmitLabel = computed(() =>
  institutionSubmitting.value
    ? editingInstitutionId.value
      ? 'Saving institution...'
      : 'Creating institution...'
    : editingInstitutionId.value
      ? 'Save institution'
      : 'Create institution',
);

function resetAccountForm(): void {
  accountForm.value = createAccountDraft();
  editingAccountId.value = null;
  accountError.value = null;
}

function resetAccountDeletion(): void {
  pendingAccountDeletionId.value = null;
  pendingAccountDeletionCheck.value = null;
  accountDeleteReviewing.value = false;
  accountDeleteError.value = null;
}

function resetInstitutionForm(): void {
  institutionForm.value = createInstitutionDraft();
  editingInstitutionId.value = null;
  institutionError.value = null;
}

function resetInstitutionDeletion(): void {
  pendingInstitutionDeletionId.value = null;
  institutionDeleteError.value = null;
}

function editAccount(accountId: string): void {
  const account = accounts.value.find((item) => item.id === accountId);

  if (!account) {
    accountError.value = 'Account not found.';
    return;
  }

  activeSection.value = 'accounts';
  editingAccountId.value = account.id;
  accountForm.value = populateAccountDraft(account);
  accountError.value = null;
  resetAccountDeletion();
}

function editInstitution(institutionId: string): void {
  const institution = institutions.value.find((item) => item.id === institutionId);

  if (!institution) {
    institutionError.value = 'Institution not found.';
    return;
  }

  activeSection.value = 'institutions';
  editingInstitutionId.value = institution.id;
  institutionForm.value = populateInstitutionDraft(institution);
  institutionError.value = null;
  resetInstitutionDeletion();
}

function confirmInstitutionDeletion(institutionId: string): void {
  const row = institutionRows.value.find((item) => item.institution.id === institutionId);

  if (!row) {
    institutionDeleteError.value = 'Institution not found.';
    return;
  }

  activeSection.value = 'institutions';
  pendingInstitutionDeletionId.value = institutionId;
  institutionDeleteError.value = null;
}

async function submitAccount(): Promise<void> {
  accountError.value = validateAccountDraft(accountForm.value);

  if (accountError.value) {
    return;
  }

  accountSubmitting.value = true;

  try {
    const accountName = accountForm.value.name.trim();
    const toast = editingAccountId.value
      ? buildBankingSuccessToast('account', accountName, 'updated')
      : buildBankingSuccessToast('account', accountName, 'created');

    if (editingAccountId.value) {
      await trpc.account.update.mutate({
        id: editingAccountId.value,
        name: accountName,
        kind: accountForm.value.kind,
        ownership: accountForm.value.ownership,
        institutionId: accountForm.value.institutionId || undefined,
      });
    } else {
      await trpc.account.create.mutate({
        name: accountName,
        currency: accountForm.value.currency,
        kind: accountForm.value.kind,
        ownership: accountForm.value.ownership,
        institutionId: accountForm.value.institutionId || undefined,
      });
    }

    await refetch();
    resetAccountForm();
    resetAccountDeletion();
    showToast({ tone: 'success', ...toast });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save account.';

    accountError.value = message;
    showToast({
      tone: 'error',
      title: editingAccountId.value ? 'Account update failed' : 'Account creation failed',
      description: message,
    });
  } finally {
    accountSubmitting.value = false;
  }
}

async function submitInstitution(): Promise<void> {
  institutionError.value = validateInstitutionDraft(institutionForm.value);

  if (institutionError.value) {
    return;
  }

  institutionSubmitting.value = true;

  try {
    const payload = {
      name: institutionForm.value.name.trim(),
      code: normalizeInstitutionCode(institutionForm.value.code),
    };

    const institutionName = payload.name;

    const institution = editingInstitutionId.value
      ? await trpc.account.updateInstitution.mutate({
          id: editingInstitutionId.value,
          ...payload,
        })
      : await trpc.account.createInstitution.mutate(payload);

    const toast = buildBankingSuccessToast(
      'institution',
      institutionName,
      editingInstitutionId.value ? 'updated' : 'created',
    );

    if (!editingInstitutionId.value) {
      accountForm.value.institutionId = institution.id;
    }

    await refetch();
    resetInstitutionForm();
    resetInstitutionDeletion();
    showToast({ tone: 'success', ...toast });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save institution.';

    institutionError.value = message;
    showToast({
      tone: 'error',
      title: editingInstitutionId.value ? 'Institution update failed' : 'Institution creation failed',
      description: message,
    });
  } finally {
    institutionSubmitting.value = false;
  }
}

async function confirmAccountDeletion(accountId: string): Promise<void> {
  const row = accountRows.value.find((item) => item.account.id === accountId);

  if (!row) {
    accountDeleteError.value = 'Account not found.';
    return;
  }

  activeSection.value = 'accounts';
  pendingAccountDeletionId.value = accountId;
  pendingAccountDeletionCheck.value = null;
  accountDeleteReviewing.value = true;
  accountDeleteError.value = null;

  try {
    pendingAccountDeletionCheck.value = await trpc.account.getDeletionState.query({ id: accountId });
  } catch (err) {
    pendingAccountDeletionCheck.value = null;
    const message = err instanceof Error ? err.message : 'Failed to load account deletion details.';

    accountDeleteError.value = message;
    showToast({
      tone: 'error',
      title: 'Account delete check failed',
      description: message,
    });
  } finally {
    accountDeleteReviewing.value = false;
  }
}

async function deleteAccount(): Promise<void> {
  const row = pendingAccountDeletionRow.value;
  const deletionState = pendingAccountDeletionState.value;

  if (!row || !deletionState) {
    accountDeleteError.value = 'Account not found.';
    return;
  }

  if (!deletionState.canDelete) {
    accountDeleteError.value = pendingAccountDeletionCheck.value?.message ?? deletionState.description;
    return;
  }

  accountDeleting.value = true;
  accountDeleteError.value = null;

  try {
    await trpc.account.delete.mutate({ id: row.account.id });
    const toast = buildBankingSuccessToast('account', row.account.name, 'deleted');

    if (editingAccountId.value === row.account.id) {
      resetAccountForm();
    }

    await refetch();
    resetAccountDeletion();
    showToast({ tone: 'success', ...toast });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete account.';

    accountDeleteError.value = message;
    showToast({
      tone: 'error',
      title: 'Account delete failed',
      description: message,
    });
  } finally {
    accountDeleting.value = false;
  }
}

async function deleteInstitution(): Promise<void> {
  const row = pendingInstitutionDeletionRow.value;
  const deletionState = pendingInstitutionDeletionState.value;

  if (!row || !deletionState) {
    institutionDeleteError.value = 'Institution not found.';
    return;
  }

  if (!deletionState.canDelete) {
    institutionDeleteError.value = deletionState.description;
    return;
  }

  institutionDeleting.value = true;
  institutionDeleteError.value = null;

  try {
    await trpc.account.deleteInstitution.mutate({ id: row.institution.id });
    const toast = buildBankingSuccessToast('institution', row.institution.name, 'deleted');

    if (editingInstitutionId.value === row.institution.id) {
      resetInstitutionForm();
    }

    if (accountForm.value.institutionId === row.institution.id) {
      accountForm.value.institutionId = '';
    }

    await refetch();
    resetInstitutionDeletion();
    showToast({ tone: 'success', ...toast });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete institution.';

    institutionDeleteError.value = message;
    showToast({
      tone: 'error',
      title: 'Institution delete failed',
      description: message,
    });
  } finally {
    institutionDeleting.value = false;
  }
}

async function archiveAccount(accountId: string): Promise<void> {
  accountSubmitting.value = true;
  accountError.value = null;

  try {
    await trpc.account.archive.mutate({ id: accountId });
    const account = accounts.value.find((item) => item.id === accountId);

    if (editingAccountId.value === accountId) {
      resetAccountForm();
    }

    if (pendingAccountDeletionId.value === accountId) {
      resetAccountDeletion();
    }

    await refetch();

    if (account) {
      const toast = buildBankingSuccessToast('account', account.name, 'archived');
      showToast({ tone: 'success', ...toast });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to archive account.';

    accountError.value = message;
    showToast({
      tone: 'error',
      title: 'Account archive failed',
      description: message,
    });
  } finally {
    accountSubmitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-4 lg:space-y-6">
    <ResponsivePageHeader
      title="Banking"
      subtitle="Manage the institutions behind your money and keep every account ready for transactions, transfers, recurring charges, and installments from one place."
    >
      <template #actions>
        <button
          type="button"
          class="inline-flex w-full items-center justify-center gap-2 rounded-base border px-3 py-2 text-sm transition-colors sm:w-auto"
          :class="activeSection === 'accounts' ? 'border-accent-gold text-accent-gold' : 'border-border-default text-text-secondary hover:bg-bg-card hover:text-text-primary'"
          @click="activeSection = 'accounts'"
        >
          <Wallet :size="16" />
          Accounts
        </button>

        <button
          type="button"
          class="inline-flex w-full items-center justify-center gap-2 rounded-base border px-3 py-2 text-sm transition-colors sm:w-auto"
          :class="activeSection === 'institutions' ? 'border-accent-gold text-accent-gold' : 'border-border-default text-text-secondary hover:bg-bg-card hover:text-text-primary'"
          @click="activeSection = 'institutions'"
        >
          <Building2 :size="16" />
          Institutions
        </button>

        <button
          type="button"
          class="inline-flex w-full items-center justify-center gap-2 rounded-base bg-accent-gold px-3 py-2 text-sm font-medium text-bg-primary transition-colors hover:bg-accent-gold/90 sm:w-auto"
          @click="router.push('/transactions/create')"
        >
          <ChevronRight :size="16" />
          New transaction
        </button>
      </template>
    </ResponsivePageHeader>

    <section class="grid gap-3 md:grid-cols-3">
      <article class="rounded-base border border-border-default bg-bg-card p-4">
        <p class="text-xs uppercase tracking-wide text-text-muted">Active accounts</p>
        <p class="mt-3 text-2xl font-semibold text-text-primary">{{ activeAccountsCount }}</p>
        <p class="mt-1 text-xs text-text-muted">Available for new writes and transfer flows.</p>
      </article>

      <article class="rounded-base border border-border-default bg-bg-card p-4">
        <p class="text-xs uppercase tracking-wide text-text-muted">Archived accounts</p>
        <p class="mt-3 text-2xl font-semibold text-text-primary">{{ archivedAccountsCount }}</p>
        <p class="mt-1 text-xs text-text-muted">Still readable in history and included in balance summaries.</p>
      </article>

      <article class="rounded-base border border-border-default bg-bg-card p-4">
        <p class="text-xs uppercase tracking-wide text-text-muted">Linked institutions</p>
        <p class="mt-3 text-2xl font-semibold text-text-primary">{{ linkedInstitutionsCount }}</p>
        <p class="mt-1 text-xs text-text-muted">Reusable institution metadata across all accounts.</p>
      </article>
    </section>

    <section class="grid gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <div class="rounded-base border border-border-default bg-bg-card p-4">
        <div v-if="activeSection === 'accounts'" class="space-y-4">
          <div>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-sm font-medium text-text-primary">
                  {{ editingAccountId ? 'Edit account' : 'Create account' }}
                </h2>
                <p class="mt-1 text-xs text-text-muted">
                  Accounts become the trusted home for every new transaction, transfer, recurring payment, and installment obligation.
                </p>
              </div>

              <button
                v-if="editingAccountId"
                type="button"
                class="rounded-base border border-border-default px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
                @click="resetAccountForm"
              >
                Cancel
              </button>
            </div>
          </div>

          <form class="space-y-3" @submit.prevent="submitAccount">
            <input v-model="accountForm.name" type="text" :class="fieldClass" placeholder="Main checking" />

            <select v-model="accountForm.kind" :class="fieldClass">
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="cash">Cash</option>
              <option value="credit">Credit</option>
            </select>

            <div class="space-y-2">
              <select v-model="accountForm.ownership" :class="fieldClass">
                <option value="self">My account</option>
                <option value="custodial">Custodial</option>
                <option value="third_party">Third-party destination</option>
              </select>

              <p class="text-xs text-text-muted">
                {{ describeAccountOwnership(accountForm.ownership) }}
              </p>
            </div>

            <template v-if="editingAccountId === null">
              <select v-model="accountForm.currency" :class="fieldClass">
                <option :value="CurrencyEnum.USD">USD</option>
                <option :value="CurrencyEnum.EUR">EUR</option>
                <option :value="CurrencyEnum.UYU">UYU</option>
              </select>
            </template>

            <div v-else class="rounded-base border border-border-default/60 bg-bg-primary/60 px-3 py-2">
              <p class="text-xs uppercase tracking-wide text-text-muted">Currency</p>
              <p class="mt-1 text-sm text-text-primary">{{ accountForm.currency }}</p>
              <p class="mt-1 text-xs text-text-muted">
                Currency stays fixed after creation so existing account history remains trustworthy.
              </p>
            </div>

            <div class="space-y-2">
              <select v-model="accountForm.institutionId" :class="fieldClass">
                <option value="">No institution</option>
                <option v-for="institution in institutions" :key="institution.id" :value="institution.id">
                  {{ institution.name }}
                </option>
              </select>

              <button
                type="button"
                class="inline-flex items-center gap-1 text-xs text-accent-gold transition-colors hover:text-accent-gold/80"
                @click="activeSection = 'institutions'"
              >
                <Building2 :size="12" />
                Manage institutions
              </button>
            </div>

            <p v-if="accountError" class="text-xs text-accent-red">{{ accountError }}</p>

            <button
              type="submit"
              :disabled="accountSubmitting"
              class="inline-flex w-full items-center justify-center gap-2 rounded-base bg-accent-gold px-4 py-2 text-sm font-medium text-bg-primary transition-colors hover:bg-accent-gold/90 disabled:opacity-50"
            >
              <Loader2 v-if="accountSubmitting" :size="14" class="animate-spin" />
              {{ accountSubmitLabel }}
            </button>
          </form>

        </div>

        <div v-else class="space-y-4">
          <div>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-sm font-medium text-text-primary">
                  {{ editingInstitutionId ? 'Edit institution' : 'Create institution' }}
                </h2>
                <p class="mt-1 text-xs text-text-muted">
                  Create reusable institution records once, then attach them cleanly to any account without treating them like hidden metadata.
                </p>
              </div>

              <button
                v-if="editingInstitutionId"
                type="button"
                class="rounded-base border border-border-default px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
                @click="resetInstitutionForm"
              >
                Cancel
              </button>
            </div>
          </div>

          <form class="space-y-3" @submit.prevent="submitInstitution">
            <input v-model="institutionForm.name" type="text" :class="fieldClass" placeholder="Neighborhood credit union" />

            <input v-model="institutionForm.code" type="text" :class="fieldClass" placeholder="NCU" />

            <p class="text-xs text-text-muted">
              Codes are optional and stored in uppercase when provided.
            </p>

            <p v-if="institutionError" class="text-xs text-accent-red">{{ institutionError }}</p>

            <button
              type="submit"
              :disabled="institutionSubmitting"
              class="inline-flex w-full items-center justify-center gap-2 rounded-base bg-accent-gold px-4 py-2 text-sm font-medium text-bg-primary transition-colors hover:bg-accent-gold/90 disabled:opacity-50"
            >
              <Loader2 v-if="institutionSubmitting" :size="14" class="animate-spin" />
              {{ institutionSubmitLabel }}
            </button>
          </form>

        </div>
      </div>

      <div class="rounded-base border border-border-default bg-bg-card p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-sm font-medium text-text-primary">
              {{ activeSection === 'accounts' ? 'Accounts overview' : 'Institutions overview' }}
            </h2>
            <p class="mt-1 text-xs text-text-muted">
              {{
                activeSection === 'accounts'
                  ? 'Balances are server-derived from linked transactions, and archived accounts remain visible in history.'
                  : 'Linked-account counts help you clean up institutions before assigning them across multiple accounts.'
              }}
            </p>
          </div>

          <span class="text-xs text-text-muted">
            {{ activeSection === 'accounts' ? `${accountRows.length} accounts` : `${institutionRows.length} institutions` }}
          </span>
        </div>

        <div v-if="loading" class="mt-4 text-sm text-text-muted">
          Loading {{ activeSection === 'accounts' ? 'accounts' : 'institutions' }}...
        </div>

        <template v-else-if="activeSection === 'accounts'">
          <div
            v-if="accountRows.length === 0"
            class="mt-4 rounded-base border border-dashed border-border-default p-6 text-center text-sm text-text-muted"
          >
            No accounts yet. Create one before adding new transactions or transfers.
          </div>

          <div
            v-else
            class="mt-4 grid gap-3 md:grid-cols-2"
            :class="accountCardLayout.preserveNeighborHeight ? 'items-start' : undefined"
          >
            <article
              v-for="row in accountRows"
              :key="row.account.id"
              class="rounded-base border p-4"
              :class="row.account.archivedAt ? 'border-border-default/60 bg-bg-primary/40 opacity-80' : 'border-border-default bg-bg-primary/70'"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <Landmark :size="16" class="text-accent-gold" />
                    <h3 class="truncate text-sm font-medium text-text-primary">{{ row.account.name }}</h3>
                  </div>

                  <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                    <span>{{ row.account.currency }}</span>
                    <span class="rounded-full bg-bg-card px-2 py-1 text-[11px] text-text-secondary">
                      {{ row.account.kind }}
                    </span>
                    <span class="rounded-full bg-bg-card px-2 py-1 text-[11px] text-text-secondary">
                      {{ formatAccountOwnership(row.account.ownership) }}
                    </span>
                    <span>{{ createInstitutionSelectLabel(row.account) }}</span>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    v-if="row.account.archivedAt === null"
                    type="button"
                    class="inline-flex items-center gap-1 rounded-base border border-border-default px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary"
                    @click="editAccount(row.account.id)"
                  >
                    <PencilLine :size="12" />
                    Edit
                  </button>

                  <button
                    v-if="row.account.archivedAt === null"
                    type="button"
                    class="inline-flex items-center gap-1 rounded-base border border-border-default px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary"
                    @click="archiveAccount(row.account.id)"
                  >
                    <Archive :size="12" />
                    Archive
                  </button>

                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-base border border-border-default px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary"
                    @click="confirmAccountDeletion(row.account.id)"
                  >
                    <Trash2 :size="12" />
                    Delete
                  </button>

                  <span v-if="row.account.archivedAt !== null" class="rounded-full bg-bg-card px-2 py-1 text-[11px] text-text-muted">
                    Archived
                  </span>
                </div>
              </div>

              <p class="mt-4 font-mono text-lg text-text-primary">
                {{ formatCurrency(row.summary?.currentBalance ?? 0, row.account.currency) }}
              </p>

              <p class="mt-1 text-xs text-text-muted">
                {{ row.summary?.lastTransactionDate ? `Last activity ${formatDate(row.summary.lastTransactionDate)}` : 'No linked transactions yet' }}
              </p>

              <p class="mt-1 text-xs text-text-muted">
                {{ describeAccountOwnership(row.account.ownership) }}
              </p>

              <p v-if="row.account.archivedAt" class="mt-1 text-xs text-text-muted">
                Archived {{ formatDate(row.account.archivedAt.toString()) }}
              </p>

              <section
                v-if="pendingAccountDeletionId === row.account.id"
                class="mt-4 rounded-base border border-accent-red/40 bg-accent-red/5 p-4"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <template v-if="accountDeleteReviewing">
                      <h4 class="text-sm font-medium text-text-primary">Checking delete safety...</h4>
                      <p class="mt-1 text-xs text-text-muted">
                        Confirming whether {{ row.account.name }} can be permanently deleted without breaking linked history.
                      </p>
                    </template>

                    <template v-else-if="pendingAccountDeletionState">
                      <h4 class="text-sm font-medium text-text-primary">
                        {{ pendingAccountDeletionState.title }}
                      </h4>
                      <p class="mt-1 text-xs text-text-muted">
                        {{ pendingAccountDeletionState.description }}
                      </p>
                      <p class="mt-2 text-xs text-text-muted">
                        {{ pendingAccountDeletionCheck?.message }}
                      </p>
                    </template>

                    <template v-else>
                      <h4 class="text-sm font-medium text-text-primary">Delete details unavailable</h4>
                      <p class="mt-1 text-xs text-text-muted">
                        We could not confirm whether {{ row.account.name }} is safe to delete yet. Retry the check or keep the account archived for now.
                      </p>
                    </template>
                  </div>

                  <button
                    type="button"
                    class="rounded-base border border-border-default px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
                    @click="resetAccountDeletion"
                  >
                    Cancel
                  </button>
                </div>

                <ul
                  v-if="pendingAccountDeletionState && pendingAccountDeletionState.blockerSummary.length > 0"
                  class="mt-4 space-y-1 text-xs text-text-muted"
                >
                  <li v-for="blocker in pendingAccountDeletionState.blockerSummary" :key="blocker">
                    - {{ blocker }}
                  </li>
                </ul>

                <p v-if="accountDeleteError" class="mt-4 text-xs text-accent-red">{{ accountDeleteError }}</p>

                <div v-if="accountDeleteReviewing" class="mt-4 inline-flex items-center gap-2 text-xs text-text-muted">
                  <Loader2 :size="14" class="animate-spin" />
                  Loading delete details...
                </div>

                <div v-else class="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    :disabled="accountDeleting || !pendingAccountDeletionState?.canDelete"
                    class="inline-flex w-full items-center justify-center gap-2 rounded-base border border-accent-red/40 px-4 py-2 text-sm font-medium text-accent-red transition-colors hover:bg-accent-red/10 disabled:cursor-not-allowed disabled:opacity-50"
                    @click="deleteAccount"
                  >
                    <Loader2 v-if="accountDeleting" :size="14" class="animate-spin" />
                    <Trash2 v-else :size="14" />
                    {{ pendingAccountDeletionState?.confirmLabel ?? 'Delete account' }}
                  </button>

                  <button
                    v-if="pendingAccountDeletionState?.archiveInsteadLabel && row.account.archivedAt === null"
                    type="button"
                    class="inline-flex w-full items-center justify-center gap-2 rounded-base border border-border-default px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
                    @click="archiveAccount(row.account.id)"
                  >
                    <Archive :size="14" />
                    {{ pendingAccountDeletionState.archiveInsteadLabel }}
                  </button>
                </div>
              </section>
            </article>
          </div>
        </template>

        <template v-else>
          <div
            v-if="institutionRows.length === 0"
            class="mt-4 rounded-base border border-dashed border-border-default p-6 text-center text-sm text-text-muted"
          >
            No institutions yet. Create one now so account creation stays clean and reusable.
          </div>

          <div v-else class="mt-4 grid gap-3 md:grid-cols-2">
            <article
              v-for="row in institutionRows"
              :key="row.institution.id"
              class="rounded-base border border-border-default bg-bg-primary/70 p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <Building2 :size="16" class="text-accent-gold" />
                    <h3 class="truncate text-sm font-medium text-text-primary">{{ row.institution.name }}</h3>
                  </div>

                  <p class="mt-2 text-xs text-text-muted">
                    {{ row.institution.code ? `Code ${row.institution.code}` : 'No institution code' }}
                  </p>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-base border border-border-default px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary"
                    @click="editInstitution(row.institution.id)"
                  >
                    <PencilLine :size="12" />
                    Edit
                  </button>

                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-base border border-border-default px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary"
                    @click="confirmInstitutionDeletion(row.institution.id)"
                  >
                    <Trash2 :size="12" />
                    Delete
                  </button>
                </div>
              </div>

              <div class="mt-4 grid gap-2 text-xs text-text-muted sm:grid-cols-3">
                <div>
                  <p class="uppercase tracking-wide">Linked</p>
                  <p class="mt-1 text-sm text-text-primary">{{ row.linkedAccounts }}</p>
                </div>

                <div>
                  <p class="uppercase tracking-wide">Active</p>
                  <p class="mt-1 text-sm text-text-primary">{{ row.activeAccounts }}</p>
                </div>

                <div>
                  <p class="uppercase tracking-wide">Archived</p>
                  <p class="mt-1 text-sm text-text-primary">{{ row.archivedAccounts }}</p>
                </div>
              </div>

              <p class="mt-4 text-xs text-text-muted">
                {{ row.currencies.length > 0 ? `Currencies: ${row.currencies.join(', ')}` : 'No accounts assigned yet.' }}
              </p>

              <section
                v-if="pendingInstitutionDeletionId === row.institution.id && pendingInstitutionDeletionState"
                class="mt-4 rounded-base border border-accent-red/40 bg-accent-red/5 p-4"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h4 class="text-sm font-medium text-text-primary">
                      {{ pendingInstitutionDeletionState.title }}
                    </h4>
                    <p class="mt-1 text-xs text-text-muted">
                      {{ pendingInstitutionDeletionState.description }}
                    </p>
                  </div>

                  <button
                    type="button"
                    class="rounded-base border border-border-default px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
                    @click="resetInstitutionDeletion"
                  >
                    Cancel
                  </button>
                </div>

                <div class="mt-4 grid gap-2 text-xs text-text-muted sm:grid-cols-3">
                  <div>
                    <p class="uppercase tracking-wide">Linked</p>
                    <p class="mt-1 text-sm text-text-primary">{{ row.linkedAccounts }}</p>
                  </div>

                  <div>
                    <p class="uppercase tracking-wide">Active</p>
                    <p class="mt-1 text-sm text-text-primary">{{ row.activeAccounts }}</p>
                  </div>

                  <div>
                    <p class="uppercase tracking-wide">Archived</p>
                    <p class="mt-1 text-sm text-text-primary">{{ row.archivedAccounts }}</p>
                  </div>
                </div>

                <p v-if="institutionDeleteError" class="mt-4 text-xs text-accent-red">{{ institutionDeleteError }}</p>

                <button
                  type="button"
                  :disabled="institutionDeleting || !pendingInstitutionDeletionState.canDelete"
                  class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-base border border-accent-red/40 px-4 py-2 text-sm font-medium text-accent-red transition-colors hover:bg-accent-red/10 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="deleteInstitution"
                >
                  <Loader2 v-if="institutionDeleting" :size="14" class="animate-spin" />
                  <Trash2 v-else :size="14" />
                  {{ pendingInstitutionDeletionState.confirmLabel }}
                </button>
              </section>
            </article>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>
