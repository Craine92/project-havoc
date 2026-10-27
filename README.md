# Project Havoc

Project Havoc is a browser-based local multiplayer party game. Alpha 0.1C provides a strict TypeScript monorepo, a versioned protocol, an authoritative Socket.IO server, and the first fully interactive TV lobby. The smartphone controller remains intentionally unimplemented.

## Requirements and installation

- Node.js 22.12 or newer
- npm 11

```powershell
npm install
```

## Run the multiplayer server

```powershell
npm run dev:server
```

The default address is `http://127.0.0.1:3000`; `GET /health` returns `{"status":"ok"}`. To accept devices on the local network, bind explicitly and allow the exact UI origins:

```powershell
$env:HOST='0.0.0.0'
$env:CORS_ORIGINS='http://192.168.1.10:5173,http://192.168.1.10:5174'
$env:RECONNECT_TOKEN_SECRET='replace-with-at-least-32-bytes-of-random-secret'
npm run dev:server
```

Production mode requires `RECONNECT_TOKEN_SECRET`. Development creates an ephemeral secret when none is configured, so credentials stop working after restart. Wildcard CORS origins are rejected.

See [.env.example](.env.example) for all lifecycle and security settings. In-memory rooms always disappear when the process restarts.

## Run the TV lobby

For development on one PC, open a second terminal:

```powershell
npm run dev:tv
```

Then open `http://127.0.0.1:5173`. The TV derives its default server endpoint as the current hostname on port 3000.

For LAN use, copy `apps/tv/.env.example` to the ignored file `apps/tv/.env.local` and replace loopback addresses with the PC's reachable LAN hostname or address:

```dotenv
VITE_HAVOC_SERVER_URL=http://192.168.1.20:3000
VITE_PUBLIC_JOIN_URL=http://192.168.1.20:5174/join
```

Start the server and TV with LAN binding and exact CORS origins:

```powershell
$env:HOST='0.0.0.0'
$env:CORS_ORIGINS='http://192.168.1.20:5173'
$env:RECONNECT_TOKEN_SECRET='replace-with-at-least-32-bytes-of-random-secret'
npm run dev:server
```

```powershell
npm run dev:tv -- --host 0.0.0.0
```

The join URL is displayed and correctly encoded, but its controller destination becomes usable only after Auftrag 006. The TV shows a warning when `VITE_PUBLIC_JOIN_URL` is absent; it never guesses or exposes a private network address.

## Wire flow

Clients emit `client.message` with a value accepted by `packages/protocol`. The server emits only versioned `server.message` values:

1. `room.create`, `room.join`, or a reconnect action establishes an identity.
2. `credentials.issued` is sent only to the requesting socket on first creation/join.
3. `action.accepted` or `action.rejected` correlates through `actionId`.
4. `session.snapshot` is a complete role-specific authoritative view.
5. Later actions use the latest snapshot revision. Reconnect and anonymous join are safely serialized against the current server revision.

Socket IDs are transport details, never identities. A valid reconnect credential replaces an older socket for the same host/player and receives a fresh full snapshot.

## Quality checks

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm audit
npm run test:e2e
```

Integration tests use real Socket.IO clients and random free ports. Playwright starts an isolated backend and Vite server on ports 4310/4311, drives Chromium, and shuts both down after the run.

## Manual TV check

1. Start backend and TV in separate terminals.
2. Confirm that the start screen says `Server verbunden`.
3. Select `Neues Spiel` and verify that the server-issued room code appears.
4. Switch between Classic and Chaos; the selected state changes only after the server snapshot.
5. Reload the browser and verify that the same room is restored.
6. Select `Raum schließen`, cancel once, then confirm and verify the closed-room screen.

Host credentials are stored in `sessionStorage`, scoped to the browser tab session. This supports reload recovery with less persistence than `localStorage`, but any script executing in the page origin could still access them. Use only trusted assets and origins.

Current browser constraints: a modern ES2022-capable browser, WebSocket support, and available `sessionStorage` are expected. Privacy modes can disable storage; strict networks or proxies can block WebSockets. HTTPS and public-internet operation are not part of this local alpha.

## Workspace

```text
apps/
  server/       HTTP + Socket.IO authority
  tv/           interactive React/Vite TV lobby
  controller/   empty React/Vite shell
packages/
  protocol/     versioned wire schemas
  game-core/    transport-free lobby domain
  rules-classic/
  rules-chaos/
  test-support/
  ui/
tests/e2e/      reserved for later browser flows
```

See `docs/` for architecture, decisions, state models, acceptance scenarios, open questions, and roadmap.
