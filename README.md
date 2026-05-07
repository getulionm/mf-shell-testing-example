# MF Shell Testing Example

Minimal Webpack 5 Module Federation demo focused on one beginner-friendly concept:
- `apps/shell` (Host under test: Control Plane)
- `apps/tools-remote` (Remote A owned by Team A: Task Creator)
- `apps/records-remote` (Remote B owned by Team B: Task Summary)

The shell composes remotes and brokers typed events. Remotes never call each other directly.

## Host vs Remotes (first thing to notice)

- **Host under test**: Control Plane (shell)
- **Remote A**: Task Creator UI
- **Remote B**: Task Summary UI
- **Boundary rule**: Remote A emits intent, shell broker translates to shared summary update for Remote B

## Quick Start

### 1) Install dependencies

```bash
npm install
```

### 2) Run the app (shell + both remotes)

```bash
npm run dev
```

### 3) Open in browser

- Shell (single-view route): [http://127.0.0.1:3000/](http://127.0.0.1:3000/)
- Records remote dev host: [http://127.0.0.1:3001](http://127.0.0.1:3001)
- Tools remote dev host: [http://127.0.0.1:3002](http://127.0.0.1:3002)

## Demo cross-module flow

1. Open the shell (both remotes are visible side-by-side).
2. In **Task Creator** (Remote A), enter a task title.
3. Click **Create Task**.
4. **Task Summary** (Remote B) updates its total/open counters.

This flow is shell-brokered (`TaskCreated` -> `TaskStatsUpdated`) to preserve MF boundaries.

## Build

```bash
npm run build
```

## Test

Run all main checks:

```bash
npm test
```

Run specific layers:

```bash
npm run test:unit
npm run test:contract
npm run test:integration
npm run test:e2e:smoke
npm run test:e2e
```

Generate one HTML report across all layers:
Use default runner commands from terminal output instead (`npm test`, `npm run test:e2e`, etc.).
