# Learning Materials

This repo is **Track A: MF boundary + testing mastery**.

It teaches how a shell orchestrates team-owned remotes through contracts — and how to test that boundary at every layer.

## Start here

| Doc | What you get |
|---|---|
| [Fundamentals walkthrough](./fundamentals-walkthrough.md) | **Start here if you're new to MF** — concepts, repo file map, mermaid diagrams |
| [Contract-first curriculum](./contract-first-curriculum.md) | Build order: schema → contract tests → remotes → integration → E2E |
| [Workshop labs](./workshop-labs.md) | Hands-on labs with checkpoints (break things on purpose, then fix) |
| [Testing strategy](../README.md#testing-strategy) | Layer boundaries, CI guidance, anti-patterns (in main README) |

## Suggested order

1. Read **Fundamentals walkthrough** (Parts 1–10)
2. Run the app (`npm run dev`) and follow along in the browser
3. Do **Contract-first curriculum** exercises
4. Try **Workshop labs** for break/fix practice

## What this repo covers

- Shell-first MF boundary design
- Contract-driven communication between remotes
- Deterministic fault injection and resilience testing
- A testing pyramid mapped to shell orchestration

## Track B (optional, later)

Runtime mechanics — routing composition, version skew, shared dependency contracts — for when you need independent deploy cadence and runtime compatibility management.

Common triggers:
- Team A deploys without redeploying the shell
- Remote B runs a different major version
- Shared library instances conflict at runtime
