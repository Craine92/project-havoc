export type LogLevel = 'info' | 'warn' | 'error'

export interface LogFields {
  readonly event: string
  readonly roomId?: string
  readonly socketId?: string
  readonly code?: string
  readonly detail?: string
}

export interface Logger {
  log(level: LogLevel, fields: LogFields): void
}

/** Emits one JSON record per line and never accepts credential fields. */
export function createConsoleLogger(): Logger {
  return {
    log(level, fields) {
      const writer = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info
      writer(JSON.stringify({ timestamp: new Date().toISOString(), level, ...fields }))
    },
  }
}
