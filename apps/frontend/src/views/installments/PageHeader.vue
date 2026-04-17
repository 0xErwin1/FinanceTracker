<script setup lang="ts">
import StatCard from '@/components/base/StatCard.vue';

interface Props {
  totalActivePlans: number;
  loading: boolean;
}

defineProps<Props>();
</script>

<template>
  <div class="flex items-start justify-between">
    <!-- Left: subtitle + heading -->
    <div>
      <p class="text-sm font-medium tracking-wider text-text-muted">
        PAYMENT TRACKING
      </p>
      <h1 class="mt-1 text-2xl font-bold text-text-primary">
        Installment Plans
      </h1>
    </div>

    <!-- Right: insight stat card -->
    <div v-if="loading" class="animate-pulse">
      <div class="h-20 w-52 rounded-base border border-border-default bg-bg-card" />
    </div>
    <StatCard
      v-else
      title="Active Plans"
      :value="String(totalActivePlans)"
      subtitle="tracked installment plans"
    />
  </div>
</template>
