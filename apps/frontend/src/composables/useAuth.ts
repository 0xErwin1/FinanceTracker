import type { UserDTO } from '@expenses/api';
import { computed, type InjectionKey, inject, provide, type Ref, ref } from 'vue';
import { trpc } from '@/api/trpc';

// The tRPC client infers loose types when crossing workspace boundaries.
// We cast the server response to the known DTO shape.
type MeResponse = UserDTO;

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  reportingCurrency: UserDTO['reportingCurrency'];
  valuationFreshnessDays: UserDTO['valuationFreshnessDays'];
}

export interface UseAuthReturn {
  user: Ref<AuthUser | null>;
  isAuthenticated: Ref<boolean>;
  loading: Ref<boolean>;
  initialized: Ref<boolean>;
  error: Ref<string | null>;
  login(email: string, password: string): Promise<void>;
  register(data: { firstName: string; lastName: string; email: string; password: string }): Promise<void>;
  logout(): Promise<void>;
  fetchUser(): Promise<void>;
  refreshUser(): Promise<void>;
}

const AUTH_KEY: InjectionKey<UseAuthReturn> = Symbol('auth');

const user = ref<AuthUser | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const initialized = ref(false);

const isAuthenticated = computed(() => user.value !== null);

function toAuthUser(dto: UserDTO): AuthUser {
  return {
    id: dto.id,
    firstName: dto.firstName,
    lastName: dto.lastName,
    email: dto.email,
    reportingCurrency: dto.reportingCurrency,
    valuationFreshnessDays: dto.valuationFreshnessDays,
  };
}

async function login(email: string, password: string): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    await trpc.auth.login.mutate({ email, password });
    // Allow fetchUser to run again after a successful login.
    initialized.value = false;
    await fetchUser();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
    error.value = message;
    user.value = null;
    throw err;
  } finally {
    loading.value = false;
  }
}

async function register(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    await trpc.user.register.mutate(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
    error.value = message;
    throw err;
  } finally {
    loading.value = false;
  }
}

async function logout(): Promise<void> {
  try {
    await trpc.auth.logout.mutate();
  } catch {
    // Session may already be invalid; clear state regardless
  }
  user.value = null;
  error.value = null;
}

async function fetchUser(): Promise<void> {
  // Prevent duplicate calls: once initialized, fetchUser is a no-op
  // until login() explicitly resets the flag.
  if (initialized.value) return;

  // Set immediately so concurrent callers and router guards see
  // initialized=true before the network request resolves.
  initialized.value = true;
  loading.value = true;
  error.value = null;

  try {
    const result = (await trpc.user.me.query()) as MeResponse;
    user.value = toAuthUser(result);
  } catch {
    user.value = null;
  } finally {
    loading.value = false;
  }
}

async function refreshUser(): Promise<void> {
  initialized.value = true;
  loading.value = true;
  error.value = null;

  try {
    const result = (await trpc.user.me.query()) as MeResponse;
    user.value = toAuthUser(result);
  } catch {
    user.value = null;
  } finally {
    loading.value = false;
  }
}

const authState: UseAuthReturn = {
  user: computed(() => user.value),
  isAuthenticated,
  loading: computed(() => loading.value),
  initialized: computed(() => initialized.value),
  error: computed(() => error.value),
  login,
  register,
  logout,
  fetchUser,
  refreshUser,
};

/**
 * Must be called once in App.vue to provide auth state to the component tree.
 */
export function provideAuth(): UseAuthReturn {
  provide(AUTH_KEY, authState);
  return authState;
}

/**
 * Returns the shared auth state.
 *
 * Inside a descendant component the Vue provide/inject pair is used.
 * Outside component context (e.g. a router navigation guard) the
 * module-level singleton is returned directly.
 */
export function useAuth(): UseAuthReturn {
  try {
    const injected = inject(AUTH_KEY);
    return injected ?? authState;
  } catch {
    // inject() throws when called outside of an active component
    // instance (e.g. in a router navigation guard). Fall back to
    // the module-level singleton.
    return authState;
  }
}

/**
 * Clears the auth state without calling the server-side logout.
 * Used by the tRPC 401 interceptor to avoid circular calls.
 */
export function clearAuthState(): void {
  user.value = null;
  error.value = null;
}
