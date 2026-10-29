import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { randomInt } from 'node:crypto'
import { closeSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

interface LauncherUrls {
  readonly tv: string
  readonly controller: string
  readonly backend: string
}

let launcher: ChildProcess | null = null
let output = ''
let urls: LauncherUrls | null = null
let logFd: number | null = null
const logPath = join(tmpdir(), `project-havoc-lan-e2e-${process.pid}-${randomInt(1_000_000)}.log`)
const shutdownPath = join(tmpdir(), `project-havoc-lan-e2e-${process.pid}-${randomInt(1_000_000)}.stop`)
const serverPort = randomInt(48_000, 60_000)
const tvPort = serverPort + 1
const controllerPort = serverPort + 2

function stopLauncher(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.pid === undefined) return Promise.resolve()
  return new Promise((resolve) => {
    let settled = false
    const finish = (): void => {
      if (settled) return
      settled = true
      child.unref()
      resolve()
    }
    child.once('exit', finish)
    writeFileSync(shutdownPath, 'shutdown', 'utf8')
    setTimeout(() => {
      if (settled) return
      if (process.platform !== 'win32') { child.kill('SIGTERM'); finish(); return }
      execFile('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, finish)
    }, 8_000)
  })
}

function startLauncher(): Promise<LauncherUrls> {
  const executable = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'npm'
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm.cmd', 'run', 'dev'] : ['run', 'dev']
  logFd = openSync(logPath, 'w')
  launcher = spawn(executable, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      HAVOC_SERVER_PORT: String(serverPort),
      HAVOC_TV_PORT: String(tvPort),
      HAVOC_CONTROLLER_PORT: String(controllerPort),
      HAVOC_TEST_SHUTDOWN_FILE: shutdownPath,
    },
    stdio: ['ignore', logFd, logFd],
    windowsHide: true,
  })
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`LAN launcher did not become ready.\n${output}`)), 25_000)
    const inspect = (): void => {
      output = readFileSync(logPath, 'utf8')
      const tv = output.match(new RegExp(`TV:\\s+(http:\\/\\/[^\\s]+:${tvPort})`))?.[1]
      const controller = output.match(new RegExp(`Smartphone:\\s+(http:\\/\\/[^\\s]+:${controllerPort})`))?.[1]
      const backend = output.match(new RegExp(`Backend:\\s+(http:\\/\\/[^\\s]+:${serverPort})`))?.[1]
      if (tv && controller && backend) {
        clearTimeout(timeout)
        clearInterval(interval)
        resolve({ tv, controller, backend })
      }
    }
    const interval = setInterval(inspect, 100)
    launcher?.once('exit', (code) => {
      clearTimeout(timeout)
      clearInterval(interval)
      inspect()
      reject(new Error(`LAN launcher exited with ${code}.\n${output}`))
    })
    launcher?.once('error', reject)
  })
}

test.beforeAll(async () => { urls = await startLauncher() })
test.afterAll(async () => {
  if (launcher) await stopLauncher(launcher)
  if (logFd !== null) { closeSync(logFd); logFd = null }
})

test('npm run dev creates a real LAN room and joins through its generated controller URL', async ({ browser }) => {
  test.setTimeout(60_000)
  if (!urls) throw new Error('LAN launcher URLs are unavailable')
  const tvContext = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const tv = await tvContext.newPage()
  const phone = await phoneContext.newPage()
  const browserErrors: string[] = []
  tv.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`TV: ${message.text()}`) })
  phone.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`Controller: ${message.text()}`) })
  const webSockets: string[] = []
  tv.on('websocket', (socket) => webSockets.push(socket.url()))

  try {
    await tv.goto(urls.tv)
    await expect(tv.getByText('Server verbunden')).toBeVisible()
    await tv.getByRole('button', { name: 'Neues Spiel' }).click()
    try {
      await expect(tv.getByTestId('room-code')).toBeVisible({ timeout: 12_000 })
    } catch {
      throw new Error(`Room creation did not reach the LAN server.\nLauncher output:\n${output}\nBrowser errors:\n${browserErrors.join('\n')}`)
    }
    const code = (await tv.getByTestId('room-code').textContent())?.trim() ?? ''
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)

    const expectedJoinUrl = `${urls.controller}/join?room=${code}`
    await expect(tv.getByRole('link', { name: new RegExp(code) })).toHaveAttribute('href', expectedJoinUrl)
    await expect(tv.locator('.qr-code')).toHaveAttribute('data-qr-value', expectedJoinUrl)
    expect(webSockets.some((url) => url.includes(`:${serverPort}/socket.io/`))).toBe(true)
    output = readFileSync(logPath, 'utf8')
    expect(output).toContain('"event":"room.created"')

    await phone.goto(expectedJoinUrl)
    await expect(phone.getByText('Server verbunden')).toBeVisible()
    await phone.getByPlaceholder(/wie sollen/i).fill('LAN Nova')
    await phone.getByRole('button', { name: /raum beitreten/i }).click()
    await expect(phone.getByRole('heading', { name: 'LAN Nova' })).toBeVisible()
    await expect(tv.getByText('LAN Nova')).toBeVisible()
    expect(browserErrors).toEqual([])
  } finally {
    await phoneContext.close()
    await tvContext.close()
  }
})
