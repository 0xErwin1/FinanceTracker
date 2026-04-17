import { ref, computed, type Ref } from 'vue';
import { trpc } from '@/api/trpc';

type CategoryResult = Awaited<ReturnType<typeof trpc.category.getAll.query>>;

interface UseCategoriesReturn {
  categories: Ref<CategoryResult>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  refetch: () => Promise<void>;
}

/**
 * Composable that wraps tRPC category.getAll and provides
 * reactive state for categories.
 */
export function useCategories(): UseCategoriesReturn {
  const categories = ref<CategoryResult>([] as unknown as CategoryResult);
  const loading = ref(true);
  const error = ref<Error | null>(null);

  async function fetch() {
    loading.value = true;
    error.value = null;

    try {
      categories.value = await trpc.category.getAll.query();
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
      loading.value = false;
    }
  }

  fetch();

  return {
    categories: computed(() => categories.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    refetch: fetch,
  };
}
