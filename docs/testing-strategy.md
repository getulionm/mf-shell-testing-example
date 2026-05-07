# Testing Strategy

This repository demonstrates a shell-first microfrontend test architecture where two team-owned remotes are mounted in one shell view:
- Remote A creates tasks
- Remote B displays task summary stats
- Shell is the only orchestrator between them

## Layer Boundaries

- **Unit (~70%)**: event bus behavior, manifest validation, route policy helpers, fault toggles, and remote-local logic.
- **Contract + Integration (~20%)**: remote manifest/mount contract checks and cross-module interaction at shell boundaries via event contracts.
- **E2E (~10%)**: only critical shell journeys and resilience paths.

## What The Shell Tests

- Route delegation by manifest contract.
- Event brokering (`TaskCreated` -> `TaskStatsUpdated`) and telemetry markers.
- Graceful fallback for remote load failures.
- Isolation during backend faults in one remote.
- Topology clarity that distinguishes host under test from team-owned remotes.

## What The Shell Does Not Test

- Remote private implementation details.
- Deep UI internals that belong to a remote-local test suite.
- Direct remote-to-remote calls that bypass the shell contract broker.

## Outage Simulation

Faults are deterministic and test-driven through `@mf/fault-toggles`:

- `manifestUnavailable`
- `backendTimeout`
- `backendError`
- `latencyMs`

These are consumed by shell/remote runtime in tests and E2E via `window.__MF_FAULTS__`.

## CI Recommendation

- **Per push**: `npm run test:unit` + `npm run test:contract`
- **Per PR**: `npm run test:integration` + `npm run test:e2e:smoke`
- **Nightly**: `npm run test:e2e` (full resilience coverage)

## Anti-patterns

- Asserting remote private state from shell tests.
- Overfitting E2E tests to selectors that belong inside remotes.
- Relying on random delay-based outage tests instead of deterministic toggles.
- Encoding module-specific business rules in shell rendering logic.
