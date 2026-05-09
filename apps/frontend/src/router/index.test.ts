import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { appRoutes } from './routes';

describe('appRoutes', () => {
  it('does not expose forgot/reset route names, paths, or lazy imports', () => {
    const serializedRoutes = JSON.stringify(
      appRoutes.map((route) => ({
        name: route.name,
        path: route.path,
        component: typeof route.component === 'function' ? route.component.toString() : '',
      })),
    ).toLowerCase();

    expect(serializedRoutes).not.toContain('forgot');
    expect(serializedRoutes).not.toContain('resetpassword');
    expect(serializedRoutes).not.toContain('reset-password');
  });

  it('treats direct forgot/reset navigation like any other missing route', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: appRoutes,
    });

    const forgotResolution = router.resolve('/forgot-password');
    const resetResolution = router.resolve('/reset-password/token-123');

    expect(forgotResolution.matched).toHaveLength(0);
    expect(resetResolution.matched).toHaveLength(0);
  });

  it('exposes the CSV import flow under /transactions/import', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: appRoutes,
    });

    const importResolution = router.resolve('/transactions/import');

    expect(importResolution.name).toBe('ImportTransactions');
    expect(importResolution.matched).toHaveLength(1);
    expect(importResolution.matched[0]?.path).toBe('/transactions/import');
  });
});
