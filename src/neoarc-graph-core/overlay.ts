import type {
  GraphAppliedOverlayEdgeState,
  GraphAppliedOverlayNodeState,
  GraphId,
  GraphModel,
  GraphOverlay,
  GraphOverlayFreshness,
  GraphOverlayPath,
  GraphOverlayViewState,
  GraphViewEdge,
  GraphViewModel,
  GraphViewNode,
} from "@neoarc/graph-contracts"

/**
 * Pure overlay derivation. Applies SUPPLIED overlays (impact/search/risk/…)
 * onto an already-derived GraphViewModel to produce a new, overlay-decorated
 * GraphViewModel.
 *
 * LOCKED INVARIANTS:
 * - Never mutates the input `viewModel`, its nodes/edges, or any GraphModel.
 * - Never interprets overlay `state` strings. Visual intent travels only via
 *   the supplied `tone`; membership (focus/paths) is pure id-set testing.
 * - Overlay/path edge references match a visible edge by its own id OR by any
 *   of its `aggregatedEdgeIds`, so a canonical reference survives collapse.
 * - No impact/overlay recomputation ever happens here.
 */

export interface ApplyOverlaysResult {
  readonly viewModel: GraphViewModel
  /** Overlay-referenced node ids absent from the loaded GraphModel. */
  readonly unresolvedNodeIds: readonly GraphId[]
  /** Overlay-referenced edge ids absent from the loaded GraphModel. */
  readonly unresolvedEdgeIds: readonly GraphId[]
}

/**
 * Resolve which overlays are active given the LOCKED selection semantics:
 * - `activeOverlayIds === undefined` → all supplied overlays active
 * - `activeOverlayIds === []`        → explicitly none active
 */
function resolveActiveOverlays(
  overlays: readonly GraphOverlay[],
  activeOverlayIds: readonly string[] | undefined,
): readonly GraphOverlay[] {
  if (activeOverlayIds === undefined) return overlays
  const active = new Set(activeOverlayIds)
  return overlays.filter((o) => active.has(o.id))
}

/** Supplied paths, normalizing the simpler `pathEdgeIds` shape into one path. */
function overlayPaths(overlay: GraphOverlay): readonly GraphOverlayPath[] {
  if (overlay.paths && overlay.paths.length > 0) return overlay.paths
  if (overlay.pathEdgeIds && overlay.pathEdgeIds.length > 0) {
    return [{ id: `${overlay.id}:path`, edgeIds: overlay.pathEdgeIds }]
  }
  return []
}

/** The canonical edge ids a visible view edge stands for (itself + aggregates). */
function edgeCanonicalIds(edge: GraphViewEdge): readonly GraphId[] {
  if (edge.aggregatedEdgeIds && edge.aggregatedEdgeIds.length > 0) {
    return edge.aggregatedEdgeIds
  }
  return [edge.id]
}

