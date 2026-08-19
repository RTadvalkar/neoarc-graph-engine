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

export { applyOverlays, resolveOverlayFreshness } from "./overlay"
export type { ApplyOverlaysResult } from "./overlay"

export { localNeighborhood } from "./traversal"
export type { LocalNeighborhoodOptions } from "./traversal"

export { applyGraphPatch } from "./graph-patch"
export type { GraphPatchApplicationStatus, GraphPatchApplicationResult } from "./graph-patch"

export { deriveGraphChangeSet } from "./graph-change-set"

export {
  createInitialViewState,
  selectNode,
  selectEdge,
  clearSelection,
  setLayout,
  toggleContainerCollapsed,
  setFilters,
  setExplorationFocus,
  clearExplorationFocus,
  setActiveOverlays,
  setOverlayShow,
  setOverlayShowPaths,
  setOverlayRestrictToFocus,
  setActiveOverlayPath,
  clearOverlayState,
} from "./view-state"
