/**
 * Kleiner Sound-Manager für den Fernseher.
 *
 * Lege eigene Dateien einfach in apps/tv/public/assets/sfx/ bzw. voice/ und music/ ab.
 * Fehlende Dateien werden still ignoriert – das Spiel läuft auch ganz ohne Ton.
 * Liste aller erwarteten Dateinamen: apps/tv/public/assets/README.md
 */

export type SoundKey =
  | 'start' | 'play' | 'draw' | 'penalty' | 'shield' | 'cannon' | 'swap' | 'whirlpool' | 'dice'
  | 'event' | 'kraken' | 'storm' | 'plunder' | 'bottle' | 'tick'

export type VoiceKey = 'havoc' | 'caught' | 'win' | 'final' | 'event' | 'mutiny' | 'dice'

const SFX_FILES: Record<SoundKey, string> = {
  start: 'sfx/shuffle.mp3',
  play: 'sfx/card-play.mp3',
  draw: 'sfx/card-draw.mp3',
  penalty: 'sfx/penalty.mp3',
  shield: 'sfx/shield.mp3',
  cannon: 'sfx/cannon.mp3',
  swap: 'sfx/swords.mp3',
  whirlpool: 'sfx/whirlpool.mp3',
  dice: 'sfx/dice.mp3',
  event: 'sfx/ship-bell.mp3',
  kraken: 'sfx/kraken.mp3',
  storm: 'sfx/thunder.mp3',
  plunder: 'sfx/coins.mp3',
  bottle: 'sfx/bottle.mp3',
  tick: 'sfx/tick.mp3',
}

const VOICE_FILES: Record<VoiceKey, string> = {
  havoc: 'voice/havoc.mp3',
  caught: 'voice/caught.mp3',
  win: 'voice/win.mp3',
  final: 'voice/final.mp3',
  event: 'voice/event.mp3',
  mutiny: 'voice/mutiny.mp3',
  dice: 'voice/dice.mp3',
}

const BASE = `${import.meta.env.BASE_URL}assets/`

class SoundBoard {
  #muted = false
  #music: HTMLAudioElement | null = null
  readonly #cache = new Map<string, HTMLAudioElement>()
  readonly #missing = new Set<string>()

  get muted(): boolean { return this.#muted }

  #play(path: string, volume: number): void {
    if (this.#muted || this.#missing.has(path) || typeof Audio === 'undefined') return
    let template = this.#cache.get(path)
    if (!template) {
      template = new Audio(BASE + path)
      template.preload = 'auto'
      template.addEventListener('error', () => this.#missing.add(path), { once: true })
      this.#cache.set(path, template)
    }
    const instance = template.cloneNode(true) as HTMLAudioElement
    instance.volume = volume
    instance.play().catch(() => { /* Autoplay blockiert oder Datei fehlt */ })
  }

  sfx(key: SoundKey, volume = 0.8): void { this.#play(SFX_FILES[key], volume) }
  voice(key: VoiceKey): void { this.#play(VOICE_FILES[key], 1) }

  startMusic(): void {
    if (this.#muted || typeof Audio === 'undefined') return
    if (!this.#music) {
      this.#music = new Audio(`${BASE}music/theme.mp3`)
      this.#music.loop = true
      this.#music.volume = 0.25
    }
    this.#music.play().catch(() => { /* keine Musikdatei oder Autoplay blockiert */ })
  }

  setFinalMusic(final: boolean): void {
    if (this.#music) this.#music.playbackRate = final ? 1.12 : 1
  }

  stopMusic(): void { this.#music?.pause() }

  toggleMute(): boolean {
    this.#muted = !this.#muted
    if (this.#muted) this.stopMusic()
    else this.startMusic()
    return this.#muted
  }
}

export const sounds = new SoundBoard()
