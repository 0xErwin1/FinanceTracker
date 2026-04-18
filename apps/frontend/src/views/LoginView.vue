<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { LogIn } from 'lucide-vue-next';

const router = useRouter();
const auth = useAuth();

const email = ref('');
const password = ref('');

async function handleLogin() {
  try {
    await auth.login(email.value, password.value);
    router.push('/');
  } catch {
    // Error is displayed via auth.error
  }
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center overflow-y-auto bg-bg-primary px-4 py-6 sm:px-6 sm:py-10">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="mb-6 text-center sm:mb-8">
        <h1 class="text-3xl font-bold tracking-widest text-accent-gold">
          VAULTLY
        </h1>
        <p class="mt-1 text-xs text-text-muted font-mono">
          SIGN IN TO YOUR ACCOUNT
        </p>
      </div>

      <!-- Login form -->
      <form
        class="rounded-base border border-border-default bg-bg-surface p-5 space-y-5 sm:p-6"
        @submit.prevent="handleLogin"
      >
        <!-- Error message -->
        <div
          v-if="auth.error.value"
          class="bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm rounded-base px-4 py-3"
        >
          {{ auth.error.value }}
        </div>

        <!-- Email -->
        <div class="space-y-1.5">
          <label for="email" class="block text-sm text-text-secondary">
            Email
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50 transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <!-- Password -->
        <div class="space-y-1.5">
          <label for="password" class="block text-sm text-text-secondary">
            Password
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50 transition-colors"
            placeholder="Enter your password"
          />
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="auth.loading.value"
          class="w-full flex items-center justify-center gap-2 bg-accent-gold text-bg-primary font-semibold text-sm py-2.5 rounded-base hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogIn :size="18" />
          <span v-if="auth.loading.value">Signing in...</span>
          <span v-else>Sign In</span>
        </button>
      </form>

      <!-- Link to register -->
      <p class="mt-5 text-center text-sm text-text-muted sm:mt-6">
        Don't have an account?
        <router-link
          to="/register"
          class="text-accent-gold hover:underline"
        >
          Sign up
        </router-link>
      </p>
    </div>
  </div>
</template>
