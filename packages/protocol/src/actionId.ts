export type RandomByteFiller = (bytes: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer>

const defaultRandomByteFiller: RandomByteFiller = (bytes) => globalThis.crypto.getRandomValues(bytes)

/** Creates a protocol-safe action ID without requiring a secure browser context. */
export function createActionId(prefix: string, fillRandomBytes: RandomByteFiller = defaultRandomByteFiller): string {
  if (!/^[A-Za-z0-9_-]+$/.test(prefix)) throw new Error('Action ID prefix contains unsupported characters')
  const bytes = fillRandomBytes(new Uint8Array(new ArrayBuffer(16)))
  if (bytes.length !== 16) throw new Error('Action ID randomness must contain 16 bytes')
  const suffix = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
  return `${prefix}_${suffix}`
}

