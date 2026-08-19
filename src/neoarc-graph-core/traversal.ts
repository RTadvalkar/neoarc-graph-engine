import type {
  GraphId,
  GraphModel,
  GraphTraversalDirection,
} from "@neoarc/graph-contracts"

/**
 * Pure local graph traversal over an already-loaded `GraphModel`. This is
 * explicitly scoped to the loaded graph — it is never presented as globally
 * authoritative. Authoritative expansion/impact/path queries remain a
 * product/backend concern; this helper only powers local, derived view
 * behavior (e.g. "open branch as focus", local neighborhood highlighting).
 *
 * Arbitrary N-hop is a locked invariant: `maxHops` is a plain number, never a
 * fixed `1 | 2 | 3` union.
 */
export interface LocalNeighborhoodOptions {
  readonly maxHops: number
  readonly direction: GraphTraversalDirection
  readonly edgeTypes?: readonly string[]
}

/**
 * Returns the set of node ids reachable from `rootIds` within `maxHops`,
 * honoring traversal direction and an optional edge-type allowlist. Root ids
 * are always included. Never mutates `model`.
 */
export function localNeighborhood(
  model: GraphModel,
  rootIds: readonly GraphId[],
  options: LocalNeighborhoodOptions,
): ReadonlySet<GraphId> {
  const { direction, edgeTypes } = options
  const maxHops = Math.max(0, Math.trunc(options.maxHops))
  const edgeTypeAllowed = (type: string): boolean =>
    !edgeTypes || edgeTypes.length === 0 || edgeTypes.includes(type)

  const reached = new Set<GraphId>(rootIds)
  let frontier = new Set<GraphId>(rootIds)

  for (let hop = 0; hop < maxHops; hop++) {
    if (frontier.size === 0) break
    const next = new Set<GraphId>()
    for (const edge of model.edges) {
      if (!edgeTypeAllowed(edge.type)) continue
      const outMatch = direction !== "incoming" && frontier.has(edge.source)
      const inMatch = direction !== "outgoing" && frontier.has(edge.target)
      if (outMatch && !reached.has(edge.target)) next.add(edge.target)
      if (inMatch && !reached.has(edge.source)) next.add(edge.source)
    }
    if (next.size === 0) break
    for (const id of next) reached.add(id)
    frontier = next
  }

  return reached
}