export function applyOverlays(
  viewModel: GraphViewModel,
  overlays: readonly GraphOverlay[] | undefined,
  loadedNodeIds: ReadonlySet<GraphId>,
  loadedEdgeIds: ReadonlySet<GraphId>,
  overlayViewState: GraphOverlayViewState | undefined,
): ApplyOverlaysResult {
  const activeOverlays = resolveActiveOverlays(overlays ?? [], overlayViewState?.activeOverlayIds)

  // Unresolved-reference reporting is INDEPENDENT of show flags and focus — it
  // always reflects what the supplied active overlays reference vs. the loaded
  // model. Computed even when presentation is fully hidden.
  const unresolvedNodeIds = new Set<GraphId>()
  const unresolvedEdgeIds = new Set<GraphId>()
  for (const overlay of activeOverlays) {
    for (const ns of overlay.nodeStates ?? []) {
      if (!loadedNodeIds.has(ns.nodeId)) unresolvedNodeIds.add(ns.nodeId)
    }
    for (const es of overlay.edgeStates ?? []) {
      if (!loadedEdgeIds.has(es.edgeId)) unresolvedEdgeIds.add(es.edgeId)
    }
    for (const id of overlay.focusNodeIds ?? []) {
      if (!loadedNodeIds.has(id)) unresolvedNodeIds.add(id)
    }
    for (const id of overlay.focusEdgeIds ?? []) {
      if (!loadedEdgeIds.has(id)) unresolvedEdgeIds.add(id)
    }
    for (const path of overlayPaths(overlay)) {
      for (const id of path.edgeIds) {
        if (!loadedEdgeIds.has(id)) unresolvedEdgeIds.add(id)
      }
      for (const id of path.nodeIds ?? []) {
        if (!loadedNodeIds.has(id)) unresolvedNodeIds.add(id)
      }
    }
  }

  const emptyResult = (vm: GraphViewModel): ApplyOverlaysResult => ({
    viewModel: vm,
    unresolvedNodeIds: [...unresolvedNodeIds],
    unresolvedEdgeIds: [...unresolvedEdgeIds],
  })

  // Fast path: nothing active → return the input view model untouched (still
  // reporting unresolved refs, which will be empty when nothing is active).
  if (activeOverlays.length === 0) return emptyResult(viewModel)

  const showOverlay = overlayViewState?.showOverlay !== false
  const showPaths = overlayViewState?.showPaths === true
  const activePathId = overlayViewState?.activePathId
  const restrictToFocus = overlayViewState?.restrictToOverlayFocus === true

  // --- Node-state presentation (gated by showOverlay) -----------------------
  const nodeStatesById = new Map<GraphId, GraphAppliedOverlayNodeState[]>()
  if (showOverlay) {
    for (const overlay of activeOverlays) {
      for (const ns of overlay.nodeStates ?? []) {
        const list = nodeStatesById.get(ns.nodeId) ?? []
        list.push({ ...ns, overlayId: overlay.id })
        nodeStatesById.set(ns.nodeId, list)
      }
    }
  }

  // --- Edge-state presentation (gated by showOverlay), aggregate-aware ------
  // Keyed by VISIBLE view-edge id. A supplied state on canonical edge C is
  // attached to whichever visible edge stands for C (itself or the meta-edge
  // whose aggregatedEdgeIds include C), recording `viaEdgeId = C`.
  const edgeStatesByViewEdge = new Map<GraphId, GraphAppliedOverlayEdgeState[]>()
  if (showOverlay) {
    for (const edge of viewModel.edges) {
      const canonicalIds = edgeCanonicalIds(edge)
      for (const overlay of activeOverlays) {
        for (const es of overlay.edgeStates ?? []) {
          if (!canonicalIds.includes(es.edgeId)) continue
          const list = edgeStatesByViewEdge.get(edge.id) ?? []
          list.push({ ...es, overlayId: overlay.id, viaEdgeId: es.edgeId })
          edgeStatesByViewEdge.set(edge.id, list)
        }
      }
    }
  }

  // --- Supporting-path membership (gated by showPaths, INDEPENDENT of state) -
  const nodePathIds = new Map<GraphId, Set<string>>()
  const edgePathIdsByViewEdge = new Map<GraphId, Set<string>>()
  if (showPaths) {
    for (const overlay of activeOverlays) {
      for (const path of overlayPaths(overlay)) {
        if (activePathId && path.id !== activePathId) continue
        // Node membership: direct id match against visible nodes.
        for (const nodeId of path.nodeIds ?? []) {
          const set = nodePathIds.get(nodeId) ?? new Set<string>()
          set.add(path.id)
          nodePathIds.set(nodeId, set)
        }
        // Edge membership: match supplied canonical edge ids against each
        // visible edge's canonical id set (aggregate-aware).
        const pathEdgeSet = new Set(path.edgeIds)
        for (const edge of viewModel.edges) {
          if (edgeCanonicalIds(edge).some((id) => pathEdgeSet.has(id))) {
            const set = edgePathIdsByViewEdge.get(edge.id) ?? new Set<string>()
            set.add(path.id)
            edgePathIdsByViewEdge.set(edge.id, set)
          }
        }
      }
    }
  }

  // --- Compose decorated nodes/edges (new objects; inputs untouched) --------
  const decoratedNodes: GraphViewNode[] = viewModel.nodes.map((node) => {
    const states = nodeStatesById.get(node.id)
    const pathIds = nodePathIds.get(node.id)
    if (!states && !pathIds) return node
    return {
      ...node,
      ...(states ? { overlays: states } : {}),
      ...(pathIds ? { onSupportingPathIds: [...pathIds] } : {}),
    }
  })

  const decoratedEdges: GraphViewEdge[] = viewModel.edges.map((edge) => {
    const states = edgeStatesByViewEdge.get(edge.id)
    const pathIds = edgePathIdsByViewEdge.get(edge.id)
    if (!states && !pathIds) return edge
    return {
      ...edge,
      ...(states ? { overlays: states } : {}),
      ...(pathIds ? { onSupportingPathIds: [...pathIds] } : {}),
    }
  })

  // --- Focus restriction (gated by restrictToOverlayFocus, INDEPENDENT) -----
  let finalNodes = decoratedNodes
  let finalEdges = decoratedEdges
  if (restrictToFocus) {
    const focusNodeSet = new Set<GraphId>()
    const focusEdgeSet = new Set<GraphId>()
    for (const overlay of activeOverlays) {
      for (const id of overlay.focusNodeIds ?? []) focusNodeSet.add(id)
      for (const id of overlay.focusEdgeIds ?? []) focusEdgeSet.add(id)
    }
    const keptNodeIds = new Set<GraphId>()
    finalNodes = decoratedNodes.filter((n) => {
      const keep = focusNodeSet.has(n.id)
      if (keep) keptNodeIds.add(n.id)
      return keep
    })
    finalEdges = decoratedEdges.filter((e) => {
      // Pure id-set membership: the view edge (or a canonical id it stands
      // for) is in the supplied focus edge set, and both endpoints survived.
      const edgeInFocus = edgeCanonicalIds(e).some((id) => focusEdgeSet.has(id))
      return edgeInFocus && keptNodeIds.has(e.source) && keptNodeIds.has(e.target)
    })
  }

  const decoratedViewModel: GraphViewModel = {
    ...viewModel,
    nodes: finalNodes,
    edges: finalEdges,
  }

  return emptyResult(decoratedViewModel)
}

/**
 * Compare a supplied overlay's provenance against the current canonical model.
 * Returns a 4-way result — never a boolean — so missing data is reported as
 * `"unknown"` instead of being misclassified. NEVER recomputes the overlay.
 *
 * - `"unknown"`      — either revision is unavailable, OR `sourceModelId` was
 *                      supplied but the model has no `id` to verify against.
 * - `"incompatible"` — both identities exist and differ.
 * - `"current"`/`"stale"` — plain revision equality once both revisions exist
 *                      and identities (if both present) match.
 */
export function resolveOverlayFreshness(
  model: GraphModel,
  overlay: GraphOverlay,
): GraphOverlayFreshness {
  const supRev = overlay.sourceRevision
  const modRev = model.revision
  if (supRev === undefined || modRev === undefined) return "unknown"

  const supId = overlay.sourceModelId
  const modId = model.id
  if (supId !== undefined) {
    if (modId === undefined) return "unknown"
    if (supId !== modId) return "incompatible"
  }

  return supRev === modRev ? "current" : "stale"
}
