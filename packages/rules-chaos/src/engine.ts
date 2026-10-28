import { CARD_COLORS, shuffle, type CardColor } from '@project-havoc/game-core'

import { CHAOS_DECK_SIZE, cardScore, createChaosDeck, isColoredCard } from './deck.js'
import { cardLabel, colorLabel } from './labels.js'
import type {
  ChaosAction,
  ChaosActionKind,
  ChaosEventType,
  ChaosFeedEntry,
  ChaosGameState,
  ChaosLastAction,
  ChaosResult,
  ChaosRoll,
  ChaosServices,
  ChaosTiming,
  HavocCard,
  PenaltySource,
} from './types.js'

export const DEFAULT_CHAOS_TIMING: ChaosTiming = {
  firstEventMs: 3 * 60_000,
  eventIntervalMs: 3 * 60_000,
  eventShowMs: 7_000,
  reactionMs: 12_000,
  havocCatchMs: 5_000,
  finalPhaseMs: 20 * 60_000,
  timeLimitMs: 25 * 60_000,
}

const EVENT_TYPES: readonly ChaosEventType[] = ['kraken', 'storm', 'plunder', 'bottle']
const FEED_LENGTH = 8

interface MPlayer { playerId: string; name: string; hand: HavocCard[]; havocCalled: boolean }
type Stable = Exclude<keyof ChaosGameState, 'players' | 'drawPile' | 'discardPile' | 'feed'>
type MState = { -readonly [K in Stable]: ChaosGameState[K] } & {
  players: MPlayer[]
  drawPile: HavocCard[]
  discardPile: HavocCard[]
  feed: ChaosFeedEntry[]
}

function fail(message: string): ChaosResult {
  return { ok: false, message }
}

function clone(state: ChaosGameState): MState {
  return {
    ...state,
    players: state.players.map((player) => ({ ...player, hand: [...player.hand] })),
    drawPile: [...state.drawPile],
    discardPile: [...state.discardPile],
    feed: [...state.feed],
  }
}

function at(state: MState, index: number): MPlayer {
  const player = state.players[index]
  if (!player) throw new Error(`Player index invariant failed: ${index}`)
  return player
}

function indexOf(state: MState | ChaosGameState, playerId: string): number {
  return state.players.findIndex((player) => player.playerId === playerId)
}

function nameOf(state: MState, playerId: string): string {
  return state.players.find((player) => player.playerId === playerId)?.name ?? 'Jemand'
}

function step(state: MState, from: number, steps = 1): number {
  const count = state.players.length
  return ((from + state.direction * steps) % count + count) % count
}

function topCard(state: MState | ChaosGameState): HavocCard {
  const card = state.discardPile[state.discardPile.length - 1]
  if (!card) throw new Error('Discard pile invariant failed')
  return card
}

function randomInt(services: ChaosServices, max: number): number {
  return Math.floor(services.random.next() * max)
}

function rollDie(services: ChaosServices): number {
  return randomInt(services, 6) + 1
}

/** Legt eine Karte unter die oberste Ablagekarte, damit die Farbe auf dem Tisch erhalten bleibt. */
function tuckUnderTop(state: MState, card: HavocCard): void {
  state.discardPile.splice(Math.max(0, state.discardPile.length - 1), 0, card)
}

export function isPlayableOn(card: HavocCard, activeColor: CardColor, top: HavocCard): boolean {
  if (card.kind === 'chaos') return card.chaos === 'mutiny' || card.chaos === 'maelstrom' || card.chaos === 'cursed-dice'
  if (!isColoredCard(card)) return true
  if (card.color === activeColor) return true
  if (card.kind === 'number') return top.kind === 'number' && top.value === card.value
  return top.kind === card.kind
}

export function cardNeedsColor(card: HavocCard): boolean {
  return card.kind === 'wild' || card.kind === 'wild-draw-four' || card.kind === 'chaos'
}

export function cardNeedsTarget(card: HavocCard): boolean {
  return card.kind === 'chaos' && (card.chaos === 'mutiny' || card.chaos === 'cursed-dice')
}

function refill(state: MState, services: ChaosServices): boolean {
  if (state.drawPile.length > 0) return true
  if (state.discardPile.length <= 1) return false
  const top = state.discardPile.pop()
  if (!top) return false
  state.drawPile = shuffle(state.discardPile, services.random)
  state.discardPile = [top]
  return state.drawPile.length > 0
}

