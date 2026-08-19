import type {
  GraphChangeSet,
  GraphChangeSetSource,
  GraphModel,
  GraphPatch,
} from "@neoarc/graph-contracts"

/**
 * Pure derivation of a `GraphChangeSet` from a `GraphPatch`, called with the
 * PRE-patch model so removed node/edge refs can still be captured — by the
 * time the patch is applied, removed ids no longer resolve in the model.
 *
 * Never mutates `model` or `patch`.
 */
export function deriveGraphChangeSet(
  model: GraphModel,
  patch: GraphPatch,
  id: string,
  sourceRefs?: readonly GraphChangeSetSource[],
): GraphChangeSet {
  const nodeById = new Map(model.nodes.map((n) => [n.id, n] as const))
  const edgeById = new Map(model.edges.map((e) => [e.id, e] as const))

  const removedNodeRefs = (patch.removeNodeIds ?? []).map((nodeId) => {
    const node = nodeById.get(nodeId)
    return {
      id: nodeId,
      type: node?.type ?? "unknown",
      label: node?.label,
    }
  })

  const removedEdgeRefs = (patch.removeEdgeIds ?? []).map((edgeId) => {
    const edge = edgeById.get(edgeId)
    return {
      id: edgeId,
      type: edge?.type ?? "unknown",
      source: edge?.source ?? "",
      target: edge?.target ?? "",
      label: edge?.label,
    }
  })

  return {
    id,
    fromRevision: model.revision,
    toRevision: patch.resultRevision,
    addedNodeIds: patch.addNodes?.map((n) => n.id),
    updatedNodeIds: patch.updateNodes?.map((n) => n.id),
    removedNodeIds: patch.removeNodeIds,
    removedNodeRefs: removedNodeRefs.length > 0 ? removedNodeRefs : undefined,
    addedEdgeIds: patch.addEdges?.map((e) => e.id),
    updatedEdgeIds: patch.updateEdges?.map((e) => e.id),
    removedEdgeIds: patch.removeEdgeIds,
    removedEdgeRefs: removedEdgeRefs.length > 0 ? removedEdgeRefs : undefined,
    sourceRefs,
  }
}
