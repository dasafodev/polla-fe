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
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'warn' })

  // worker.start() solo garantiza que el SW está activado, no que controle ESTE documento.
  // En el primer registro, los navegadores móviles (iOS Safari / Chrome) no ponen la página
  // bajo control hasta una nueva navegación; clients.claim() puede tardar. Sin control, las
  // peticiones /api escapan a nginx (HTML 200 / 405) y apiClient lanza "Respuesta inválida
  // del servidor". Esperamos brevemente al controllerchange y, si aún no controla, recargamos
  // una vez para que el SW intercepte desde la primera petición. La bandera evita bucles.
  if (!navigator.serviceWorker.controller) {
    await new Promise<void>((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })
      setTimeout(resolve, 1000)
    })
  }
  if (!navigator.serviceWorker.controller && !sessionStorage.getItem('msw-reloaded')) {
    sessionStorage.setItem('msw-reloaded', '1')
    location.reload()
    await new Promise(() => {}) // detiene el render: la recarga reemplaza el documento
  }
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
