<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { computed } from 'vue';
import { Search, Bell, Settings } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const searchQuery = ref('');

const pageTitle = computed(() => {
  return (route.name as string) || 'Dashboard';
});

function handleSearch() {
  const q = searchQuery.value.trim();
  if (q) {
    router.push({ path: '/transactions', query: { q } });
  }
}

function handleSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    handleSearch();
  }
}
</script>

<template>
  <header
    class="h-[56px] bg-bg-surface border-b border-border-default flex items-center px-6 gap-4"
  >
    <!-- Page title -->
    <h2 class="text-base font-semibold text-text-primary mr-auto">
      {{ pageTitle }}
    </h2>

    <!-- Search -->
    <div
      class="flex items-center gap-2 bg-bg-card rounded-base px-3 py-1.5 border border-border-default"
    >
      <Search :size="16" class="text-text-muted" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search..."
        class="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-48"
        @keydown="handleSearchKeydown"
      />
    </div>

    <!-- Tab navigation placeholder -->
    <div class="hidden md:flex items-center gap-1 text-xs text-text-muted">
      <span class="px-2 py-1 rounded-base hover:bg-bg-card-hover cursor-pointer">
        All
      </span>
      <span class="px-2 py-1 rounded-base hover:bg-bg-card-hover cursor-pointer">
        Income
      </span>
      <span class="px-2 py-1 rounded-base hover:bg-bg-card-hover cursor-pointer">
        Expenses
      </span>
    </div>

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
