import type { GraphId } from "./graph-model"
import type {
  GraphExplorationFocus,
  GraphFilterState,
  GraphLayoutId,
  GraphViewport,
} from "./graph-view"
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
  /** "Open branch as focus": restrict the view to a local loaded-graph neighborhood. */
  | { readonly type: "graph.focus.explore"; readonly focus: GraphExplorationFocus }
  /** "Reset focus": clear the exploration-focus restriction. */
  | { readonly type: "graph.focus.reset" }
  | { readonly type: "graph.filters.change"; readonly filters: GraphFilterState }
  | { readonly type: "graph.layout.change"; readonly layoutId: GraphLayoutId }
  | { readonly type: "graph.viewport.change"; readonly viewport: GraphViewport }
  /**
   * Requests a supplied impact result from the host (authoritative). Forwarded
   * like expand/search/path — never fulfilled locally, no hidden fetch.
   */
  | { readonly type: "graph.impact.request"; readonly request: GraphQueryRequest }
  /* View-only overlay intents — fulfilled locally against GraphViewState.overlay. */
  | { readonly type: "graph.overlay.setActive"; readonly overlayIds?: readonly string[] }
  | { readonly type: "graph.overlay.show"; readonly show: boolean }
  | { readonly type: "graph.overlay.showPaths"; readonly show: boolean }
  | { readonly type: "graph.overlay.restrictToOverlayFocus"; readonly restrict: boolean }
  | { readonly type: "graph.overlay.selectPath"; readonly pathId?: string }
  | { readonly type: "graph.overlay.clear" }

export type GraphSemanticEventType = GraphSemanticEvent["type"]

/** Handler a host installs to receive intents from UI/renderer. */
export type GraphSemanticEventHandler = (event: GraphSemanticEvent) => void
