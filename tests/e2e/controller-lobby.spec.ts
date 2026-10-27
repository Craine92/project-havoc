import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'

const TV_URL = 'http://127.0.0.1:4311'
const CONTROLLER_URL = 'http://127.0.0.1:4312'

interface RoomFixture {
  readonly tvContext: BrowserContext
  readonly tv: Page
  readonly roomCode: string
}

function collectBrowserErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`))
  return errors
}

async function createRoom(browser: Browser): Promise<RoomFixture> {
  const tvContext = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  const tv = await tvContext.newPage()
  await tv.goto(TV_URL)
  await expect(tv.getByText('Server verbunden')).toBeVisible()
  await tv.getByRole('button', { name: 'Neues Spiel' }).click()
  const code = tv.getByTestId('room-code')
  await expect(code).toBeVisible()
  return { tvContext, tv, roomCode: (await code.textContent())?.trim() ?? '' }
}

async function controllerPage(browser: Browser, width = 390, height = 844): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true })
  return { context, page: await context.newPage() }
}

async function join(page: Page, roomCode: string, name: string, fromUrl = true): Promise<void> {
  await page.goto(fromUrl ? `${CONTROLLER_URL}/?room=${roomCode}` : CONTROLLER_URL)
  await expect(page.getByText('Server verbunden')).toBeVisible()
  if (!fromUrl) await page.getByTestId('room-input').fill(roomCode)
  await page.getByPlaceholder(/wie sollen/i).fill(name)
  await page.getByRole('button', { name: /raum beitreten/i }).click()
  await expect(page.getByRole('heading', { name })).toBeVisible()
}

test('controller accepts the QR/deep-link room code and joins the real room', async ({ browser }) => {
  const room = await createRoom(browser)
  const phone = await controllerPage(browser)
  const browserErrors = [
    ...collectBrowserErrors(room.tv),
    ...collectBrowserErrors(phone.page),
  ]
  try {
    await phone.page.goto(`${CONTROLLER_URL}/?room=${room.roomCode}`)
    await expect(phone.page.getByTestId('room-input')).toHaveValue(room.roomCode)
    await phone.page.getByPlaceholder(/wie sollen/i).fill('Nova')
    await phone.page.getByRole('button', { name: /raum beitreten/i }).click()
    await expect(phone.page.getByRole('heading', { name: 'Nova' })).toBeVisible()
    await expect(room.tv.getByText('Nova')).toBeVisible()
    expect(browserErrors).toEqual([])
  } finally { await phone.context.close(); await room.tvContext.close() }
})

test('controller supports manual room entry and local name validation', async ({ browser }) => {
  const room = await createRoom(browser)
  const phone = await controllerPage(browser)
  try {
    await phone.page.goto(CONTROLLER_URL)
    await phone.page.getByTestId('room-input').fill(room.roomCode)
    await phone.page.getByPlaceholder(/wie sollen/i).fill('A')
    await phone.page.getByRole('button', { name: /raum beitreten/i }).click()
    await expect(phone.page.getByRole('alert')).toContainText('2 bis 16')
    await phone.page.getByPlaceholder(/wie sollen/i).fill('Mira')
    await phone.page.getByRole('button', { name: /raum beitreten/i }).click()
    await expect(phone.page.getByRole('heading', { name: 'Mira' })).toBeVisible()
  } finally { await phone.context.close(); await room.tvContext.close() }
})

test('server errors for duplicate names and unknown rooms are actionable', async ({ browser }) => {
  const room = await createRoom(browser)
  const first = await controllerPage(browser)
  const second = await controllerPage(browser)
  try {
    await join(first.page, room.roomCode, 'Nova')
    await second.page.goto(`${CONTROLLER_URL}/?room=${room.roomCode}`)
    await second.page.getByPlaceholder(/wie sollen/i).fill('nova')
    await second.page.getByRole('button', { name: /raum beitreten/i }).click()
    await expect(second.page.getByRole('alert')).toContainText('schon vergeben')
    await second.page.getByTestId('room-input').fill('ABCDEF')
    await second.page.getByPlaceholder(/wie sollen/i).fill('Rex')
    await second.page.getByRole('button', { name: /raum beitreten/i }).click()
    await expect(second.page.getByRole('alert')).toContainText('nicht gefunden')
  } finally { await first.context.close(); await second.context.close(); await room.tvContext.close() }
})

test('player can toggle ready and rename with live TV synchronization', async ({ browser }) => {
  const room = await createRoom(browser)
  const phone = await controllerPage(browser)
  try {
    await join(phone.page, room.roomCode, 'Nova')
    await phone.page.getByRole('button', { name: /bereit machen/i }).click()
    await expect(phone.page.getByRole('button', { name: /bereit!/i })).toHaveAttribute('aria-pressed', 'true')
    await expect(room.tv.getByText('Bereit', { exact: true })).toBeVisible()
    await phone.page.getByRole('button', { name: /namen ändern/i }).click()
    await phone.page.getByLabel('Neuer Spielername').fill('Nova Prime')
    await phone.page.getByRole('button', { name: /namen speichern/i }).click()
    await expect(room.tv.getByText('Nova Prime')).toBeVisible()
    await phone.page.getByRole('button', { name: /bereit!/i }).click()
    await expect(room.tv.getByText('Wartet')).toBeVisible()
  } finally { await phone.context.close(); await room.tvContext.close() }
})

test('player reload reconnects without creating a duplicate seat', async ({ browser }) => {
  const room = await createRoom(browser)
  const phone = await controllerPage(browser)
  try {
    await join(phone.page, room.roomCode, 'Nova')
    await phone.page.reload()
    await expect(phone.page.getByRole('heading', { name: 'Nova' })).toBeVisible()
    await expect(room.tv.getByText('Nova')).toHaveCount(1)
    await expect(room.tv.getByText('1', { exact: true })).toBeVisible()
  } finally { await phone.context.close(); await room.tvContext.close() }
})

test('disconnect is visible and the same phone can recover', async ({ browser }) => {
  const room = await createRoom(browser)
  const phone = await controllerPage(browser)
  try {
    await join(phone.page, room.roomCode, 'Nova')
    await phone.context.setOffline(true)
    await expect(room.tv.getByText('Verbindung getrennt')).toBeVisible()
    await expect(phone.page.getByText('Verbindung verloren', { exact: true })).toBeVisible()
    await phone.context.setOffline(false)
    await expect(phone.page.getByText('Server verbunden')).toBeVisible({ timeout: 10_000 })
    await expect(room.tv.getByText('Verbindung getrennt')).toHaveCount(0)
  } finally { await phone.context.close(); await room.tvContext.close() }
})

test('invalid stored credentials return to join with a recovery message', async ({ browser }) => {
  const room = await createRoom(browser)
  const phone = await controllerPage(browser)
  try {
    await join(phone.page, room.roomCode, 'Nova')
    await phone.page.evaluate((code) => {
      const key = `project-havoc:player:v1:${code}`
      const raw = localStorage.getItem(key)
      if (!raw) throw new Error('Credential missing')
      const value: unknown = JSON.parse(raw)
      if (!value || typeof value !== 'object' || !('reconnectToken' in value)) throw new Error('Credential malformed')
      Object.assign(value, { reconnectToken: 'invalid_reconnect_token_that_is_long_enough_12345' })
      localStorage.setItem(key, JSON.stringify(value))
    }, room.roomCode)
    await phone.page.reload()
    await expect(phone.page.getByRole('alert')).toContainText('nicht mehr gültig')
    await expect(phone.page.getByRole('button', { name: /raum beitreten/i })).toBeVisible()
  } finally { await phone.context.close(); await room.tvContext.close() }
})

test('room close and game start propagate to separate phone contexts', async ({ browser }) => {
  const room = await createRoom(browser)
  const first = await controllerPage(browser)
  const second = await controllerPage(browser)
  try {
    await join(first.page, room.roomCode, 'Nova')
    await join(second.page, room.roomCode, 'Rex')
    await first.page.getByRole('button', { name: /bereit machen/i }).click()
    await second.page.getByRole('button', { name: /bereit machen/i }).click()
    await room.tv.getByRole('button', { name: /chaos/i }).click()
    await room.tv.getByRole('button', { name: /spiel starten/i }).click()
    await expect(first.page.getByRole('heading', { name: /festhalten/i })).toBeVisible()
    await expect(second.page.getByRole('heading', { name: /festhalten/i })).toBeVisible()
    await expect(first.page.getByText(/CHAOS/)).toBeVisible()
    await expect(room.tv.getByText('Nova')).toBeVisible()
    await expect(room.tv.getByText('Rex')).toBeVisible()
  } finally { await first.context.close(); await second.context.close(); await room.tvContext.close() }
})

test('host room close propagates to the controller', async ({ browser }) => {
  const room = await createRoom(browser)
  const phone = await controllerPage(browser)
  try {
    await join(phone.page, room.roomCode, 'Nova')
    await room.tv.getByRole('button', { name: 'Raum schließen' }).click()
    await room.tv.getByRole('dialog').getByRole('button', { name: 'Raum schließen' }).click()
    await expect(phone.page.getByRole('heading', { name: /portal ist erloschen/i })).toBeVisible()
  } finally { await phone.context.close(); await room.tvContext.close() }
})

test('ninth browser player is rejected after eight real controller joins', async ({ browser }) => {
  const room = await createRoom(browser)
  const phones: BrowserContext[] = []
  try {
    for (let index = 0; index < 8; index += 1) {
      const phone = await controllerPage(browser, 320, 700)
      phones.push(phone.context)
      await join(phone.page, room.roomCode, `Player ${index}`)
    }
    await expect(room.tv.getByText('8', { exact: true })).toBeVisible()
    const ninth = await controllerPage(browser, 320, 700)
    phones.push(ninth.context)
    await ninth.page.goto(`${CONTROLLER_URL}/?room=${room.roomCode}`)
    await ninth.page.getByPlaceholder(/wie sollen/i).fill('Ninth')
    await ninth.page.getByRole('button', { name: /raum beitreten/i }).click()
    await expect(ninth.page.getByRole('alert')).toContainText('bereits voll')
  } finally { for (const context of phones) await context.close(); await room.tvContext.close() }
})

for (const viewport of [{ width: 320, height: 640 }, { width: 375, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
  test(`controller remains usable at ${viewport.width}px`, async ({ browser }, testInfo) => {
    const phone = await controllerPage(browser, viewport.width, viewport.height)
    try {
      await phone.page.goto(CONTROLLER_URL)
      const layout = await phone.page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }))
      expect(layout.width).toBeLessThanOrEqual(layout.viewport)
      const button = phone.page.getByRole('button', { name: /raum beitreten/i })
      await expect(button).toBeVisible()
      const box = await button.boundingBox()
      expect(box?.x).toBeGreaterThanOrEqual(0)
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport.width)
      await phone.page.screenshot({ path: testInfo.outputPath(`controller-${viewport.width}.png`), fullPage: true })
    } finally { await phone.context.close() }
  })
}
