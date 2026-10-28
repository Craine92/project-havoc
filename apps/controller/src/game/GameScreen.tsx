import { useEffect, useMemo, useRef, useState } from 'react'

import type { CardColor } from '@project-havoc/game-core'
import type { ChaosPlayerView, HavocCard } from '@project-havoc/rules-chaos'

import type { ControllerModel } from '../types.js'
import { HavocCardView } from './Card.js'
import { COLOR_NAMES } from './colors.js'
import './game.css'

const COLORS: readonly CardColor[] = ['red', 'yellow', 'green', 'blue']

const CHAOS_ICONS: Record<string, string> = { mutiny: '⚔', maelstrom: '🌀', 'cursed-dice': '🎲', lifebuoy: '🛟', backfire: '💥' }

const CHAOS_HELP: Record<string, string> = {
  mutiny: 'Tausche deine Hand mit einem Gegner.',
  maelstrom: 'Alle Hände wandern eine Position weiter.',
  'cursed-dice': 'Ein Gegner zieht 1–6 Karten.',
  lifebuoy: 'Hebe ihn auf! Er wehrt eine Strafe ab.',
  backfire: 'Hebe ihn auf! Er lenkt eine Strafe um.',
}

function needsColor(card: HavocCard): boolean {
  return card.kind === 'wild' || card.kind === 'wild-draw-four' || card.kind === 'chaos'
}

function needsTarget(card: HavocCard): boolean {
  return card.kind === 'chaos' && (card.chaos === 'mutiny' || card.chaos === 'cursed-dice')
}

function useNow(offset: number): number {
  const [now, setNow] = useState(() => Date.now() + offset)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now() + offset), 250)
    return () => window.clearInterval(timer)
  }, [offset])
  return now
}

function vibrate(pattern: number | number[]): void {
  try { navigator.vibrate?.(pattern) } catch { /* nicht jedes Gerät kann vibrieren */ }
}

function sortHand(hand: readonly HavocCard[]): HavocCard[] {
  const order = (card: HavocCard): number => {
    if ('color' in card) return COLORS.indexOf(card.color) * 100 + (card.kind === 'number' ? card.value : 20 + ['skip', 'reverse', 'draw-two'].indexOf(card.kind))
    return card.kind === 'chaos' ? 600 : 500
  }
  return [...hand].sort((a, b) => order(a) - order(b))
}

