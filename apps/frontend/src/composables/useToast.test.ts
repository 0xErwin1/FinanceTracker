import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createToastStore } from './useToast';

describe('createToastStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('adds toasts and auto-dismisses them after the configured duration', () => {
    const store = createToastStore({
      defaultDurationMs: 3_000,
      idFactory: () => 'toast-1',
    });

    const toastId = store.showToast({
      title: 'Account created',
      tone: 'success',
    });

    expect(toastId).toBe('toast-1');
    expect(store.toasts.value).toEqual([
      {
        id: 'toast-1',
        title: 'Account created',
        description: null,
        tone: 'success',
        durationMs: 3_000,
      },
    ]);

    vi.advanceTimersByTime(2_999);
    expect(store.toasts.value).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(store.toasts.value).toEqual([]);
  });

  it('keeps only the newest toasts when the stack limit is exceeded', () => {
    let nextId = 0;

    const store = createToastStore({
      maxToasts: 2,
      defaultDurationMs: 5_000,
      idFactory: () => `toast-${++nextId}`,
    });

    store.showToast({ title: 'First' });
    store.showToast({ title: 'Second' });
    store.showToast({ title: 'Third' });

    expect(store.toasts.value.map((toast) => toast.title)).toEqual(['Second', 'Third']);
  });

  it('lets callers dismiss a toast before its timeout fires', () => {
    const store = createToastStore({
      defaultDurationMs: 5_000,
      idFactory: () => 'toast-1',
    });

    const toastId = store.showToast({
      title: 'Institution deleted',
      tone: 'info',
    });

    store.dismissToast(toastId);

    expect(store.toasts.value).toEqual([]);

    vi.advanceTimersByTime(5_000);
    expect(store.toasts.value).toEqual([]);
  });
});
