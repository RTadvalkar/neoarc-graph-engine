# G1 — Foundation + Renderer Architecture

## Objective

Create the reusable architecture and prove Cytoscape.js can operate behind a replaceable renderer boundary.

Do **not** begin G2.

## Build

Converge toward:

```text
src/
  neoarc-graph-contracts/
  neoarc-graph-core/
  neoarc-graph-renderer/
  neoarc-graph-cytoscape/
  neoarc-graph-ui/

components/showcase/
  graph-lab/
```

Use the existing Next/v0 scaffold only as showcase/application infrastructure.

## Contracts

Create the minimum useful renderer-neutral contracts for:

```text
GraphModel
GraphNode
GraphEdge
GraphPatch

GraphNodeTypeDefinition
GraphEdgeTypeDefinition
GraphPropertyDefinition

GraphViewState
GraphViewModel

GraphOverlay
GraphViewDescriptor

GraphQueryRequest
GraphQueryResult
```

Do not over-model speculative future fields.

Required principles:

- stable string IDs
- `GraphNode.type: string`
- `GraphEdge.type: string`
- optional property bag
- stable edge identity
- no Cytoscape types in contracts
- support unknown types safely

## Registries

Create lightweight registries/seams for:

```text
NodeTypeRegistry
EdgeTypeRegistry
IconRegistry
PropertyFormatterRegistry
NodeRendererRegistry
GraphActionRegistry
```

Prefer declarative visual definitions over custom renderers.

## Renderer boundary

Introduce `GraphRendererAdapter` or equivalent.

Cytoscape-specific types/instances must not escape the Cytoscape package.

Future renderers must be able to implement the same seam.

## Cytoscape renderer v1

Use Cytoscape.js as the initial renderer.

Prove:

- pan
- zoom
- fit
- node selection
- edge selection
- compound/group nodes
- relationships crossing groups
- at least two useful layouts
- type-driven node styling
- type-driven edge styling
- renderer events mapped back to renderer-neutral semantic events

Do not prematurely implement every Cytoscape feature or extension.

## Graph Lab v1

Create `/graph-lab`.

Use a realistic multi-service software architecture fixture, not a toy social graph.

Include examples of:

```text
Application
Microservice
Requirement
Capability
API
Entity
Story/Feature
Test Case
Finding
External System
```

Use several services and relationships crossing service boundaries.

Include a simple reusable inspector seam for selected nodes/edges.

Demonstrate an unknown node type and unknown edge type fallback.

## Manual smoke checks

Manually verify:

- route renders
- pan/zoom/fit work
- node and edge selection work
- compound groups render
- layout switching works
- unknown types do not crash

## Automated validation

Run existing:

```text
tsc --noEmit
eslint
existing tests
next build
```

Add only minimal new tests for:

1. canonical GraphModel is not mutated by renderer/view adaptation
2. unknown node/edge types resolve to fallback behavior

Do not build a large test suite.

## G1 exit

Finish with:

```text
G1_FOUNDATION_READY_FOR_HUMAN_REVIEW
```

Report:

- files changed
- reusable contracts
- renderer seam
- Cytoscape isolation evidence
- manual checks
- automated checks
- any concern

Then stop. Do not begin G2.
