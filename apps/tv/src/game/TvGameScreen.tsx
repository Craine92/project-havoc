import { useEffect, useRef, useState } from 'react'

import type { ChaosLastAction, ChaosPublicView } from '@project-havoc/rules-chaos'

import type { TvLobbyModel } from '../types.js'
import { sounds } from './audio.js'
import { CardBack, HavocCardView } from './Card.js'
import { COLOR_NAMES } from './colors.js'
import './tv-game.css'

const EVENT_TITLES = { kraken: '🐙 Kraken-Angriff!', storm: '⛈ Sturm zieht auf!', plunder: '💰 Plünderung!', bottle: '📜 Flaschenpost!' } as const
const DIE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

function useNow(offset: number): number {
  const [now, setNow] = useState(() => Date.now() + offset)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now() + offset), 250)
    return () => window.clearInterval(timer)
  }, [offset])
  return now
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

function nameOf(game: ChaosPublicView, playerId: string | null | undefined): string {
  return game.players.find((player) => player.playerId === playerId)?.name ?? '…'
}

interface Flash { readonly seq: number; readonly tone: string; readonly title: string; readonly sub?: string; readonly dice?: number }

function flashFor(game: ChaosPublicView, action: ChaosLastAction): Flash | null {
  const who = nameOf(game, action.playerId)
  const target = nameOf(game, action.targetId)
  switch (action.kind) {
    case 'havoc': return { seq: action.seq, tone: 'havoc', title: 'HAVOC!', sub: `${who} hat nur noch eine Karte!` }
    case 'caught': return { seq: action.seq, tone: 'caught', title: 'ERWISCHT!', sub: `${who} schnappt ${target} – zwei Strafkarten!` }
    case 'swap': return { seq: action.seq, tone: 'chaos', title: '⚔ MEUTEREI ⚔', sub: `${who} und ${target} tauschen alle Karten!` }
    case 'rotate': return { seq: action.seq, tone: 'chaos', title: '🌀 STRUDEL 🌀', sub: 'Alle Hände wandern weiter!' }
    case 'dice': return { seq: action.seq, tone: 'dice', title: "DAVY JONES' WÜRFEL", sub: `${target} zieht ${action.dice ?? 0} Karten …`, ...(action.dice ? { dice: action.dice } : {}) }
    case 'shield': return { seq: action.seq, tone: 'shield', title: '🛟 GERETTET!', sub: `${who} wehrt ${action.amount ?? 0} Karten ab!` }
    case 'mirror': return { seq: action.seq, tone: 'cannon', title: '💥 RÜCKSCHLAG!', sub: `${target} kassiert ${action.amount ?? 0} Karten!` }
    case 'final': return { seq: action.seq, tone: 'final', title: '☠ FINALE ☠', sub: 'Noch 5 Minuten – dann entscheidet die Zeit!' }
    default: return null
  }
}

/** Spielt passende Sounds, sobald eine neue Aktion vom Server kommt. */
function useActionSounds(game: ChaosPublicView): void {
  const lastSeq = useRef<number | null>(null)
  useEffect(() => {
    const action = game.lastAction
    if (lastSeq.current === action.seq) return
    const first = lastSeq.current === null
    lastSeq.current = action.seq
    if (first && action.kind !== 'start') return
    switch (action.kind) {
      case 'start': sounds.sfx('start'); sounds.startMusic(); break
      case 'play': sounds.sfx('play'); break
      case 'draw': case 'keep': sounds.sfx('draw', 0.6); break
      case 'penalty': sounds.sfx('penalty'); break
      case 'shield': sounds.sfx('shield'); break
      case 'mirror': sounds.sfx('cannon'); break
      case 'swap': sounds.sfx('swap'); sounds.voice('mutiny'); break
      case 'rotate': sounds.sfx('whirlpool'); break
      case 'dice': sounds.sfx('dice'); sounds.voice('dice'); break
      case 'havoc': sounds.voice('havoc'); break
      case 'caught': sounds.voice('caught'); break
      case 'final': sounds.voice('final'); sounds.setFinalMusic(true); break
      case 'win': sounds.voice('win'); sounds.setFinalMusic(false); break
      case 'event': {
        sounds.sfx('event')
        sounds.voice('event')
        if (game.event) window.setTimeout(() => sounds.sfx(game.event?.type ?? 'storm'), 900)
        break
      }
    }
  }, [game.lastAction, game.event])
}

