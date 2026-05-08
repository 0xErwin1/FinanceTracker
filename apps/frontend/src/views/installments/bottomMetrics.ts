import type { InstallmentPlanDTO } from '@expenses/api';
import { formatCurrency, formatDate } from '@/utils/format';

interface BottomMetricCard {
  label: string;
  value: string;
}

function getNextPaymentLabel(plans: InstallmentPlanDTO[]): string {
  const upcoming = plans.flatMap((plan) =>
    (plan.obligations ?? [])
      .filter((obligation) => obligation.status === 'PENDING' && obligation.dueDate)
      .map((obligation) => obligation.dueDate),
  );

  if (upcoming.length === 0) {
    return 'None';
  }

  upcoming.sort();

  return formatDate(upcoming[0]);
}

function getRemainingPaymentsLabel(plans: InstallmentPlanDTO[]): string {
  if (plans.length === 0) {
    return 'N/A';
  }

  const remainingPayments = plans.reduce((sum, plan) => {
    return sum + (plan.obligations ?? []).filter((obligation) => obligation.status === 'PENDING').length;
  }, 0);

  return `${remainingPayments} payments`;
}

export function getCompletedPaymentsLabel(plans: InstallmentPlanDTO[]): string {
  if (plans.length === 0) {
    return 'N/A';
  }

  const completedPayments = plans.reduce((sum, plan) => {
    return sum + (plan.obligations ?? []).filter((obligation) => obligation.status === 'PAID').length;
  }, 0);

  return `${completedPayments} payments`;
}

export function buildBottomMetricsCards(
  plans: InstallmentPlanDTO[],
  totalRemaining: number,
): BottomMetricCard[] {
  return [
    {
      label: 'NEXT PAYMENT',
      value: getNextPaymentLabel(plans),
    },
    {
      label: 'REMAINING',
      value: getRemainingPaymentsLabel(plans),
    },
    {
      label: 'COMPLETED PAYMENTS',
      value: getCompletedPaymentsLabel(plans),
    },
    {
      label: 'REMAINING DEBT',
      value: formatCurrency(totalRemaining),
    },
  ];
}
