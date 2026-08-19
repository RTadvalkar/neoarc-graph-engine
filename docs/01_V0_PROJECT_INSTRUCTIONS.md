# v0 Project Instructions

## Mission

Build **NeoArc Graph Engine**, a reusable graph exploration component for NeoArc products.

The reusable library must remain domain-neutral. TestCopilot will be the first consumer, but the library must not contain TestCopilot DTOs, routes, backend clients, auth, tenancy, Neo4j types, or product-specific business rules.

## Architecture principles

1. **Cytoscape.js is a renderer, not the source of truth.**
2. Keep `GraphModel`, `GraphViewModel`, and `GraphViewState` separate.
3. Keep renderer-specific types behind a `GraphRendererAdapter` boundary.
4. `GraphNode.type` and `GraphEdge.type` are open strings, not closed product enums.
5. New node types, edge types, icons, properties, and appearance rules must be data-driven through registries.
6. Unknown node/edge types must render safely through generic fallback behavior.
7. Collapse, aggregation, semantic zoom, filtering, focus, and overlays never mutate canonical graph facts.
8. Product/backends own authoritative querying, impact logic, networking, auth, persistence, and governance.
9. Reusable UI emits typed semantic intent events; the product decides how to fulfill them.
10. Do not embed backend query execution inside the reusable graph component.

## Intended reusable roots

Prefer a structure converging toward:

```text
src/
  neoarc-graph-contracts/
  neoarc-graph-core/
  neoarc-graph-renderer/
  neoarc-graph-cytoscape/
  neoarc-graph-ui/

components/showcase/
  graph-lab/
  impact-analysis/
```

Exact file names may evolve, but dependency direction must remain clean.

## Controlled integration model

Direct path:

```text
Authoritative product data
       ↓
Product adapter
       ↓
GraphModel
       ↓
Graph Explorer
```

Query/result path:

```text
Product query / impact backend
       ↓
GraphQueryResult / Impact result
       ↓
Product adapter
       ↓
GraphModel + GraphOverlay + GraphViewDescriptor
       ↓
Graph Explorer
```

The graph component does not execute Neo4j or impact logic.

## Extensibility

Provide registry-driven extension seams for:

- node types
- edge types
- icons
- property formatting
- node renderers
- graph actions
- inspector surfaces
- toolbar actions

Custom renderers are an escape hatch, not the default mechanism.

## Interaction semantics

Semantic events may include concepts such as:

- `graph.node.select`
- `graph.edge.select`
- `graph.expand.request`
- `graph.collapse`
- `graph.search.request`
- `graph.path.request`
- `graph.focus.change`
- `graph.filters.change`
- `graph.layout.change`

Names can be refined, but intent must remain product-controlled.

## N-hop rule

The contract supports arbitrary N:

```ts
maxHops: number
```

Never encode a fixed `1 | 2 | 3` union.

The UI may provide presets, but the contract remains arbitrary N.

## Testing discipline

Do not create tests merely because components exist.

Add automated tests only for graph behavior that is difficult to verify manually, such as:

- N-hop traversal correctness
- incoming/outgoing traversal correctness
- canonical graph immutability
- collapse/expand round-trip integrity
- aggregate/meta-edge membership
- atomic patch application
- stable selection identity across view transforms
- supplied overlay/path integrity

Manual smoke checks are sufficient for ordinary UI controls, visual hierarchy, pan/zoom, themes, and basic component rendering.

## v0 scope exclusion

Do not implement:

- TestCopilot APIs
- Neo4j
- Cypher/APOC/GDS
- impact calculation
- LLM/FAB orchestration
- tenant/auth logic
- persistence
- Impact Report backend
- CI/CD
- package publishing
- exhaustive documentation
- broad refactoring unrelated to the current slice
