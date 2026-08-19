# Stop v0 and Hand Off to Cursor

After G4 is approved, stop v0 feature development unless a genuinely missing UX concept is discovered.

## v0 should have delivered

```text
NeoArc Graph Engine
├─ renderer-neutral contracts
├─ GraphModel / GraphViewModel / GraphViewState separation
├─ extensible node/edge/property registries
├─ graph core
├─ arbitrary N-hop local exploration
├─ expand/collapse and compound groups
├─ filtering/search/focus
├─ layout abstraction
├─ semantic zoom
├─ minimap/navigation
├─ inspector and extension surfaces
├─ generic overlays
├─ impact visualization
├─ supporting-path visualization
├─ query intent seams
├─ Impact Report preview
├─ Cytoscape.js renderer v1
└─ Graph Lab
```

## Cursor/product integration owns next

- semantic hardening
- architecture audit
- public API/export cleanup
- documentation
- package boundaries
- performance profiling
- accessibility hardening
- production styling refinements
- TestCopilot adapters
- TestCopilot relationship APIs
- existing Impact Review integration
- Neo4j/query backend
- FAB tool/function calling
- auth/tenant context
- saved Impact Report persistence
- governance/approval integration
- renderer evaluation if Cytoscape scale becomes limiting

## Renderer replacement rule

A future `OgmaRenderer`, `yFilesRenderer`, `SigmaRenderer`, or another renderer must plug into the renderer adapter boundary.

Do not rewrite GraphModel, graph-core, product adapters, query result contracts, overlays, or graph UI semantics merely to change the renderer.

## Final handoff check

Before Cursor integration, confirm:

1. no Cytoscape types leaked into graph contracts/core/public reusable UI APIs
2. no TestCopilot-specific DTOs leaked into reusable roots
3. no canonical graph mutation occurs during view transformations
4. new node/edge types can be added via registry definitions
5. unknown types render safely
6. query/impact intelligence remains product/backend-owned
