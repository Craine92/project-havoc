// The explicit control range is the rule being enforced, not an accidental pattern.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g
const WHITESPACE = /\s+/g

export const PLAYER_NAME_MIN_LENGTH = 2
export const PLAYER_NAME_MAX_LENGTH = 16

export type PlayerNameResult =
  | { readonly ok: true; readonly name: string; readonly normalizedName: string }
  | { readonly ok: false }

/** Normalizes a display name without accepting it as an identity credential. */
export function normalizePlayerName(value: string): PlayerNameResult {
  const name = value.replace(CONTROL_CHARACTERS, '').trim().replace(WHITESPACE, ' ')
  const length = [...name].length

  if (length < PLAYER_NAME_MIN_LENGTH || length > PLAYER_NAME_MAX_LENGTH) {
    return { ok: false }
  }

  return {
    ok: true,
    name,
    normalizedName: name.normalize('NFKC').toLocaleLowerCase('und'),
  }
}
