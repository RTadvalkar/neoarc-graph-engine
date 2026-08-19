import type { GraphId, GraphViewState } from "@neoarc/graph-contracts"

/**
 * Pure helpers for evolving GraphViewState immutably. The UI layer owns *where*
 * state lives (a reducer, a store); these functions guarantee every transition
 * returns a new object and never touches canonical GraphModel facts.
 */

export function createInitialViewState(
  overrides: Partial<GraphViewState> = {},
): GraphViewState {
  return {
    selectedNodeIds: [],
    selectedEdgeIds: [],
    ...overrides,
  }
}

function toggleIn(list: readonly GraphId[], id: GraphId, additive: boolean): GraphId[] {
  if (additive) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
  }
  return list.length === 1 && list[0] === id ? [] : [id]
}

export function selectNode(
  state: GraphViewState,
  nodeId: GraphId,
  additive = false,
): GraphViewState {
  return {
    ...state,
    selectedNodeIds: toggleIn(state.selectedNodeIds, nodeId, additive),
    selectedEdgeIds: additive ? state.selectedEdgeIds : [],
  }
}

export function selectEdge(
  state: GraphViewState,
  edgeId: GraphId,
  additive = false,
): GraphViewState {
  return {
    ...state,
    selectedEdgeIds: toggleIn(state.selectedEdgeIds, edgeId, additive),
    selectedNodeIds: additive ? state.selectedNodeIds : [],
  }
}

export function clearSelection(state: GraphViewState): GraphViewState {
  if (state.selectedNodeIds.length === 0 && state.selectedEdgeIds.length === 0) return state
  return { ...state, selectedNodeIds: [], selectedEdgeIds: [] }
}

export function setLayout(state: GraphViewState, layoutId: string): GraphViewState {
  return { ...state, layoutId }
}

export function toggleContainerCollapsed(
  state: GraphViewState,
  containerId: GraphId,
): GraphViewState {
  const current = state.collapsedContainerIds ?? []
  const collapsedContainerIds = current.includes(containerId)
    ? current.filter((x) => x !== containerId)
    : [...current, containerId]
  return { ...state, collapsedContainerIds }
}

export function setFilters(
  state: GraphViewState,
  filters: GraphViewState["filters"],
): GraphViewState {
  return { ...state, filters }
}