function Seat({ game, playerId, index, count, now }: {
  readonly game: ChaosPublicView
  readonly playerId: string
  readonly index: number
  readonly count: number
  readonly now: number
}): React.JSX.Element {
  const player = game.players.find((candidate) => candidate.playerId === playerId)
  // Spieler gleichmäßig auf einer Ellipse um den Tisch verteilen, beginnend unten.
  const angle = Math.PI / 2 + (index / count) * Math.PI * 2
  const x = 50 + 43 * Math.cos(angle)
  const y = 50 + 38 * Math.sin(angle)
  const active = game.decisionPlayerId === playerId
  const reacting = game.reaction?.targetId === playerId
  const catchable = game.havocCatch?.playerId === playerId && now < game.havocCatch.until
  const highlighted = game.event?.highlightPlayerIds.includes(playerId) ?? false
  const roll = game.event?.rolls.find((candidate) => candidate.playerId === playerId)
  const fan = Math.min(player?.cardCount ?? 0, 12)
  if (!player) return <></>
  return (
    <div
      className={`seat ${active ? 'seat--active' : ''} ${reacting ? 'seat--reacting' : ''} ${catchable ? 'seat--catchable' : ''} ${highlighted ? 'seat--highlight' : ''} ${game.winner?.playerId === playerId ? 'seat--winner' : ''}`}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className="seat__fan" aria-hidden="true">
        {Array.from({ length: fan }, (_, cardIndex) => (
          <span key={cardIndex} className="seat__mini" style={{ transform: `rotate(${(cardIndex - (fan - 1) / 2) * 7}deg) translateY(${Math.abs(cardIndex - (fan - 1) / 2) * 1.5}px)` }} />
        ))}
      </div>
      <div className="seat__plate">
        <strong>{player.name}</strong>
        <span className="seat__count">{player.cardCount}</span>
      </div>
      {player.havocCalled && <span className="seat__badge seat__badge--havoc">☠ HAVOC</span>}
      {catchable && <span className="seat__badge seat__badge--catch">Vergessen! Erwischt ihn!</span>}
      {reacting && game.reaction && <span className="seat__badge seat__badge--react">Wehrt ab … {formatClock(game.reaction.deadline - now)}</span>}
      {roll && <span className="seat__roll">{DIE_FACES[roll.value - 1]}<small>{roll.value}</small></span>}
    </div>
  )
}

