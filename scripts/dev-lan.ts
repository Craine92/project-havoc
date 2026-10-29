import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createLanRuntime, discoverLanCandidates, selectLanAddress, type LanRuntime } from './lan-config.js'
import { ManagedProcessGroup } from './process-group.js'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const viteCli = resolve(projectRoot, 'node_modules/vite/bin/vite.js')
const tsxCli = resolve(projectRoot, 'node_modules/tsx/dist/cli.mjs')
const processes = new ManagedProcessGroup()
let shuttingDown = false

function requireAvailablePort(address: string, port: number, label: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.unref()
    probe.once('error', () => reject(new Error(`${label}-Port ${port} ist auf ${address} bereits belegt. Beende den alten Prozess oder verwende npm run doctor.`)))
    probe.listen(port, address, () => probe.close((error) => error ? reject(error) : resolve()))
  })
}

function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.pid === undefined) return Promise.resolve()
  if (process.platform === 'win32') {
    const pid = String(child.pid)
    return new Promise((resolve) => {
      execFile('taskkill.exe', ['/PID', pid, '/T'], { windowsHide: true, timeout: 2_000 }, (error) => {
        if (!error) { resolve(); return }
        execFile('taskkill.exe', ['/PID', pid, '/T', '/F'], { windowsHide: true, timeout: 3_000 }, () => resolve())
      })
    })
  }
  return new Promise((resolve) => {
    const done = (): void => resolve()
    child.once('exit', done)
    child.kill('SIGTERM')
    const timer = setTimeout(() => {
      if (child.exitCode !== null || child.pid === undefined) return
      child.kill('SIGKILL')
    }, 2_000)
    timer.unref()
  })
}

function start(label: string, args: readonly string[], environment: NodeJS.ProcessEnv, cwd: string): ChildProcess {
  const child = spawn(process.execPath, args, {
    cwd,
    env: environment,
    stdio: 'inherit',
    windowsHide: true,
  })
  processes.add({ label, stop: () => stopChild(child) })
  child.once('error', (error) => {
    console.error(`[${label}] konnte nicht gestartet werden: ${error.message}`)
    void shutdown(1)
  })
  child.once('exit', (code) => {
    if (!shuttingDown) {
      console.error(`[${label}] wurde unerwartet beendet (Code ${code ?? 'unbekannt'}).`)
      void shutdown(code === 0 ? 1 : (code ?? 1))
    }
  })
  return child
}

async function waitFor(url: string, label: string, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`${label} wurde vor der Bereitschaft beendet.`)
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) })
      if (response.ok) return
    } catch {
      // The service is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`${label} antwortet nicht unter ${url}. Prüfe belegte Ports und die Windows-Firewall.`)
}

async function shutdown(exitCode: number): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  console.info('\nProject Havoc wird beendet …')
  try {
    await processes.shutdown()
  } catch (error: unknown) {
    console.error(`Mindestens ein Prozess konnte nicht sauber beendet werden: ${error instanceof Error ? error.message : 'unbekannter Fehler'}`)
    exitCode = 1
  }
  process.exitCode = exitCode
}

function printCandidates(runtime: LanRuntime, source: 'automatic' | 'manual'): void {
  console.info('\nPROJECT HAVOC – LAN-START')
  console.info(`LAN-IP:       ${runtime.lanAddress} (${source === 'automatic' ? 'automatisch erkannt' : 'manuell vorgegeben'})`)
  console.info(`TV:           ${runtime.tvUrl}`)
  console.info(`Smartphone:   ${runtime.controllerUrl}`)
  console.info(`Backend:      ${runtime.backendUrl}`)
  console.info('CORS:         nur TV- und Controller-Origin')
  console.info('Hinweis: Beim ersten Start Node.js in der Windows-Firewall nur für private Netzwerke freigeben.')
  console.info('Beenden:      Strg+C\n')
}

async function main(): Promise<void> {
  const selection = selectLanAddress(discoverLanCandidates(), process.env.HAVOC_LAN_IP)
  if (!selection.ok) {
    console.error(`LAN-Konfiguration fehlgeschlagen: ${selection.reason}`)
    for (const candidate of selection.candidates) console.error(`- ${candidate.name}: ${candidate.address}`)
    console.error("Fallback: $env:HAVOC_LAN_IP='192.168.x.x'; npm run dev")
    process.exitCode = 1
    return
  }

  let runtime: LanRuntime
  try {
    runtime = createLanRuntime(selection.address)
    await Promise.all([
      requireAvailablePort(runtime.lanAddress, runtime.backendPort, 'Backend'),
      requireAvailablePort(runtime.lanAddress, runtime.tvPort, 'TV'),
      requireAvailablePort(runtime.lanAddress, runtime.controllerPort, 'Controller'),
    ])
  } catch (error: unknown) {
    console.error(`Fehlerhafte Konfiguration: ${error instanceof Error ? error.message : 'unbekannter Fehler'}`)
    process.exitCode = 1
    return
  }

  const shared = {
    ...process.env,
    VITE_HAVOC_SERVER_URL: runtime.backendUrl,
  }
  const server = start('Backend', [tsxCli, 'watch', 'src/index.ts'], {
    ...shared,
    HOST: runtime.lanAddress,
    PORT: String(runtime.backendPort),
    CORS_ORIGINS: runtime.corsOrigins,
    RECONNECT_TOKEN_SECRET: process.env.RECONNECT_TOKEN_SECRET ?? randomBytes(32).toString('base64url'),
  }, resolve(projectRoot, 'apps/server'))
  const tv = start('TV', [viteCli, '--host', runtime.lanAddress, '--port', String(runtime.tvPort), '--strictPort'], {
    ...shared,
    VITE_PUBLIC_JOIN_URL: runtime.controllerJoinBaseUrl,
  }, resolve(projectRoot, 'apps/tv'))
  const controller = start('Controller', [viteCli, '--host', runtime.lanAddress, '--port', String(runtime.controllerPort), '--strictPort'], shared, resolve(projectRoot, 'apps/controller'))

  try {
    await Promise.all([
      waitFor(`${runtime.backendUrl}/health`, 'Backend', server),
      waitFor(runtime.tvUrl, 'TV', tv),
      waitFor(runtime.controllerUrl, 'Controller', controller),
    ])
    printCandidates(runtime, selection.source)
  } catch (error: unknown) {
    console.error(`Startdiagnose fehlgeschlagen: ${error instanceof Error ? error.message : 'unbekannter Fehler'}`)
    await shutdown(1)
  }
}

process.once('SIGINT', () => { void shutdown(0) })
process.once('SIGTERM', () => { void shutdown(0) })
const testShutdownFile = process.env.HAVOC_TEST_SHUTDOWN_FILE
if (testShutdownFile) {
  const shutdownWatcher = setInterval(() => {
    if (!existsSync(testShutdownFile)) return
    clearInterval(shutdownWatcher)
    void shutdown(0)
  }, 100)
}

void main().catch(async (error: unknown) => {
  console.error(`Projektstart fehlgeschlagen: ${error instanceof Error ? error.message : 'unbekannter Fehler'}`)
  await shutdown(1)
})

