<script setup lang="ts">
import { computed } from 'vue';
import { trpc } from '@/api/trpc';
import { useInstallments } from '@/composables/useInstallments';
import PageHeader from './installments/PageHeader.vue';
import PlanCards from './installments/PlanCards.vue';
import TimelineSection from './installments/TimelineSection.vue';
import BottomMetrics from './installments/BottomMetrics.vue';

const { plans, totalRemaining, loading, refetch } = useInstallments();

const isLoading = computed(() => loading.value);

async function handlePay(obligationId: string) {
  try {
    await trpc.installment.payObligation.mutate({ obligationId });
    await refetch();
  } catch (err) {
    console.error('Failed to pay obligation:', err);
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Section 1: Page Header -->
    <PageHeader
      :loading="isLoading"
    />

    <!-- Section 2: Bento Grid of Active Plans -->
    <PlanCards
      :plans="plans"
      :loading="isLoading"
    />

    <!-- Section 3: Summary Metrics (promoted above timeline) -->
    <BottomMetrics
      :plans="plans"
      :total-remaining="totalRemaining"
      :loading="isLoading"
    />

    <!-- Section 4: Detailed Timeline -->
    <TimelineSection
      :plans="plans"
      :loading="isLoading"
      @pay="handlePay"
    />
  </div>
</template>
