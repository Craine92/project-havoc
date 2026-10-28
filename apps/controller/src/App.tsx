import { useMemo, useState } from 'react'

import { roomCodeFromUrl } from './config.js'
import type { ControllerConnection, ControllerModel } from './types.js'
import { useController } from './useController.js'
import { GameScreen } from './game/GameScreen.js'

const connectionLabels: Record<ControllerConnection, string> = {
  connecting: 'Verbinden …', connected: 'Server verbunden', unavailable: 'Server offline', lost: 'Verbindung verloren', reconnecting: 'Wiederherstellen …', 'protocol-error': 'Protokollfehler',
}

function Mark(): React.JSX.Element {
  return <div className="phone-mark" aria-hidden="true">☠</div>
}

function Status({ state }: { readonly state: ControllerConnection }): React.JSX.Element {
  return <div className={`phone-status phone-status--${state}`} role="status"><span />{connectionLabels[state]}</div>
}

export function JoinScreen({ model, initialCode }: { readonly model: ControllerModel; readonly initialCode: string }): React.JSX.Element {
  const [roomCode, setRoomCode] = useState(initialCode)
  const [name, setName] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const submitting = model.pending === 'join' || model.pending === 'reconnect'

  function submit(event: React.FormEvent): void {
    event.preventDefault()
    const error = model.join(roomCode, name)
    setLocalError(error)
  }

  return (
    <main className="phone-shell phone-join">
      <header className="phone-brand"><Mark /><div><small>Project</small><strong>Havoc</strong></div></header>
      <section className="phone-hero">
        <span className="phone-kicker">Ahoi, Landratte!</span>
        <h1>Komm an Bord<br />ins Chaos.</h1>
        <p>Code vom Fernseher eingeben, Namen wählen und loslegen.</p>
      </section>
      <form className="join-form" onSubmit={submit} noValidate>
        <label><span>Raumcode</span><input data-testid="room-input" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6))} inputMode="text" autoCapitalize="characters" autoCorrect="off" maxLength={6} placeholder="HVC234" required /></label>
        <label><span>Dein Name</span><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="nickname" maxLength={32} placeholder="Wie sollen wir dich nennen?" required /></label>
        {(localError || model.notice) && <div className="phone-notice" role="alert">{localError ?? model.notice}</div>}
        <button className="phone-button phone-button--primary" disabled={model.connection !== 'connected' || submitting}>
          {submitting ? 'Gangway wird ausgefahren …' : 'Raum beitreten'} <span aria-hidden="true">→</span>
        </button>
        {model.connection === 'unavailable' && <button type="button" className="phone-button phone-button--ghost" onClick={model.retry}>Erneut verbinden</button>}
      </form>
      <footer><Status state={model.connection} /><small>{model.serverUrl}</small></footer>
    </main>
  )
}

export function LobbyScreen({ model }: { readonly model: ControllerModel }): React.JSX.Element {
  const [renaming, setRenaming] = useState(false)
  const session = model.session
  const player = session?.players.find((candidate) => candidate.playerId === model.playerId)
  const [name, setName] = useState(player?.name ?? '')
  if (!session || !player) return <JoinScreen model={model} initialCode="" />
  const canReady = session.allowedActions.includes('player.set-ready')
  const canRename = session.allowedActions.includes('player.rename')
  const readyPending = model.pending === 'ready'

  function submitRename(event: React.FormEvent): void {
    event.preventDefault()
    const error = model.rename(name)
    if (!error) setRenaming(false)
  }

  return (
    <main className="phone-shell phone-lobby">
      <header className="lobby-top"><div className="phone-brand"><Mark /><div><small>Raum</small><strong>{session.roomCode}</strong></div></div><Status state={model.connection} /></header>
      <section className="identity-card">
        <span className="phone-kicker">Dein Platz · {String(player.seat + 1).padStart(2, '0')}</span>
        {renaming ? (
          <form className="rename-form" onSubmit={submitRename}><input aria-label="Neuer Spielername" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={32} /><button className="icon-button" aria-label="Namen speichern">✓</button></form>
        ) : <div className="player-name"><h1>{player.name}</h1><button className="icon-button" aria-label="Namen ändern" disabled={!canRename} onClick={() => { setName(player.name); setRenaming(true) }}>✎</button></div>}
        <p>{player.connected ? 'Du bist mit der Lobby verbunden.' : 'Deine Verbindung wird wiederhergestellt.'}</p>
      </section>

      <button className={`ready-orb ${player.ready ? 'ready-orb--active' : ''}`} disabled={!canReady || readyPending} onClick={() => model.setReady(!player.ready)} aria-pressed={player.ready}>
        <span className="ready-orb__glyph">{player.ready ? '✓' : '✦'}</span>
        <strong>{readyPending ? 'Server prüft …' : player.ready ? 'Bereit!' : 'Bereit machen'}</strong>
        <small>{player.ready ? 'Tippen, um zurückzunehmen' : 'Tippen, wenn du startklar bist'}</small>
      </button>

      {model.notice && <div className="phone-notice" role="alert">{model.notice}</div>}
      <section className="lobby-facts">
        <div><span>Modus</span><strong>{session.selectedMode ? session.selectedMode.toUpperCase() : 'OFFEN'}</strong></div>
        <div><span>Crew</span><strong>{session.players.filter((candidate) => candidate.connected).length} / {session.maxPlayers}</strong></div>
      </section>
      <p className="waiting-copy">Der TV-Host startet, sobald mindestens zwei Spieler bereit sind.</p>
    </main>
  )
}

function StartedScreen({ model }: { readonly model: ControllerModel }): React.JSX.Element {
  const player = model.session?.players.find((candidate) => candidate.playerId === model.playerId)
  return <main className="phone-shell centered-state"><Mark /><span className="phone-kicker">Spiel gestartet</span><h1>Festhalten,<br />{player?.name}.</h1><p>Der Modus <strong>{model.session?.selectedMode?.toUpperCase() ?? 'CLASSIC'}</strong> beginnt gleich auf dem großen Bildschirm.</p><div className="state-rune">✦</div></main>
}

function ClosedScreen({ model }: { readonly model: ControllerModel }): React.JSX.Element {
  return <main className="phone-shell centered-state"><Mark /><span className="phone-kicker">Raum geschlossen</span><h1>Das Schiff hat abgelegt.</h1><p>Der Host hat diese Sitzung beendet.</p><button className="phone-button phone-button--primary" onClick={model.forgetSession}>Anderen Raum suchen</button></main>
}

export function ControllerApp(): React.JSX.Element {
  const initialCode = useMemo(() => roomCodeFromUrl(), [])
  const model = useController(initialCode)
  if (!model.session) return <JoinScreen model={model} initialCode={initialCode} />
  if (model.session.phase === 'started' && model.game) return <GameScreen model={model} game={model.game} />
  if (model.session.phase === 'started') return <StartedScreen model={model} />
  if (model.session.phase === 'closed') return <ClosedScreen model={model} />
  return <LobbyScreen model={model} />
}