function nameOf(game: ChaosPlayerView, playerId: string | null | undefined): string {
  return game.players.find((player) => player.playerId === playerId)?.name ?? '…'
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

interface Selection { readonly card: HavocCard; readonly color?: CardColor }

export function GameScreen({ model, game }: { readonly model: ControllerModel; readonly game: ChaosPlayerView }): React.JSX.Element {
  const now = useNow(model.clockOffset)
  const [rawSelection, setSelection] = useState<Selection | null>(null)
  const [rawMirrorPicking, setMirrorPicking] = useState(false)
  const me = game.players.find((player) => player.playerId === game.viewerId)
  const myTurn = game.activePlayerId === game.viewerId && game.turn !== 'reaction'
  const reactingToMe = game.reactionOptions !== null
  const opponents = game.players.filter((player) => player.playerId !== game.viewerId)
  const hand = useMemo(() => sortHand(game.hand), [game.hand])
  const playable = new Set(game.playableCardIds)
  const chaosKinds = [...new Set(hand.flatMap((card) => card.kind === 'chaos' ? [card.chaos] : []))]
  const busy = model.pending === 'game'
  // Auswahl verfällt automatisch, sobald man nicht mehr dran ist.
  const selection = myTurn ? rawSelection : null
  const mirrorPicking = reactingToMe && rawMirrorPicking

  // Vibrieren, wenn ich dran bin oder mich eine Strafe trifft.
  const wasMyTurn = useRef(false)
  useEffect(() => {
    const alert = myTurn || reactingToMe
    if (alert && !wasMyTurn.current) vibrate(reactingToMe ? [80, 60, 80, 60, 200] : [120, 80, 120])
    wasMyTurn.current = alert
  }, [myTurn, reactingToMe])
  useEffect(() => { if (game.canCatchPlayerId) vibrate(60) }, [game.canCatchPlayerId])

  function tapCard(card: HavocCard): void {
    if (!playable.has(card.id) || busy) return
    if (!needsColor(card) && !needsTarget(card)) {
      model.gameAction({ type: 'play', cardId: card.id })
      return
    }
    setSelection({ card })
  }

  function pickColor(color: CardColor): void {
    if (!selection) return
    if (needsTarget(selection.card)) {
      setSelection({ card: selection.card, color })
      return
    }
    model.gameAction({ type: 'play', cardId: selection.card.id, color })
    setSelection(null)
  }

  function pickTarget(targetId: string): void {
    if (!selection?.color) return
    model.gameAction({ type: 'play', cardId: selection.card.id, color: selection.color, targetId })
    setSelection(null)
  }

  if (game.phase === 'finished') {
    const iWon = game.winner?.playerId === game.viewerId
    return (
      <main className={`game-phone game-phone--finished ${iWon ? 'game-phone--won' : ''}`}>
        <div className="finish-burst">{iWon ? '🏆' : '☠'}</div>
        <span className="phone-kicker">{game.winner?.reason === 'time' ? 'Die Zeit ist abgelaufen' : 'Runde vorbei'}</span>
        <h1>{iWon ? 'Du hast gewonnen, Käpt\'n!' : `${nameOf(game, game.winner?.playerId)} gewinnt!`}</h1>
        <p>Der Fernseher kann gleich eine neue Runde starten. Bleib an Bord!</p>
      </main>
    )
  }

  const reaction = game.reaction
  const event = game.event
  const statusText = reactingToMe
    ? 'Strafe! Schnell entscheiden!'
    : myTurn
      ? game.drawnCardId ? 'Gezogene Karte spielen?' : 'Du bist dran!'
      : reaction
        ? `${nameOf(game, reaction.targetId)} wehrt ab …`
        : `${nameOf(game, game.activePlayerId)} ist dran`

  return (
    <main className={`game-phone ${myTurn ? 'game-phone--turn' : ''} ${game.finalPhase ? 'game-phone--final' : ''}`}>
      <header className="game-top">
        <div className={`gem gem--${game.activeColor}`} title={COLOR_NAMES[game.activeColor]} />
        <div className="game-top__status">
          <strong>{statusText}</strong>
          <small>{COLOR_NAMES[game.activeColor]} · {game.finalPhase ? '☠ Finale ' : ''}{formatClock(game.endsAt - now)}</small>
        </div>
        <HavocCardView card={game.topCard} size="sm" tint={'color' in game.topCard ? undefined : game.activeColor} />
      </header>

      <section className="opponents" aria-label="Gegner">
        {opponents.map((player) => (
          <span key={player.playerId} className={`opp ${player.playerId === game.activePlayerId ? 'opp--active' : ''}`}>
            {player.name}<b>{player.cardCount}</b>{player.havocCalled && <i>☠</i>}
          </span>
        ))}
      </section>

      {model.gameNotice && <div className="game-toast" role="alert">{model.gameNotice}</div>}

      <section className="action-row">
        {game.canDraw && <button className="game-btn game-btn--draw" disabled={busy} onClick={() => model.gameAction({ type: 'draw' })}>Karte ziehen</button>}
        {game.drawnCardId && <button className="game-btn game-btn--ghost" disabled={busy} onClick={() => model.gameAction({ type: 'keep' })}>Behalten &amp; weiter</button>}
        {game.canCallHavoc && (
          <button className={`game-btn game-btn--havoc ${(me?.cardCount ?? 0) <= 2 ? 'game-btn--pulse' : ''}`} onClick={() => model.gameAction({ type: 'havoc' })}>
            HAVOC!
          </button>
        )}
        {me?.havocCalled && <span className="havoc-ok">☠ HAVOC gerufen</span>}
      </section>

      <section className="hand" aria-label="Deine Karten">
        {hand.map((card) => {
          const canPlay = playable.has(card.id)
          return (
            <button
              key={card.id}
              className={`hand-card ${canPlay ? 'hand-card--playable' : ''} ${card.id === game.drawnCardId ? 'hand-card--drawn' : ''}`}
              onClick={() => tapCard(card)}
              aria-disabled={!canPlay}
            >
              <HavocCardView card={card} size="md" dim={myTurn && !canPlay} glow={canPlay} />
            </button>
          )
        })}
      </section>
      {chaosKinds.length > 0 && (
        <ul className="hand-help">
          {chaosKinds.map((kind) => <li key={kind}><b>{CHAOS_ICONS[kind]}</b> {CHAOS_HELP[kind]}</li>)}
        </ul>
      )}

      {/* Farbe / Ziel wählen */}
      {selection && (
        <div className="sheet-backdrop" onClick={() => setSelection(null)}>
          <section className="sheet" onClick={(event) => event.stopPropagation()}>
            <HavocCardView card={selection.card} size="md" />
            {!selection.color ? (
              <>
                <h2>Welche Farbe soll gelten?</h2>
                <div className="color-grid">
                  {COLORS.map((color) => (
                    <button key={color} className={`color-pick color-pick--${color}`} onClick={() => pickColor(color)}>{COLOR_NAMES[color]}</button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2>{selection.card.kind === 'chaos' && selection.card.chaos === 'mutiny' ? 'Mit wem tauschst du die Hand?' : 'Wen trifft der Fluch?'}</h2>
                <div className="target-list">
                  {opponents.map((player) => (
                    <button key={player.playerId} className="target-pick" onClick={() => pickTarget(player.playerId)}>
                      <span>{player.name}</span><b>{player.cardCount} Karten</b>
                    </button>
                  ))}
                </div>
              </>
            )}
            <button className="game-btn game-btn--ghost" onClick={() => setSelection(null)}>Abbrechen</button>
          </section>
        </div>
      )}

      {/* Strafe abwehren */}
      {reaction && game.reactionOptions && (
        <div className="sheet-backdrop sheet-backdrop--alarm">
          <section className="sheet sheet--alarm">
            <span className="phone-kicker">Achtung, {formatClock(reaction.deadline - now)}</span>
            <h2>Du sollst {reaction.amount} Karte{reaction.amount === 1 ? '' : 'n'} ziehen!</h2>
            {!mirrorPicking ? (
              <div className="reaction-actions">
                {game.reactionOptions.shield && <button className="game-btn game-btn--shield" onClick={() => model.gameAction({ type: 'react', choice: 'shield' })}>🛟 Rettungsring werfen</button>}
                {game.reactionOptions.mirror && <button className="game-btn game-btn--mirror" onClick={() => setMirrorPicking(true)}>💥 Kanonenrückschlag</button>}
                <button className="game-btn game-btn--ghost" onClick={() => model.gameAction({ type: 'react', choice: 'accept' })}>Karten nehmen</button>
              </div>
            ) : (
              <>
                <p>Wen soll die Kanone treffen?</p>
                <div className="target-list">
                  {opponents.map((player) => (
                    <button key={player.playerId} className="target-pick" onClick={() => model.gameAction({ type: 'react', choice: 'mirror', targetId: player.playerId })}>
                      <span>{player.name}</span><b>{player.cardCount} Karten</b>
                    </button>
                  ))}
                </div>
                <button className="game-btn game-btn--ghost" onClick={() => setMirrorPicking(false)}>Zurück</button>
              </>
            )}
          </section>
        </div>
      )}

      {/* Jemand hat HAVOC vergessen */}
      {game.canCatchPlayerId && (
        <button className="catch-button" onClick={() => model.gameAction({ type: 'catch', targetId: game.canCatchPlayerId ?? '' })}>
          🪝 ERWISCHT!<small>{nameOf(game, game.canCatchPlayerId)} hat nicht HAVOC gerufen</small>
        </button>
      )}
      {game.havocCatch?.playerId === game.viewerId && !me?.havocCalled && (
        <button className="catch-button catch-button--self" onClick={() => model.gameAction({ type: 'havoc' })}>
          ☠ SCHNELL HAVOC RUFEN!<small>Sonst erwischen dich die anderen</small>
        </button>
      )}

      {/* Ereignis / Flaschenpost */}
      {event && (
        <div className="event-strip">
          <strong>⚡ Ereignis!</strong> Schau auf den Fernseher.
          {game.reveal && (
            <div className="reveal">
              <span>📜 Flaschenpost: {nameOf(game, game.reveal.ownerId)} hat …</span>
              <HavocCardView card={game.reveal.card} size="md" />
            </div>
          )}
        </div>
      )}
    </main>
  )
}
