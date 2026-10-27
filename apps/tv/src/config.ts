export interface TvRuntimeConfig {
  readonly serverUrl: string
  readonly publicJoinBaseUrl: string | null
}

function validHttpUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

export function loadTvConfig(location: Location = window.location): TvRuntimeConfig {
  const configuredServer = import.meta.env.VITE_HAVOC_SERVER_URL?.trim()
  const defaultServer = `${location.protocol}//${location.hostname}:3000`
  const serverUrl = configuredServer ? validHttpUrl(configuredServer) : defaultServer
  if (!serverUrl) throw new Error('VITE_HAVOC_SERVER_URL must be an HTTP or HTTPS URL')

  const configuredJoinUrl = import.meta.env.VITE_PUBLIC_JOIN_URL?.trim()
  return {
    serverUrl: serverUrl.replace(/\/$/, ''),
    publicJoinBaseUrl: configuredJoinUrl ? validHttpUrl(configuredJoinUrl) : null,
  }
}

export function createJoinUrl(config: TvRuntimeConfig, roomCode: string): {
  readonly url: string
  readonly warning: string | null
} {
  const base = config.publicJoinBaseUrl ?? `${window.location.origin}/join`
  const url = new URL(base)
  url.searchParams.set('room', roomCode)
  return {
    url: url.toString(),
    warning: config.publicJoinBaseUrl
      ? null
      : 'LAN-Link nicht konfiguriert. Setze VITE_PUBLIC_JOIN_URL auf die erreichbare Controller-Adresse.',
  }
}