function drawCards(state: MState, playerIndex: number, count: number, services: ChaosServices): HavocCard[] {
  const drawn: HavocCard[] = []
  for (let index = 0; index < count; index += 1) {
    if (!refill(state, services)) break
    const card = state.drawPile.pop()
    if (!card) break
    at(state, playerIndex).hand.push(card)
    drawn.push(card)
  }
  return drawn
}

function log(state: MState, now: number, text: string): void {
  state.feed = [...state.feed, { seq: state.seq, at: now, text }].slice(-FEED_LENGTH)
}

function act(state: MState, now: number, kind: ChaosActionKind, details: Omit<ChaosLastAction, 'seq' | 'at' | 'kind'> = {}): void {
  state.seq += 1
  state.lastAction = { seq: state.seq, at: now, kind, ...details }
}

function normalizeHavocFlags(state: MState): void {
  for (const player of state.players) if (player.hand.length > 2 || player.hand.length === 0) player.havocCalled = false
  if (state.havocCatch) {
    const caught = state.players.find((player) => player.playerId === state.havocCatch?.playerId)
    if (!caught || caught.hand.length !== 1 || caught.havocCalled) state.havocCatch = null
  }
}

function done(state: MState): ChaosResult {
  normalizeHavocFlags(state)
  state.revision += 1
  const cards = state.drawPile.length + state.discardPile.length + state.players.reduce((sum, player) => sum + player.hand.length, 0)
  if (cards !== CHAOS_DECK_SIZE) throw new Error(`Chaos card invariant failed: ${cards}`)
  return { ok: true, state }
}

function finish(state: MState, playerId: string, reason: 'empty' | 'time', now: number): ChaosResult {
  state.phase = 'finished'
  state.winner = { playerId, reason }
  state.turn = { kind: 'play' }
  state.havocCatch = null
  state.event = null
  act(state, now, 'win', { playerId })
  log(state, now, reason === 'empty'
    ? `🏆 ${nameOf(state, playerId)} hat alle Karten losgeschlagen!`
    : `⌛ Die Zeit ist um! ${nameOf(state, playerId)} gewinnt nach Punkten.`)
  return done(state)
}

export function initializeChaosGame(
  identities: readonly { readonly playerId: string; readonly name: string }[],
  services: ChaosServices,
  timing: ChaosTiming = DEFAULT_CHAOS_TIMING,
): ChaosResult {
  if (identities.length < 2 || identities.length > 8) return fail('Chaos braucht zwei bis acht Spieler.')
  if (new Set(identities.map((player) => player.playerId)).size !== identities.length) return fail('Doppelte Spieler.')
  const drawPile = shuffle(createChaosDeck(), services.random)
  const players: MPlayer[] = identities.map((identity) => ({ playerId: identity.playerId, name: identity.name, hand: [], havocCalled: false }))
  for (let round = 0; round < 7; round += 1) {
    for (const player of players) {
      const card = drawPile.pop()
      if (!card) throw new Error('Deal invariant failed')
      player.hand.push(card)
    }
  }
  // Startkarte: so lange aufdecken, bis eine Zahlenkarte oben liegt.
  const discardPile: HavocCard[] = []
  let opening = drawPile.pop()
  while (opening && opening.kind !== 'number') {
    discardPile.push(opening)
    opening = drawPile.pop()
  }
  if (!opening || opening.kind !== 'number') throw new Error('Opening card invariant failed')
  drawPile.unshift(...discardPile)
  const now = services.clock.now()
  const state: MState = {
    phase: 'playing',
    revision: 0,
    seq: 0,
    timing,
    players,
    drawPile: shuffle(drawPile, services.random),
    discardPile: [opening],
    activeColor: opening.color,
    direction: 1,
    activeIndex: randomInt(services, players.length),
    turn: { kind: 'play' },
    havocCatch: null,
    event: null,
    lastEventType: null,
    nextEventAt: now + timing.firstEventMs,
    startedAt: now,
    finalPhaseAt: now + timing.finalPhaseMs,
    endsAt: now + timing.timeLimitMs,
    finalPhase: false,
    winner: null,
    lastAction: { seq: 0, at: now, kind: 'start' },
    feed: [],
  }
  log(state, now, `⚓ Leinen los! ${at(state, state.activeIndex).name} beginnt.`)
  return done(state)
}

