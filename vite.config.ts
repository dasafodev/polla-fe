import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // msw/native expone `browser: null` en su exports map, así que Vite no lo resuelve.
      // Lo apuntamos directo al .mjs (interceptación de fetch in-process para los mocks; sin SW).
      'msw/native': fileURLToPath(new URL('./node_modules/msw/lib/native/index.mjs', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // D3: el API real se sirve same-origin bajo /api → cookie same-site sobre HTTP en dev
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // Alinea el origin de jsdom con las URLs de los tests (http://localhost/api/...)
    // y con los fetch relativos del apiClient, para que MSW resuelva los handlers.
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
