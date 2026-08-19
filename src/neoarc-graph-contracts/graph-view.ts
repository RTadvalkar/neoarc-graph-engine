import type { GraphId, GraphProperties } from "./graph-model"

/**
 * Derived view concerns. These NEVER mutate canonical GraphModel facts.
 *
 * - GraphViewState  = user/session interaction state (selection, focus, filters…)
 * - GraphViewModel  = the derived, currently-visible graph produced by graph-core
 *
 * Keeping these distinct from GraphModel is a locked invariant.
 */

export type GraphLayoutId = string

export interface GraphViewport {
  readonly zoom?: number
  readonly pan?: { readonly x: number; readonly y: number }
}

export interface GraphFilterState {
  readonly nodeTypes?: readonly string[]
  readonly edgeTypes?: readonly string[]
  /** Local text query used for search highlighting over loaded data. */
  readonly query?: string
}

export interface GraphViewState {
  readonly selectedNodeIds: readonly GraphId[]
  readonly selectedEdgeIds: readonly GraphId[]
  readonly focusedNodeId?: GraphId
  /** Nodes hidden purely by view behavior (never removed from the model). */
  readonly hiddenNodeIds?: readonly GraphId[]
  /** Containers rendered collapsed; children are folded in the view only. */
  readonly collapsedContainerIds?: readonly GraphId[]
  readonly pinnedNodeIds?: readonly GraphId[]
  readonly filters?: GraphFilterState
  readonly layoutId?: GraphLayoutId
  readonly viewport?: GraphViewport
}

/** A node as it should currently appear. Purely derived. */
export interface GraphViewNode {
  readonly id: GraphId
  readonly type: string
  readonly label?: string
  readonly containerId?: GraphId
  readonly properties?: GraphProperties
  /** True when this node visually contains other nodes (compound). */
  readonly isContainer?: boolean
  readonly selected: boolean
  readonly focused: boolean
  readonly pinned: boolean
  readonly searchHighlighted: boolean
}

/** An edge as it should currently appear. Purely derived. */
export interface GraphViewEdge {
  readonly id: GraphId
  readonly type: string
  readonly source: GraphId
  readonly target: GraphId
  readonly label?: string
  readonly properties?: GraphProperties
  readonly selected: boolean
  readonly searchHighlighted: boolean
  /**
   * When this is an aggregate/meta-edge, the canonical edge ids it stands in
   * for. Aggregation must always retain references to the underlying facts.
   */
  readonly aggregatedEdgeIds?: readonly GraphId[]
}

export interface GraphViewModel {
  readonly nodes: readonly GraphViewNode[]
  readonly edges: readonly GraphViewEdge[]
  /** Revision of the GraphModel this view was derived from. */
  readonly sourceRevision?: number
}
