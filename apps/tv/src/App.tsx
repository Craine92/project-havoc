import { useState } from 'react'

import type { PrivateSessionView } from '@project-havoc/protocol'

import type { ConnectionState, TvLobbyModel } from './types.js'
import { useTvLobby } from './useTvLobby.js'
import { QrCode } from './QrCode.js'

const VERSION = `Alpha 0.1C · Protokoll 1`

const CONNECTION_LABELS: Record<ConnectionState, string> = {
  connecting: 'Verbindung wird hergestellt',
  connected: 'Server verbunden',
  unavailable: 'Server nicht erreichbar',
  lost: 'Verbindung verloren',
  reconnecting: 'Sitzung wird wiederhergestellt',
  'protocol-error': 'Protokollfehler',
  'session-invalid': 'Sitzung nicht mehr gültig',
  'host-lost': 'Hostberechtigung verloren',
}

function HavocMark(): React.JSX.Element {
  return (
    <svg className="havoc-mark" viewBox="0 0 80 80" aria-hidden="true">
      <path d="M40 5 69 22v36L40 75 11 58V22L40 5Z" />
      <path d="m28 22 12 9 12-9-3 15 10 7-13 2-6 14-6-14-13-2 10-7-3-15Z" />
    </svg>
  )
}

export function ConnectionBadge({ state }: { readonly state: ConnectionState }): React.JSX.Element {
  return (
    <div className={`connection-badge connection-badge--${state}`} role="status" aria-live="polite">
      <span className="connection-badge__dot" />
      {CONNECTION_LABELS[state]}
    </div>
  )
}

function Brand(): React.JSX.Element {
  return (
    <div className="brand" aria-label="Project Havoc">
      <HavocMark />
      <div>
        <span className="brand__eyebrow">Project</span>
        <span className="brand__name">Havoc</span>
      </div>
    </div>
  )
}

export function StartScreen({ model }: { readonly model: TvLobbyModel }): React.JSX.Element {
  const canCreate = model.connection === 'connected' && model.pendingAction === null
  const recoverable = model.connection === 'unavailable' || model.connection === 'lost'
  const invalidSession = model.connection === 'session-invalid' || model.connection === 'host-lost'

  return (
    <main className="start-screen">
      <div className="energy-orbit energy-orbit--one" />
      <div className="energy-orbit energy-orbit--two" />
      <section className="start-hero">
        <Brand />
        <p className="start-hero__kicker">Versammelt eure Crew</p>
        <h1>Ein Bildschirm.<br /><em>Maximales Chaos.</em></h1>
        <p className="start-hero__copy">
          Erschaffe eine Lobby und verbinde bis zu acht Smartphones für eure nächste magische Eskalation.
        </p>

        <button className="button button--primary button--hero" onClick={model.createRoom} disabled={!canCreate}>
          <span>{model.pendingAction === 'create' ? 'Raum wird erschaffen …' : model.notice && model.connection === 'connected' ? 'Erneut versuchen' : 'Neues Spiel'}</span>
          <span aria-hidden="true">↗</span>
        </button>

        {recoverable && (
          <button className="button button--ghost" onClick={model.retryConnection}>Erneut verbinden</button>
        )}
        {invalidSession && (
          <button className="button button--ghost" onClick={model.resetSession}>Zurück zum Start</button>
        )}

        {model.notice && <div className="notice notice--error" role="alert">{model.notice}</div>}
      </section>

      <footer className="start-footer">
        <ConnectionBadge state={model.connection} />
        <span>{VERSION}</span>
        <span className="start-footer__server" title={model.serverUrl}>{model.serverUrl}</span>
      </footer>
    </main>
  )
}