/** Startet eine Ziehstrafe. Hat das Ziel Rettungsring oder Rückschlag, darf es reagieren. */
function penalty(
  state: MState,
  services: ChaosServices,
  now: number,
  options: { targetIndex: number; sourcePlayerId: string; amount: number; source: PenaltySource; resumeIndex: number },
): void {
  const target = at(state, options.targetIndex)
  const canReact = target.hand.some((card) => card.kind === 'chaos' && (card.chaos === 'lifebuoy' || card.chaos === 'backfire'))
  if (canReact) {
    state.turn = {
      kind: 'reaction',
      targetId: target.playerId,
      sourcePlayerId: options.sourcePlayerId,
      amount: options.amount,
      source: options.source,
      deadline: now + state.timing.reactionMs,
      resumeIndex: options.resumeIndex,
    }
    return
  }
  drawCards(state, options.targetIndex, options.amount, services)
  act(state, now, 'penalty', { playerId: options.sourcePlayerId, targetId: target.playerId, amount: options.amount })
  log(state, now, `${target.name} zieht ${options.amount} Karte${options.amount === 1 ? '' : 'n'}.`)
  state.activeIndex = options.resumeIndex
  state.turn = { kind: 'play' }
}

function eventRunning(state: ChaosGameState, now: number): boolean {
  return state.event !== null && now < state.event.until
}

function play(state: ChaosGameState, action: Extract<ChaosAction, { type: 'play' }>, services: ChaosServices): ChaosResult {
  const now = services.clock.now()
  if (state.phase !== 'playing') return fail('Die Runde ist vorbei.')
  if (eventRunning(state, now)) return fail('Warte, bis das Ereignis vorbei ist.')
  const actorIndex = indexOf(state, action.playerId)
  if (actorIndex !== state.activeIndex) return fail('Du bist nicht am Zug.')
  if (state.turn.kind === 'reaction') return fail('Gerade wird eine Strafe abgewehrt.')
  if (state.turn.kind === 'drawn' && state.turn.cardId !== action.cardId) return fail('Du darfst nur die gezogene Karte spielen.')
  const owned = state.players[actorIndex]?.hand.find((card) => card.id === action.cardId)
  if (!owned) return fail('Diese Karte hast du nicht.')
  if (owned.kind === 'chaos' && (owned.chaos === 'lifebuoy' || owned.chaos === 'backfire')) {
    return fail(`${cardLabel(owned)} kannst du nur einsetzen, wenn dich eine Strafe trifft.`)
  }
  if (!isPlayableOn(owned, state.activeColor, topCard(state))) return fail('Diese Karte passt nicht.')
  if (cardNeedsColor(owned) && !action.color) return fail('Wähle eine Farbe.')
  const targetIndex = action.targetId ? indexOf(state, action.targetId) : -1
  if (cardNeedsTarget(owned) && (targetIndex < 0 || targetIndex === actorIndex)) return fail('Wähle einen Gegner.')
  const actorHand = state.players[actorIndex]?.hand ?? []
  if (owned.kind === 'chaos' && (owned.chaos === 'mutiny' || owned.chaos === 'maelstrom') && actorHand.length === 1) {
    return fail(`${cardLabel(owned)} darf nicht deine letzte Karte sein.`)
  }

  const next = clone(state)
  const actor = at(next, actorIndex)
  actor.hand = actor.hand.filter((card) => card.id !== owned.id)
  next.discardPile.push(owned)
  next.activeColor = isColoredCard(owned) ? owned.color : (action.color ?? next.activeColor)
  next.turn = { kind: 'play' }
  act(next, now, 'play', { playerId: actor.playerId, card: owned, ...(action.targetId ? { targetId: action.targetId } : {}) })
  const colorNote = cardNeedsColor(owned) ? ` → ${colorLabel(next.activeColor)}` : ''
  log(next, now, `${actor.name} spielt ${cardLabel(owned)}${colorNote}.`)

  if (actor.hand.length === 0) return finish(next, actor.playerId, 'empty', now)
  if (actor.hand.length === 1 && !actor.havocCalled) next.havocCatch = { playerId: actor.playerId, until: now + next.timing.havocCatchMs }

  const after = step(next, actorIndex)
  switch (owned.kind) {
    case 'number':
    case 'wild':
      next.activeIndex = after
      break
    case 'skip':
      next.activeIndex = step(next, actorIndex, 2)
      break
    case 'reverse':
      next.direction = next.direction === 1 ? -1 : 1
      next.activeIndex = step(next, actorIndex, next.players.length === 2 ? 2 : 1)
      break
    case 'draw-two':
    case 'wild-draw-four':
      penalty(next, services, now, {
        targetIndex: after,
        sourcePlayerId: actor.playerId,
        amount: owned.kind === 'draw-two' ? 2 : 4,
        source: owned.kind === 'draw-two' ? 'draw-two' : 'draw-four',
        resumeIndex: step(next, after),
      })
      break
    case 'chaos': {
      if (owned.chaos === 'mutiny') {
        const target = at(next, targetIndex)
        const mine = actor.hand
        actor.hand = target.hand
        target.hand = mine
        actor.havocCalled = false
        target.havocCalled = false
        next.havocCatch = null
        act(next, now, 'swap', { playerId: actor.playerId, targetId: target.playerId })
        log(next, now, `⚔ Meuterei! ${actor.name} und ${target.name} tauschen ihre Hände.`)
        next.activeIndex = after
      } else if (owned.chaos === 'maelstrom') {
        const hands = next.players.map((player) => player.hand)
        next.players.forEach((_, index) => {
          const hand = hands[index]
          if (hand) at(next, step(next, index)).hand = hand
        })
        for (const player of next.players) player.havocCalled = false
        next.havocCatch = null
        act(next, now, 'rotate', { playerId: actor.playerId })
        log(next, now, '🌀 Der Strudel reißt alle Hände eine Position weiter!')
        next.activeIndex = after
      } else {
        const dice = rollDie(services)
        const target = at(next, targetIndex)
        act(next, now, 'dice', { playerId: actor.playerId, targetId: target.playerId, dice })
        log(next, now, `🎲 Davy Jones würfelt eine ${dice} für ${target.name}!`)
        penalty(next, services, now, { targetIndex, sourcePlayerId: actor.playerId, amount: dice, source: 'cursed-dice', resumeIndex: after })
      }
      break
    }
  }
  return done(next)
}

