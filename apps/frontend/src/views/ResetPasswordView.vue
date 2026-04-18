<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { ArrowLeft, KeyRound } from 'lucide-vue-next';

const password = ref('');
const confirmPassword = ref('');
const submitted = ref(false);

const passwordsMatch = computed(() => !confirmPassword.value || password.value === confirmPassword.value);

function handleSubmit() {
  if (!passwordsMatch.value) return;
  submitted.value = true;
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center overflow-y-auto bg-bg-primary px-4 py-6 sm:px-6 sm:py-10">
    <div class="w-full max-w-md">
      <div class="mb-6 text-center sm:mb-8">
        <h1 class="text-3xl font-bold tracking-widest text-accent-gold">VAULTLY</h1>
        <p class="mt-1 font-mono text-xs text-text-muted">RESET PASSWORD</p>
      </div>

      <form class="space-y-5 rounded-base border border-border-default bg-bg-surface p-5 sm:p-6" @submit.prevent="handleSubmit">
        <div class="rounded-base border border-accent-blue/30 bg-accent-blue/10 px-4 py-3 text-sm text-text-secondary">
          This responsive screen reserves the reset-password flow. Backend token verification is not wired in this environment yet.
        </div>

        <div v-if="submitted" class="rounded-base border border-accent-green/30 bg-accent-green/10 px-4 py-3 text-sm text-text-secondary">
          Reset form submitted locally.
        </div>

        <div class="space-y-1.5">
          <label for="new-password" class="block text-sm text-text-secondary">New Password</label>
          <div class="flex items-center gap-2 rounded-base border border-border-default bg-bg-card px-4 py-2.5">
            <KeyRound :size="16" class="text-text-muted" />
            <input
              id="new-password"
              v-model="password"
              type="password"
              required
              class="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
              placeholder="Enter a new password"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <label for="confirm-password" class="block text-sm text-text-secondary">Confirm Password</label>
          <input
            id="confirm-password"
            v-model="confirmPassword"
            type="password"
            required
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none"
            :class="{ '!border-accent-red/50': !passwordsMatch }"
            placeholder="Re-enter your password"
          />
          <p v-if="!passwordsMatch" class="text-xs text-accent-red">Passwords do not match</p>
        </div>

        <button
          type="submit"
          :disabled="!passwordsMatch"
          class="w-full rounded-base bg-accent-gold py-2.5 text-sm font-semibold text-bg-primary transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Reset Password
        </button>
      </form>

      <div class="mt-5 text-center text-sm text-text-muted sm:mt-6">
        <RouterLink to="/login" class="inline-flex items-center gap-1 text-accent-gold hover:underline">
          <ArrowLeft :size="14" />
          Back to sign in
        </RouterLink>
      </div>
    </div>
  </div>
</template>
