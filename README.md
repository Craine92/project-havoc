# Project Havoc

Project Havoc is a browser-based local multiplayer party game. Alpha 0.1D provides a versioned authoritative Socket.IO server, an interactive TV lobby, locally generated QR joins, and a complete smartphone controller.

## Requirements and installation

- Node.js 22.12 or newer
- npm 11

```powershell
npm install
```

## Start on the local network (recommended)

Open PowerShell in the project directory and run:

```powershell
npm run dev
```

`npm run dev` delegates to `dev:lan`. The launcher selects the active physical IPv4 interface through the Windows default route, binds all three services only to that address, configures the exact CORS origins, and prints all three LAN URLs. Open the displayed TV URL and scan its QR code. Stop the complete process group with `Ctrl+C`.

If Windows has multiple active default routes, the launcher refuses to guess. Select an address shown by `npm run doctor` explicitly:

```powershell
$env:HAVOC_LAN_IP='192.168.x.x'
npm run dev
```

Use an address actually assigned to the PC; do not copy the placeholder. `HAVOC_SERVER_PORT`, `HAVOC_TV_PORT`, and `HAVOC_CONTROLLER_PORT` optionally override ports 3000, 5173, and 5174. Manual `.env.local` files are no longer needed for the normal LAN workflow.

For a read-only diagnosis of adapter selection, configured ports, and currently reachable services:

```powershell
npm run doctor
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

For an exceptional manual setup, copy `apps/tv/.env.example` to the ignored file `apps/tv/.env.local` and replace loopback addresses with the PC's reachable LAN hostname or address:

```dotenv
VITE_HAVOC_SERVER_URL=http://192.168.1.20:3000
VITE_PUBLIC_JOIN_URL=http://192.168.1.20:5174/join
```

Then start the server and UIs individually with LAN binding and exact CORS origins. The normal `npm run dev` workflow performs this automatically:

```powershell
$env:HOST='0.0.0.0'
$env:CORS_ORIGINS='http://192.168.1.20:5173,http://192.168.1.20:5174'
$env:RECONNECT_TOKEN_SECRET='replace-with-at-least-32-bytes-of-random-secret'
npm run dev:server
```

```powershell
npm run dev:tv -- --host 0.0.0.0 --port 5173
```

The join URL is displayed, encoded into a locally generated QR code, and opens the controller with the room code prefilled. Without a valid non-loopback `VITE_PUBLIC_JOIN_URL`, the TV shows guidance and deliberately renders no QR code instead of inventing a TV or localhost URL.

## Run the smartphone controller

```powershell
npm run dev:controller -- --host 0.0.0.0 --port 5174
```

The `--` after the root script name is required: it forwards `--host` and `--port` through npm's workspace wrapper to Vite.

Set `VITE_HAVOC_SERVER_URL` in `apps/controller/.env.local` for LAN use. The complete three-terminal Windows procedure and hardware test checklist are in [MANUAL_MULTIPLAYER_TEST.md](docs/MANUAL_MULTIPLAYER_TEST.md).

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
  controller/   interactive React/Vite smartphone controller
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
