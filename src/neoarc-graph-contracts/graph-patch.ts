import type { GraphEdge, GraphId, GraphNode } from "./graph-model"

/**
 * A supplied, atomic mutation of a GraphModel. Products emit patches in
 * response to expansion/search results. `baseRevision` allows a consumer to
 * reject stale patches. Patch *application* logic lives in graph-core; the
 * contract only describes the shape.
 */
export interface GraphPatch {
  /** Revision the patch was computed against, for stale-write detection. */
  readonly baseRevision?: number
  /** Revision the model should report after the patch applies. */
  readonly resultRevision?: number
  readonly addNodes?: readonly GraphNode[]
  readonly updateNodes?: readonly GraphNode[]
  readonly removeNodeIds?: readonly GraphId[]
  readonly addEdges?: readonly GraphEdge[]
  readonly updateEdges?: readonly GraphEdge[]
  readonly removeEdgeIds?: readonly GraphId[]
}
