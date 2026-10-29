import { execFileSync } from 'node:child_process'
import { networkInterfaces } from 'node:os'

export interface LanCandidate {
  readonly name: string
  readonly description: string
  readonly address: string
  readonly hasDefaultGateway: boolean
}

export type LanSelection =
  | { readonly ok: true; readonly address: string; readonly source: 'automatic' | 'manual'; readonly candidates: readonly LanCandidate[] }
  | { readonly ok: false; readonly reason: string; readonly candidates: readonly LanCandidate[] }

export interface LanRuntime {
  readonly lanAddress: string
  readonly backendPort: number
  readonly tvPort: number
  readonly controllerPort: number
  readonly backendUrl: string
  readonly tvUrl: string
  readonly controllerUrl: string
  readonly controllerJoinBaseUrl: string
  readonly corsOrigins: string
}

const VIRTUAL_ADAPTER = /virtual|vmware|vbox|hyper-v|vethernet|wsl|docker|container|loopback|tailscale|zerotier/i

export function isUsableLanIpv4(value: string): boolean {
  const parts = value.split('.')
  if (parts.length !== 4) return false
  const octets = parts.map((part) => Number(part))
  if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const first = octets[0]
  const second = octets[1]
  if (first === undefined || second === undefined) return false
  return first !== 0 && first !== 127 && first < 224 && !(first === 169 && second === 254)
}

export function selectLanAddress(candidates: readonly LanCandidate[], manualAddress?: string): LanSelection {
  const usable = candidates.filter((candidate) =>
    isUsableLanIpv4(candidate.address)
    && !VIRTUAL_ADAPTER.test(`${candidate.name} ${candidate.description}`),
  )
  if (manualAddress) {
    const address = manualAddress.trim()
    return isUsableLanIpv4(address)
      ? { ok: true, address, source: 'manual', candidates: usable }
      : { ok: false, reason: `HAVOC_LAN_IP ist keine geeignete IPv4-Adresse: ${address}`, candidates: usable }
  }

  const routed = usable.filter((candidate) => candidate.hasDefaultGateway)
  const soleRouted = routed.length === 1 ? routed[0] : undefined
  if (soleRouted) return { ok: true, address: soleRouted.address, source: 'automatic', candidates: usable }
  if (routed.length > 1) {
    return { ok: false, reason: 'Mehrere aktive LAN-Adapter mit Standardgateway gefunden.', candidates: routed }
  }
  const soleUsable = usable.length === 1 ? usable[0] : undefined
  if (soleUsable) return { ok: true, address: soleUsable.address, source: 'automatic', candidates: usable }
  return {
    ok: false,
    reason: usable.length === 0
      ? 'Keine geeignete aktive LAN-IPv4-Adresse gefunden.'
      : 'Mehrere mögliche LAN-Adapter gefunden; eine automatische Auswahl wäre unsicher.',
    candidates: usable,
  }
}

function windowsDefaultRouteAddresses(): ReadonlySet<string> {
  try {
    const output = execFileSync('route.exe', ['PRINT', '-4', '0.0.0.0'], {
      encoding: 'utf8',
      windowsHide: true,
    })
    const addresses = output.split(/\r?\n/).flatMap((line): string[] => {
      const columns = line.trim().split(/\s+/)
      return columns[0] === '0.0.0.0' && columns[1] === '0.0.0.0' && columns[3] && isUsableLanIpv4(columns[3])
        ? [columns[3]]
        : []
    })
    return new Set(addresses)
  } catch {
    return new Set()
  }
}

function portableCandidates(defaultRoutes: ReadonlySet<string> = new Set()): readonly LanCandidate[] {
  return Object.entries(networkInterfaces()).flatMap(([name, addresses]) =>
    (addresses ?? []).flatMap((address): LanCandidate[] =>
      address.family === 'IPv4' && !address.internal
        ? [{ name, description: name, address: address.address, hasDefaultGateway: defaultRoutes.has(address.address) }]
        : [],
    ),
  )
}

export function discoverLanCandidates(): readonly LanCandidate[] {
  const defaultRoutes = process.platform === 'win32' ? windowsDefaultRouteAddresses() : new Set<string>()
  return portableCandidates(defaultRoutes)
}

function port(value: string | undefined, fallback: number, name: string): number {
  const result = value === undefined ? fallback : Number(value)
  if (!Number.isInteger(result) || result < 1 || result > 65_535) throw new Error(`${name} muss ein Port zwischen 1 und 65535 sein.`)
  return result
}

export function createLanRuntime(address: string, environment: NodeJS.ProcessEnv = process.env): LanRuntime {
  if (!isUsableLanIpv4(address)) throw new Error(`Ungeeignete LAN-IP: ${address}`)
  const backendPort = port(environment.HAVOC_SERVER_PORT, 3000, 'HAVOC_SERVER_PORT')
  const tvPort = port(environment.HAVOC_TV_PORT, 5173, 'HAVOC_TV_PORT')
  const controllerPort = port(environment.HAVOC_CONTROLLER_PORT, 5174, 'HAVOC_CONTROLLER_PORT')
  if (new Set([backendPort, tvPort, controllerPort]).size !== 3) throw new Error('Backend-, TV- und Controller-Port müssen verschieden sein.')
  const host = `http://${address}`
  const backendUrl = `${host}:${backendPort}`
  const tvUrl = `${host}:${tvPort}`
  const controllerUrl = `${host}:${controllerPort}`
  return {
    lanAddress: address,
    backendPort,
    tvPort,
    controllerPort,
    backendUrl,
    tvUrl,
    controllerUrl,
    controllerJoinBaseUrl: `${controllerUrl}/join`,
    corsOrigins: `${tvUrl},${controllerUrl}`,
  }
}

