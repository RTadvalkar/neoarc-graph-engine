# Architecture Boundaries

## Canonical layers

```text
AUTHORITATIVE PRODUCT / BACKEND
        ↓
NORMALIZED GRAPH CONTRACTS
        ↓
GRAPH CORE
        ↓
GRAPH VIEW MODEL / VIEW STATE
        ↓
GRAPH RENDERER ADAPTER
        ↓
CYTOSCAPE.JS RENDERER V1
        ↓
GRAPH UI / SHOWCASE
```

## Layer responsibilities

### `neoarc-graph-contracts`

Owns renderer-neutral normalized contracts such as:

- `GraphModel`
- `GraphNode`
- `GraphEdge`
- `GraphPatch`
- `GraphNodeTypeDefinition`
- `GraphEdgeTypeDefinition`
- `GraphPropertyDefinition`
- `GraphViewState`
- `GraphViewModel`
- `GraphOverlay`
- `GraphViewDescriptor`
- `GraphQueryRequest`
- `GraphQueryResult`

No Cytoscape imports.

### `neoarc-graph-core`

Owns pure graph/view behavior:

- local traversal
- filtering
- focus
- local search
- N-hop exploration over loaded graph
- collapse/expand view transforms
- aggregation/meta-edges
- path highlighting
- patch application
- stable identity handling

No React or Cytoscape dependency where practical.

### `neoarc-graph-renderer`

Owns the renderer abstraction.

The public seam must not expose Cytoscape objects.

### `neoarc-graph-cytoscape`

Owns all Cytoscape-specific mapping:

- Cytoscape elements
- Cytoscape stylesheet translation
- layouts
- viewport operations
- semantic zoom implementation
- compound-node rendering
- renderer event bridging

Future renderers plug in beside this package.

### `neoarc-graph-ui`

Owns reusable UI composition:

- Graph Explorer shell
- toolbar
- search
- filters
- legend
- minimap shell/integration
- inspector shell
- impact overlay controls
- accessible alternate/list representation

No backend networking.

## Canonical facts vs derived view

Never mutate `GraphModel` for UI behavior.

Examples of **derived view state**:

- hidden due to filter
- collapsed under a group
- aggregate/meta-edge
- selected
- focused
- pinned
- impact highlighted
- semantic zoom state
- search highlight

These belong to `GraphViewModel`, `GraphViewState`, or overlays.

## Containment vs relationships

Visual containment is not the same as semantic membership.

Use a renderer-neutral containment concept such as `containerId` or equivalent for visual grouping.

Relationships such as `partOf`, `implementedBy`, `ownedBy`, or `belongsTo` remain normal graph edges.

## Edge identity

Every edge has stable authoritative identity.

Never deduplicate only by source + target because parallel relationships are valid:

```text
A --supports--> B
A --dependsOn--> B
A --cites--> B
```

Cycles, self-loops, and parallel edges must not break the model.

## Renderer independence

The Graph Explorer should be able to add a future:

```text
OgmaRenderer
yFilesRenderer
SigmaRenderer
```

without changing:

- GraphModel
- graph-core
- product adapters
- query/impact contracts
- reusable Graph UI APIs

No second renderer is required during v0 work. Prove the boundary through structure and types.

## Query boundary

The Graph Explorer is **query-aware**, not the authoritative query engine.

Local operations over loaded graph are allowed.

Authoritative global operations belong to product/backend services:

- impact analysis
- global relationship search
- authoritative N-hop traversal
- blast radius
- authoritative shortest/causal path
- persistence and approval

The reusable library emits query intent and consumes returned results.

## Security

The reusable component is not an authorization boundary.

Products determine what nodes, edges, properties, and topology the user is authorized to receive.

## Impact overlays

Impact is supplied by an external authoritative result.

Graph overlays must not infer impact.

The same overlay architecture should later support risk, search, change sets, provenance, security, or test coverage.

## Node visual definition boundary

Node appearance is part of the renderer-neutral type catalog.

`GraphNodeTypeDefinition` may declaratively define:

- semantic shape
- icon key
- tone
- size
- border treatment
- label rules
- semantic zoom behavior

These are semantic visual descriptors, not Cytoscape configuration.

Renderer-specific mapping belongs only inside the renderer implementation.

Node records should normally reference a node type and optional status/facets rather than carrying arbitrary renderer
styling.

Example:

type: requirement
status: approved
facets: [security]

The type catalog and visual rules decide how this appears.

A node type such as `Deployment` must be able to change from rectangle to hexagon through configuration without changing
graph-core.
