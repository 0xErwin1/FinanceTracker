<script setup lang="ts">
import { ArrowLeft, Mail } from 'lucide-vue-next';
import { ref } from 'vue';
import { RouterLink } from 'vue-router';

const email = ref('');
const submitted = ref(false);

function handleSubmit() {
  submitted.value = true;
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center overflow-y-auto bg-bg-primary px-4 py-6 sm:px-6 sm:py-10">
    <div class="w-full max-w-md">
      <div class="mb-6 text-center sm:mb-8">
        <h1 class="text-3xl font-bold tracking-widest text-accent-gold">
          VAULTLY
        </h1>
        <p class="mt-1 font-mono text-xs text-text-muted">
          PASSWORD RECOVERY
        </p>
      </div>

      <form
        class="space-y-5 rounded-base border border-border-default bg-bg-surface p-5 sm:p-6"
        @submit.prevent="handleSubmit"
      >
        <div class="rounded-base border border-accent-blue/30 bg-accent-blue/10 px-4 py-3 text-sm text-text-secondary">
          Enter your email to continue. This environment does not yet send recovery emails, but this
          responsive flow is reserved for the recovery/reset experience.
        </div>

        <div v-if="submitted" class="rounded-base border border-accent-gold/30 bg-accent-gold/10 px-4 py-3 text-sm text-text-secondary">
          Recovery request captured for <span class="font-medium text-text-primary">{{ email }}</span>.
        </div>

        <div class="space-y-1.5">
          <label for="recovery-email" class="block text-sm text-text-secondary">Email</label>
          <div class="flex items-center gap-2 rounded-base border border-border-default bg-bg-card px-4 py-2.5">
            <Mail :size="16" class="text-text-muted" />
            <input
              id="recovery-email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              class="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <button
          type="submit"
          class="w-full rounded-base bg-accent-gold py-2.5 text-sm font-semibold text-bg-primary transition-opacity hover:opacity-90"
        >
          Continue
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
