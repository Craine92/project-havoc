import { expect, test, type Page } from '@playwright/test'
import { io, type Socket } from 'socket.io-client'

import {
  PROTOCOL_VERSION,
  validateClientMessage,
  validateServerMessage,
  type ClientMessage,
  type ServerMessage,
} from '@project-havoc/protocol'

const SERVER_URL = 'http://127.0.0.1:4310'
const clients: Socket[] = []
let actionSequence = 0

type ClientMessageInput = ClientMessage extends infer Message
  ? Message extends ClientMessage ? Omit<Message, 'version'> : never
  : never

function message(value: ClientMessageInput): ClientMessage {
  const parsed = validateClientMessage({ version: PROTOCOL_VERSION, ...value })
  if (!parsed.success) throw new Error(parsed.issues.join('; '))
  return parsed.data
}

function actionId(label: string): string {
  actionSequence += 1
  return `e2e_${label}_${actionSequence.toString().padStart(6, '0')}`
}

function waitForMessage(
  socket: Socket,
  predicate: (message: ServerMessage) => boolean,
): Promise<ServerMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('server.message', handler)
      reject(new Error('Timed out waiting for a server message'))
    }, 5_000)
    function handler(value: unknown): void {
      const parsed = validateServerMessage(value)
      if (!parsed.success || !predicate(parsed.data)) return
      clearTimeout(timer)
      socket.off('server.message', handler)
      resolve(parsed.data)
    }
    socket.on('server.message', handler)
  })
}

async function connectClient(): Promise<Socket> {
  const socket = io(SERVER_URL, { transports: ['websocket'], forceNew: true, reconnection: false })
  clients.push(socket)
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket client connection timed out')), 5_000)
    socket.once('connect', () => { clearTimeout(timer); resolve() })
    socket.once('connect_error', (error) => { clearTimeout(timer); reject(error) })
  })
  return socket
}

interface TestPlayer {
  readonly socket: Socket
  readonly playerId: string
  readonly token: string
  revision: number
}

async function joinPlayer(roomCode: string, name: string): Promise<TestPlayer> {
  const socket = await connectClient()
  const id = actionId('join')
  const credentialsPromise = waitForMessage(socket, (item) => item.type === 'credentials.issued' && item.actionId === id)
  const snapshotPromise = waitForMessage(socket, (item) => item.type === 'session.snapshot')
  socket.emit('client.message', message({ type: 'room.join', actionId: id, expectedRevision: 0, roomCode, name }))
  const credentials = await credentialsPromise
  const snapshot = await snapshotPromise
  if (credentials.type !== 'credentials.issued' || credentials.identity.role !== 'player') throw new Error('Player credentials missing')
  if (snapshot.type !== 'session.snapshot') throw new Error('Player snapshot missing')
  return {
    socket,
    playerId: credentials.identity.playerId,
    token: credentials.identity.reconnectToken,
    revision: snapshot.session.revision,
  }
}

async function setReady(player: TestPlayer): Promise<void> {
  const id = actionId('ready')
  const accepted = waitForMessage(player.socket, (item) => item.type === 'action.accepted' && item.actionId === id)
  player.socket.emit('client.message', message({
    type: 'player.set-ready', actionId: id, expectedRevision: player.revision, ready: true,
  }))
  const response = await accepted
  if (response.type !== 'action.accepted') throw new Error('Ready action was not accepted')
  player.revision = response.revision
}

async function openRoom(page: Page): Promise<string> {
  await page.goto('/')
  await expect(page.getByText('Server verbunden')).toBeVisible()
  await page.getByRole('button', { name: 'Neues Spiel' }).click()
  const roomCode = page.getByTestId('room-code')
  await expect(roomCode).toBeVisible()
  return (await roomCode.textContent())?.trim() ?? ''
}

test.beforeEach(() => { actionSequence = 0 })
test.afterEach(() => { for (const client of clients.splice(0)) client.disconnect() })

