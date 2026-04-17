import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from '@/composables/useAuth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'Dashboard',
      component: () => import('@/views/DashboardView.vue'),
    },
    {
      path: '/transactions',
      name: 'Transactions',
      component: () => import('@/views/TransactionsView.vue'),
    },
    {
      path: '/transactions/create',
      name: 'CreateTransaction',
      component: () => import('@/views/transactions/CreateTransactionView.vue'),
    },
    {
      path: '/transactions/:id/edit',
      name: 'EditTransaction',
      component: () => import('@/views/transactions/EditTransactionView.vue'),
    },
    {
      path: '/installments',
      name: 'Installments',
      component: () => import('@/views/InstallmentsView.vue'),
    },
    {
      path: '/budgets',
      name: 'Budgets',
      component: () => import('@/views/BudgetsView.vue'),
    },
    {
      path: '/budgets/create',
      name: 'CreateBudget',
      component: () => import('@/views/budgets/CreateBudgetView.vue'),
    },
    {
      path: '/goals',
      name: 'Goals',
      component: () => import('@/views/GoalsView.vue'),
    },
    {
      path: '/goals/create',
      name: 'CreateGoal',
      component: () => import('@/views/goals/CreateGoalView.vue'),
    },
    {
      path: '/goals/:id/edit',
      name: 'EditGoal',
      component: () => import('@/views/goals/EditGoalView.vue'),
    },
    {
      path: '/recurring',
      name: 'Recurring',
      component: () => import('@/views/RecurringView.vue'),
    },
    {
      path: '/recurring/create',
      name: 'CreateRecurring',
      component: () => import('@/views/RecurringCreateView.vue'),
    },
    {
      path: '/recurring/:id/edit',
      name: 'EditRecurring',
      component: () => import('@/views/EditRecurringView.vue'),
    },
    {
      path: '/categories',
      name: 'Categories',
      component: () => import('@/views/CategoriesView.vue'),
    },
    {
      path: '/categories/create',
      name: 'CreateCategory',
      component: () => import('@/views/CategoriesCreateView.vue'),
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@/views/SettingsView.vue'),
    },
  ],
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
