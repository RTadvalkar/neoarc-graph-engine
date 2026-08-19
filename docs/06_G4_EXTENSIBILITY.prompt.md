# G4 — Extensibility Proof

## Entry

Begin only after explicit G3 approval.

## Objective

Prove the project is a reusable graph platform primitive, not a hard-coded TestCopilot relationship screen.

## Runtime type catalog

Demonstrate adding a completely new node type through data/configuration only.

Example:

```text
Deployment
```

The type definition should be able to influence supported declarative presentation such as:

```text
display name
icon key
shape
tone
property schema
status mapping
semantic zoom rules
capabilities
```

No Graph Explorer core edit should be required for the new type.

## Edge type catalog

Demonstrate adding a new edge type through configuration only.

Example:

```text
streamsTo
```

It should render, filter, inspect, and participate in local traversal without core changes.

## Properties

Keep raw node/edge properties extensible.

Use `GraphPropertyDefinition` or equivalent to interpret/display configured properties such as:

```text
owner
confidence
version
risk
changeSet
source
lastModified
```

Unknown properties should not crash the inspector.

## Facets

Avoid combinatorial node types.

Prefer:

```text
type: requirement
facets: [security, approved, high-impact]
```

rather than creating a different type for every status/category combination.

Type + status + facets may influence presentation through controlled rules.

## Unknown type fallback

Demonstrate a node and edge type absent from the registry.

They must:

- render generically
- remain selectable
- show raw/basic properties
- keep relationships usable
- not crash filters/search

## Extension surfaces

Provide lightweight extension seams for product-specific composition, for example:

```text
graph.toolbar.actions

graph.inspector.overview
graph.inspector.properties
graph.inspector.relationships
graph.inspector.evidence
graph.inspector.trace

graph.node.actions
graph.edge.actions
```

Exact API can differ, but reusable graph code must not know product actions such as “Open Requirement” or “View Change Set”.

## Renderer boundary proof

Graph Lab should make the integration seams inspectable, for example:

```text
GraphModel
GraphViewState
GraphViewModel
Renderer: Cytoscape.js
Latest semantic Graph UI Event
```

Do not build a second renderer.

Instead prove structurally and through types that no Cytoscape object leaks into contracts/core/UI public APIs.

## Accessible alternate representation

Add a basic non-canvas path to inspect graph information, such as:

```text
Graph | List
```

or an accessible node/relationship list tied to search/selection.

Do not attempt full accessibility certification in v0.

## Optional scale fixtures

If cheap to add, Graph Lab may include:

```text
~100 nodes
~500 nodes
~2000 nodes
```

for manual observation.

Do not spend substantial credits benchmarking or optimizing. Record obvious issues instead.

## Automated validation

Run existing typecheck/lint/tests/build.

Do not add broad new tests.

Only add a focused test if required to prove:

- new types work without core modifications
- renderer-neutral public boundary remains clean
- fallback resolution is deterministic

## G4 exit

Finish with:

```text
G4_EXTENSIBILITY_READY_FOR_HUMAN_REVIEW
```

Stop v0 feature development after human approval unless explicitly asked for a missing UX concept.
