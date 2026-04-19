import { CurrencyEnum } from '@expenses/api';
import { describe, expect, it } from 'vitest';
import {
  createInstallmentPlanDraft,
  reconcileInstallmentAccountSelection,
  resolveLinkedAccountLabel,
  validateInstallmentPlanDraft,
} from './installmentPlanForm';

describe('installmentPlanForm helpers', () => {
  it('creates a draft that keeps the provided default account and date', () => {
    expect(createInstallmentPlanDraft('2026-04-18', 'account-1')).toEqual({
      totalAmount: '',
      currency: CurrencyEnum.USD,
      accountId: 'account-1',
      installmentsCount: 2,
      categoryId: '',
      note: '',
      startDate: '2026-04-18',
    });
  });

  it('reconciles the selected account against the available currency accounts', () => {
    expect(
      reconcileInstallmentAccountSelection('account-2', [
        { id: 'account-1', name: 'Main', archivedAt: null },
        { id: 'account-2', name: 'Savings', archivedAt: null },
      ]),
    ).toBe('account-2');

    expect(
      reconcileInstallmentAccountSelection('missing', [{ id: 'account-1', name: 'Main', archivedAt: null }]),
    ).toBe('account-1');

    expect(reconcileInstallmentAccountSelection('missing', [])).toBe('');
  });

  it('validates amount, installments, account, and start date before submission', () => {
    expect(
      validateInstallmentPlanDraft({
        totalAmount: '',
        currency: CurrencyEnum.USD,
        accountId: 'account-1',
        installmentsCount: 2,
        categoryId: '',
        note: '',
        startDate: '2026-04-18',
      }),
    ).toBe('Amount must be greater than 0.');

    expect(
      validateInstallmentPlanDraft({
        totalAmount: '1200',
        currency: CurrencyEnum.USD,
        accountId: '',
        installmentsCount: 2,
        categoryId: '',
        note: '',
        startDate: '2026-04-18',
      }),
    ).toBe('Account is required.');

    expect(
      validateInstallmentPlanDraft({
        totalAmount: '1200',
        currency: CurrencyEnum.USD,
        accountId: 'account-1',
        installmentsCount: 1,
        categoryId: '',
        note: '',
        startDate: '2026-04-18',
      }),
    ).toBe('Installment count must be at least 2.');

    expect(
      validateInstallmentPlanDraft({
        totalAmount: '1200',
        currency: CurrencyEnum.USD,
        accountId: 'account-1',
        installmentsCount: 3,
        categoryId: '',
        note: '',
        startDate: '',
      }),
    ).toBe('Start date is required.');

    expect(
      validateInstallmentPlanDraft({
        totalAmount: '1200',
        currency: CurrencyEnum.USD,
        accountId: 'account-1',
        installmentsCount: 3,
        categoryId: '',
        note: 'Laptop',
        startDate: '2026-04-18',
      }),
    ).toBeNull();
  });

  it('resolves active, archived, and missing account labels for list views', () => {
    expect(
      resolveLinkedAccountLabel('account-1', [{ id: 'account-1', name: 'Main checking', archivedAt: null }]),
    ).toBe('Main checking');

    expect(
      resolveLinkedAccountLabel('account-2', [
        { id: 'account-2', name: 'Legacy cash', archivedAt: '2026-04-01T00:00:00.000Z' },
      ]),
    ).toBe('Legacy cash (archived)');

    expect(resolveLinkedAccountLabel('missing', [])).toBe('Missing account');
    expect(resolveLinkedAccountLabel(null, [])).toBe('No account');
  });
});
