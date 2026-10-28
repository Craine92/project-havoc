import { connect } from 'node:net'

import { createLanRuntime, discoverLanCandidates, selectLanAddress } from './lan-config.js'
import { serviceDiagnosis } from './doctor-utils.js'

function portOpen(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host, port })
    const finish = (result: boolean): void => { socket.destroy(); resolve(result) }
    socket.setTimeout(1_000)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

async function httpReachable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2_000) })
    return response.ok
  } catch {
    return false
  }
}

async function main(): Promise<void> {
  const selection = selectLanAddress(discoverLanCandidates(), process.env.HAVOC_LAN_IP)
  if (!selection.ok) {
    console.error(`LAN-IP: FEHLER – ${selection.reason}`)
    for (const candidate of selection.candidates) console.error(`- ${candidate.name}: ${candidate.address}`)
    process.exitCode = 1
    return
  }
  const runtime = createLanRuntime(selection.address)
  const ports = await Promise.all([
    portOpen(runtime.lanAddress, runtime.backendPort),
    portOpen(runtime.lanAddress, runtime.tvPort),
    portOpen(runtime.lanAddress, runtime.controllerPort),
  ])
  const lanReachable = await Promise.all([
    httpReachable(`${runtime.backendUrl}/health`), httpReachable(runtime.tvUrl), httpReachable(runtime.controllerUrl),
  ])
  const localReachable = await Promise.all([
    httpReachable(`http://127.0.0.1:${runtime.backendPort}/health`),
    httpReachable(`http://127.0.0.1:${runtime.tvPort}`),
    httpReachable(`http://127.0.0.1:${runtime.controllerPort}`),
  ])
  console.info(`LAN-IP:     ${runtime.lanAddress} (${selection.source})`)
  console.info(`Backend:    ${runtime.backendUrl} – ${serviceDiagnosis('Backend', lanReachable[0] ?? false, localReachable[0] ?? false, ports[0] ?? false)}`)
  console.info(`TV:         ${runtime.tvUrl} – ${serviceDiagnosis('TV', lanReachable[1] ?? false, localReachable[1] ?? false, ports[1] ?? false)}`)
  console.info(`Controller: ${runtime.controllerUrl} – ${serviceDiagnosis('Controller', lanReachable[2] ?? false, localReachable[2] ?? false, ports[2] ?? false)}`)
  console.info('Ein erfolgreicher Doctor-Test ersetzt keinen Test mit einem echten Smartphone im selben WLAN.')
}

void main().catch((error: unknown) => {
  console.error(`Doctor fehlgeschlagen: ${error instanceof Error ? error.message : 'unbekannter Fehler'}`)
  process.exitCode = 1
})

