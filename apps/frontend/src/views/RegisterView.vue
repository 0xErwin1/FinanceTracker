<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { UserPlus } from 'lucide-vue-next';

const router = useRouter();
const auth = useAuth();

const firstName = ref('');
const lastName = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');

const loading = ref(false);
const errorMessage = ref<string | null>(null);

const passwordsMatch = computed(() => !confirmPassword.value || password.value === confirmPassword.value);

async function handleRegister() {
  errorMessage.value = null;

  if (!passwordsMatch.value) {
    errorMessage.value = 'Passwords do not match.';
    return;
  }

  loading.value = true;

  try {
    await auth.register({
      firstName: firstName.value,
      lastName: lastName.value,
      email: email.value,
      password: password.value,
    });

    await auth.login(email.value, password.value);
    router.push('/');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
    errorMessage.value = message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-bg-primary">
    <div class="w-full max-w-[400px] px-6">
      <!-- Logo -->
      <div class="mb-8 text-center">
        <h1 class="text-3xl font-bold tracking-widest text-accent-gold">
          VAULTLY
        </h1>
        <p class="mt-1 text-xs text-text-muted font-mono">
          CREATE YOUR ACCOUNT
        </p>
      </div>

      <!-- Register form -->
      <form
        class="bg-bg-surface rounded-base border border-border-default p-6 space-y-5"
        @submit.prevent="handleRegister"
      >
        <!-- Error message -->
        <div
          v-if="errorMessage"
          class="bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm rounded-base px-4 py-3"
        >
          {{ errorMessage }}
        </div>

        <!-- First name -->
        <div class="space-y-1.5">
          <label for="firstName" class="block text-sm text-text-secondary">
            First Name
          </label>
          <input
            id="firstName"
            v-model="firstName"
            type="text"
            required
            autocomplete="given-name"
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50 transition-colors"
            placeholder="John"
          />
        </div>

        <!-- Last name -->
        <div class="space-y-1.5">
          <label for="lastName" class="block text-sm text-text-secondary">
            Last Name
          </label>
          <input
            id="lastName"
            v-model="lastName"
            type="text"
            required
            autocomplete="family-name"
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50 transition-colors"
            placeholder="Doe"
          />
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
            autocomplete="new-password"
            minlength="8"
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50 transition-colors"
            placeholder="Min. 8 chars, 1 uppercase, 1 number"
          />
        </div>

        <!-- Confirm password -->
        <div class="space-y-1.5">
          <label for="confirmPassword" class="block text-sm text-text-secondary">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            required
            autocomplete="new-password"
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50 transition-colors"
            :class="{ '!border-accent-red/50': !passwordsMatch }"
            placeholder="Re-enter your password"
          />
          <p
            v-if="!passwordsMatch"
            class="text-xs text-accent-red"
          >
            Passwords do not match
          </p>
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="loading || !passwordsMatch"
          class="w-full flex items-center justify-center gap-2 bg-accent-gold text-bg-primary font-semibold text-sm py-2.5 rounded-base hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UserPlus :size="18" />
          <span v-if="loading">Creating account...</span>
          <span v-else>Create Account</span>
        </button>
      </form>

      <!-- Link to login -->
      <p class="mt-6 text-center text-sm text-text-muted">
        Already have an account?
        <router-link
          to="/login"
          class="text-accent-gold hover:underline"
        >
          Sign in
        </router-link>
      </p>
    </div>
  </div>
</template>
