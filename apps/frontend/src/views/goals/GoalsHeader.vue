<script setup lang="ts">
interface Props {
  totalSaved: number;
  currency: string;
  loading: boolean;
}

defineProps<Props>();
</script>

<template>
  <div class="flex items-start justify-between">
    <div>
      <p class="text-sm text-text-secondary">Track & plan</p>
      <h1 class="text-2xl font-semibold text-text-primary">
        Financial Goals
      </h1>
    </div>

    <div v-if="loading" class="h-[83px] w-52 animate-pulse rounded-base bg-bg-card" />
    <StatCard
      v-else
      title="Total Saved"
      :value="
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: 2,
        }).format(totalSaved)
      "
      subtitle="Across all goals"
    />
  </div>
</template>