function PlayerGrid({ session }: { readonly session: PrivateSessionView }): React.JSX.Element {
  const slots = Array.from({ length: session.maxPlayers }, (_, seat) => {
    const player = session.players.find((candidate) => candidate.seat === seat)
    return { seat, player }
  })
  return (
    <div className="player-grid" aria-label={`${session.players.length} von ${session.maxPlayers} Spielern`}>
      {slots.map(({ seat, player }) => player ? (
        <article className={`player-card ${player.ready ? 'player-card--ready' : ''} ${player.connected ? '' : 'player-card--offline'}`} key={player.playerId}>
          <span className="player-card__number">{String(seat + 1).padStart(2, '0')}</span>
          <span className="player-card__sigil" aria-hidden="true">✦</span>
          <div className="player-card__identity">
            <strong>{player.name}</strong>
            <span>{player.connected ? (player.ready ? 'Bereit' : 'Wartet') : 'Verbindung getrennt'}</span>
          </div>
          <span className={`status-gem ${player.ready && player.connected ? 'status-gem--ready' : ''}`} aria-hidden="true" />
        </article>
      ) : (
        <article className="player-card player-card--empty" key={`empty-${seat}`} aria-label={`Freier Spielerplatz ${seat + 1}`}>
          <span className="player-card__number">{String(seat + 1).padStart(2, '0')}</span>
          <span className="player-card__empty-mark" aria-hidden="true">＋</span>
          <span>Freier Platz</span>
        </article>
      ))}
    </div>
  )
}

