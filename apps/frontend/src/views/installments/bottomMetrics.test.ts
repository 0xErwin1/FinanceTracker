import { CurrencyEnum, type InstallmentPlanDTO } from '@expenses/api';
import { describe, expect, it } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import BottomMetrics from './BottomMetrics.vue';
import { buildBottomMetricsCards, getCompletedPaymentsLabel } from './bottomMetrics';

function makePlan(overrides: Partial<InstallmentPlanDTO> = {}): InstallmentPlanDTO {
  return {
    id: overrides.id ?? 'plan-1',
    userId: overrides.userId ?? 'user-1',
    accountId: overrides.accountId ?? 'account-1',
    categoryId: overrides.categoryId ?? null,
    totalAmount: overrides.totalAmount ?? 1200,
    currency: overrides.currency ?? CurrencyEnum.USD,
    installmentsCount: overrides.installmentsCount ?? 4,
    note: overrides.note ?? 'Laptop',
    status: overrides.status ?? 'ACTIVE',
    createdAt: overrides.createdAt ?? '2026-04-01T00:00:00.000Z',
    obligations: overrides.obligations ?? [],
  };
}

describe('bottom metrics helpers', () => {
  it('reports completed payments from paid obligations instead of a mock interest rate', () => {
    const plans = [
      makePlan({
        obligations: [
          {
            id: 'obligation-1',
            planId: 'plan-1',
            installmentNumber: 1,
            amount: 300,
            dueDate: '2026-04-15',
            status: 'PAID',
            paidAt: '2026-04-15T12:00:00.000Z',
            transactionId: 'tx-1',
          },
          {
            id: 'obligation-2',
            planId: 'plan-1',
            installmentNumber: 2,
            amount: 300,
            dueDate: '2026-05-15',
            status: 'PAID',
            paidAt: '2026-05-15T12:00:00.000Z',
            transactionId: 'tx-2',
          },
          {
            id: 'obligation-3',
            planId: 'plan-1',
            installmentNumber: 3,
            amount: 300,
            dueDate: '2026-06-15',
            status: 'PENDING',
            paidAt: null,
            transactionId: null,
          },
        ],
      }),
    ];

    expect(getCompletedPaymentsLabel(plans)).toBe('2 payments');
  });

  it('keeps the metric truthful when there are no installment plans', () => {
    expect(getCompletedPaymentsLabel([])).toBe('N/A');
  });

  it('builds truthful bottom-metric cards and omits the old fabricated interest tile', () => {
    const cards = buildBottomMetricsCards(
      [
        makePlan({
          obligations: [
            {
              id: 'obligation-1',
              planId: 'plan-1',
              installmentNumber: 1,
              amount: 300,
              dueDate: '2026-04-15',
              status: 'PAID',
              paidAt: '2026-04-15T12:00:00.000Z',
              transactionId: 'tx-1',
            },
            {
              id: 'obligation-2',
              planId: 'plan-1',
              installmentNumber: 2,
              amount: 300,
              dueDate: '2026-05-15',
              status: 'PENDING',
              paidAt: null,
              transactionId: null,
            },
          ],
        }),
      ],
      600,
    );

    expect(cards).toEqual([
      expect.objectContaining({ label: 'NEXT PAYMENT', value: expect.stringContaining('2026') }),
      expect.objectContaining({ label: 'REMAINING', value: '1 payments' }),
      expect.objectContaining({ label: 'COMPLETED PAYMENTS', value: '1 payments' }),
      expect.objectContaining({ label: 'REMAINING DEBT', value: '$600.00' }),
    ]);
    expect(cards.map((card) => card.label)).not.toContain('EST. INTEREST');
  });

  it('renders truthful cards at the component boundary without the legacy interest tile', async () => {
    const html = await renderToString(
      createSSRApp(BottomMetrics, {
        plans: [
          makePlan({
            obligations: [
              {
                id: 'obligation-1',
                planId: 'plan-1',
                installmentNumber: 1,
                amount: 300,
                dueDate: '2026-04-15',
                status: 'PAID',
                paidAt: '2026-04-15T12:00:00.000Z',
                transactionId: 'tx-1',
              },
              {
                id: 'obligation-2',
                planId: 'plan-1',
                installmentNumber: 2,
                amount: 300,
                dueDate: '2026-05-15',
                status: 'PENDING',
                paidAt: null,
                transactionId: null,
              },
            ],
          }),
        ],
        totalRemaining: 600,
        loading: false,
      }),
    );

    expect(html).toContain('COMPLETED PAYMENTS');
    expect(html).toContain('1 payments');
    expect(html).toContain('REMAINING DEBT');
    expect(html).toContain('$600.00');
    expect(html).not.toContain('EST. INTEREST');
  });
});
