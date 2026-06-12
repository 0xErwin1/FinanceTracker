import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Redirect @expenses/api to a client-only barrel that does not
      // pull in @trpc/server. The full barrel (index.ts) re-exports
      // tRPC procedures which call initTRPC() at module level; that
      // throws in the browser. The backend resolves via the "main"
      // field and gets the full barrel, unaffected by this alias.
      '@expenses/api': fileURLToPath(
        new URL('../../packages/api/src/client.ts', import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/trpc': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
