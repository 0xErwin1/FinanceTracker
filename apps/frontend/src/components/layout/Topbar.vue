<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Bell, Settings } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const pageTitle = computed(() => {
  return (route.name as string) || 'Dashboard';
});
</script>

<template>
  <header
    class="h-[56px] bg-bg-surface border-b border-border-default flex items-center px-6 gap-4"
  >
    <!-- Page title -->
    <h2 class="text-base font-semibold text-text-primary mr-auto">
      {{ pageTitle }}
    </h2>

    <!-- Right section -->
    <button
      class="p-2 text-text-muted hover:text-text-primary transition-colors"
      title="Notifications"
    >
      <Bell :size="18" />
    </button>
    <button
      class="p-2 text-text-muted hover:text-text-primary transition-colors"
      title="Settings"
      @click="router.push('/settings')"
    >
      <Settings :size="18" />
    </button>
  </header>
</template>
