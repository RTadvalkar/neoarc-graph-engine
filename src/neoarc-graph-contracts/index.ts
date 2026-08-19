/**
 * neoarc-graph-contracts
 *
 * Renderer-neutral, domain-neutral graph contracts. This package MUST NOT
 * import any renderer (Cytoscape/Sigma/…), React, or product DTO. It is the
 * shared vocabulary every other layer depends on.
 */
export type {
  GraphId,
  GraphPropertyValue,
  GraphProperties,
  GraphNode,
  GraphEdge,
  GraphModel,
} from "./graph-model"

export type { GraphPatch } from "./graph-patch"

export type {
  GraphTone,
  GraphNodeShape,
  GraphEdgeLineStyle,
  GraphEdgeArrow,
  GraphPropertyDefinition,
  GraphNodeTypeDefinition,
  GraphEdgeTypeDefinition,
} from "./graph-type-definitions"
export { DEFAULT_NODE_SHAPE } from "./graph-type-definitions"

export type {
  GraphLayoutId,
  GraphViewport,
  GraphFilterState,
  GraphViewState,
  GraphViewNode,
  GraphViewEdge,
  GraphViewModel,
} from "./graph-view"

export type {
  GraphOverlayNodeState,
  GraphOverlayEdgeState,
  GraphOverlayCompleteness,
  GraphOverlay,
} from "./graph-overlay"

export type { GraphViewDescriptor } from "./graph-view-descriptor"

export type {
  GraphTraversalDirection,
  GraphQueryKind,
  GraphQueryRequest,
  GraphQueryResult,
} from "./graph-query"

export type {
  GraphSemanticEvent,
  GraphSemanticEventType,
  GraphSemanticEventHandler,
} from "./graph-events"
