<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  Repeat,
  Layers,
  PieChart,
  Target,
  Tag,
  Settings,
  LogOut,
  Plus,
  PanelLeftClose,
} from 'lucide-vue-next';
import { useAuth } from '@/composables/useAuth';
import type { Component } from 'vue';

interface Props {
  open: boolean;
  desktop: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
}>();

const route = useRoute();
const router = useRouter();
const auth = useAuth();

interface NavItem {
  label: string;
  to: string;
  icon: Component;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Transactions', to: '/transactions', icon: ArrowLeftRight },
  { label: 'Banking', to: '/accounts', icon: Landmark },
  { label: 'Recurring', to: '/recurring', icon: Repeat },
  { label: 'Installments', to: '/installments', icon: Layers },
  { label: 'Budgets', to: '/budgets', icon: PieChart },
  { label: 'Goals', to: '/goals', icon: Target },
  { label: 'Categories', to: '/categories', icon: Tag },
  { label: 'Settings', to: '/settings', icon: Settings },
];

function isActive(to: string): boolean {
  if (to === '/') return route.path === '/';
  return route.path.startsWith(to);
}

function closeSidebar() {
  if (!props.desktop) {
    emit('close');
  }
}

async function navigateTo(to: string) {
  await router.push(to);
  closeSidebar();
}

async function handleNewTransaction() {
  await router.push('/transactions/create');
  closeSidebar();
}

async function handleLogout() {
  await auth.logout();
  await router.push('/login');
  closeSidebar();
}

const userInitial = () => {
  if (auth.user.value?.firstName) {
    return auth.user.value.firstName.charAt(0).toUpperCase();
  }
  return 'U';
};
</script>

<template>
  <aside
    :class="[
      'fixed inset-y-0 left-0 z-50 flex h-dvh w-[var(--app-sidebar-width)] flex-col border-r border-border-default bg-bg-sidebar transition-transform duration-200 ease-out shell:translate-x-0',
      open ? 'translate-x-0 shadow-2xl shadow-black/30 shell:shadow-none' : '-translate-x-full',
    ]"
  >
    <!-- Logo -->
    <div class="border-b border-border-default px-5 py-4 sm:px-6">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold tracking-widest text-accent-gold">
            VAULTLY
          </h1>
          <p class="mt-0.5 font-mono text-xs text-text-muted">TERMINAL V1.0.4</p>
        </div>

        <button
          v-if="!desktop"
          type="button"
          class="rounded-base p-2 text-text-muted transition-colors hover:bg-bg-card hover:text-text-primary shell:hidden"
          aria-label="Close navigation"
          @click="closeSidebar"
        >
          <PanelLeftClose :size="18" />
        </button>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      <button
        v-for="item in navItems"
        :key="item.to + item.label"
        type="button"
        class="flex w-full items-center gap-3 rounded-base px-3 py-2.5 text-left text-sm transition-colors"
        :class="
          isActive(item.to)
            ? 'bg-bg-card text-accent-gold'
            : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'
        "
        @click="navigateTo(item.to)"
      >
        <component :is="item.icon" :size="20" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <!-- Bottom section -->
    <div class="space-y-3 border-t border-border-default px-4 py-4">
      <button
        type="button"
        class="flex w-full items-center justify-center gap-2 rounded-base bg-accent-gold px-4 py-2.5 text-sm font-semibold text-bg-primary transition-opacity hover:opacity-90"
        @click="handleNewTransaction"
      >
        <Plus :size="16" />
        New Transaction
      </button>

      <div class="flex items-center gap-3 rounded-base bg-bg-card px-3 py-3">
        <div
          class="flex h-9 w-9 items-center justify-center rounded-full bg-bg-card-hover font-mono text-sm font-semibold text-accent-gold"
        >
          {{ userInitial() }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-xs text-text-primary">
            {{ auth.user.value?.firstName ?? 'User' }}
          </p>
          <p class="truncate text-[10px] text-text-muted">
            {{ auth.user.value?.email ?? '' }}
          </p>
        </div>
        <button
          type="button"
          class="rounded-base p-2 text-text-muted transition-colors hover:bg-bg-primary hover:text-accent-red"
          title="Sign out"
          @click="handleLogout"
        >
          <LogOut :size="16" />
        </button>
      </div>
    </div>
  </aside>
</template>
