import type { GraphEdge, GraphId, GraphModel, GraphNode, GraphPatch } from "@neoarc/graph-contracts"

/**
 * Explicit, atomic application of a supplied `GraphPatch` against a
 * canonical `GraphModel`.
 *
 * LOCKED INVARIANTS:
 * - Never mutates `model` — on `"stale"`/`"invalid"` the returned `model` is
 *   the exact same object reference as the input, proving no partial write
 *   occurred; on `"applied"` a brand-new `GraphModel` is returned.
 * - No upsert semantics: add requires the id to be absent, update requires
 *   it to be present, remove expects an existing target. This is deliberate
 *   — it catches agent/backend contract bugs (double-add, id collisions,
 *   updates against ids that were never added) early instead of silently
 *   overwriting or no-op'ing.
 * - A patch is applied all-or-nothing: any invalid operation rejects the
 *   whole patch, even if other operations in the same patch are valid.
 */

export type GraphPatchApplicationStatus = "applied" | "stale" | "invalid"

export interface GraphPatchApplicationResult {
  readonly status: GraphPatchApplicationStatus
  readonly model: GraphModel
  readonly reason?: string
}

function duplicateIdWithin(ids: readonly GraphId[]): GraphId | undefined {
  const seen = new Set<GraphId>()
  for (const id of ids) {
    if (seen.has(id)) return id
    seen.add(id)
  }
  return undefined
}

function idsOf(items: readonly { id: GraphId }[] | undefined): readonly GraphId[] {
  return items?.map((item) => item.id) ?? []
}

export function applyGraphPatch(model: GraphModel, patch: GraphPatch): GraphPatchApplicationResult {
  const reject = (status: "stale" | "invalid", reason: string): GraphPatchApplicationResult => ({
    status,
    model,
    reason,
  })

  if (
    patch.baseRevision !== undefined &&
    model.revision !== undefined &&
    patch.baseRevision !== model.revision
  ) {
    return reject(
      "stale",
      `patch.baseRevision (${patch.baseRevision}) does not match model.revision (${model.revision})`,
    )
  }

  const addNodeIds = idsOf(patch.addNodes)
  const updateNodeIds = idsOf(patch.updateNodes)
  const removeNodeIds = patch.removeNodeIds ?? []
  const addEdgeIds = idsOf(patch.addEdges)
  const updateEdgeIds = idsOf(patch.updateEdges)
  const removeEdgeIds = patch.removeEdgeIds ?? []

  // 1. No duplicate id within a single operation array.
  for (const [label, ids] of [
    ["addNodes", addNodeIds],
    ["updateNodes", updateNodeIds],
    ["removeNodeIds", removeNodeIds],
    ["addEdges", addEdgeIds],
    ["updateEdges", updateEdgeIds],
    ["removeEdgeIds", removeEdgeIds],
  ] as const) {
    const dup = duplicateIdWithin(ids)
    if (dup !== undefined) {
      return reject("invalid", `duplicate id "${dup}" within patch.${label}`)
    }
  }

  // 2. No id may appear in more than one operation for the same entity kind.
  //    No operation-order semantics are introduced to resolve this — the
  //    whole patch is rejected instead.
  const nodeOpsById = new Map<GraphId, string>()
  for (const [label, ids] of [
    ["addNodes", addNodeIds],
    ["updateNodes", updateNodeIds],
    ["removeNodeIds", removeNodeIds],
  ] as const) {
    for (const id of ids) {
      const prior = nodeOpsById.get(id)
      if (prior) {
        return reject(
          "invalid",
          `node id "${id}" appears in both patch.${prior} and patch.${label}`,
        )
      }
      nodeOpsById.set(id, label)
    }
  }
  const edgeOpsById = new Map<GraphId, string>()
  for (const [label, ids] of [
    ["addEdges", addEdgeIds],
    ["updateEdges", updateEdgeIds],
    ["removeEdgeIds", removeEdgeIds],
  ] as const) {
    for (const id of ids) {
      const prior = edgeOpsById.get(id)
      if (prior) {
        return reject(
          "invalid",
          `edge id "${id}" appears in both patch.${prior} and patch.${label}`,
        )
      }
      edgeOpsById.set(id, label)
    }
  }

  const existingNodeIds = new Set(model.nodes.map((n) => n.id))
  const existingEdgeIds = new Set(model.edges.map((e) => e.id))

  // 3. add* must target absent ids (no upsert).
  for (const id of addNodeIds) {
    if (existingNodeIds.has(id)) {
      return reject("invalid", `addNodes references id "${id}" that already exists in the model`)
    }
  }
  for (const id of addEdgeIds) {
    if (existingEdgeIds.has(id)) {
      return reject("invalid", `addEdges references id "${id}" that already exists in the model`)
    }
  }

  // 4. update* must target present ids.
  for (const id of updateNodeIds) {
    if (!existingNodeIds.has(id)) {
      return reject("invalid", `updateNodes references unknown id "${id}"`)
    }
  }
  for (const id of updateEdgeIds) {
    if (!existingEdgeIds.has(id)) {
      return reject("invalid", `updateEdges references unknown id "${id}"`)
    }
  }

  // 5. remove* must target present ids.
  for (const id of removeNodeIds) {
    if (!existingNodeIds.has(id)) {
      return reject("invalid", `removeNodeIds references unknown id "${id}"`)
    }
  }
  for (const id of removeEdgeIds) {
    if (!existingEdgeIds.has(id)) {
      return reject("invalid", `removeEdgeIds references unknown id "${id}"`)
    }
  }

  // Build the resolved node/edge maps.
  const removeNodeIdSet = new Set(removeNodeIds)
  const updateNodeById = new Map(patch.updateNodes?.map((n) => [n.id, n] as const))
  const resolvedNodes: GraphNode[] = []
  for (const node of model.nodes) {
    if (removeNodeIdSet.has(node.id)) continue
    resolvedNodes.push(updateNodeById.get(node.id) ?? node)
  }
  for (const node of patch.addNodes ?? []) resolvedNodes.push(node)

  const removeEdgeIdSet = new Set(removeEdgeIds)
  const updateEdgeById = new Map(patch.updateEdges?.map((e) => [e.id, e] as const))
  const resolvedEdges: GraphEdge[] = []
  for (const edge of model.edges) {
    if (removeEdgeIdSet.has(edge.id)) continue
    resolvedEdges.push(updateEdgeById.get(edge.id) ?? edge)
  }
  for (const edge of patch.addEdges ?? []) resolvedEdges.push(edge)

  // 6. Reject any resulting edge with a dangling endpoint — never silently
  //    cascade-delete edges whose node was removed/never existed.
  const resolvedNodeIds = new Set(resolvedNodes.map((n) => n.id))
  for (const edge of resolvedEdges) {
    if (!resolvedNodeIds.has(edge.source) || !resolvedNodeIds.has(edge.target)) {
      return reject(
        "invalid",
        `resulting graph would contain edge "${edge.id}" with a dangling endpoint (source "${edge.source}" or target "${edge.target}" not present)`,
      )
    }
  }

  const nextModel: GraphModel = {
    ...model,
    nodes: resolvedNodes,
    edges: resolvedEdges,
    revision: patch.resultRevision ?? model.revision,
  }

  return { status: "applied", model: nextModel }
}
