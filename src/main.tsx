import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

async function enableMocks() {
  if (import.meta.env.VITE_USE_MOCKS !== 'true') return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'warn' })
}

enableMocks().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <div>Polla 2026 — bootstrap</div>
    </StrictMode>,
  )
})
