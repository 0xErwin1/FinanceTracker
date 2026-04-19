<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { useToast } from '@/composables/useToast';

const { toasts, dismissToast } = useToast();

function resolveToastClass(tone: 'success' | 'error' | 'info'): string {
  switch (tone) {
    case 'success':
      return 'border-accent-green/40 bg-accent-green/10';
    case 'error':
      return 'border-accent-red/40 bg-accent-red/10';
    case 'info':
      return 'border-accent-blue/40 bg-accent-blue/10';
  }
}
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:justify-end">
    <div class="flex w-full max-w-sm flex-col gap-3">
      <section
        v-for="toast in toasts"
        :key="toast.id"
        :class="resolveToastClass(toast.tone)"
        class="pointer-events-auto rounded-base border px-4 py-3 shadow-lg backdrop-blur"
        role="alert"
        aria-live="polite"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-sm font-medium text-text-primary">{{ toast.title }}</p>
            <p v-if="toast.description" class="mt-1 text-xs text-text-secondary">
              {{ toast.description }}
            </p>
          </div>

          <button
            type="button"
            class="rounded-base border border-border-default/60 p-1 text-text-secondary transition-colors hover:bg-bg-primary/60 hover:text-text-primary"
            aria-label="Dismiss notification"
            @click="dismissToast(toast.id)"
          >
            <X :size="14" />
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
