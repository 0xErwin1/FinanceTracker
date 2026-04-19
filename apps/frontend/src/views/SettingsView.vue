<script setup lang="ts">
import { CurrencyEnum } from '@expenses/api';
import { Lock, LogOut, Save, User } from 'lucide-vue-next';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { trpc } from '@/api/trpc';
import ResponsivePageHeader from '@/components/base/ResponsivePageHeader.vue';
import { useAuth } from '@/composables/useAuth';

const router = useRouter();
const auth = useAuth();

// --- Profile editing ---
const editingProfile = ref(false);
const profileLoading = ref(false);
const profileError = ref<string | null>(null);
const profileSuccess = ref(false);

const editFirstName = ref(auth.user.value?.firstName ?? '');
const editLastName = ref(auth.user.value?.lastName ?? '');

function startEditProfile() {
  editFirstName.value = auth.user.value?.firstName ?? '';
  editLastName.value = auth.user.value?.lastName ?? '';
  editingProfile.value = true;
  profileError.value = null;
  profileSuccess.value = false;
}

async function saveProfile() {
  profileLoading.value = true;
  profileError.value = null;
  profileSuccess.value = false;

  try {
    await trpc.user.updateProfile.mutate({
      firstName: editFirstName.value,
      lastName: editLastName.value,
    });
    await auth.fetchUser();
    editingProfile.value = false;
    profileSuccess.value = true;
    setTimeout(() => {
      profileSuccess.value = false;
    }, 3000);
  } catch (err) {
    profileError.value = err instanceof Error ? err.message : 'Failed to update profile';
  } finally {
    profileLoading.value = false;
  }
}

// --- Password change ---
const showPasswordForm = ref(false);
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const passwordLoading = ref(false);
const passwordError = ref<string | null>(null);
const passwordSuccess = ref(false);

function startChangePassword() {
  showPasswordForm.value = true;
  currentPassword.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
  passwordError.value = null;
  passwordSuccess.value = false;
}

async function savePassword() {
  passwordError.value = null;

  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Passwords do not match';
    return;
  }

  passwordLoading.value = true;

  try {
    await trpc.user.changePassword.mutate({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });
    showPasswordForm.value = false;
    passwordSuccess.value = true;
    setTimeout(() => {
      passwordSuccess.value = false;
    }, 3000);
  } catch (err) {
    passwordError.value = err instanceof Error ? err.message : 'Failed to change password';
  } finally {
    passwordLoading.value = false;
  }
}

// --- Logout ---
async function handleLogout() {
  await auth.logout();
  router.push('/login');
}

const currencyOptions = Object.values(CurrencyEnum);
type FxRateItem = Awaited<ReturnType<typeof trpc.user.listFxRates.query>>[number];
const valuationLoading = ref(false);
const valuationError = ref<string | null>(null);
const valuationSuccess = ref(false);
const reportingCurrency = ref<CurrencyEnum | ''>(
  (auth.user.value?.reportingCurrency as CurrencyEnum | null) ?? '',
);
const valuationFreshnessDays = ref(auth.user.value?.valuationFreshnessDays ?? 3);
const fxRates = ref<FxRateItem[]>([]);
const editingFxRateId = ref<string | null>(null);
const fxBaseCurrency = ref<CurrencyEnum>(CurrencyEnum.EUR);
const fxQuoteCurrency = ref<CurrencyEnum>(CurrencyEnum.USD);
const fxRate = ref('');
const fxEffectiveDate = ref(new Date().toISOString().slice(0, 10));
const fxSourceLabel = ref('Manual rate');

async function fetchValuationSettings() {
  valuationLoading.value = true;
  valuationError.value = null;

  try {
    const [preferencesResult, fxRatesResult] = await Promise.all([
      trpc.user.getValuationPreferences.query(),
      trpc.user.listFxRates.query(),
    ]);

    reportingCurrency.value = preferencesResult.reportingCurrency ?? '';
    valuationFreshnessDays.value = preferencesResult.valuationFreshnessDays;
    fxRates.value = fxRatesResult;
  } catch (err) {
    valuationError.value = err instanceof Error ? err.message : 'Failed to load valuation settings';
  } finally {
    valuationLoading.value = false;
  }
}