function draw(state: ChaosGameState, action: Extract<ChaosAction, { type: 'draw' }>, services: ChaosServices): ChaosResult {
  const now = services.clock.now()
  if (state.phase !== 'playing') return fail('Die Runde ist vorbei.')
  if (eventRunning(state, now)) return fail('Warte, bis das Ereignis vorbei ist.')
  if (indexOf(state, action.playerId) !== state.activeIndex) return fail('Du bist nicht am Zug.')
  if (state.turn.kind !== 'play') return fail('Du kannst gerade nicht ziehen.')
  const next = clone(state)
  const [card] = drawCards(next, next.activeIndex, 1, services)
  const actor = at(next, next.activeIndex)
  act(next, now, 'draw', { playerId: actor.playerId, amount: card ? 1 : 0 })
  if (card && isPlayableOn(card, next.activeColor, topCard(next))) next.turn = { kind: 'drawn', cardId: card.id }
  else next.activeIndex = step(next, next.activeIndex)
  return done(next)
}

function keep(state: ChaosGameState, action: Extract<ChaosAction, { type: 'keep' }>, services: ChaosServices): ChaosResult {
  if (state.phase !== 'playing') return fail('Die Runde ist vorbei.')
  if (indexOf(state, action.playerId) !== state.activeIndex || state.turn.kind !== 'drawn') return fail('Gerade nicht möglich.')
  const next = clone(state)
  next.turn = { kind: 'play' }
  next.activeIndex = step(next, next.activeIndex)
  act(next, services.clock.now(), 'keep', { playerId: action.playerId })
  return done(next)
}

