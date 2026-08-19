import type { GraphId } from "./graph-model"

/**
 * Structured provenance for a change set. `kind` is an open string (e.g.
 * "agent", "user", "sync") so any domain can attach its own provenance
 * without a contract change. Never a bare string — callers that need
 * multiple simultaneous provenances (agent + run + mission) can supply
 * several `GraphChangeSetSource` entries via `GraphChangeSet.sourceRefs`.
 */
export interface GraphChangeSetSource {
  readonly kind: string
  readonly id?: string
  readonly label?: string
}

/**
 * Minimal structured reference to a node that no longer resolves in the
 * current `GraphModel`. Captured before removal so a UI can still describe
 * what was removed after the canonical data is gone.
 */
export interface GraphChangeSetNodeRef {
  readonly id: GraphId
  readonly type: string
  readonly label?: string
}

/** Minimal structured reference to a removed edge, same rationale as above. */
export interface GraphChangeSetEdgeRef {
  readonly id: GraphId
  readonly type: string
  readonly source: GraphId
  readonly target: GraphId
  readonly label?: string
}

/**
 * Renderer-neutral, domain-neutral description of what a `GraphPatch`
 * changed, derived against the pre-patch `GraphModel`. This is NOT a visual
 * overlay (see `GraphOverlay`) — it exists so a host can render a structured
 * "what changed" summary without repurposing selection or inferring change
 * semantics that were not supplied.
 */
export interface GraphChangeSet {
  readonly id: string
  readonly fromRevision?: number
  readonly toRevision?: number
  readonly addedNodeIds?: readonly GraphId[]
  readonly updatedNodeIds?: readonly GraphId[]
  readonly removedNodeIds?: readonly GraphId[]
  readonly removedNodeRefs?: readonly GraphChangeSetNodeRef[]
  readonly addedEdgeIds?: readonly GraphId[]
  readonly updatedEdgeIds?: readonly GraphId[]
  readonly removedEdgeIds?: readonly GraphId[]
  readonly removedEdgeRefs?: readonly GraphChangeSetEdgeRef[]
  readonly sourceRefs?: readonly GraphChangeSetSource[]
}
