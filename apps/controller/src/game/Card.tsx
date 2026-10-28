// Gemeinsame Kartendarstellung. Identische Kopie liegt in apps/tv/src/game/Card.tsx – bei Änderungen beide anpassen.
import type { CardColor } from '@project-havoc/game-core'
import type { HavocCard } from '@project-havoc/rules-chaos'

const CHAOS_GLYPHS = {
  mutiny: '⚔',
  maelstrom: '🌀',
  'cursed-dice': '🎲',
  lifebuoy: '🛟',
  backfire: '💥',
} as const

const CHAOS_NAMES = {
  mutiny: 'Meuterei',
  maelstrom: 'Strudel',
  'cursed-dice': 'Davy Jones',
  lifebuoy: 'Rettungsring',
  backfire: 'Rückschlag',
} as const


function face(card: HavocCard): { glyph: string; corner: string; label: string } {
  switch (card.kind) {
    case 'number': return { glyph: String(card.value), corner: String(card.value), label: '' }
    case 'skip': return { glyph: '⊘', corner: '⊘', label: 'Aussetzen' }
    case 'reverse': return { glyph: '⇄', corner: '⇄', label: 'Kurswechsel' }
    case 'draw-two': return { glyph: '+2', corner: '+2', label: 'Enterhaken' }
    case 'wild': return { glyph: '🧭', corner: '✶', label: 'Kompass' }
    case 'wild-draw-four': return { glyph: '+4', corner: '+4', label: 'Breitseite' }
    case 'chaos': return { glyph: CHAOS_GLYPHS[card.chaos], corner: '☠', label: CHAOS_NAMES[card.chaos] }
  }
}

function cardTone(card: HavocCard): string {
  if ('color' in card) return card.color
  return card.kind === 'chaos' ? 'chaos' : 'wild'
}

export function HavocCardView({ card, size = 'md', dim = false, glow = false, tint }: {
  readonly card: HavocCard
  readonly size?: 'sm' | 'md' | 'lg' | 'xl'
  readonly dim?: boolean
  readonly glow?: boolean
  /** Für Kompass/Breitseite: zeigt die gewählte Farbe als Rand. */
  readonly tint?: CardColor | undefined
}): React.JSX.Element {
  const { glyph, corner, label } = face(card)
  const classes = [
    'hcard', `hcard--${size}`, `hcard--${cardTone(card)}`,
    dim ? 'hcard--dim' : '', glow ? 'hcard--glow' : '', tint ? `hcard--tint-${tint}` : '',
  ].filter(Boolean).join(' ')
  return (
    <div className={classes} aria-label={label || glyph}>
      <span className="hcard__corner hcard__corner--tl">{corner}</span>
      <span className="hcard__oval"><span className="hcard__glyph">{glyph}</span></span>
      {label && <span className="hcard__label">{label}</span>}
      <span className="hcard__corner hcard__corner--br">{corner}</span>
    </div>
  )
}

export function CardBack({ size = 'md', count }: { readonly size?: 'sm' | 'md' | 'lg' | 'xl'; readonly count?: number }): React.JSX.Element {
  return (
    <div className={`hcard hcard--${size} hcard--back`}>
      <span className="hcard__back-art">☠</span>
      {count !== undefined && <span className="hcard__count">{count}</span>}
    </div>
  )
}
