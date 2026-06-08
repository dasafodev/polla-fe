// Smoke real de browser del dev-bypass + flujo participante/admin.
// Usa el Google Chrome del sistema (playwright-core, sin descargar navegadores).
// Requiere el dev server corriendo (npm run dev) con VITE_USE_MOCKS=true.
//   SMOKE_BASE=http://localhost:5173 npm run smoke
// Navega SOLO con clicks dentro del SPA: una recarga completa reseedearía el mock (§9.5).
import { chromium } from 'playwright-core'

const BASE = process.env.SMOKE_BASE || 'http://localhost:5173'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

let failed = false
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failed = true }

try {
  await page.goto(`${BASE}/login`)
  await page.getByRole('heading', { name: /Polla Mundial 2026/i }).waitFor({ timeout: 10000 })

  // 1) dev login-as Juan → Dashboard
  await page.getByRole('button', { name: /^Juan \(participant\)$/ }).click()
  await page.getByRole('heading', { name: /Hola, Juan/i }).waitFor({ timeout: 8000 })
  check(true, 'dev login-as Juan → Dashboard "Hola, Juan"')

  // 2) Predicciones → Grupos consume /groups + /groups/predictions/me
  await page.getByRole('link', { name: 'Predicciones' }).click()
  await page.getByRole('link', { name: 'Grupos' }).click()
  await page.getByText(/12\/12 completos/).waitFor({ timeout: 8000 })
  check(true, 'Grupos consume /groups + /groups/predictions/me (12/12 completos)')

  // 3) Tabla consume /scoreboard (Juan 1º por desempate)
  await page.getByRole('link', { name: 'Tabla' }).click()
  await page.getByRole('heading', { name: /Tabla de posiciones/i }).waitFor({ timeout: 8000 })
  const firstRow = (await page.locator('ol li').first().innerText()).trim()
  check(/#1\s+Juan/.test(firstRow), `Tabla consume /scoreboard (1º: "${firstRow}")`)

  // 4) Eliminatorias consume /ko/matches
  await page.getByRole('link', { name: 'Eliminatorias' }).click()
  await page.getByRole('link', { name: 'Dieciseisavos' }).click()
  await page.getByRole('heading', { name: /Dieciseisavos/i }).waitFor({ timeout: 8000 })
  check(true, 'Eliminatorias consume /ko/matches (ronda r32)')

  // 5) logout y entrar como Admin → /admin consume /admin/participants
  await page.getByRole('link', { name: 'Inicio' }).click()
  await page.getByRole('button', { name: /Cerrar sesión/i }).click()
  await page.getByRole('heading', { name: /Dev bypass/i }).waitFor({ timeout: 8000 })
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
