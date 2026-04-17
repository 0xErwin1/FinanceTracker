<script setup lang="ts">
import { computed } from 'vue';
import { useTransactions } from '@/composables/useTransactions';
import { useInstallments } from '@/composables/useInstallments';
import PageHeader from './installments/PageHeader.vue';
import PlanCards from './installments/PlanCards.vue';
import TimelineSection from './installments/TimelineSection.vue';
import BottomMetrics from './installments/BottomMetrics.vue';

const { transactions, loading } = useTransactions();

const { plans, totalActivePlans, totalRemaining } = useInstallments(transactions);

const isLoading = computed(() => loading.value);
</script>

<template>
  <div class="space-y-6">
    <!-- Section 1: Page Header -->
    <PageHeader
      :total-active-plans="totalActivePlans"
      :loading="isLoading"
    />

    <!-- Section 2: Bento Grid of Active Plans -->
    <PlanCards
      :plans="plans"
      :loading="isLoading"
    />

    <!-- Section 3: Detailed Timeline -->
    <TimelineSection
      :plans="plans"
      :loading="isLoading"
    />

    <!-- Section 4: Bottom Metrics -->
    <BottomMetrics
      :plans="plans"
      :total-remaining="totalRemaining"
      :loading="isLoading"
    />
  </div>
</template>
