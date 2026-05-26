/**
 * Auth stress test: login → verify dashboard → logout × 20 cycles
 * 
 * Usage:
 *   TEST_ADMIN_PASSWORD=yourpass node tests/auth-stress.mjs
 *
 * Requires the Vite dev server to be running on http://localhost:3000
 */
import { chromium } from 'playwright'

const EMAIL = 'kagiso.thobane.73@gmail.com'
const PASSWORD = process.env.TEST_ADMIN_PASSWORD

const BASE_URL = 'http://localhost:3001'
const CYCLES = 20

if (!PASSWORD) {
  console.error('❌  Set TEST_ADMIN_PASSWORD before running.')
  process.exit(1)
}

async function waitForSelector(page, selector, timeout = 12000) {
  try {
    await page.waitForSelector(selector, { timeout })
    return true
  } catch {
    return false
  }
}

async function login(page) {
  // Navigate to root — AdminLayout will show LoginPage when not authenticated
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })

  // Wait for login form
  const emailInput = await page.waitForSelector('input[type="email"]', { timeout: 10000 })
  await emailInput.fill(EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')

  // Wait for redirect to dashboard (login form gone + nav appears)
  const reached = await waitForSelector(page, 'nav', 12000)
  if (!reached) throw new Error('Login did not reach dashboard (nav not found)')

  // Confirm we are NOT showing the login button anymore
  const stillOnLogin = await page.$('button[type="submit"]')
  if (stillOnLogin) throw new Error('Still on login page after submit')
}

async function logout(page) {
  // Find and click the Sign out button added in AdminLayout header
  const btn = await page.waitForSelector('button:has-text("Sign out")', { timeout: 8000 })
  await btn.click()

  // Wait for the login form to reappear
  const reached = await waitForSelector(page, 'input[type="email"]', 8000)
  if (!reached) throw new Error('Did not return to login page after logout')
}

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Capture console errors
  const errors = []
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[cycle?] ${msg.text()}`)
  })
  page.on('pageerror', err => errors.push(`[page error] ${err.message}`))

  let passed = 0
  let failed = 0

  console.log(`\n🔄  Starting ${CYCLES} login/logout cycles against ${BASE_URL}\n`)

  for (let i = 1; i <= CYCLES; i++) {
    const label = `Cycle ${String(i).padStart(2, '0')}/${CYCLES}`
    try {
      await login(page)
      await logout(page)
      console.log(`  ✅  ${label} — OK`)
      passed++
    } catch (err) {
      console.error(`  ❌  ${label} — FAILED: ${err.message}`)
      // Take screenshot for diagnosis
      await page.screenshot({ path: `tests/failure-cycle-${i}.png` }).catch(() => {})
      failed++
      // Reset: go back to base URL to attempt next cycle
      try {
        await page.goto(BASE_URL, { waitUntil: 'networkidle' })
        await page.waitForSelector('input[type="email"]', { timeout: 8000 })
      } catch { /* ignore recovery errors */ }
    }
    // Brief pause between cycles to let Supabase rate limits breathe
    await page.waitForTimeout(600)
  }

  await browser.close()

  console.log(`\n${'─'.repeat(44)}`)
  console.log(`  Total: ${CYCLES}   ✅ Passed: ${passed}   ❌ Failed: ${failed}`)
  if (errors.length) {
    console.log(`\nConsole errors captured:`)
    errors.forEach(e => console.log(`  • ${e}`))
  }
  console.log(`${'─'.repeat(44)}\n`)

  process.exit(failed > 0 ? 1 : 0)
})()
