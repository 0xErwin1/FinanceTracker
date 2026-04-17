<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Repeat,
  Layers,
  PieChart,
  Target,
  Tag,
  Settings,
  LogOut,
  Plus,
  User,
} from 'lucide-vue-next';
import { useAuth } from '@/composables/useAuth';
import type { Component } from 'vue';

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

function handleNewTransaction() {
  router.push('/transactions/create');
}

async function handleLogout() {
  await auth.logout();
  router.push('/login');
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
    class="fixed top-0 left-0 h-screen w-[256px] bg-bg-sidebar border-r border-border-default flex flex-col z-50"
  >
    <!-- Logo -->
    <div class="px-6 py-5 border-b border-border-default">
      <h1 class="text-xl font-bold tracking-widest text-accent-gold">
        VAULTLY
      </h1>
      <p class="text-xs text-text-muted mt-0.5 font-mono">TERMINAL V1.0.4</p>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      <RouterLink
        v-for="item in navItems"
        :key="item.to + item.label"
        :to="item.to"
        class="flex items-center gap-3 px-3 py-2.5 rounded-base text-sm transition-colors"
        :class="
          isActive(item.to)
            ? 'bg-bg-card text-accent-gold'
            : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'
        "
      >
        <component :is="item.icon" :size="20" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <!-- Bottom section -->
    <div class="px-4 py-4 border-t border-border-default space-y-3">
      <button
        class="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-accent-gold text-bg-primary font-semibold text-sm rounded-base hover:opacity-90 transition-opacity"
        @click="handleNewTransaction"
      >
        <Plus :size="16" />
        New Transaction
      </button>

      <div class="flex items-center gap-3 px-2">
        <div
          class="w-8 h-8 rounded-full bg-bg-card-hover flex items-center justify-center"
        >
          <User :size="16" class="text-text-muted" />
        </div>
        <div class="flex flex-col flex-1 min-w-0">
          <span class="text-xs text-text-primary truncate">
            {{ auth.user.value?.firstName ?? 'User' }}
          </span>
          <span class="text-[10px] text-text-muted truncate">
            {{ auth.user.value?.email ?? '' }}
          </span>
        </div>
        <button
          class="p-1 text-text-muted hover:text-accent-red transition-colors"
          title="Sign out"
          @click="handleLogout"
        >
          <LogOut :size="16" />
        </button>
      </div>
    </div>
  </aside>
</template>
