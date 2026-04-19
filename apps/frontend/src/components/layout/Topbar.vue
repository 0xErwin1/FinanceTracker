<script setup lang="ts">
import { Bell, Menu, Settings } from 'lucide-vue-next';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

interface Props {
  showMenuButton?: boolean;
}

withDefaults(defineProps<Props>(), {
  showMenuButton: false,
});

const emit = defineEmits<{
  toggleSidebar: [];
}>();

const route = useRoute();
const router = useRouter();

const pageTitle = computed(() => {
  return (route.name as string) || 'Dashboard';
});
</script>

<template>
  <header
    class="sticky top-0 z-30 flex min-h-[56px] items-center gap-3 border-b border-border-default bg-bg-surface/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8"
  >
    <button
      v-if="showMenuButton"
      type="button"
      class="rounded-base p-2 text-text-muted transition-colors hover:bg-bg-card hover:text-text-primary shell:hidden"
      aria-label="Open navigation"
      @click="emit('toggleSidebar')"
    >
      <Menu :size="18" />
    </button>

    <div class="mr-auto min-w-0">
      <h2 class="truncate text-base font-semibold text-text-primary sm:text-lg">
        {{ pageTitle }}
      </h2>
    </div>

    <slot name="actions" />

    <!-- Right section -->
    <button
      type="button"
      class="rounded-base p-2 text-text-muted transition-colors hover:bg-bg-card hover:text-text-primary"
      title="Notifications"
    >
      <Bell :size="18" />
    </button>
    <button
      type="button"
      class="rounded-base p-2 text-text-muted transition-colors hover:bg-bg-card hover:text-text-primary"
      title="Settings"
      @click="router.push('/settings')"
    >
      <Settings :size="18" />
    </button>
  </header>
</template>
