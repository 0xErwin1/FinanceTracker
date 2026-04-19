import { computed, type InjectionKey, inject, provide, type Ref, ref } from 'vue';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
}

export interface ToastItem {
  id: string;
  title: string;
  description: string | null;
  tone: ToastTone;
  durationMs: number;
}

export interface ToastStore {
  toasts: Ref<ToastItem[]>;
  showToast: (input: ToastInput) => string;
  dismissToast: (toastId: string) => void;
  clearToasts: () => void;
}

interface CreateToastStoreOptions {
  maxToasts?: number;
  defaultDurationMs?: number;
  idFactory?: () => string;
}

const DEFAULT_MAX_TOASTS = 4;
const DEFAULT_DURATION_MS = 4_000;

function createToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createToastStore(options: CreateToastStoreOptions = {}): ToastStore {
  const maxToasts = options.maxToasts ?? DEFAULT_MAX_TOASTS;
  const defaultDurationMs = options.defaultDurationMs ?? DEFAULT_DURATION_MS;
  const idFactory = options.idFactory ?? createToastId;
  const toasts = ref<ToastItem[]>([]);
  const timeoutHandles = new Map<string, ReturnType<typeof setTimeout>>();

  function clearToastTimeout(toastId: string): void {
    const timeoutHandle = timeoutHandles.get(toastId);

    if (!timeoutHandle) {
      return;
    }

    clearTimeout(timeoutHandle);
    timeoutHandles.delete(toastId);
  }

  function dismissToast(toastId: string): void {
    clearToastTimeout(toastId);
    toasts.value = toasts.value.filter((toast) => toast.id !== toastId);
  }

  function clearToasts(): void {
    for (const toast of toasts.value) {
      clearToastTimeout(toast.id);
    }

    toasts.value = [];
  }

  function showToast(input: ToastInput): string {
    const toastId = idFactory();
    const durationMs = input.durationMs ?? defaultDurationMs;

    const toast: ToastItem = {
      id: toastId,
      title: input.title,
      description: input.description?.trim() || null,
      tone: input.tone ?? 'info',
      durationMs,
    };

    const nextToasts = [...toasts.value, toast];
    const overflowCount = Math.max(0, nextToasts.length - maxToasts);

    if (overflowCount > 0) {
      for (const overflowToast of nextToasts.slice(0, overflowCount)) {
        clearToastTimeout(overflowToast.id);
      }
    }

    toasts.value = nextToasts.slice(-maxToasts);

    if (durationMs > 0) {
      timeoutHandles.set(
        toastId,
        setTimeout(() => {
          dismissToast(toastId);
        }, durationMs),
      );
    }

    return toastId;
  }

  return {
    toasts: computed(() => toasts.value),
    showToast,
    dismissToast,
    clearToasts,
  };
}

const TOAST_KEY: InjectionKey<ToastStore> = Symbol('toast');

const toastStore = createToastStore();

export function provideToast(): ToastStore {
  provide(TOAST_KEY, toastStore);
  return toastStore;
}

export function useToast(): ToastStore {
  try {
    const injected = inject(TOAST_KEY);
    return injected ?? toastStore;
  } catch {
    return toastStore;
  }
}
