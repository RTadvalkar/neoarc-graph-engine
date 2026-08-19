# G2 — Complex Graph Exploration

# Default layout quality and mental-map preservation

The current G1 showcase proves renderer functionality but its default breadth-first layout is too compressed for
realistic multi-service relationship graphs.

During G2:

Add cytoscape-fcose behind the existing Cytoscape renderer boundary and make a tuned fCoSE-based Explore layout the
preferred/default layout for complex compound relationship graphs.
Keep Hierarchy/breadth-first as an alternate layout for tree/DAG-oriented views.
Tune layout spacing for readability, including node separation, node repulsion, ideal edge length, compound nesting,
padding, and label dimensions where supported.
Evaluate component packing where useful for disconnected components.
Aim to avoid node/group overlap and reduce unnecessary edge crossing. Do not claim arbitrary dense graphs can always be
crossing-free.
Preserve the user's mental map during expansion/collapse. Existing visible nodes should retain positions where
practical; newly expanded nodes should enter near the expansion anchor rather than causing a full-graph reshuffle.
Do not persist coordinates to backend/storage in this slice.
Replace the current topology-change “remove all → rebuild all → full layout” behavior where necessary with incremental
graph element updates that preserve existing positions.
Remove the current Cytoscape wheelSensitivity: 0.2 override and use the normal/default wheel sensitivity unless browser
verification proves another value is clearly better.
Keep all fCoSE/Cytoscape-specific configuration entirely inside neoarc-graph-cytoscape. GraphRenderer, Graph UI and
graph contracts must remain renderer-neutral.

Manual browser verification is sufficient for layout cleanliness, wheel zoom feel and interaction quality. Add automated
tests only where position/identity/canonical-graph invariants would otherwise be difficult to verify.

## Entry

Begin only after explicit G1 approval.

## Objective

Turn the graph canvas into a reusable enterprise relationship explorer while preserving canonical graph facts.

Do **not** begin G3.

## Arbitrary N-hop exploration

The contract must support:

```ts
maxHops: number
```

Never use a fixed `1 | 2 | 3` type.

The UI may provide presets such as 1, 2, 3, 5, 10 and Custom, but the contract must support arbitrary N.

Support:

```text
incoming
outgoing
both
```

Local N-hop traversal is explicitly scoped to the **loaded graph**.

Do not claim global completeness unless an externally supplied result says so.

## Exploration interactions

Implement reusable interactions for:

```text
focus selected
expand neighbors
expand incoming
expand outgoing
expand N hops
collapse
expand group
collapse group
open branch as focus
reset focus
```

Expansion that would require additional authoritative data must emit a semantic request such as:

```text
graph.expand.request
```

Graph Lab may simulate the product returning a `GraphPatch`.

The reusable component must not fetch.

## Compound groups

Demonstrate microservice/application grouping.

A service can contain requirements, capabilities, APIs, entities, stories, tests, findings, and similar children.

Collapsing a group must reduce visual complexity without deleting canonical graph data.

## Collapse and aggregation

When a group is collapsed, cross-boundary relationships may be represented as derived aggregate/meta-edges.

Derived edges must retain references to underlying canonical edge IDs.

Expanding again must restore the original relationships.

## Mental map

Favor local/incremental layout behavior:

- preserve existing positions where practical
- keep selected/focus nodes stable
- place new nodes near the expansion point
- support pin/unpin in view state if practical
- avoid full graph reshuffle on every interaction

Do not sacrifice architecture for perfect layout polish.

## Search

Support:

### Loaded graph search
Instant local search over loaded graph data.

### Global search request seam
Emit a semantic intent such as:

```text
graph.search.request
```

for the product/backend to fulfill later.

## Filters

Support reusable filters for:

```text
node type
edge type
status
facets
selected properties
```

Filtering changes view state only.

It must not remove canonical data.

## Layouts

Keep the initial layout set small and useful.

At minimum demonstrate:

- force/compound-friendly layout
- hierarchical layout

Keep layout selection behind a renderer-neutral abstraction.

## Semantic zoom

Introduce type-driven semantic zoom behavior.

Conceptually:

```text
high zoom   → richer node
medium      → icon + label
low         → compact identity
very low    → group/service emphasis
```

Do not hard-code TestCopilot node types.

## Navigation aids

Provide useful Graph Explorer composition for:

- minimap
- fit
- zoom
- fullscreen where practical
- legend
- search
- filters
- layout
- focus

## Graph Lab scenarios

Keep fixtures focused:

1. requirement neighborhood
2. multi-service architecture
3. deep N-hop dependency graph
4. collapsed service graph
5. dense cross-service graph

Do not create dozens of fixtures.

## Automated validation

Run existing typecheck/lint/tests/build.

Add tests only for difficult invariants:

1. N-hop traversal correctness for arbitrary N over loaded graph
2. incoming/outgoing traversal correctness
3. collapse → expand preserves canonical graph
4. aggregate/meta-edge references correct underlying edges
5. selected identity survives view transformations

Manual smoke-check visual interaction.

## G2 exit

Finish with:

```text
G2_EXPLORATION_READY_FOR_HUMAN_REVIEW
```

Then stop. Do not begin G3.
