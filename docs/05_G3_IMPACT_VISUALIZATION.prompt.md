# G3 — Query-Aware Impact Visualization

## Entry

Begin only after explicit G2 approval.

## Objective

Make NeoArc Graph Engine consume and visualize externally supplied query/impact results.

The existing product/backend is authoritative for impact calculation and graph querying.

**Do not implement an impact algorithm.**

Do **not** begin G4.

## Architecture

```text
Authoritative product impact/query result
        ↓
Product adapter
        ↓
GraphModel
+ GraphOverlay
+ GraphViewDescriptor
        ↓
NeoArc Graph Explorer
```

## Query-aware contracts

Keep graph query/result contracts renderer-neutral and lightweight.

The reusable component may emit intents such as:

```text
graph.expand.request
graph.search.request
graph.path.request
graph.impact.request
```

but must not execute Neo4j, Cypher, APIs, or backend logic.

## Generic overlay model

Create/use a generic `GraphOverlay` abstraction.

Impact must be one overlay kind, not a hard-coded mutation of node data.

Demonstrate impact states such as:

```text
root
direct impact
transitive impact
potential impact
no impact
supporting path
```

Only render impact facts that are supplied.

Do not infer impact, confidence, evidence, or severity.

## Impact Analysis showcase

Create `/impact-analysis`.

Use the representative scenario:

> Introduce Spring AI in Intelligence Service.

Mock an externally supplied impact result containing enough structure to explain and visualize affected:

- services
- capabilities
- requirements
- features/stories
- tests
- supporting relationship paths

The showcase should feel like a realistic result a FAB/backend flow could open.

## Impact graph behavior

Provide:

```text
focus impacted only
show/hide impact overlay
show/hide supporting paths
select impacted node
inspect reason/hop/path
expand surrounding context
clear overlay
```

The main graph remains the same canonical graph underneath the overlay.

## Supporting path visualization

If the supplied result says:

```text
Intelligence Service
  → relationship
Knowledge Retrieval
  → relationship
ACP
```

highlight that exact supplied path.

Do not calculate or invent an alternative explanation path.

## Completeness and truncation

The UI must be able to represent supplied result metadata such as:

```text
complete
truncated
effective hops
additional relationships available
graph revision
```

Do not silently imply completeness.

## GraphViewDescriptor

Use a renderer-neutral descriptor sufficient for a product to open a graph view from FAB or another surface.

It may include concepts such as:

```text
anchors
selected node
overlay IDs/data
focus
layout
fit strategy
```

Do not hard-code TestCopilot URLs/routes in reusable code.

## Impact Report preview

Create a showcase-only preview of:

```text
Analyze
→ View graph
→ Save Impact Report
→ Impact Report preview
```

No persistence.

The report preview may show supplied semantic information such as:

- change intent
- root entities
- graph revision
- policy/version if supplied
- affected entities
- supporting paths
- completeness/truncation
- evidence references
- generated summary

Do not treat canvas coordinates as report semantics.

Demonstrate a stale-report state where the current graph revision differs from the revision used to generate the report.

## Automated validation

Run existing typecheck/lint/tests/build.

Add only difficult invariant tests:

1. overlay application does not mutate GraphModel
2. overlay entity refs use stable identity
3. supporting path highlights only supplied path IDs/edges

Do not test impact calculation because this project does not own it.

## G3 exit

Finish with:

```text
G3_IMPACT_VISUALIZATION_READY_FOR_HUMAN_REVIEW
```

Then stop. Do not begin G4.
