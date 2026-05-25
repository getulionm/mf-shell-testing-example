# Workshop Labs (Track A)

Hands-on checkpoints for MF boundary + testing mastery.

Each lab follows the same pattern:
1. **Observe** working behavior
2. **Break** one boundary on purpose
3. **Detect** failure at the right test layer
4. **Fix** and return to green

Keep `npm run dev` running in one terminal while doing browser labs.

---

## Lab 0 — Map the topology (10 min)

**Outcome:** you can point to host vs remotes and describe event flow.

1. Open [http://127.0.0.1:3000/](http://127.0.0.1:3000/)
2. Find the topology panel (`data-testid="topology-panel"`)
3. Create a task in Remote A and watch Remote B counters change
4. Open DevTools console and trace the event flow through the shell broker

Checkpoint:
- Can you draw `TaskCreated -> shell -> TaskStatsUpdated` from memory?

Reference files:
- `apps/shell/src/shellApp.ts`
- `apps/tools-remote/src/mount.ts`
- `apps/records-remote/src/mount.ts`

---

## Lab 1 — Break remote manifest → see shell fallback

**Outcome:** one failed remote slot does not crash the shell.

### Browser exercise

1. Open shell page
2. In DevTools console:

```js
window.__MF_FAULTS__.setFault("tools", { manifestUnavailable: true });
```

3. Click **Reload remotes**
4. Confirm:
   - creator slot shows unavailable fallback
   - summary slot still works
   - shell header/topology still visible

Repeat with `"records"` instead of `"tools"`.

### Test exercise

Run the matching E2E cases:

```bash
npm run test:e2e -- --grep "manifestUnavailable"
```

Reference:
- fault API: `packages/fault-toggles/src/index.ts`
- shell fallback rendering: `apps/shell/src/shellApp.ts`
- E2E: `tests/e2e/resilience.spec.ts`

Checkpoint questions:
- Where is fault state stored?
- Why does shell stay alive when one manifest fails?

---

## Lab 2 — Add invalid event payload → contract test fails

**Outcome:** bad cross-team payloads are rejected before UI/integration drift.

### Break it

In `packages/module-contracts/src/index.ts`, temporarily weaken validation, e.g. allow empty title for `TaskCreated`.

### Detect

```bash
npm run test:unit
```

Expected failure in `tests/unit/module-contracts.test.ts`:
- `rejects empty task title`

### Fix

Restore strict validation and re-run unit tests.

Optional stretch:
1. Add a new event field in contract (e.g. `priority: "low" | "high"`)
2. Add unit tests for valid/invalid values **first**
3. Only then update remotes/shell

Reference:
- contract logic: `packages/module-contracts/src/index.ts`
- unit tests: `tests/unit/module-contracts.test.ts`

Checkpoint questions:
- Why are contract tests cheaper than E2E for schema drift?
- Which team owns `@mf/module-contracts` in a real org?

---

## Lab 3 — Inject backend timeout → other remote still works

**Outcome:** backend failure is isolated to the failing remote boundary.

### Browser exercise

1. Reset faults:

```js
window.__MF_FAULTS__.resetFaults();
```

2. Inject timeout for summary remote:

```js
window.__MF_FAULTS__.setFault("records", { backendTimeout: true });
```

3. Reload remotes, create a task
4. Confirm:
   - creator still accepts task input
   - summary slot shows error/unavailable state
   - shell frame remains usable

### Test exercise

Integration (fast, no browser):

```bash
npm run test:integration
```

Look at: `renders records outage message without crashing`.

Full resilience matrix:

```bash
npm run test:e2e
```

Reference:
- backend fault wrapper: `runWithBackendFault(...)` in `packages/fault-toggles/src/index.ts`
- remote usage: both `apps/*/src/mount.ts`
- integration test: `tests/integration/module-interaction.test.ts`

Checkpoint questions:
- Is this a shell outage or a remote outage?
- Which test layer proves isolation best: unit, integration, or E2E?

---

## Lab 4 — Change broker rule in shell only, remotes unchanged

**Outcome:** orchestration policy changes happen in shell, preserving remote autonomy.

Current broker behavior (`wireTaskBroker`):
- on `TaskCreated`, increment `total` and `open`

### Change policy (shell only)

In `apps/shell/src/shellApp.ts`, modify broker logic, for example:
- increment `done` instead of `open`, or
- increment `open` by 2 for demo effect

Do **not** edit remote files.

### Verify

```bash
npm run test:integration
npm run test:e2e:smoke
```

Then manually confirm in browser that summary numbers follow your new shell rule.

Revert broker change when done (unless you intentionally want to keep it).

Reference:
- broker: `wireTaskBroker` in `apps/shell/src/shellApp.ts`
- integration assertion on shell telemetry source: `tests/integration/module-interaction.test.ts`

Checkpoint questions:
- Why is this the correct place for the rule?
- What would break if Remote A updated summary counters directly?

---

## Lab completion rubric

| Lab | You pass if... |
|---|---|
| 0 | You can explain host/remotes/event flow without reading code |
| 1 | You can fault one remote and keep the other usable |
| 2 | You can tie schema changes to unit/contract test failures |
| 3 | You can distinguish remote backend failure vs shell failure |
| 4 | You can change orchestration in shell without touching remotes |

---

## Facilitator notes (if teaching others)

Suggested 90-minute workshop:
- 10 min Lab 0
- 20 min Lab 1 (+ E2E grep demo)
- 20 min Lab 2 (live TDD on payload rule)
- 20 min Lab 3 (browser + integration)
- 20 min Lab 4 (shell-only policy change)

Debrief prompts:
1. “What does the shell know about each remote?”
2. “Which test layer gave the fastest feedback?”
3. “Where does cross-remote coordination happen?”

---

## Next step after Track A

Track B covers runtime mechanics: version skew, shared deps, and route composition — useful when teams need independent deploy cadence.
