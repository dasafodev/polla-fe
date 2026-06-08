import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './styles/fonts.css'
import './styles/theme.css'
import { Providers } from './app/providers'
import { router } from './app/router'
import { env } from './lib/env'

async function enableMocks() {
  if (!env.useMocks) return
  const { network } = await import('./mocks/inProcess')
  // Parchea globalThis.fetch in-process: el primer POST de login se intercepta a la primera,
  // sin Service Worker, sin recargas y sin depender del ciclo de control del SW en iOS Safari.
  network.listen({ onUnhandledRequest: 'warn' })
  // Limpieza para visitantes que ya tenían registrado el SW de mocks de despliegues anteriores:
  // el interceptor in-process captura los fetch en la propia página, así que el SW viejo es inerte;
  // lo desregistramos para no dejar basura. Best-effort, no bloquea el arranque.
  void navigator.serviceWorker
    ?.getRegistrations?.()
    .then((rs) => rs.forEach((r) => r.unregister()))
    .catch(() => {})
}

enableMocks().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </StrictMode>,
  )
})
