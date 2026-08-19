import type {
  GraphId,
  GraphModel,
  GraphNode,
  GraphViewEdge,
  GraphViewModel,
  GraphViewNode,
  GraphViewState,
} from "@neoarc/graph-contracts"
import { localNeighborhood } from "./traversal"

/**
 * Pure derivation of a GraphViewModel from canonical GraphModel + GraphViewState.
 *
 * LOCKED INVARIANT: this function must never mutate `model`. It only reads the
 * facts and produces brand-new derived structures. Selection, focus, filtering,
 * hiding, collapse, exploration-focus, and collapse-driven aggregate/meta-edges
 * are all expressed here as *derived* state — never written back to the model.
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

function nodeFacets(node: GraphNode): readonly string[] {
  const raw = node.properties?.facets
  if (!Array.isArray(raw)) return []
  return raw.filter((v): v is string => typeof v === "string")
}

function nodeStatus(node: GraphNode): string | undefined {
  const raw = node.properties?.status
  return typeof raw === "string" ? raw : undefined
}

/** Resolve the full ancestor container chain for a node (nearest first). */
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
  const statusFilter = viewState.filters?.statuses
  const facetFilter = viewState.filters?.facets
  const query = viewState.filters?.query ?? ""

  const typeAllowed = (type: string, allow?: readonly string[]): boolean =>
    !allow || allow.length === 0 || allow.includes(type)

  const statusAllowed = (node: GraphNode): boolean => {
    if (!statusFilter || statusFilter.length === 0) return true
    const status = nodeStatus(node)
    return status !== undefined && statusFilter.includes(status)
  }

  const facetsAllowed = (node: GraphNode): boolean => {
    if (!facetFilter || facetFilter.length === 0) return true
    const facets = nodeFacets(node)
    return facets.some((f) => facetFilter.includes(f))
  }

  // "Open branch as focus": a local, loaded-graph-only neighborhood around a
  // root node. Never presented as globally authoritative — it is a pure view
  // restriction over whatever is already in `model`.
  const focus = viewState.explorationFocus
  const focusNeighborhood = focus
    ? localNeighborhood(model, [focus.nodeId], {
        maxHops: focus.maxHops,
        direction: focus.direction,
      })
    : undefined

  const focusEligible = (node: GraphNode): boolean => {
    if (!focusNeighborhood) return true
    if (focusNeighborhood.has(node.id)) return true
    // Keep ancestor containers of in-focus nodes visible so compound
    // structure survives the restriction, even if the ancestor itself falls
    // outside the traversed neighborhood.
    return ancestorContainerIds(node, byId).some((id) => focusNeighborhood.has(id))
  }

  // Eligibility independent of collapse: passes hidden/type/status/facet/focus.
  const eligible = new Set<GraphId>()
  for (const node of model.nodes) {
    if (hiddenNodeIds.has(node.id)) continue
    if (!typeAllowed(node.type, nodeTypeFilter)) continue
    if (!statusAllowed(node)) continue
    if (!facetsAllowed(node)) continue
    if (!focusEligible(node)) continue
    eligible.add(node.id)
  }

  // A node is a compound container if it has any eligible child — computed
  // independently of collapse, so a *collapsed* container still renders as a
  // (collapsed) container rather than losing its compound identity.
  const containerIds = new Set<GraphId>()
  for (const node of model.nodes) {
    if (!eligible.has(node.id)) continue
    if (node.containerId && eligible.has(node.containerId)) {
      containerIds.add(node.containerId)
    }
  }

  // Visible = eligible AND no ancestor is currently collapsed.
  const visibleNodeIds = new Set<GraphId>()
  for (const node of model.nodes) {
    if (!eligible.has(node.id)) continue
    const ancestors = ancestorContainerIds(node, byId)
    if (ancestors.some((id) => collapsed.has(id))) continue
    visibleNodeIds.add(node.id)
  }

  const nodes: GraphViewNode[] = []
  for (const node of model.nodes) {
    if (!visibleNodeIds.has(node.id)) continue
    // Drop containerId if the parent is not visible (avoids dangling parents).
    const containerId =
      node.containerId && visibleNodeIds.has(node.containerId) ? node.containerId : undefined
    const isContainer = containerIds.has(node.id)
    nodes.push({
      id: node.id,
      type: node.type,
      label: node.label,
      containerId,
      properties: node.properties,
      isContainer,
      collapsed: isContainer ? collapsed.has(node.id) : undefined,
      selected: selectedNodeIds.has(node.id),
      focused: viewState.focusedNodeId === node.id,
      pinned: pinnedNodeIds.has(node.id),
      searchHighlighted: query ? matchesQuery(node, query) : false,
    })
  }

  /**
   * Resolve the endpoint that should actually be drawn for an edge: the node
   * itself if visible, otherwise the nearest visible ancestor container
   * (which is how a collapsed group "absorbs" its children's edges into a
   * meta-edge). Returns undefined when no visible ancestor exists — the edge
   * is dropped entirely, same as before collapse-aggregation existed.
   */
  function resolveVisibleEndpoint(nodeId: GraphId): GraphId | undefined {
    if (visibleNodeIds.has(nodeId)) return nodeId
    const node = byId.get(nodeId)
    if (!node) return undefined
    for (const ancestorId of ancestorContainerIds(node, byId)) {
      if (visibleNodeIds.has(ancestorId)) return ancestorId
    }
    return undefined
  }

  const edges: GraphViewEdge[] = []
  const aggregates = new Map<
    string,
    { source: GraphId; target: GraphId; underlying: GraphId[] }
  >()

  for (const edge of model.edges) {
    // The relationship-type filter applies to every canonical edge before it
    // takes either path below: a type excluded by `edgeTypeFilter` must not
    // render as an ordinary edge AND must not contribute to (or appear in
    // the underlying ids of) an aggregate/meta-edge.
    if (!typeAllowed(edge.type, edgeTypeFilter)) continue

    const effectiveSource = resolveVisibleEndpoint(edge.source)
    const effectiveTarget = resolveVisibleEndpoint(edge.target)
    if (!effectiveSource || !effectiveTarget) continue

    const wasSubstituted = effectiveSource !== edge.source || effectiveTarget !== edge.target

    if (!wasSubstituted) {
      // Ordinary, unmodified edge: both endpoints are visible as-is.
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
      continue
    }

    // A canonical self-loop stays a self-loop even if its owning container is
    // also visible under the same id path — it was never a cross-boundary
    // relationship, so it is never aggregated.
    if (edge.source === edge.target) continue

    // Substitution collapsed both endpoints onto the same visible ancestor
    // (an edge entirely internal to one collapsed group): no cross-boundary
    // meaning to show, so it is folded away rather than becoming a no-op
    // self-loop.
    if (effectiveSource === effectiveTarget) continue

    // Genuine cross-boundary relationship exposed by a collapsed group: fold
    // it into a meta-edge, retaining the underlying canonical edge id.
    const key = `${effectiveSource}=>${effectiveTarget}`
    const existing = aggregates.get(key)
    if (existing) {
      existing.underlying.push(edge.id)
    } else {
      aggregates.set(key, {
        source: effectiveSource,
        target: effectiveTarget,
        underlying: [edge.id],
      })
    }
  }

  for (const [key, agg] of aggregates) {
    edges.push({
      id: `agg:${key}`,
      type: "aggregate",
      source: agg.source,
      target: agg.target,
      label: `${agg.underlying.length} relationship${agg.underlying.length === 1 ? "" : "s"}`,
      selected: selectedEdgeIds.has(`agg:${key}`),
      searchHighlighted: false,
      aggregatedEdgeIds: agg.underlying,
    })
  }

  return { nodes, edges, sourceRevision: model.revision }
}