function callHavoc(state: ChaosGameState, action: Extract<ChaosAction, { type: 'havoc' }>, services: ChaosServices): ChaosResult {
  if (state.phase !== 'playing') return fail('Die Runde ist vorbei.')
  const player = state.players.find((candidate) => candidate.playerId === action.playerId)
  if (!player) return fail('Unbekannter Spieler.')
  if (player.havocCalled) return fail('Du hast schon HAVOC gerufen.')
  if (player.hand.length > 2) return fail('HAVOC darfst du erst bei zwei oder einer Karte rufen.')
  const now = services.clock.now()
  const next = clone(state)
  const mutable = at(next, indexOf(next, action.playerId))
  mutable.havocCalled = true
  if (next.havocCatch?.playerId === action.playerId) next.havocCatch = null
  act(next, now, 'havoc', { playerId: action.playerId })
  log(next, now, `🏴‍☠️ ${mutable.name} ruft HAVOC!`)
  return done(next)
}

function catchPlayer(state: ChaosGameState, action: Extract<ChaosAction, { type: 'catch' }>, services: ChaosServices): ChaosResult {
  const now = services.clock.now()
  if (state.phase !== 'playing') return fail('Die Runde ist vorbei.')
  if (!state.havocCatch || state.havocCatch.playerId !== action.targetId || now >= state.havocCatch.until) return fail('Zu spät!')
  if (action.playerId === action.targetId) return fail('Dich selbst kannst du nicht erwischen.')
  if (indexOf(state, action.playerId) < 0) return fail('Unbekannter Spieler.')
  const next = clone(state)
  const targetIndex = indexOf(next, action.targetId)
  drawCards(next, targetIndex, 2, services)
  next.havocCatch = null
  act(next, now, 'caught', { playerId: action.playerId, targetId: action.targetId, amount: 2 })
  log(next, now, `🪝 ${nameOf(next, action.playerId)} erwischt ${nameOf(next, action.targetId)} ohne HAVOC-Ruf! +2 Karten.`)
  return done(next)
}

function resolveReaction(next: MState, services: ChaosServices, now: number, choice: 'shield' | 'mirror' | 'accept', mirrorTargetId?: string): void {
  const turn = next.turn
  if (turn.kind !== 'reaction') throw new Error('Reaction invariant failed')
  const targetIndex = indexOf(next, turn.targetId)
  const target = at(next, targetIndex)
  if (choice === 'shield' || choice === 'mirror') {
    const wanted = choice === 'shield' ? 'lifebuoy' : 'backfire'
    const card = target.hand.find((candidate) => candidate.kind === 'chaos' && candidate.chaos === wanted)
    if (!card) throw new Error('Reaction card invariant failed')
    target.hand = target.hand.filter((candidate) => candidate.id !== card.id)
    tuckUnderTop(next, card)
  }
  if (choice === 'shield') {
    act(next, now, 'shield', { playerId: target.playerId, amount: turn.amount })
    log(next, now, `🛟 ${target.name} wirft den Rettungsring und wehrt ${turn.amount} Karten ab!`)
  } else if (choice === 'mirror' && mirrorTargetId) {
    const mirrorIndex = indexOf(next, mirrorTargetId)
    drawCards(next, mirrorIndex, turn.amount, services)
    act(next, now, 'mirror', { playerId: target.playerId, targetId: mirrorTargetId, amount: turn.amount })
    log(next, now, `💥 Kanonenrückschlag! ${nameOf(next, mirrorTargetId)} kassiert ${turn.amount} Karten statt ${target.name}.`)
  } else {
    drawCards(next, targetIndex, turn.amount, services)
    act(next, now, 'penalty', { playerId: turn.sourcePlayerId, targetId: target.playerId, amount: turn.amount })
    log(next, now, `${target.name} zieht ${turn.amount} Karte${turn.amount === 1 ? '' : 'n'}.`)
  }
  next.activeIndex = turn.resumeIndex
  next.turn = { kind: 'play' }
}

