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
      // El API real se sirve same-origin bajo /api: el navegador ve respuestas same-origin (sin CORS)
      // y la cookie de sesión aterriza como cookie de primera parte de `localhost`. changeOrigin
      // reescribe el Host hacia el API desplegado. Para apuntar a un backend local:
      //   POLLA_DEV_API=http://localhost:3000 npm run dev
      '/api': {
        target: process.env.POLLA_DEV_API ?? 'https://api.paulpredice.com',
        changeOrigin: true,
        secure: true,
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
