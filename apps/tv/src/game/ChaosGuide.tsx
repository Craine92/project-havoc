// Kartenlexikon: erklärt Chaos-Karten, Ereignisse und Sonderkarten. Identische Kopie in apps/controller/src/game/ChaosGuide.tsx.
import {
  CHAOS_DESCRIPTIONS,
  CHAOS_ICONS,
  CHAOS_KINDS,
  CHAOS_LABELS,
  EVENT_DESCRIPTIONS,
  EVENT_ICONS,
  EVENT_LABELS,
  HAVOC_RULE,
  SPECIAL_CARD_GUIDE,
  type ChaosEventType,
} from '@project-havoc/rules-chaos'

import './guide.css'

const EVENTS: readonly ChaosEventType[] = ['kraken', 'storm', 'plunder', 'bottle']
const IMG = `${import.meta.env.BASE_URL}assets/img/`

function Icon({ src, fallback }: { readonly src: string; readonly fallback: string }): React.JSX.Element {
  return (
    <span className="guide__icon">
      <span>{fallback}</span>
      <img src={src} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} />
    </span>
  )
}

export function ChaosGuide({ compact = false }: { readonly compact?: boolean }): React.JSX.Element {
  return (
    <div className={`guide ${compact ? 'guide--compact' : ''}`}>
      <section>
        <h3>☠ Chaos-Karten</h3>
        <ul>
          {CHAOS_KINDS.map((kind) => (
            <li key={kind}>
              <Icon src={`${IMG}cards/${kind}.png`} fallback={CHAOS_ICONS[kind]} />
              <div><strong>{CHAOS_LABELS[kind]}</strong><p>{CHAOS_DESCRIPTIONS[kind]}</p></div>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>⚡ Ereignisse <small>alle 3 Minuten</small></h3>
        <ul>
          {EVENTS.map((type) => (
            <li key={type}>
              <Icon src={`${IMG}events/${type}.png`} fallback={EVENT_ICONS[type]} />
              <div><strong>{EVENT_LABELS[type]}</strong><p>{EVENT_DESCRIPTIONS[type]}</p></div>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>🧭 Sonderkarten</h3>
        <ul className="guide__specials">
          {SPECIAL_CARD_GUIDE.map((entry) => (
            <li key={entry.name}><b className="guide__badge">{entry.icon}</b><div><strong>{entry.name}</strong><p>{entry.text}</p></div></li>
          ))}
        </ul>
        <p className="guide__havoc">{HAVOC_RULE}</p>
        <p className="guide__havoc">Ab Minute 20 beginnt das Finale. Nach 25 Minuten gewinnt, wer die wenigsten Karten hat.</p>
      </section>
    </div>
  )
}
