import type {
  GraphId,
  GraphModel,
  GraphNode,
  GraphViewEdge,
  GraphViewModel,
  GraphViewNode,
  GraphViewState,
} from "@neoarc/graph-contracts"

/**
 * Pure derivation of a GraphViewModel from canonical GraphModel + GraphViewState.
 *
 * LOCKED INVARIANT: this function must never mutate `model`. It only reads the
 * facts and produces brand-new derived structures. Selection, focus, filtering,
 * hiding, and collapse are all expressed here as *derived* state.
 */

const EMPTY_VIEW_STATE: GraphViewState = {
  selectedNodeIds: [],
  selectedEdgeIds: [],
}

function matchesQuery(node: GraphNode, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return false
  if ((node.label ?? node.id).toLowerCase().includes(q)) return true
  if (node.type.toLowerCase().includes(q)) return true
  const props = node.properties
  if (props) {
    for (const value of Object.values(props)) {
      if (typeof value === "string" && value.toLowerCase().includes(q)) return true
      if (typeof value === "number" && String(value).includes(q)) return true
    }
  }
  return false
}

/** Resolve the full ancestor container chain for a node. */
function ancestorContainerIds(
  node: GraphNode,
  byId: ReadonlyMap<GraphId, GraphNode>,
): GraphId[] {
  const chain: GraphId[] = []
  const seen = new Set<GraphId>()
  let current = node.containerId
  while (current && byId.has(current) && !seen.has(current)) {
    seen.add(current)
    chain.push(current)
    current = byId.get(current)?.containerId
  }
  return chain
}

export function buildViewModel(
  model: GraphModel,
  viewState: GraphViewState = EMPTY_VIEW_STATE,
): GraphViewModel {
  const byId = new Map<GraphId, GraphNode>()
  for (const node of model.nodes) byId.set(node.id, node)

  const selectedNodeIds = new Set(viewState.selectedNodeIds)
  const selectedEdgeIds = new Set(viewState.selectedEdgeIds)
  const hiddenNodeIds = new Set(viewState.hiddenNodeIds ?? [])
  const pinnedNodeIds = new Set(viewState.pinnedNodeIds ?? [])
  const collapsed = new Set(viewState.collapsedContainerIds ?? [])
  const nodeTypeFilter = viewState.filters?.nodeTypes
  const edgeTypeFilter = viewState.filters?.edgeTypes
  const query = viewState.filters?.query ?? ""

  const typeAllowed = (type: string, allow?: readonly string[]): boolean =>
    !allow || allow.length === 0 || allow.includes(type)

  // Decide visibility first so edges can be filtered by endpoint visibility.
  const visibleNodeIds = new Set<GraphId>()
  for (const node of model.nodes) {
    if (hiddenNodeIds.has(node.id)) continue
    if (!typeAllowed(node.type, nodeTypeFilter)) continue
    // Hidden if any ancestor container is collapsed.
    const ancestors = ancestorContainerIds(node, byId)
    if (ancestors.some((id) => collapsed.has(id))) continue
    visibleNodeIds.add(node.id)
  }

  // A node is a container if some *visible* node declares it as its container.
  const containerIds = new Set<GraphId>()
  for (const node of model.nodes) {
    if (!visibleNodeIds.has(node.id)) continue
    if (node.containerId && visibleNodeIds.has(node.containerId)) {
      containerIds.add(node.containerId)
    }
  }

  const nodes: GraphViewNode[] = []
  for (const node of model.nodes) {
    if (!visibleNodeIds.has(node.id)) continue
    // Drop containerId if the parent is not visible (avoids dangling parents).
    const containerId =
      node.containerId && visibleNodeIds.has(node.containerId) ? node.containerId : undefined
    nodes.push({
      id: node.id,
      type: node.type,
      label: node.label,
      containerId,
      properties: node.properties,
      isContainer: containerIds.has(node.id),
      selected: selectedNodeIds.has(node.id),
      focused: viewState.focusedNodeId === node.id,
      pinned: pinnedNodeIds.has(node.id),
      searchHighlighted: query ? matchesQuery(node, query) : false,
    })
  }

  const edges: GraphViewEdge[] = []
  for (const edge of model.edges) {
    if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) continue
    if (!typeAllowed(edge.type, edgeTypeFilter)) continue
    const endpointsHighlighted =
      !!query &&
      (nodes.find((n) => n.id === edge.source)?.searchHighlighted ?? false) &&
      (nodes.find((n) => n.id === edge.target)?.searchHighlighted ?? false)
    edges.push({
      id: edge.id,
      type: edge.type,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      properties: edge.properties,
      selected: selectedEdgeIds.has(edge.id),
      searchHighlighted: endpointsHighlighted,
    })
  }

  return { nodes, edges, sourceRevision: model.revision }
}
