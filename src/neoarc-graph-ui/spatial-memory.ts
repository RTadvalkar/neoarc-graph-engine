import type { GraphSpatialSnapshot } from "@neoarc/graph-renderer"

/**
 * Plain, renderer-neutral, module-level, session-scoped cache of spatial
 * workspaces (node positions + viewport). Deliberately outside React so it
 * survives a `GraphCanvas`/renderer remount within the same browser session —
 * this is session-scoped working memory, not a persistence layer; a reload or
 * new tab starts empty.
 *
 * Keyed by view identity + renderer id + layout id, never by `GraphModel`
 * revision — an automatic data update (agent/backend patch) bumps the
 * revision but must never evict the cache. Including the renderer id prevents
 * coordinates computed by one renderer (e.g. Cytoscape) from ever being
 * restored into a different renderer (a future Ogma/yFiles/Sigma
 * implementation) that happens to reuse the same view-identity/layout-id
 * strings.
 *
 * Entries are never evicted just because a key becomes momentarily inactive
 * (switching scenario, layout, or view) — restoration always intersects the
 * cached ids against the live view model, so a stale entry for an id that
 * never reappears is harmless.
 */

const snapshots = new Map<string, GraphSpatialSnapshot>()

export function buildSpatialMemoryKey(
  viewIdentity: string,
  rendererId: string,
  layoutId: string,
): string {
  return `${viewIdentity}::${rendererId}::${layoutId}`
}

export function getSpatialSnapshot(key: string): GraphSpatialSnapshot | undefined {
  return snapshots.get(key)
}

export function setSpatialSnapshot(key: string, snapshot: GraphSpatialSnapshot): void {
  snapshots.set(key, snapshot)
}
