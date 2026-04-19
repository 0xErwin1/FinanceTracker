<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import AppLayout from '@/components/layout/AppLayout.vue';
import AppToastRegion from '@/components/feedback/AppToastRegion.vue';
import { provideAuth, clearAuthState } from '@/composables/useAuth';
import { provideToast } from '@/composables/useToast';
import { setOnUnauthorized } from '@/api/trpc';
import router from '@/router';

const auth = provideAuth();
provideToast();

// Clear local auth state and navigate to login via SPA navigation.
// Uses clearAuthState() instead of auth.logout() to avoid firing an
// unnecessary POST /auth.logout request.  Uses router.push() instead
// of window.location.href to avoid a full page reload that would
// reset module-level state and re-trigger fetchUser.
setOnUnauthorized(() => {
  clearAuthState();
  if (router.currentRoute.value.path !== '/login') {
    router.push('/login');
  }
});

const initializing = ref(true);

// The router guard already called fetchUser() during the initial
// navigation, so by the time onMounted fires the auth state is
// resolved.  We only need to dismiss the loading spinner.
onMounted(() => {
  initializing.value = false;
});

const showLayout = computed(() => auth.isAuthenticated.value);
</script>

<template>
  <!-- Full-screen loading while checking session -->
  <div
    v-if="initializing"
    class="flex min-h-dvh items-center justify-center bg-bg-primary"
  >
    <div class="flex flex-col items-center gap-3">
      <div
        class="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin"
      />
      <p class="text-sm text-text-muted">Loading...</p>
    </div>
  </div>

  <!-- Authenticated: full layout with sidebar + topbar -->
  <AppLayout v-else-if="showLayout" class="min-h-dvh" />

  <!-- Unauthenticated: bare router view (LoginView) -->
  <RouterView v-else />

  <AppToastRegion />
</template>
