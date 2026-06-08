// Smoke real de browser del dev-bypass + flujo participante/admin.
// Usa el Google Chrome del sistema (playwright-core, sin descargar navegadores).
// Requiere el dev server corriendo (npm run dev) con VITE_USE_MOCKS=true.
//   SMOKE_BASE=http://localhost:5173 npm run smoke
// Navega SOLO con clicks dentro del SPA: una recarga completa reseedearía el mock (§9.5).
import { chromium } from 'playwright-core'

const BASE = process.env.SMOKE_BASE || 'http://localhost:5173'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

let failed = false
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failed = true }

try {
  await page.goto(`${BASE}/login`)
  // 1) dev login-as Juan → Dashboard
  await page.getByRole('button', { name: /^Juan \(participant\)$/ }).click()
  await page.getByRole('heading', { name: /Hola, Juan/i }).waitFor({ timeout: 8000 })
  check(true, 'dev login-as Juan → Dashboard "Hola, Juan"')

  // 2) Predicciones → Hub (con barra inferior); entra a Grupos (consume /groups + /groups/predictions/me, Juan 12/12)
  await page.getByRole('link', { name: 'Predicciones' }).click()
  await page.getByRole('heading', { name: /^Predicciones$/ }).waitFor({ timeout: 8000 })
  await page.getByRole('button', { name: /Grupos/ }).click()
  await page.getByText(/12 de 12 listos/).waitFor({ timeout: 8000 })
  check(true, 'Predicciones: Hub → Grupos consume /groups + /groups/predictions/me (12 de 12 listos)')

  // volver al Dashboard por la barra inferior (sigue visible en el flujo in-shell)
  await page.getByRole('link', { name: 'Inicio' }).click()
  await page.getByRole('heading', { name: /Hola, Juan/i }).waitFor({ timeout: 8000 })

  // 3) Tabla: podio (Juan 1º) + detalle en sheet
  await page.getByRole('link', { name: 'Tabla' }).click()
  await page.getByRole('heading', { name: /^Tabla$/ }).waitFor({ timeout: 8000 })
  await page.getByRole('button', { name: /Juan/i }).first().click()
  await page.getByRole('dialog', { name: 'Juan' }).waitFor({ timeout: 8000 })
  check(true, 'Tabla: podio + detalle de Juan (sheet)')
  await page.keyboard.press('Escape') // cierra el sheet antes de seguir navegando

  // 4) logout (menú de avatar) y entrar como Admin → /admin consume /admin/participants
  await page.getByRole('link', { name: 'Inicio' }).click()
  await page.getByRole('heading', { name: /Hola, Juan/i }).waitFor({ timeout: 8000 })
  await page.getByRole('button', { name: /Tu cuenta/i }).click()
  await page.getByRole('button', { name: /Cerrar sesión/i }).click()
  await page.getByRole('button', { name: /^Admin \(admin\)$/ }).waitFor({ timeout: 8000 })
  await page.getByRole('button', { name: /^Admin \(admin\)$/ }).click()
  await page.getByRole('heading', { name: /Hola, Admin/i }).waitFor({ timeout: 8000 })
  await page.getByRole('link', { name: 'Admin' }).click()
  await page.getByRole('heading', { name: /Participantes inscritos/i }).waitFor({ timeout: 8000 })
  check(true, 'logout + login Admin → /admin consume /admin/participants')

  check(errors.length === 0, `sin errores de página JS (${errors.length})`)
  if (errors.length) console.log(errors.join('\n'))
} catch (e) {
  check(false, `excepción: ${e.message}`)
  try { await page.screenshot({ path: '/tmp/polla-smoke-fail.png', fullPage: true }) } catch { /* noop */ }
} finally {
  await browser.close()
}

process.exit(failed ? 1 : 0)