test('shows the connected start screen and creates a real room', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /ein bildschirm/i })).toBeVisible()
  await expect(page.getByText('Server verbunden')).toBeVisible()
  await expect(page.getByText(/alpha 0.1c/i)).toBeVisible()

  const code = await openRoom(page)
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
  await expect(page.getByRole('link', { name: new RegExp(code) })).toHaveAttribute('href', new RegExp(`4312.*room=${code}`))
  const qr = page.locator('.qr-code')
  await expect(qr).toHaveAttribute('data-qr-value', new RegExp(`room=${code}`))
  await expect(qr.getByRole('img')).toHaveAttribute('src', /^data:image\/png;base64,/)
})

test('shows a clear unavailable-server state', async ({ page }) => {
  await page.routeWebSocket('ws://127.0.0.1:4310/socket.io/**', (webSocket) => webSocket.close())
  await page.goto('/')
  await expect(page.getByText('Server nicht erreichbar')).toBeVisible({ timeout: 8_000 })
  await expect(page.getByRole('button', { name: 'Neues Spiel' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Erneut verbinden' })).toBeVisible()
})

test('changes mode only after the authoritative server snapshot', async ({ page }) => {
  await openRoom(page)
  const chaos = page.getByRole('button', { name: /chaos/i })
  await chaos.click()
  await expect(chaos).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /classic/i }).click()
  await expect(page.getByRole('button', { name: /classic/i })).toHaveAttribute('aria-pressed', 'true')
})

test('shows real player, ready, and disconnect updates', async ({ page }) => {
  const roomCode = await openRoom(page)
  const player = await joinPlayer(roomCode, 'Nova')
  await expect(page.getByText('Nova')).toBeVisible()
  await expect(page.getByText('Wartet')).toBeVisible()

  await setReady(player)
  await expect(page.getByText('Bereit', { exact: true })).toBeVisible()
  player.socket.disconnect()
  await expect(page.getByText('Verbindung getrennt')).toBeVisible()
})

test('keeps start disabled without permission and starts with two ready players', async ({ page }) => {
  const roomCode = await openRoom(page)
  const startButton = page.getByRole('button', { name: /spiel starten/i })
  await expect(startButton).toBeDisabled()
  await expect(page.getByText(/mindestens zwei verbundene spieler/i)).toBeVisible()

  const first = await joinPlayer(roomCode, 'Nova')
  await setReady(first)
  const second = await joinPlayer(roomCode, 'Rex')
  await setReady(second)
  await expect(startButton).toBeEnabled()
  await startButton.click()
  await expect(page.getByRole('heading', { name: /portal ist offen/i })).toBeVisible()
})

test('restores the host after a browser reload', async ({ page }) => {
  const roomCode = await openRoom(page)
  await page.reload()
  await expect(page.getByTestId('room-code')).toHaveText(roomCode)
  await expect(page.getByText('Server verbunden')).toBeVisible()
})

test('closes a room only after confirmation', async ({ page }) => {
  await openRoom(page)
  await page.getByRole('button', { name: 'Raum schließen' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Raum schließen' }).click()
  await expect(page.getByRole('heading', { name: /energie ist verflogen/i })).toBeVisible()
})

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
]) {
  test(`keeps controls visible without horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await openRoom(page)
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      startRect: document.querySelector<HTMLButtonElement>('.launch-actions .button--primary')?.getBoundingClientRect(),
      closeRect: document.querySelector<HTMLButtonElement>('.launch-actions .button--danger')?.getBoundingClientRect(),
    }))
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.viewportWidth)
    for (const rectangle of [dimensions.startRect, dimensions.closeRect]) {
      expect(rectangle).toBeTruthy()
      expect(rectangle?.left).toBeGreaterThanOrEqual(0)
      expect(rectangle?.right).toBeLessThanOrEqual(viewport.width)
      expect(rectangle?.bottom).toBeLessThanOrEqual(viewport.height)
    }
    await page.screenshot({ path: testInfo.outputPath(`tv-lobby-${viewport.width}x${viewport.height}.png`), fullPage: true })
  })
}
