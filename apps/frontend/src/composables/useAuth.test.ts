import { beforeEach, describe, expect, it, vi } from 'vitest';

const meQuery = vi.fn();

vi.mock('@/api/trpc', () => ({
  trpc: {
    auth: {
      login: { mutate: vi.fn() },
      logout: { mutate: vi.fn() },
    },
    user: {
      me: { query: meQuery },
      register: { mutate: vi.fn() },
    },
  },
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.resetModules();
    meQuery.mockReset();
  });

  it('keeps fetchUser bootstrap-only after initialization', async () => {
    meQuery
      .mockResolvedValueOnce({
        id: 'user-1',
        firstName: 'Alice',
        lastName: 'Example',
        email: 'alice@example.com',
        reportingCurrency: 'USD',
        valuationFreshnessDays: 3,
      })
      .mockResolvedValueOnce({
        id: 'user-1',
        firstName: 'Updated',
        lastName: 'Example',
        email: 'alice@example.com',
        reportingCurrency: 'USD',
        valuationFreshnessDays: 3,
      });

    const { useAuth } = await import('./useAuth');
    const auth = useAuth();

    await auth.fetchUser();
    await auth.fetchUser();

    expect(meQuery).toHaveBeenCalledTimes(1);
    expect(auth.user.value).toMatchObject({
      firstName: 'Alice',
      lastName: 'Example',
    });
  });

  it('refreshes the shared user state after bootstrap initialization', async () => {
    meQuery
      .mockResolvedValueOnce({
        id: 'user-1',
        firstName: 'Alice',
        lastName: 'Example',
        email: 'alice@example.com',
        reportingCurrency: 'USD',
        valuationFreshnessDays: 3,
      })
      .mockResolvedValueOnce({
        id: 'user-1',
        firstName: 'Alicia',
        lastName: 'Example',
        email: 'alice@example.com',
        reportingCurrency: 'EUR',
        valuationFreshnessDays: 5,
      });

    const { useAuth } = await import('./useAuth');
    const auth = useAuth();

    await auth.fetchUser();
    await auth.refreshUser();

    expect(meQuery).toHaveBeenCalledTimes(2);
    expect(auth.user.value).toMatchObject({
      firstName: 'Alicia',
      reportingCurrency: 'EUR',
      valuationFreshnessDays: 5,
    });
  });
});
