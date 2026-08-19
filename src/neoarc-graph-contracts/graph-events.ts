import type { GraphId } from "./graph-model"
import type { GraphFilterState, GraphLayoutId, GraphViewport } from "./graph-view"
import type { GraphQueryRequest } from "./graph-query"

/**
 * Renderer-neutral, product-controlled semantic intents. Renderers translate
 * raw input (a Cytoscape tap, a wheel zoom) into these; reusable UI translates
 * user actions into these; the product decides how to fulfill the ones that
 * require authoritative data (expand/search/path/impact). No hidden fetches.
 */
export type GraphSemanticEvent =
  | { readonly type: "graph.node.select"; readonly nodeId: GraphId; readonly additive?: boolean }
  | { readonly type: "graph.edge.select"; readonly edgeId: GraphId; readonly additive?: boolean }
  | { readonly type: "graph.selection.clear" }
  | { readonly type: "graph.background.tap" }
  | { readonly type: "graph.expand.request"; readonly request: GraphQueryRequest }
  | { readonly type: "graph.search.request"; readonly request: GraphQueryRequest }
  | { readonly type: "graph.path.request"; readonly request: GraphQueryRequest }
  | { readonly type: "graph.collapse"; readonly containerId: GraphId }
  | { readonly type: "graph.expand"; readonly containerId: GraphId }
  | { readonly type: "graph.focus.change"; readonly nodeId?: GraphId }
  | { readonly type: "graph.filters.change"; readonly filters: GraphFilterState }
  | { readonly type: "graph.layout.change"; readonly layoutId: GraphLayoutId }
  | { readonly type: "graph.viewport.change"; readonly viewport: GraphViewport }

export type GraphSemanticEventType = GraphSemanticEvent["type"]

/** Handler a host installs to receive intents from UI/renderer. */
export type GraphSemanticEventHandler = (event: GraphSemanticEvent) => void
