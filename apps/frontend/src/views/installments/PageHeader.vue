<script setup lang="ts">
interface Props {
  loading: boolean;
}

defineProps<Props>();
</script>

<template>
  <div class="flex items-start justify-between">
    <div>
      <p class="text-sm font-medium tracking-wider text-text-muted">
        PAYMENT TRACKING
      </p>

      <h1 class="mt-1 text-2xl font-bold text-text-primary">
        Installment Plans
      </h1>

      <p class="mt-1 text-sm text-text-secondary">
        Track upcoming obligations and realized payments.
      </p>
    </div>

    <div v-if="loading" class="h-6 w-24 animate-pulse rounded bg-bg-card" />
  </div>
</template>
