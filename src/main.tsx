import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './styles/fonts.css'
import './styles/theme.css'
import { Providers } from './app/providers'
import { router } from './app/router'
import { env } from './lib/env'

function reloadOnce(): boolean {
  try {
    if (sessionStorage.getItem('msw-reloaded')) return false
    sessionStorage.setItem('msw-reloaded', '1')
    return true
  } catch {
    return false // sin sessionStorage (modo privado): no arriesgamos un bucle de recargas
  }
}

// Banner de diagnóstico, solo visible si la URL trae ?mswdebug (para inspeccionar en móvil).
function showMswDebug(line: string) {
  if (!location.search.includes('mswdebug')) return
  const el = document.createElement('pre')
  el.textContent = line
  el.style.cssText =
    'position:fixed;left:0;right:0;bottom:0;z-index:99999;margin:0;padding:8px;background:#120f29;color:#7CFFB2;font:11px/1.5 monospace;white-space:pre-wrap'
  document.body.appendChild(el)
}

async function enableMocks() {
  if (!env.useMocks) return
  const { worker } = await import('./mocks/browser')

  const ctrlPre = !!navigator.serviceWorker?.controller
  await worker.start({ onUnhandledRequest: 'warn' })
  const ctrlPost = !!navigator.serviceWorker?.controller

  // Comprobamos la interceptación REAL en vez de fiarnos de navigator.serviceWorker.controller:
  // en iOS Safari, tras registrar el SW por primera vez, controller queda != null pero el SW NO
  // intercepta ESTA página hasta una nueva navegación. Sin interceptar, /api escapa a nginx (HTML)
  // y apiClient lanza "Respuesta inválida del servidor" al loguear. Pedimos /api/me: con MSW
  // responde JSON, sin interceptar responde el index.html (text/html). Si escapó, recargamos una
  // vez (equivale al refresh manual que hoy soluciona el bug) para forzar una carga ya controlada.
  let contentType = 'n/a'
  try {
    const res = await fetch('/api/me', { credentials: 'include' })
    contentType = res.headers.get('content-type') ?? 'null'
  } catch {
    contentType = 'fetch-error'
  }
  const intercepted = contentType.includes('application/json')
  const debug = location.search.includes('mswdebug')

  showMswDebug(`[MSW] ctrl ${ctrlPre}->${ctrlPost} | /api/me ct=${contentType} | intercepted=${intercepted}`)

  if (!intercepted && !debug && reloadOnce()) {
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
