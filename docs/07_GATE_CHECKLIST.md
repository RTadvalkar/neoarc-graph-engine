# v0 Gate Checklist

Use this checklist at the end of every slice.

## Architecture

- [ ] Reusable roots contain no TestCopilot generated DTO/API imports.
- [ ] No Neo4j/Cypher/APOC/GDS implementation entered the reusable library.
- [ ] No networking/auth/persistence was added to reusable graph components.
- [ ] Cytoscape-specific types remain inside the Cytoscape renderer package.
- [ ] `GraphModel` remains renderer-neutral.
- [ ] `GraphModel`, `GraphViewModel`, and `GraphViewState` remain distinct.
- [ ] Canonical node and edge identity is stable.
- [ ] Node and edge types remain open/extensible strings.
- [ ] Unknown types fail gracefully.
- [ ] View transforms do not mutate canonical graph facts.

## Interaction

- [ ] Reusable UI emits semantic intent rather than performing authoritative backend actions.
- [ ] Arbitrary N-hop is supported as a number, not a fixed enum.
- [ ] Local traversal is not represented as globally authoritative.
- [ ] Filters/focus/collapse/overlays operate as derived view state.
- [ ] Product-controlled extension seams remain available.

## Impact/query

When applicable:

- [ ] Impact is supplied, not inferred by the Graph Explorer.
- [ ] Supporting paths reflect supplied path facts.
- [ ] Completeness/truncation can be represented.
- [ ] Overlay application does not mutate GraphModel.
- [ ] GraphViewDescriptor is product-route-neutral.

## Quality

- [ ] `tsc --noEmit` passes.
- [ ] lint passes.
- [ ] existing tests pass.
- [ ] production build passes.
- [ ] basic browser smoke check completed.
- [ ] no unnecessary exhaustive tests added.
- [ ] no unrelated refactor or documentation expansion consumed scope.

## Human gate

At completion report:

```text
Slice:
Status:
Files changed:
Reusable APIs:
Manual verification:
Automated verification:
Architectural concerns:
Next slice started: NO
```

Do not start the next slice until explicitly approved.