function resetFxRateForm() {
  editingFxRateId.value = null;
  fxBaseCurrency.value = CurrencyEnum.EUR;
  fxQuoteCurrency.value = CurrencyEnum.USD;
  fxRate.value = '';
  fxEffectiveDate.value = new Date().toISOString().slice(0, 10);
  fxSourceLabel.value = 'Manual rate';
}

function startEditFxRate(rate: FxRateItem) {
  editingFxRateId.value = rate.id;
  fxBaseCurrency.value = rate.baseCurrency;
  fxQuoteCurrency.value = rate.quoteCurrency;
  fxRate.value = String(rate.rate);
  fxEffectiveDate.value = rate.effectiveDate;
  fxSourceLabel.value = rate.sourceLabel;
}

async function saveValuationPreferences() {
  valuationLoading.value = true;
  valuationError.value = null;
  valuationSuccess.value = false;

  try {
    await trpc.user.updateValuationPreferences.mutate({
      reportingCurrency: reportingCurrency.value || null,
      valuationFreshnessDays: valuationFreshnessDays.value,
    });
    await auth.fetchUser();
    await fetchValuationSettings();
    valuationSuccess.value = true;
  } catch (err) {
    valuationError.value = err instanceof Error ? err.message : 'Failed to save valuation preferences';
  } finally {
    valuationLoading.value = false;
  }
}

async function saveFxRate() {
  valuationLoading.value = true;
  valuationError.value = null;
  valuationSuccess.value = false;

  try {
    const payload = {
      rate: Number(fxRate.value),
      effectiveDate: fxEffectiveDate.value,
      sourceLabel: fxSourceLabel.value,
    };

    if (editingFxRateId.value) {
      await trpc.user.updateFxRate.mutate({ id: editingFxRateId.value, ...payload });
    } else {
      await trpc.user.createFxRate.mutate({
        baseCurrency: fxBaseCurrency.value,
        quoteCurrency: fxQuoteCurrency.value,
        ...payload,
      });
    }

    resetFxRateForm();
    await fetchValuationSettings();
    valuationSuccess.value = true;
  } catch (err) {
    valuationError.value = err instanceof Error ? err.message : 'Failed to save FX rate';
  } finally {
    valuationLoading.value = false;
  }
}

async function removeFxRate(id: string) {
  valuationLoading.value = true;
  valuationError.value = null;

  try {
    await trpc.user.deleteFxRate.mutate({ id });
    await fetchValuationSettings();
  } catch (err) {
    valuationError.value = err instanceof Error ? err.message : 'Failed to delete FX rate';
  } finally {
    valuationLoading.value = false;
  }
}

void fetchValuationSettings();
</script>

