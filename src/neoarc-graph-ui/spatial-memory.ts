import type { GraphSpatialSnapshot } from "@neoarc/graph-renderer"
import type { GraphViewState } from "@neoarc/graph-contracts"

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

/** Deterministic, order-independent identity for a string id set. */
function normalizeList(list?: readonly string[]): string {
  if (!list || list.length === 0) return ""
  return [...list].map(String).sort().join(",")
}

/**
 * Renderer- and Cytoscape-neutral identity of a USER-DRIVEN ANALYTICAL VIEW
 * RESTRICTION — the subset of `GraphViewState` that changes *which nodes/edges
 * are visible* as an explicit user act (filters, local focus, overlay focus
 * restriction), as opposed to a selection/highlight change or an automatic
 * backend/agent data update.
 *
 * Two equivalent restrictions produce the same scope regardless of the order
 * the user built them (arrays are normalized). A base, unrestricted view maps
 * to the stable `"base"` scope so it always resolves to one workspace.
 *
 * DELIBERATELY EXCLUDED (must NOT change the scope):
 * - `selectedNodeIds` / `selectedEdgeIds` / `focusedNodeId` — highlight only
 * - `filters.query` — search currently HIGHLIGHTS, it does not filter
 * - `overlay.showOverlay` / `showPaths` / `activePathId` — presentation only
 * - `viewport`, model revision — spatial/data churn, not a visibility restriction
 * - `collapsedContainerIds` — collapse/expand keeps its own existing mental-map
 *   behavior and is NOT part of this analytical scope
 *
 * @param overlayRestrictionIdentity effective active-overlay + focus-id identity,
 *   consulted ONLY when `overlay.restrictToOverlayFocus` is active (the product
 *   builds it from the active overlays' `focusNodeIds`/`focusEdgeIds`).
 */
export function buildAnalyticalViewScope(
  viewState: Pick<GraphViewState, "filters" | "explorationFocus" | "hiddenNodeIds" | "overlay">,
  overlayRestrictionIdentity = "",
): string {
  const filters = viewState.filters ?? {}
  const explorationFocus = viewState.explorationFocus
  const restrict = viewState.overlay?.restrictToOverlayFocus === true

  const isBase =
    !filters.nodeTypes?.length &&
    !filters.edgeTypes?.length &&
    !filters.statuses?.length &&
    !filters.facets?.length &&
    !viewState.hiddenNodeIds?.length &&
    !explorationFocus &&
    !restrict
  if (isBase) return "base"

  const parts = [
    `nt:${normalizeList(filters.nodeTypes)}`,
    `et:${normalizeList(filters.edgeTypes)}`,
    `st:${normalizeList(filters.statuses)}`,
    `fc:${normalizeList(filters.facets)}`,
    `hn:${normalizeList(viewState.hiddenNodeIds)}`,
    explorationFocus
      ? `ef:${explorationFocus.nodeId}|${explorationFocus.maxHops}|${explorationFocus.direction}`
      : "ef:",
    restrict ? `or:1|${overlayRestrictionIdentity}` : "or:0",
  ]
  return parts.join(";")
}

/**
 * Session-scoped spatial-workspace key. Extended with `analyticalViewScope` so
 * a user-driven analytical restriction (filters/focus/overlay restriction) is a
 * SEPARATE spatial workspace from the base view — while an automatic data update
 * on the same scope keeps the same key and thus the same mental map.
 */
export function buildSpatialMemoryKey(
  viewIdentity: string,
  rendererId: string,
  layoutId: string,
  analyticalViewScope = "base",
): string {
  return `${viewIdentity}::${rendererId}::${layoutId}::${analyticalViewScope}`
}

export function getSpatialSnapshot(key: string): GraphSpatialSnapshot | undefined {
  return snapshots.get(key)
}

export function setSpatialSnapshot(key: string, snapshot: GraphSpatialSnapshot): void {
  snapshots.set(key, snapshot)
}
