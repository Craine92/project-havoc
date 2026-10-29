export interface ControllerConfig { readonly serverUrl: string }

export function loadControllerConfig(location: Location = window.location): ControllerConfig {
  const configured = import.meta.env.VITE_HAVOC_SERVER_URL?.trim()
  const fallback = `${location.protocol}//${location.hostname}:3000`
  const url = new URL(configured || fallback)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('VITE_HAVOC_SERVER_URL must be HTTP or HTTPS')
  return { serverUrl: url.toString().replace(/\/$/, '') }
}

export function roomCodeFromUrl(location: Location = window.location): string {
  return new URLSearchParams(location.search).get('room')?.trim().toUpperCase() ?? ''
}
