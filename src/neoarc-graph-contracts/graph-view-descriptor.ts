import type { GraphModel } from "./graph-model"
import type { GraphOverlay } from "./graph-overlay"
import type { GraphNodeTypeDefinition, GraphEdgeTypeDefinition } from "./graph-type-definitions"
import type { GraphViewState } from "./graph-view"

/**
 * A self-contained, product-route-neutral description of a graph view: the
 * facts, the type definitions to present them with, optional overlays, and an
 * optional initial view state. A product can hand one of these to the Graph
 * Explorer without exposing any routing/backend detail.
 */
export interface GraphViewDescriptor {
  /** Optional stable id for this view (product-defined). */
  readonly id?: string
  /** Optional human-readable title for the view. */
  readonly title?: string
  readonly model: GraphModel
  readonly nodeTypes?: readonly GraphNodeTypeDefinition[]
  readonly edgeTypes?: readonly GraphEdgeTypeDefinition[]
  readonly overlays?: readonly GraphOverlay[]
  /**
   * Active overlay selection lives in `initialViewState.overlay.activeOverlayIds`
   * — deliberately not duplicated as a root-level field.
   */
  readonly initialViewState?: Partial<GraphViewState>
  /** When true, the explorer fits the graph to the viewport on load. */
  readonly fitOnLoad?: boolean
}
