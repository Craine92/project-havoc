export interface TvRuntimeConfig {
  readonly serverUrl: string
  readonly publicJoinBaseUrl: string | null
  readonly publicJoinError: string | null
  readonly allowLoopbackJoinUrl: boolean
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
  const validJoinUrl = configuredJoinUrl ? validHttpUrl(configuredJoinUrl) : null
  return {
    serverUrl: serverUrl.replace(/\/$/, ''),
    publicJoinBaseUrl: validJoinUrl,
    publicJoinError: configuredJoinUrl && !validJoinUrl
      ? 'Die konfigurierte Controller-URL ist ungültig. Prüfe VITE_PUBLIC_JOIN_URL oder starte mit npm run dev.'
      : null,
    allowLoopbackJoinUrl: import.meta.env.VITE_ALLOW_LOOPBACK_JOIN_URL === 'true',
  }
}

export function createJoinUrl(config: TvRuntimeConfig, roomCode: string): {
  readonly url: string | null
  readonly warning: string
} {
  if (!config.publicJoinBaseUrl) {
    return {
      url: null,
      warning: config.publicJoinError
        ?? 'Keine erreichbare Controller-Adresse erkannt. Starte das Projekt mit npm run dev oder setze VITE_PUBLIC_JOIN_URL manuell.',
    }
  }
  const url = new URL(config.publicJoinBaseUrl)
  if (!config.allowLoopbackJoinUrl && (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]')) {
    return {
      url: null,
      warning: 'Die Controller-Adresse zeigt auf localhost und ist für Smartphones nicht erreichbar. Starte mit npm run dev.',
    }
  }
  url.searchParams.set('room', roomCode)
  return {
    url: url.toString(),
    warning: '',
  }
}
