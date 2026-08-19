# NeoArc Graph Engine — START HERE

This repository is a greenfield reusable NeoArc graph exploration component. It is **not** a TestCopilot-only Relationships page and it is **not** a Cytoscape demo.

## Product goal

Build a renderer-neutral, extensible graph exploration UX that can be reused for relationships, architecture, knowledge, impact visualization, provenance, dependencies, and similar graph surfaces.

Cytoscape.js is the first renderer implementation. The architecture must allow a future renderer such as Ogma, yFiles, Sigma/WebGL, or another engine to be plugged in without changing GraphModel, graph-core, product adapters, or graph UI contracts.

## Read order

Before implementation, read these files in order:

1. `docs/01_V0_PROJECT_INSTRUCTIONS.md`
2. `docs/02_ARCHITECTURE_BOUNDARIES.md`
3. Current slice prompt only
4. `docs/07_GATE_CHECKLIST.md`

Slices:

- `docs/03_G1_FOUNDATION.prompt.md`
- `docs/04_G2_EXPLORATION.prompt.md`
- `docs/05_G3_IMPACT_VISUALIZATION.prompt.md`
- `docs/06_G4_EXTENSIBILITY.prompt.md`

After G4, read `docs/08_V0_STOP_AND_CURSOR_HANDOFF.md`.

## Execution rule

Work **one slice at a time**. Do not start the next slice automatically.

For each slice:

1. Inspect existing code first.
2. Prepare a short implementation plan.
3. Implement only the current slice.
4. Run the minimal validations required by the prompt.
5. Summarize files changed, reusable APIs introduced, manual verification performed, and any architectural concern.
6. Stop for human review.

If a requested change would violate the architecture or requires changing a locked invariant, stop and explain rather than silently redesigning the system.

## Cost discipline

Use v0 primarily for reusable UI composition, graph interactions, stateful visual behavior, Cytoscape integration, and realistic showcase experiences.

Do **not** spend effort on exhaustive tests, long documentation, CI/CD, backend wiring, Neo4j/Cypher, auth, persistence, or visual pixel-polish unless explicitly requested.

Add automated tests only for behavior that is difficult or error-prone to validate manually, especially graph transformation invariants.

## First command to v0

Use Plan Mode and say:

> Read `docs/00_START_HERE.md`, `docs/01_V0_PROJECT_INSTRUCTIONS.md`, `docs/02_ARCHITECTURE_BOUNDARIES.md`, `docs/03_G1_FOUNDATION.prompt.md`, and `docs/07_GATE_CHECKLIST.md`. Treat them as authoritative. Plan G1 only. Do not begin G2. Then implement G1 and stop at the G1 human-review gate.
