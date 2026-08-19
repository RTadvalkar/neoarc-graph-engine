import type { GraphId, GraphProperties } from "./graph-model"
import type { GraphTraversalDirection } from "./graph-query"
import type { GraphAppliedOverlayEdgeState, GraphAppliedOverlayNodeState } from "./graph-overlay"

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
  /** Open string vocabulary read from `GraphNode.properties.status`. */
  readonly statuses?: readonly string[]
  /** Open string vocabulary read from `GraphNode.properties.facets`. */
  readonly facets?: readonly string[]
  /** Local text query used for search highlighting over loaded data. */
  readonly query?: string
}

/**
 * Restricts the visible graph to a local, loaded-graph-only neighborhood
 * around a root node ("open branch as focus"). This is purely a derived view
 * transform — it never fetches and never claims global completeness; nodes
 * outside the neighborhood remain in `GraphModel`, just hidden from the view.
 */
export interface GraphExplorationFocus {
  readonly nodeId: GraphId
  readonly maxHops: number
  readonly direction: GraphTraversalDirection
}

/**
 * Derived view-only overlay controls. Same tier as `filters` — never a
 * canonical fact. Each concern is independently gated:
 *
 * - state presentation is controlled by `showOverlay`
 * - supporting-path presentation by `showPaths` (+ optional `activePathId`)
 * - focus restriction by `restrictToOverlayFocus`
 *
 * so hiding state presentation never disables paths or focus restriction, and
 * never suppresses freshness / unresolved-reference metadata.
 */
export interface GraphOverlayViewState {
  /**
   * Which supplied overlays are active. LOCKED semantics:
   * - `undefined` → all supplied overlays active (default)
   * - `[]`        → explicitly none active (distinct from undefined)
   */
  readonly activeOverlayIds?: readonly string[]
  /** Hide/show overlay node/edge STATE presentation only. Default: shown. */
  readonly showOverlay?: boolean
  /** Hide/show supplied supporting paths. Independent of `showOverlay`. */
  readonly showPaths?: boolean
  /** When set, restrict path emphasis to this single supplied path id. */
  readonly activePathId?: string
  /**
   * Restrict the visible graph to the active overlays' supplied focus id set
   * (`focusNodeIds`/`focusEdgeIds`). Generic name; a product may surface it as
   * "Impacted only". Independent of `showOverlay`.
   */
  readonly restrictToOverlayFocus?: boolean
}

export interface GraphViewState {
  readonly selectedNodeIds: readonly GraphId[]
  readonly selectedEdgeIds: readonly GraphId[]
  readonly focusedNodeId?: GraphId
  /** Local "open branch as focus" neighborhood restriction; see above. */
  readonly explorationFocus?: GraphExplorationFocus
  /** Nodes hidden purely by view behavior (never removed from the model). */
  readonly hiddenNodeIds?: readonly GraphId[]
  /** Containers rendered collapsed; children are folded in the view only. */
  readonly collapsedContainerIds?: readonly GraphId[]
  readonly pinnedNodeIds?: readonly GraphId[]
  readonly filters?: GraphFilterState
  /** Derived overlay view controls (impact/search/risk presentation). */
  readonly overlay?: GraphOverlayViewState
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
  /** True when a container's children are currently folded in the view. */
  readonly collapsed?: boolean
  readonly selected: boolean
  readonly focused: boolean
  readonly pinned: boolean
  readonly searchHighlighted: boolean
  /**
   * Supplied overlay states applied to this node (from active overlays, when
   * `showOverlay !== false`). Multiple overlays may contribute; all are
   * retained in supplied order with no precedence inference.
   */
  readonly overlays?: readonly GraphAppliedOverlayNodeState[]
  /** Supplied supporting-path ids this node participates in (view-only). */
  readonly onSupportingPathIds?: readonly string[]
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
  /**
   * Supplied overlay states applied to this edge. A state matches when its
   * `edgeId` equals this edge's `id` OR appears in `aggregatedEdgeIds`, so a
   * canonical edge reference still lights up a collapsed meta-edge. All
   * matching states are retained (`viaEdgeId` records how each matched); no
   * semantic precedence is inferred between them.
   */
  readonly overlays?: readonly GraphAppliedOverlayEdgeState[]
  /** Supplied supporting-path ids this edge participates in (view-only). */
  readonly onSupportingPathIds?: readonly string[]
}

export interface GraphViewModel {
  readonly nodes: readonly GraphViewNode[]
  readonly edges: readonly GraphViewEdge[]
  /** Revision of the GraphModel this view was derived from. */
  readonly sourceRevision?: number
}