export function TvGameScreen({ model, game }: { readonly model: TvLobbyModel; readonly game: ChaosPublicView }): React.JSX.Element {
  const now = useNow(model.clockOffset)
  const [muted, setMuted] = useState(sounds.muted)
  const [confirmClose, setConfirmClose] = useState(false)
  useActionSounds(game)

  useEffect(() => () => sounds.stopMusic(), [])

  // Die große Einblendung ergibt sich direkt aus der letzten Serveraktion und verschwindet nach ein paar Sekunden.
  const candidate = flashFor(game, game.lastAction)
  const flash = candidate && now - game.lastAction.at < (candidate.dice ? 3_200 : 2_600) ? candidate : null
  const timeLeft = game.endsAt - now
  const eventIn = game.nextEventAt - now
  const event = game.event && now < game.event.until ? game.event : null
  const activeName = game.reaction ? nameOf(game, game.reaction.targetId) : nameOf(game, game.activePlayerId)

  return (
    <main className={`tv-game tv-game--${game.activeColor} ${game.finalPhase ? 'tv-game--final' : ''}`}>
      <header className="tv-game__bar">
        <div className="tv-logo">
          <img src={`${import.meta.env.BASE_URL}assets/img/logo.png`} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} />
          <span>Project <b>Havoc</b></span>
        </div>
        <div className={`tv-clock ${game.finalPhase ? 'tv-clock--final' : ''}`}>
          <small>{game.finalPhase ? '☠ Finale' : 'Spielzeit'}</small>
          <strong>{formatClock(timeLeft)}</strong>
        </div>
        <div className="tv-clock">
          <small>Nächstes Ereignis</small>
          <strong>{event ? 'JETZT!' : formatClock(eventIn)}</strong>
        </div>
        <div className="tv-bar__actions">
          <span className="tv-room">Raum {model.session?.roomCode}</span>
          <button className="tv-icon-btn" onClick={() => setMuted(sounds.toggleMute())} aria-label={muted ? 'Ton an' : 'Ton aus'}>{muted ? '🔇' : '🔊'}</button>
          <button className="tv-icon-btn" onClick={() => setConfirmClose(true)} aria-label="Spiel beenden">✕</button>
        </div>
      </header>

      <section className="tv-table">
        <div className={`tv-table__felt ${game.direction === 1 ? 'tv-table__felt--cw' : 'tv-table__felt--ccw'}`}>
          <div className="tv-direction" aria-label={game.direction === 1 ? 'Im Uhrzeigersinn' : 'Gegen den Uhrzeigersinn'}>
            {game.direction === 1 ? '↻' : '↺'}
          </div>
          <div className="tv-piles">
            <CardBack size="lg" count={game.drawPileCount} />
            <div className="tv-discard" key={game.topCard.id}>
              <HavocCardView card={game.topCard} size="xl" tint={'color' in game.topCard ? undefined : game.activeColor} />
            </div>
            <div className={`tv-color tv-color--${game.activeColor}`}>
              <span className="tv-color__gem" />
              <strong>{COLOR_NAMES[game.activeColor]}</strong>
            </div>
          </div>
          <div className="tv-turn">
            {game.phase === 'playing' && (game.reaction
              ? <><b>{activeName}</b> soll {game.reaction.amount} Karten ziehen …</>
              : <><b>{activeName}</b> ist am Zug</>)}
          </div>
        </div>
        {game.players.map((player, index) => (
          <Seat key={player.playerId} game={game} playerId={player.playerId} index={index} count={game.players.length} now={now} />
        ))}
      </section>

      <aside className="tv-feed" aria-live="polite">
        {game.feed.slice(-4).map((entry) => <p key={`${entry.seq}-${entry.text}`}>{entry.text}</p>)}
      </aside>

      {flash && (
        <div className={`tv-flash tv-flash--${flash.tone}`} key={flash.seq}>
          {flash.dice && <div className="tv-die">{DIE_FACES[flash.dice - 1]}</div>}
          <h1>{flash.title}</h1>
          {flash.sub && <p>{flash.sub}</p>}
        </div>
      )}

      {event && (
        <div className={`tv-event tv-event--${event.type}`} key={event.seq}>
          <span className="tv-event__kicker">⚡ Ereignis</span>
          <h1>{EVENT_TITLES[event.type]}</h1>
          <p>{event.summary}</p>
          <div className="tv-event__bar"><span style={{ animationDuration: `${event.until - event.startedAt}ms` }} /></div>
        </div>
      )}

      {game.phase === 'finished' && game.winner && (
        <div className="tv-win">
          <div className="tv-win__treasure">🏆</div>
          <span className="tv-event__kicker">{game.winner.reason === 'time' ? 'Die Zeit ist abgelaufen – Sieg nach Punkten' : 'Alle Karten losgeschlagen'}</span>
          <h1>{nameOf(game, game.winner.playerId)} ist Piratenkönig!</h1>
          <ol className="tv-win__ranking">
            {[...game.players].sort((a, b) => a.cardCount - b.cardCount).map((player) => (
              <li key={player.playerId}><span>{player.name}</span><b>{player.cardCount} Karten</b></li>
            ))}
          </ol>
          <div className="tv-win__actions">
            <button className="button button--primary button--hero" disabled={model.pendingAction === 'rematch'} onClick={model.rematch}>Nochmal! ⚓</button>
            <button className="button button--ghost" onClick={() => setConfirmClose(true)}>Raum schließen</button>
          </div>
        </div>
      )}

      {confirmClose && (
        <div className="dialog-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="close-game-title">
            <h2 id="close-game-title">Spiel wirklich beenden?</h2>
            <p>Alle Handys werden getrennt. Für eine neue Partie erstellst du danach einfach einen neuen Raum.</p>
            <div className="confirm-dialog__actions">
              <button className="button button--ghost" onClick={() => setConfirmClose(false)}>Weiterspielen</button>
              <button className="button button--danger-solid" onClick={() => { setConfirmClose(false); model.closeRoom() }}>Beenden</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