<template>
  <div class="max-w-3xl space-y-4 lg:space-y-6">
    <ResponsivePageHeader
      title="Settings"
      subtitle="Manage profile, password, and account actions with forms that stay readable on small screens."
    />

    <!-- Success banner -->
    <div
      v-if="profileSuccess || passwordSuccess"
      class="bg-accent-green/10 border border-accent-green/30 text-accent-green text-sm rounded-base px-4 py-3"
    >
      Updated successfully.
    </div>

    <!-- Profile card -->
    <div class="rounded-base border border-border-default bg-bg-surface p-5 space-y-4 sm:p-6">
      <div class="flex items-center gap-3">
        <User :size="20" class="text-accent-gold" />
        <h2 class="text-base font-semibold text-text-primary">Profile</h2>
      </div>

      <div v-if="!editingProfile" class="space-y-3">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p class="text-xs text-text-muted mb-1">First Name</p>
            <p class="text-sm text-text-primary">
              {{ auth.user.value?.firstName ?? '--' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-text-muted mb-1">Last Name</p>
            <p class="text-sm text-text-primary">
              {{ auth.user.value?.lastName ?? '--' }}
            </p>
          </div>
        </div>
        <div>
          <p class="text-xs text-text-muted mb-1">Email</p>
          <p class="text-sm text-text-primary">
            {{ auth.user.value?.email ?? '--' }}
          </p>
        </div>
        <button
          class="text-sm text-accent-gold hover:underline"
          @click="startEditProfile"
        >
          Edit name
        </button>
      </div>

      <form v-else class="space-y-3" @submit.prevent="saveProfile">
        <div
          v-if="profileError"
          class="bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm rounded-base px-4 py-3"
        >
          {{ profileError }}
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="space-y-1.5">
            <label class="block text-sm text-text-secondary">First Name</label>
            <input
              v-model="editFirstName"
              type="text"
              required
              class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50"
            />
          </div>
          <div class="space-y-1.5">
            <label class="block text-sm text-text-secondary">Last Name</label>
            <input
              v-model="editLastName"
              type="text"
              required
              class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50"
            />
          </div>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
            @click="editingProfile = false"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="profileLoading"
            class="flex items-center gap-2 px-4 py-2 text-sm bg-accent-gold text-bg-primary font-semibold rounded-base hover:opacity-90 disabled:opacity-50"
          >
            <Save :size="14" />
            {{ profileLoading ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Password card -->
    <div class="rounded-base border border-border-default bg-bg-surface p-5 space-y-4 sm:p-6">
      <div class="flex items-center gap-3">
        <Lock :size="20" class="text-accent-gold" />
        <h2 class="text-base font-semibold text-text-primary">Password</h2>
      </div>

      <div v-if="!showPasswordForm">
        <button
          class="text-sm text-accent-gold hover:underline"
          @click="startChangePassword"
        >
          Change password
        </button>
      </div>

      <form v-else class="space-y-3" @submit.prevent="savePassword">
        <div
          v-if="passwordError"
          class="bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm rounded-base px-4 py-3"
        >
          {{ passwordError }}
        </div>
        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">
            Current Password
          </label>
          <input
            v-model="currentPassword"
            type="password"
            required
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50"
          />
        </div>
        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">
            New Password
          </label>
          <input
            v-model="newPassword"
            type="password"
            required
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50"
          />
        </div>
        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">
            Confirm New Password
          </label>
          <input
            v-model="confirmPassword"
            type="password"
            required
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50"
          />
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
            @click="showPasswordForm = false"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="passwordLoading"
            class="flex items-center gap-2 px-4 py-2 text-sm bg-accent-gold text-bg-primary font-semibold rounded-base hover:opacity-90 disabled:opacity-50"
          >
            <Save :size="14" />
            {{ passwordLoading ? 'Changing...' : 'Change Password' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Account card -->
    <div class="rounded-base border border-border-default bg-bg-surface p-5 space-y-4 sm:p-6">
      <div class="flex items-center gap-3">
        <LogOut :size="20" class="text-accent-gold" />
        <h2 class="text-base font-semibold text-text-primary">Account</h2>
      </div>
      <button
        class="flex items-center gap-2 px-4 py-2 text-sm bg-accent-red/10 text-accent-red border border-accent-red/30 rounded-base hover:bg-accent-red/20 transition-colors"
        @click="handleLogout"
      >
        <LogOut :size="14" />
        Sign Out
      </button>
    </div>

    <div class="rounded-base border border-border-default bg-bg-surface p-5 space-y-4 sm:p-6">
      <div class="flex items-center gap-3">
        <Save :size="20" class="text-accent-gold" />
        <h2 class="text-base font-semibold text-text-primary">Estimated valuation</h2>
      </div>

      <p class="text-sm text-text-muted">
        Native balances remain authoritative. Reporting currency and manual FX rates only power explicitly estimated totals.
      </p>

      <div
        v-if="valuationError"
        class="bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm rounded-base px-4 py-3"
      >
        {{ valuationError }}
      </div>

      <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="saveValuationPreferences">
        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Reporting currency</label>
          <select
            v-model="reportingCurrency"
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50"
          >
            <option value="">None</option>
            <option v-for="currency in currencyOptions" :key="currency" :value="currency">{{ currency }}</option>
          </select>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Freshness window (days)</label>
          <input
            v-model.number="valuationFreshnessDays"
            type="number"
            min="0"
            max="365"
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50"
          />
        </div>

        <div class="sm:col-span-2 flex justify-end">
          <button
            type="submit"
            :disabled="valuationLoading"
            class="flex items-center gap-2 px-4 py-2 text-sm bg-accent-gold text-bg-primary font-semibold rounded-base hover:opacity-90 disabled:opacity-50"
          >
            <Save :size="14" />
            Save valuation preferences
          </button>
        </div>
      </form>

      <div class="rounded-base border border-border-default bg-bg-card p-4 space-y-4">
        <div>
          <h3 class="text-sm font-semibold text-text-primary">Manual FX rates</h3>
          <p class="mt-1 text-xs text-text-muted">
            Add or edit the latest manual rate per currency pair. Provider-based ingestion stays deferred.
          </p>
        </div>

        <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="saveFxRate">
          <div class="space-y-1.5">
            <label class="block text-sm text-text-secondary">Base currency</label>
            <select
              v-model="fxBaseCurrency"
              :disabled="editingFxRateId !== null"
              class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50 disabled:opacity-60"
            >
              <option v-for="currency in currencyOptions" :key="`base-${currency}`" :value="currency">{{ currency }}</option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label class="block text-sm text-text-secondary">Quote currency</label>
            <select
              v-model="fxQuoteCurrency"
              :disabled="editingFxRateId !== null"
              class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50 disabled:opacity-60"
            >
              <option v-for="currency in currencyOptions" :key="`quote-${currency}`" :value="currency">{{ currency }}</option>
            </select>
          </div>

          <div class="space-y-1.5">
            <label class="block text-sm text-text-secondary">Rate</label>
            <input
              v-model="fxRate"
              type="number"
              min="0"
              step="0.00000001"
              required
              class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50"
            />
          </div>

          <div class="space-y-1.5">
            <label class="block text-sm text-text-secondary">Effective date</label>
            <input
              v-model="fxEffectiveDate"
              type="date"
              required
              class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50"
            />
          </div>

          <div class="space-y-1.5 sm:col-span-2">
            <label class="block text-sm text-text-secondary">Source label</label>
            <input
              v-model="fxSourceLabel"
              type="text"
              required
              class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50"
            />
          </div>

          <div class="sm:col-span-2 flex gap-3 justify-end">
            <button type="button" class="px-4 py-2 text-sm text-text-secondary hover:text-text-primary" @click="resetFxRateForm">
              Reset
            </button>
            <button
              type="submit"
              :disabled="valuationLoading"
              class="flex items-center gap-2 px-4 py-2 text-sm bg-accent-gold text-bg-primary font-semibold rounded-base hover:opacity-90 disabled:opacity-50"
            >
              <Save :size="14" />
              {{ editingFxRateId ? 'Update FX rate' : 'Add FX rate' }}
            </button>
          </div>
        </form>

        <div v-if="valuationLoading" class="text-sm text-text-muted">Loading valuation settings...</div>

        <div v-else-if="fxRates.length === 0" class="text-sm text-text-muted">
          No manual FX rates saved yet.
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="rate in fxRates"
            :key="rate.id"
            class="rounded-base border border-border-default bg-bg-surface px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p class="text-sm text-text-primary">{{ rate.baseCurrency }}/{{ rate.quoteCurrency }} · {{ rate.rate }}</p>
              <p class="text-xs text-text-muted">{{ rate.effectiveDate }} · {{ rate.sourceLabel }}</p>
            </div>

            <div class="flex gap-3 text-sm">
              <button class="text-accent-gold hover:underline" @click="startEditFxRate(rate)">Edit</button>
              <button class="text-accent-red hover:underline" @click="removeFxRate(rate.id)">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
