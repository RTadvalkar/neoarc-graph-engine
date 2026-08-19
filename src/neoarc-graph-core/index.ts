/**
 * neoarc-graph-core
 *
 * Pure graph/view behavior and extension registries. Depends only on
 * graph-contracts. No React, no Cytoscape, no networking.
 */
export { Registry } from "./registry"

export {
  createGraphRegistries,
  fallbackNodeTypeDefinition,
  fallbackEdgeTypeDefinition,
  humanizeType,
} from "./registries"
export type {
  GraphIconDefinition,
  GraphPropertyFormatter,
  GraphNodeRendererDefinition,
  GraphActionTarget,
  GraphActionDefinition,
  GraphRegistries,
  CreateRegistriesInput,
  NodeTypeRegistry,
  EdgeTypeRegistry,
  IconRegistry,
  PropertyFormatterRegistry,
  NodeRendererRegistry,
  GraphActionRegistry,
} from "./registries"

export { buildViewModel } from "./view-model"

export {
  createInitialViewState,
  selectNode,
  selectEdge,
  clearSelection,
  setLayout,
  toggleContainerCollapsed,
  setFilters,
} from "./view-state"
