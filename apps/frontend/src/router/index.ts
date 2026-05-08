import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { appRoutes } from './routes';

const router = createRouter({
  history: createWebHistory(),
  routes: appRoutes,
});

router.beforeEach(async (to) => {
  const auth = useAuth();

  // Fetch user exactly once on first navigation. After that the
  // initialised flag prevents re-fetching on every route change.
  if (!auth.initialized.value) {
    await auth.fetchUser();
  }

  const isPublic = to.meta.public === true;

  if (!auth.isAuthenticated.value && !isPublic) {
    return { path: '/login' };
  }

  if (auth.isAuthenticated.value && isPublic) {
    return { path: '/' };
  }
});

export default router;
