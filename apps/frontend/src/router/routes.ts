import type { RouteRecordRaw } from 'vue-router';

export const appRoutes: RouteRecordRaw[] = [
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
    path: '/accounts',
    name: 'Accounts',
    component: () => import('@/views/AccountsView.vue'),
  },
  {
    path: '/transactions/create',
    name: 'CreateTransaction',
    component: () => import('@/views/transactions/CreateTransactionView.vue'),
  },
  {
    path: '/transactions/import',
    name: 'ImportTransactions',
    component: () => import('@/views/transactions/ImportTransactionsView.vue'),
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
    path: '/installments/create',
    name: 'CreateInstallment',
    component: () => import('@/views/installments/CreateInstallmentView.vue'),
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
];