function react(state: ChaosGameState, action: Extract<ChaosAction, { type: 'react' }>, services: ChaosServices): ChaosResult {
  if (state.phase !== 'playing') return fail('Die Runde ist vorbei.')
  const turn = state.turn
  if (turn.kind !== 'reaction' || turn.targetId !== action.playerId) return fail('Du musst gerade nichts abwehren.')
  const hand = state.players.find((player) => player.playerId === action.playerId)?.hand ?? []
  if (action.choice === 'shield' && !hand.some((card) => card.kind === 'chaos' && card.chaos === 'lifebuoy')) return fail('Du hast keinen Rettungsring.')
  if (action.choice === 'mirror') {
    if (!hand.some((card) => card.kind === 'chaos' && card.chaos === 'backfire')) return fail('Du hast keinen Kanonenrückschlag.')
    if (!action.targetId || action.targetId === action.playerId || indexOf(state, action.targetId) < 0) return fail('Wähle, wen die Kanone treffen soll.')
  }
  const next = clone(state)
  resolveReaction(next, services, services.clock.now(), action.choice, action.targetId)
  return done(next)
}

export function applyChaosAction(state: ChaosGameState, action: ChaosAction, services: ChaosServices): ChaosResult {
  switch (action.type) {
    case 'play': return play(state, action, services)
    case 'draw': return draw(state, action, services)
    case 'keep': return keep(state, action, services)
    case 'havoc': return callHavoc(state, action, services)
    case 'catch': return catchPlayer(state, action, services)
    case 'react': return react(state, action, services)
  }
}

/** Ermittelt einen eindeutigen Höchst- (oder Tiefst-)Wurf mit W6-Stechen. */
function duel(candidates: readonly string[], services: ChaosServices, highest: boolean): string {
  let tied = [...candidates]
  for (let round = 0; round < 64 && tied.length > 1; round += 1) {
    const rolls = tied.map((playerId) => ({ playerId, value: rollDie(services) }))
    const best = highest ? Math.max(...rolls.map((roll) => roll.value)) : Math.min(...rolls.map((roll) => roll.value))
    tied = rolls.filter((roll) => roll.value === best).map((roll) => roll.playerId)
  }
  return tied[randomInt(services, tied.length)] ?? candidates[0] ?? ''
}

function extreme(rolls: readonly ChaosRoll[], services: ChaosServices, highest: boolean): string {
  const best = highest ? Math.max(...rolls.map((roll) => roll.value)) : Math.min(...rolls.map((roll) => roll.value))
  return duel(rolls.filter((roll) => roll.value === best).map((roll) => roll.playerId), services, highest)
}

function runEvent(next: MState, services: ChaosServices, now: number): void {
  const options = EVENT_TYPES.filter((type) => type !== next.lastEventType)
  const type = options[randomInt(services, options.length)] ?? 'storm'
  let rolls: ChaosRoll[] = []
  let highlight: string[] = []
  let summary: string
  const reveals: { viewerId: string; ownerId: string; card: HavocCard }[] = []

  if (type === 'kraken') {
    rolls = next.players.map((player) => ({ playerId: player.playerId, value: rollDie(services) }))
    const high = extreme(rolls, services, true)
    const low = extreme(rolls.filter((roll) => roll.playerId !== high), services, false)
    const highPlayer = at(next, indexOf(next, high))
    let highText = `${highPlayer.name} entkommt, hat aber zu wenig Karten zum Abwerfen.`
    if (highPlayer.hand.length >= 2) {
      const lost = highPlayer.hand[randomInt(services, highPlayer.hand.length)]
      if (lost) {
        highPlayer.hand = highPlayer.hand.filter((card) => card.id !== lost.id)
        tuckUnderTop(next, lost)
        highText = `${highPlayer.name} wirft dem Kraken eine Karte zum Fraß vor (−1).`
      }
    }
    drawCards(next, indexOf(next, low), 1, services)
    highlight = [high, low]
    summary = `${highText} ${nameOf(next, low)} wird gepackt und zieht eine Karte.`
  } else if (type === 'storm') {
    const colors = CARD_COLORS.filter((color) => color !== next.activeColor)
    next.activeColor = colors[randomInt(services, colors.length)] ?? next.activeColor
    summary = `Der Sturm färbt das Meer neu: Jetzt gilt ${colorLabel(next.activeColor)}!`
  } else if (type === 'plunder') {
    const passed = next.players.map((player) => {
      const card = player.hand[randomInt(services, player.hand.length)]
      if (card) player.hand = player.hand.filter((candidate) => candidate.id !== card.id)
      return card
    })
    passed.forEach((card, index) => { if (card) at(next, step(next, index)).hand.push(card) })
    summary = `Plünderung! Jeder schiebt eine zufällige Karte an seinen ${next.direction === 1 ? 'linken' : 'rechten'} Nachbarn.`
  } else {
    for (const viewer of next.players) {
      const owners = next.players.filter((player) => player.playerId !== viewer.playerId && player.hand.length > 0)
      const owner = owners[randomInt(services, owners.length)]
      const card = owner?.hand[randomInt(services, owner.hand.length)]
      if (owner && card) reveals.push({ viewerId: viewer.playerId, ownerId: owner.playerId, card })
    }
    summary = 'Eine Flaschenpost treibt heran: Schaut auf eure Handys, jeder sieht eine geheime Karte eines Gegners!'
  }

  next.event = { seq: next.seq + 1, type, startedAt: now, until: now + next.timing.eventShowMs, rolls, highlightPlayerIds: highlight, summary, reveals }
  next.lastEventType = type
  next.nextEventAt = now + next.timing.eventShowMs + next.timing.eventIntervalMs
  act(next, now, 'event')
  log(next, now, `⚡ ${summary}`)
}

