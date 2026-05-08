import { CurrencyEnum } from '@expenses/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveProfileAndRefreshUser, saveValuationPreferencesAndRefreshUser } from './settingsView';

describe('settings view save helpers', () => {
  const updateProfile = vi.fn();
  const updateValuationPreferences = vi.fn();
  const refreshUser = vi.fn();
  const reloadValuationSettings = vi.fn();

  beforeEach(() => {
    updateProfile.mockReset();
    updateValuationPreferences.mockReset();
    refreshUser.mockReset();
    reloadValuationSettings.mockReset();
  });

  it('refreshes shared auth state only after a successful profile save', async () => {
    const authState = { firstName: 'Alice' };
    const callOrder: string[] = [];

    updateProfile.mockImplementation(async () => {
      callOrder.push('updateProfile');
    });
    refreshUser.mockImplementation(async () => {
      callOrder.push('refreshUser');
      authState.firstName = 'Alicia';
    });

    await saveProfileAndRefreshUser(
      {
        firstName: 'Alicia',
        lastName: 'Example',
      },
      {
        updateProfile,
        refreshUser,
      },
    );

    expect(callOrder).toEqual(['updateProfile', 'refreshUser']);
    expect(authState.firstName).toBe('Alicia');
  });

  it('does not overwrite shared auth state when a profile save fails', async () => {
    const authState = { firstName: 'Alice' };
    const failure = new Error('Profile failed');

    updateProfile.mockRejectedValue(failure);
    refreshUser.mockImplementation(async () => {
      authState.firstName = 'Alicia';
    });

    await expect(
      saveProfileAndRefreshUser(
        {
          firstName: 'Alicia',
          lastName: 'Example',
        },
        {
          updateProfile,
          refreshUser,
        },
      ),
    ).rejects.toThrow('Profile failed');

    expect(refreshUser).not.toHaveBeenCalled();
    expect(authState.firstName).toBe('Alice');
  });

  it('refreshes auth state before reloading valuation settings after a successful preferences save', async () => {
    const callOrder: string[] = [];

    updateValuationPreferences.mockImplementation(async () => {
      callOrder.push('updatePreferences');
    });
    refreshUser.mockImplementation(async () => {
      callOrder.push('refreshUser');
    });
    reloadValuationSettings.mockImplementation(async () => {
      callOrder.push('reloadValuationSettings');
    });

    await saveValuationPreferencesAndRefreshUser(
      {
        reportingCurrency: CurrencyEnum.EUR,
        valuationFreshnessDays: 5,
      },
      {
        updateValuationPreferences,
        refreshUser,
        reloadValuationSettings,
      },
    );

    expect(callOrder).toEqual(['updatePreferences', 'refreshUser', 'reloadValuationSettings']);
  });
});
