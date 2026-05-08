import { t } from '@expenses/api';
import { appRouter } from '../../src/trpc/root';

const createCaller = t.createCallerFactory(appRouter);

describe('auth router password reset scope boundary', () => {
  it('exposes only login and logout procedures on the public auth caller', () => {
    const caller = createCaller({
      req: { sessionID: 'test-session-id', session: {} },
      res: {},
      userId: null,
    });

    expect(typeof caller.auth.login).toBe('function');
    expect(typeof caller.auth.logout).toBe('function');
    expect(Reflect.has(caller.auth, 'forgotPassword')).toBe(false);
    expect(Reflect.has(caller.auth, 'resetPassword')).toBe(false);
  });

  it('keeps the router tree free of recovery procedure names', () => {
    const serializedRouter = JSON.stringify(appRouter._def.procedures).toLowerCase();

    expect(serializedRouter).not.toContain('forgot');
    expect(serializedRouter).not.toContain('resetpassword');
    expect(serializedRouter).not.toContain('reset-password');
  });
});
