# Project Havoc

Project Havoc is a browser-based local multiplayer party game in active development. The current Alpha 0.1A foundation contains a strict TypeScript workspace, a versioned wire protocol, and a pure server-authoritative lobby domain. It does not yet contain a visual lobby, network transport, or gameplay.

## Requirements

- Node.js 22.12 or newer
- npm 11

## Install

```powershell
npm install
```

## Quality checks

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Playwright is configured for later TV/controller end-to-end tests. No browser test is included until an interactive UI exists.

## Minimal applications

```powershell
npm run dev:server
npm run dev:tv
npm run dev:controller
```

The placeholder server binds to `127.0.0.1:3000` by default and exposes `GET /health`. Set `PORT` to use another local port. TV and controller currently mount empty React roots by design.

## Workspace

```text
apps/
├─ server/
├─ tv/
└─ controller/
packages/
├─ protocol/
├─ game-core/
├─ rules-classic/
├─ rules-chaos/
├─ test-support/
└─ ui/
tests/
└─ e2e/
```

See `docs/` for the game design, architecture, decisions, state model, actions, acceptance scenarios, and roadmap.
