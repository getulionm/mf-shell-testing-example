# Contract-First Curriculum

Hands-on build order for this repo. Read the [Fundamentals walkthrough](./fundamentals-walkthrough.md) first if terms like host, remote, manifest, or event bus are new.

Use this doc as the exercise path.

---

## Mental model (read once)

```
Remote A (Task Creator)  --TaskCreated-->  Shell broker  --TaskStatsUpdated-->  Remote B (Task Summary)
```

Rules:
1. Remotes emit and consume **typed events**.
2. Shell validates payloads and translates intent into shared updates.
3. Shell orchestrates through contracts and manifests.
4. Tests assert **shell/remotes boundaries**.

---

## Step 0 — Setup (5 min)

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000/](http://127.0.0.1:3000/) and confirm:
- both remotes render side-by-side
- creating a task updates summary counters

Baseline tests:

```bash
npm test
```

---

## Step 1 — Define the event schema first

**Goal:** agree on cross-team vocabulary before writing UI.

**File:** `packages/module-contracts/src/index.ts`

What to study:
- `EVENT_TYPES.TASK_CREATED`
- `EVENT_TYPES.TASK_STATS_UPDATED`
- `validateEventPayload(...)`

Checkpoint questions:
- What is the minimum payload for `TaskCreated`?
- Which fields are required for `TaskStatsUpdated`?
- What happens if an unknown event type is published?

Expected insight: contracts are the “API” between teams. UI can change; event shape is the stability layer.

---

## Step 2 — Write contract tests before changing remotes

**Goal:** lock the API with fast tests.

**Files:**
- `tests/unit/module-contracts.test.ts`
- `tests/contract/remote-contracts.test.ts`

Run:

```bash
npm run test:unit
npm run test:contract
```

What contract tests verify here:
- manifest shape is valid (`apps/shell/src/manifests.ts`)
- remotes expose `mount(container, shellApi)` API
- invalid payloads are rejected

Checkpoint exercise:
1. Temporarily break `validateEventPayload` (e.g. allow empty title).
2. Run `npm run test:unit` and observe failure.
3. Revert.

Expected insight: contract tests fail fast and cheaply when teams drift.

---

## Step 3 — Implement remotes against the contract

**Goal:** each team owns UI + local behavior, not cross-team wiring.

**Files:**
- `apps/tools-remote/src/mount.ts` (publisher)
- `apps/records-remote/src/mount.ts` (subscriber)

Publisher rule (Remote A):
- emit `TaskCreated` with `{ title }`
- send intent through the event bus

Subscriber rule (Remote B):
- listen for `TaskStatsUpdated`
- render stats from event payload/context

Checkpoint exercise:
1. Search both remotes for direct imports of the other remote (should be none).
2. Confirm both remotes only use `@mf/module-contracts` + `@mf/fault-toggles`.

Expected insight: autonomy comes from narrow interfaces, not shared folders.

---

## Step 4 — Put orchestration in shell only

**Goal:** shell stays implementation-agnostic.

**File:** `apps/shell/src/shellApp.ts`

Study:
- `wireTaskBroker(...)` translates `TaskCreated` → `TaskStatsUpdated`
- `mountRemote(...)` loads federated modules and handles fallback
- shell passes `eventBus`, `context`, `pathname` into remotes

Checkpoint exercise:
1. Change broker logic to increment `done` instead of `open`.
2. Do not touch remotes.
3. Run integration test (Step 5) to confirm behavior changed through shell only.

Expected insight: business translation belongs in orchestration, not in remotes.

---

## Step 5 — Add integration tests at shell boundary

**Goal:** prove cross-module flow through real shell broker code.

**File:** `tests/integration/module-interaction.test.ts`

Run:

```bash
npm run test:integration
```

Assertions to notice:
- creator action updates summary UI
- telemetry includes shell-published `TaskStatsUpdated`
- records backend timeout shows outage message without crashing test harness

Expected insight: integration tests validate shell orchestration across remotes.

---

## Step 6 — Add E2E for user journey + resilience last

**Goal:** keep E2E thin; reserve it for critical journeys and failure isolation.

**Files:**
- `tests/e2e/smoke.spec.ts`
- `tests/e2e/resilience.spec.ts`

Run:

```bash
npm run test:e2e:smoke
npm run test:e2e
```

Smoke covers happy path. Resilience covers:
- `manifestUnavailable`
- `backendTimeout`
- `backendError`
- `latencyMs`

Expected insight: E2E confirms critical user journeys and fault isolation.

---

## Suggested learning timeline

| Session | Focus | Commands |
|---|---|---|
| 1 | Topology + contracts | read [Testing strategy](../README.md#testing-strategy), run `npm run test:unit` |
| 2 | Remote ownership | inspect both `mount.ts`, run `npm run test:contract` |
| 3 | Shell broker | inspect `wireTaskBroker`, run `npm run test:integration` |
| 4 | Resilience | run `npm run test:e2e`, then do [Workshop Lab 3](./workshop-labs.md#lab-3--inject-backend-timeout--other-remote-still-works) |

---

## Completion checklist

You understand contract-first MF when you can explain:

- [ ] How remotes communicate through typed events
- [ ] Which layer catches malformed payloads first
- [ ] How the shell broker translates cross-remote intent
- [ ] Which tests belong to shell vs remote teams
- [ ] How to simulate one remote outage while keeping the app usable

Optional next topic: Track B runtime mechanics (independent deploy and version compatibility).