function timeWinner(state: MState, services: ChaosServices): string {
  const fewest = Math.min(...state.players.map((player) => player.hand.length))
  let tied = state.players.filter((player) => player.hand.length === fewest)
  const score = (hand: readonly HavocCard[]): number => hand.reduce((sum, card) => sum + cardScore(card), 0)
  const lowest = Math.min(...tied.map((player) => score(player.hand)))
  tied = tied.filter((player) => score(player.hand) === lowest)
  return duel(tied.map((player) => player.playerId), services, true)
}

/** Zeitgesteuerte Abläufe: Ereignisse, Fristen, Finale und Zeitlimit. Liefert null, wenn sich nichts geändert hat. */
export function tickChaosGame(state: ChaosGameState, services: ChaosServices): ChaosGameState | null {
  if (state.phase !== 'playing') return null
  const now = services.clock.now()
  const next = clone(state)
  let changed = false

  if (now >= next.endsAt) {
    if (next.turn.kind === 'reaction') resolveReaction(next, services, now, 'accept')
    const result = finish(next, timeWinner(next, services), 'time', now)
    return result.ok ? result.state : null
  }
  if (!next.finalPhase && now >= next.finalPhaseAt) {
    next.finalPhase = true
    act(next, now, 'final')
    log(next, now, '☠ Das Finale beginnt! In 5 Minuten entscheidet die Zeit.')
    changed = true
  }
  if (next.turn.kind === 'reaction' && now >= next.turn.deadline) {
    resolveReaction(next, services, now, 'accept')
    changed = true
  }
  if (next.havocCatch && now >= next.havocCatch.until) {
    next.havocCatch = null
    changed = true
  }
  if (next.event && now >= next.event.until) {
    next.event = null
    changed = true
  }
  if (!next.event && next.turn.kind === 'play' && now >= next.nextEventAt) {
    runEvent(next, services, now)
    changed = true
  }
  if (!changed) return null
  const result = done(next)
  return result.ok ? result.state : null
}

/** Für abwesende Spieler: zieht automatisch bzw. nimmt die Strafe an, damit das Spiel nicht hängt. */
export function autoActForPlayer(state: ChaosGameState, playerId: string, services: ChaosServices): ChaosGameState | null {
  if (state.phase !== 'playing') return null
  if (state.turn.kind === 'reaction') {
    if (state.turn.targetId !== playerId) return null
    const result = react(state, { type: 'react', playerId, choice: 'accept' }, services)
    return result.ok ? result.state : null
  }
  if (state.players[state.activeIndex]?.playerId !== playerId) return null
  const result = state.turn.kind === 'drawn'
    ? keep(state, { type: 'keep', playerId }, services)
    : draw(state, { type: 'draw', playerId }, services)
  if (!result.ok) return null
  if (result.state.turn.kind === 'drawn' && result.state.players[result.state.activeIndex]?.playerId === playerId) {
    const kept = keep(result.state, { type: 'keep', playerId }, services)
    return kept.ok ? kept.state : result.state
  }
  return result.state
}

export function decisionPlayerId(state: ChaosGameState): string | null {
  if (state.phase !== 'playing') return null
  if (state.turn.kind === 'reaction') return state.turn.targetId
  return state.players[state.activeIndex]?.playerId ?? null
}
