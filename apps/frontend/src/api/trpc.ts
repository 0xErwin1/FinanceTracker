import type { AppRouter } from '@expenses/backend';
import { createTRPCClient, httpBatchLink } from '@trpc/client';

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/trpc',
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include',
        });
      },
    }),
  ],
});
