import type { CurrencyEnum } from '@expenses/api';

interface ProfileUpdateInput {
  firstName: string;
  lastName: string;
}

interface ValuationPreferencesInput {
  reportingCurrency: CurrencyEnum | null;
  valuationFreshnessDays: number;
}

interface ProfileSaveDependencies {
  updateProfile(input: ProfileUpdateInput): Promise<unknown>;
  refreshUser(): Promise<void>;
}

interface ValuationPreferencesSaveDependencies {
  updateValuationPreferences(input: ValuationPreferencesInput): Promise<unknown>;
  refreshUser(): Promise<void>;
  reloadValuationSettings(): Promise<void>;
}

export async function saveProfileAndRefreshUser(
  input: ProfileUpdateInput,
  dependencies: ProfileSaveDependencies,
): Promise<void> {
  await dependencies.updateProfile(input);
  await dependencies.refreshUser();
}

export async function saveValuationPreferencesAndRefreshUser(
  input: ValuationPreferencesInput,
  dependencies: ValuationPreferencesSaveDependencies,
): Promise<void> {
  await dependencies.updateValuationPreferences(input);
  await dependencies.refreshUser();
  await dependencies.reloadValuationSettings();
}