export function LobbyScreen({ model }: { readonly model: TvLobbyModel }): React.JSX.Element {
  const [confirmClose, setConfirmClose] = useState(false)
  const session = model.session
  if (!session) return <StartScreen model={model} />
  const canSetMode = session.allowedActions.includes('room.set-mode')
  const canStart = session.allowedActions.includes('room.start')
  const canClose = session.allowedActions.includes('room.close')
  const readyCount = session.players.filter((player) => player.connected && player.ready).length

  return (
    <main className="lobby-screen">
      <header className="lobby-header">
        <Brand />
        <div className="lobby-header__meta">
          <ConnectionBadge state={model.connection} />
          <span className="phase-chip">Lobby · Revision {session.revision}</span>
        </div>
      </header>

      {model.notice && <div className="notice notice--floating" role="alert">{model.notice}</div>}

      <div className="lobby-layout">
        <aside className="join-panel panel">
          <span className="panel-label">Dein Raumcode</span>
          <strong className="room-code" data-testid="room-code">{session.roomCode}</strong>
          <p className="join-panel__hint">Auf dem Smartphone öffnen und Code eingeben</p>
          {model.joinUrl && <a className="join-url" href={model.joinUrl}>{model.joinUrl}</a>}
          {model.joinUrlWarning && <p className="lan-warning">{model.joinUrlWarning}</p>}
          {model.joinUrl && <QrCode value={model.joinUrl} />}
        </aside>

        <section className="roster-panel panel">
          <div className="section-heading">
            <div>
              <span className="panel-label">Die Crew</span>
              <h2>Spieler versammeln</h2>
            </div>
            <div className="player-count"><strong>{session.players.length}</strong><span>/ {session.maxPlayers}</span></div>
          </div>
          <PlayerGrid session={session} />
        </section>

        <section className="mode-panel panel">
          <div className="section-heading section-heading--compact">
            <div>
              <span className="panel-label">Spielmodus</span>
              <h2>Wählt euer Schicksal</h2>
            </div>
            {model.pendingAction === 'set-mode' && <span className="pending-label">Server prüft …</span>}
          </div>
          <div className="mode-options">
            <button
              className={`mode-card ${session.selectedMode === 'classic' ? 'mode-card--selected' : ''}`}
              disabled={!canSetMode || model.pendingAction !== null}
              onClick={() => model.selectMode('classic')}
              aria-pressed={session.selectedMode === 'classic'}
            >
              <span className="mode-card__icon mode-card__icon--classic">◇</span>
              <span><strong>Classic</strong><small>Pur. Schnell. Unerbittlich.</small></span>
            </button>
            <button
              className={`mode-card mode-card--chaos ${session.selectedMode === 'chaos' ? 'mode-card--selected' : ''}`}
              disabled={!canSetMode || model.pendingAction !== null}
              onClick={() => model.selectMode('chaos')}
              aria-pressed={session.selectedMode === 'chaos'}
            >
              <span className="mode-card__icon mode-card__icon--chaos">✦</span>
              <span><strong>Chaos</strong><small>Magie bricht alle Regeln.</small></span>
            </button>
          </div>
        </section>

        <section className="launch-panel panel">
          <div className="launch-status">
            <span className={`launch-status__rune ${canStart ? 'launch-status__rune--ready' : ''}`}>✦</span>
            <div>
              <span className="panel-label">Startstatus</span>
              <strong>{canStart ? 'Die Crew ist bereit' : `${readyCount} von mindestens ${session.minPlayers} bereit`}</strong>
              <small>{canStart ? 'Der Server erlaubt den Start.' : 'Mindestens zwei verbundene Spieler müssen bereit sein.'}</small>
            </div>
          </div>
          <div className="launch-actions">
            <button className="button button--danger" disabled={!canClose || model.pendingAction !== null} onClick={() => setConfirmClose(true)}>
              Raum schließen
            </button>
            <button className="button button--primary" disabled={!canStart || model.pendingAction !== null} onClick={model.startSession}>
              {model.pendingAction === 'start' ? 'Start wird geprüft …' : 'Spiel starten'} <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      </div>

      {confirmClose && (
        <div className="dialog-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="close-title">
            <span className="confirm-dialog__rune" aria-hidden="true">✦</span>
            <span className="panel-label">Letzte Warnung</span>
            <h2 id="close-title">Raum wirklich schließen?</h2>
            <p>Alle verbundenen Spieler werden getrennt. Diese Sitzung kann danach nicht wiederhergestellt werden.</p>
            <div className="confirm-dialog__actions">
              <button className="button button--ghost" onClick={() => setConfirmClose(false)}>Abbrechen</button>
              <button className="button button--danger-solid" onClick={() => { setConfirmClose(false); model.closeRoom() }}>Raum schließen</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export function StartedScreen({ model }: { readonly model: TvLobbyModel }): React.JSX.Element {
  const session = model.session
  const startedPlayers = session?.players.filter((player) => session.startedPlayerIds.includes(player.playerId)) ?? []
  return (
    <main className="state-screen state-screen--started">
      <Brand />
      <div className="state-screen__rune" aria-hidden="true">✦</div>
      <span className="panel-label">Sitzung gestartet</span>
      <h1>Das Portal ist offen.</h1>
      <p><strong>{session?.selectedMode?.toUpperCase() ?? 'CLASSIC'}</strong> · {startedPlayers.length} Spieler sind bereit. Das eigentliche Gameplay folgt in einer späteren Alpha.</p>
      <div className="started-players" aria-label="Gestartete Spieler">
        {startedPlayers.map((player) => <span key={player.playerId}>{player.name}</span>)}
      </div>
      <ConnectionBadge state={model.connection} />
    </main>
  )
}

export function ClosedScreen({ model }: { readonly model: TvLobbyModel }): React.JSX.Element {
  return (
    <main className="state-screen">
      <Brand />
      <div className="state-screen__rune state-screen__rune--dim" aria-hidden="true">◇</div>
      <span className="panel-label">Raum geschlossen</span>
      <h1>Die Energie ist verflogen.</h1>
      <p>Alle Verbindungen wurden beendet. Du kannst jederzeit eine neue Sitzung erschaffen.</p>
      <button className="button button--primary" onClick={model.resetSession}>Zurück zum Start</button>
    </main>
  )
}

export function TvLobbyApp(): React.JSX.Element {
  const model = useTvLobby()
  if (!model.session) return <StartScreen model={model} />
  if (model.session.phase === 'closed') return <ClosedScreen model={model} />
  if (model.session.phase === 'started') return <StartedScreen model={model} />
  return <LobbyScreen model={model} />
}
