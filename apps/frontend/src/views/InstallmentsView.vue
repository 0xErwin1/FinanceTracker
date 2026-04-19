<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { trpc } from '@/api/trpc';
import ResponsivePageHeader from '@/components/base/ResponsivePageHeader.vue';
import { useAccounts } from '@/composables/useAccounts';
import { useInstallments } from '@/composables/useInstallments';
import PlanCards from './installments/PlanCards.vue';
import TimelineSection from './installments/TimelineSection.vue';
import BottomMetrics from './installments/BottomMetrics.vue';
import { resolveLinkedAccountLabel } from './installments/installmentPlanForm';

const router = useRouter();
const { plans, totalRemaining, loading, refetch } = useInstallments();
const { accounts } = useAccounts();

const isLoading = computed(() => loading.value);
const feedbackMessage = ref<string | null>(null);
const feedbackVariant = ref<'success' | 'error'>('success');

const accountLabels = computed<Record<string, string>>(() => {
  return plans.value.reduce<Record<string, string>>((labels, plan) => {
    labels[plan.id] = resolveLinkedAccountLabel(plan.accountId, accounts.value);
    return labels;
  }, {});
});

async function handlePay(obligationId: string) {
  feedbackMessage.value = null;

  try {
    await trpc.installment.payObligation.mutate({ obligationId });
    await refetch();

    feedbackVariant.value = 'success';
    feedbackMessage.value = 'Obligation paid and linked to the plan account.';
  } catch (err) {
    feedbackVariant.value = 'error';
    feedbackMessage.value = err instanceof Error ? err.message : 'Failed to pay obligation.';
  }
}
</script>

<template>
  <div class="space-y-4 lg:space-y-5">
    <ResponsivePageHeader
      title="Installment Plans"
      subtitle="Create account-linked plans, then pay obligations into the correct account history without guessing where the debt lives."
    >
      <template #actions>
        <button
          type="button"
          class="w-full rounded-base bg-accent-gold px-4 py-2 text-sm font-semibold text-bg-primary transition-opacity hover:opacity-90 sm:w-auto"
          @click="router.push('/installments/create')"
        >
          New Installment
        </button>
      </template>
    </ResponsivePageHeader>

    <div
      v-if="feedbackMessage"
      class="rounded-base border px-4 py-3 text-sm"
      :class="feedbackVariant === 'success'
        ? 'border-accent-green/30 bg-accent-green/10 text-accent-green'
        : 'border-accent-red/30 bg-accent-red/10 text-accent-red'"
    >
      {{ feedbackMessage }}
    </div>

    <!-- Section 2: Bento Grid of Active Plans -->
    <PlanCards
      :plans="plans"
      :account-labels="accountLabels"
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
      :account-labels="accountLabels"
      :loading="isLoading"
      @pay="handlePay"
    />
  </div>
</template>
