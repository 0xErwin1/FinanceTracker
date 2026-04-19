<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Sidebar from './Sidebar.vue';
import Topbar from './Topbar.vue';

const route = useRoute();

const sidebarOpen = ref(false);
const isDesktop = ref(false);

const sidebarVisible = computed(() => isDesktop.value || sidebarOpen.value);

let mediaQuery: MediaQueryList | null = null;
const SHELL_BREAKPOINT_FALLBACK = '51.25rem';

function getShellMediaQuery(): string {
  const breakpoint = getComputedStyle(document.documentElement).getPropertyValue('--breakpoint-shell').trim();

  return `(min-width: ${breakpoint || SHELL_BREAKPOINT_FALLBACK})`;
}

function syncDesktopState(nextValue: boolean) {
  isDesktop.value = nextValue;

  if (nextValue) {
    sidebarOpen.value = false;
  }
}

function handleMediaQueryChange(event: MediaQueryListEvent) {
  syncDesktopState(event.matches);
}

function closeSidebar() {
  if (!isDesktop.value) {
    sidebarOpen.value = false;
  }
}

function toggleSidebar() {
  if (!isDesktop.value) {
    sidebarOpen.value = !sidebarOpen.value;
  }
}

watch(
  () => route.fullPath,
  () => {
    closeSidebar();
  },
);

onMounted(() => {
  mediaQuery = window.matchMedia(getShellMediaQuery());
  syncDesktopState(mediaQuery.matches);
  mediaQuery.addEventListener('change', handleMediaQueryChange);
});

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', handleMediaQueryChange);
});
</script>

<template>
  <div class="flex min-h-dvh bg-bg-primary text-text-primary">
    <Sidebar
      :desktop="isDesktop"
      :open="sidebarVisible"
      @close="closeSidebar"
    />

    <button
      v-if="sidebarVisible && !isDesktop"
      type="button"
      class="fixed inset-0 z-40 bg-bg-primary/70 backdrop-blur-[1px] shell:hidden"
      aria-label="Close navigation"
      @click="closeSidebar"
    />

    <div
      class="flex min-h-dvh min-w-0 flex-1 flex-col shell:ml-[var(--app-sidebar-width)] shell:max-w-[calc(100%-var(--app-sidebar-width))]"
    >
      <Topbar
        :show-menu-button="!isDesktop"
        @toggle-sidebar="toggleSidebar"
      />

      <main class="flex-1 overflow-x-hidden overflow-y-auto">
        <div class="app-shell-content">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>
