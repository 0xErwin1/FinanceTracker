<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { trpc } from '@/api/trpc';
import ResponsivePageHeader from '@/components/base/ResponsivePageHeader.vue';
import { User, Lock, LogOut, Save } from 'lucide-vue-next';

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
  </div>
</template>
