# MF Shell Testing Example

A beginner-friendly **Webpack 5 Module Federation (v1)** lab.

One shell host loads two team-owned remotes in a single page. The shell brokers events between them.

| What you see in the browser | Folder | Port |
|---|---|---|
| **Control Plane** (host / shell) | `apps/shell` | 3000 |
| **Task Creator** (Remote A) | `apps/tools-remote` | 3002 |
| **Task Summary** (Remote B) | `apps/records-remote` | 3001 |

> Folder names (`tools-remote`, `records-remote`) are legacy. UI labels use Task Creator / Task Summary.

---

## What you'll see (open this first)

Run the app, then open [http://127.0.0.1:3000/](http://127.0.0.1:3000/).

You only need **port 3000** for the demo. Ports 3001 and 3002 are the remote dev servers running in the background.

```
┌─────────────────────────────────────────────────────────────────┐
│  CONTROL PLANE  (shell — apps/shell)                     :3000  │
├──────────────┬──────────────────────────┬───────────────────────┤
│  Topology    │  Remote A — Task Creator │  Remote B — Task Summary │
│  panel       │  (apps/tools-remote)     │  (apps/records-remote)   │
│              │                          │                         │
│  Host under  │  [ Task title input ]    │  Total tasks: 0         │
│  test:       │  [ Create Task ]         │  Open tasks:   0        │
│  Control     │                          │  Done tasks:   0        │
│  Plane       │                          │                         │
└──────────────┴──────────────────────────┴───────────────────────┘
│  Event Bus — TaskCreated → TaskStatsUpdated (shell broker)       │
└─────────────────────────────────────────────────────────────────┘
```

### Visual checklist (30 seconds)

With the app running, confirm these six things:

1. **One page** — both Task Creator and Task Summary appear side-by-side (no navigation needed).
2. **Colored borders** — each section has a visible boundary (shell vs remotes).
3. **Topology panel** — left sidebar lists Host, Remote A, Remote B.
4. **Create a task** — type a title, click **Create Task**.
5. **Summary updates** — Remote B counters increase (Total and Open go to 1).
6. **Event Bus panel** — bottom of the page shows `TaskCreated` then `TaskStatsUpdated` from `shell`.

If steps 5–6 work, the core MF flow is working: Remote A → shell broker → Remote B.

### What just happened (one line)

`TaskCreated` (Remote A) → shell broker → `TaskStatsUpdated` (Remote B)

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000/](http://127.0.0.1:3000/) and run the visual checklist above.

**Port already in use?** A previous dev session may still be running. Stop it or free ports 3000–3002, then run `npm run dev` again.

---

## Learn (recommended path)

**New to MF?** Do not start with diagrams. Start with the visual checklist above, then read:

1. [`docs/fundamentals-walkthrough.md`](docs/fundamentals-walkthrough.md) — concepts mapped to files in this repo (read with the browser open)
2. [`docs/contract-first-curriculum.md`](docs/contract-first-curriculum.md) — hands-on build-order exercises
3. [`docs/workshop-labs.md`](docs/workshop-labs.md) — break/fix labs

More docs: [`docs/README.md`](docs/README.md)

---

## Architecture in plain terms

| Piece | Job |
|---|---|
| **Shell** (`apps/shell`) | Page layout, load remotes, broker events between them |
| **Remote A** (`apps/tools-remote`) | Task creation form; publishes `TaskCreated` |
| **Remote B** (`apps/records-remote`) | Task counters; listens for `TaskStatsUpdated` |
| **Contracts** (`packages/module-contracts`) | Shared event types and payload rules |
| **Fault toggles** (`packages/fault-toggles`) | Simulate remote failures for resilience demos |

Technology: **Module Federation v1** (webpack's built-in `ModuleFederationPlugin`, runtime `remoteEntry.js` loading).

---

## Build

```bash
npm run build
```

---

## Testing Strategy

This repo demonstrates a **shell-first** micro-frontend test architecture. Two team-owned remotes mount in one shell view:

- **Remote A** creates tasks and publishes `TaskCreated`
- **Remote B** displays task stats and the shell-provided task list
- **Shell** is the only orchestrator between them (broker + Event Bus panel)

### Layer boundaries

| Layer | Share of effort | What it covers |
|---|---|---|
| **Unit** | ~70% | Event bus behavior, manifest validation, fault toggles, remote-local logic, event log viewer |
| **Contract + Integration** | ~20% | Remote manifest/mount contracts, cross-module flow through shell broker (`TaskCreated` → `TaskStatsUpdated`) |
| **E2E** | ~10% | Critical shell journeys, resilience matrix, learning-manual links |

### What the shell tests

- Manifest validation before mount
- Event brokering (`TaskCreated` → `TaskStatsUpdated`) and shell telemetry
- Event Bus panel logging for published and rejected events
- Graceful fallback when a remote fails to load (including dev-server hints)
- Isolation when one remote hits backend faults while the other keeps working
- Topology clarity: host under test vs team-owned remotes

### What the shell does not test

- Remote private implementation details
- Deep UI internals that belong in a remote-local suite
- Direct remote-to-remote calls that bypass the shell broker

### Outage simulation

Faults are deterministic via `@mf/fault-toggles`:

- `manifestUnavailable`
- `backendTimeout`
- `backendError`
- `latencyMs`

Tests and E2E drive these through `window.__MF_FAULTS__`. The Event Bus panel and `window.__MF_EVENT_LOG__` make broker behavior visible during manual exploration.

### CI recommendation

- **Per push:** `npm run test:unit` + `npm run test:contract`
- **Per PR:** `npm run test:integration` + `npm run test:e2e:smoke`
- **Nightly:** `npm run test:e2e` (full resilience matrix)

### Anti-patterns

- Asserting remote private state from shell tests
- Overfitting E2E tests to selectors that belong inside remotes
- Using random delay-based outage tests instead of deterministic toggles
- Encoding module-specific business rules in shell rendering logic

### Run tests

```bash
npm test                  # unit + contract + integration + smoke E2E
npm run test:e2e          # full resilience matrix
```

Individual layers:

```bash
npm run test:unit
npm run test:contract
npm run test:integration
npm run test:e2e:smoke
```
