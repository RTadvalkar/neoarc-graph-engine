"use client"

import { useMemo } from "react"
import type {
  GraphId,
  GraphOverlay,
  GraphOverlayFreshness,
  GraphSemanticEvent,
} from "@neoarc/graph-contracts"

/** One overlay's freshness result, as produced by the controller. */
export interface OverlayFreshnessEntry {
  readonly overlayId: string
  readonly label?: string
  readonly freshness: GraphOverlayFreshness
}

export interface GraphOverlayViewFlags {
  readonly activeOverlayIds?: readonly string[]
  readonly showOverlay?: boolean
  readonly showPaths?: boolean
  readonly activePathId?: string
  readonly restrictToOverlayFocus?: boolean
}

export interface GraphOverlayPanelProps {
  readonly overlays: readonly GraphOverlay[]
  readonly view: GraphOverlayViewFlags | undefined
  readonly freshness: readonly OverlayFreshnessEntry[]
  readonly unresolvedNodeIds: readonly GraphId[]
  readonly unresolvedEdgeIds: readonly GraphId[]
  readonly dispatch: (event: GraphSemanticEvent) => void
  /**
   * Label for the focus-restriction toggle. Generic default; a product may
   * override (e.g. "Impacted only"). The contract name stays impact-neutral.
   */
  readonly restrictLabel?: string
  readonly className?: string
}

const FRESHNESS_COPY: Record<GraphOverlayFreshness, { label: string; tone: string }> = {
  current: { label: "Current", tone: "var(--graph-success, #16a34a)" },
  stale: { label: "Stale", tone: "var(--graph-warning, #d97706)" },
  unknown: { label: "Unknown", tone: "var(--muted-foreground)" },
  incompatible: { label: "Incompatible", tone: "var(--graph-danger, #dc2626)" },
}

const rowButton =
  "flex items-center gap-2 rounded-md px-2 py-1 text-sm text-foreground transition-colors hover:bg-muted"

/**
 * Reusable, renderer-neutral overlay controls. Renderer- and domain-agnostic:
 * it shows/hides supplied overlay state presentation, supporting paths, and a
 * focus restriction, and it surfaces supplied metadata (completeness, freshness,
 * unresolved references). Its legend is built from the ACTIVE overlay's own
 * supplied `nodeStates` — never a hardcoded impact vocabulary — so any overlay
 * kind (impact/search/risk/…) is described by its own supplied tones/labels.
 */
export function GraphOverlayPanel({
  overlays,
  view,
  freshness,
  unresolvedNodeIds,
  unresolvedEdgeIds,
  dispatch,
  restrictLabel = "Restrict to focus",
  className,
}: GraphOverlayPanelProps) {
  // LOCKED active-set semantics: undefined → all active; [] → none active.
  const activeIds = view?.activeOverlayIds
  const isActive = (id: string) => (activeIds === undefined ? true : activeIds.includes(id))

  const showOverlay = view?.showOverlay !== false
  const showPaths = view?.showPaths === true
  const restrict = view?.restrictToOverlayFocus === true

  // Legend states come from the active overlays' supplied node states, deduped
  // by (state,tone). No impact vocabulary is assumed here.
  const legend = useMemo(() => {
    const seen = new Map<string, { state: string; tone?: string }>()
    for (const overlay of overlays) {
      if (!isActive(overlay.id)) continue
      for (const ns of overlay.nodeStates ?? []) {
        const key = `${ns.state}:${ns.tone ?? ""}`
        if (!seen.has(key)) seen.set(key, { state: ns.state, tone: ns.tone })
      }
    }
    return [...seen.values()]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlays, activeIds])

  const activeOverlays = overlays.filter((o) => isActive(o.id))
  const paths = activeOverlays.flatMap((o) => o.paths ?? [])
  const unresolvedCount = unresolvedNodeIds.length + unresolvedEdgeIds.length

  if (overlays.length === 0) {
    return (
      <div className={`p-4 text-sm text-muted-foreground ${className ?? ""}`}>
        No overlays supplied for this view.
      </div>
    )
  }

  return (
    <div className={`flex h-full flex-col gap-4 overflow-y-auto p-4 ${className ?? ""}`}>
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Overlays</h2>
        <button
          type="button"
          className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => dispatch({ type: "graph.overlay.clear" })}
        >
          Clear overlay
        </button>
      </header>

      {/* Overlay selection + per-overlay supplied metadata. */}
      <section className="flex flex-col gap-1.5">
        {overlays.map((overlay) => {
          const fresh = freshness.find((f) => f.overlayId === overlay.id)
          const active = isActive(overlay.id)
          return (
            <div
              key={overlay.id}
              className="flex flex-col gap-1 rounded-md border border-border bg-card px-2.5 py-2"
            >
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => {
                    const current = activeIds ?? overlays.map((o) => o.id)
                    const next = active
                      ? current.filter((id) => id !== overlay.id)
                      : [...current, overlay.id]
                    dispatch({ type: "graph.overlay.setActive", overlayIds: next })
                  }}
                  className="h-3.5 w-3.5 accent-primary"
                />
                <span className="truncate font-medium text-foreground">
                  {overlay.label ?? overlay.id}
                </span>
              </label>
              <div className="flex flex-wrap items-center gap-1.5 pl-5.5 text-[11px]">
                {fresh ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-medium"
                    style={{ color: FRESHNESS_COPY[fresh.freshness].tone }}
                  >
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: FRESHNESS_COPY[fresh.freshness].tone }}
                    />
                    {FRESHNESS_COPY[fresh.freshness].label}
                  </span>
                ) : null}
                {overlay.completeness ? (
                  <span className="rounded-sm bg-muted px-1.5 py-0.5 text-muted-foreground">
                    {overlay.completeness}
                  </span>
                ) : null}
                {typeof overlay.sourceRevision === "number" ? (
                  <span className="text-muted-foreground">rev {overlay.sourceRevision}</span>
                ) : null}
              </div>
            </div>
          )
        })}
      </section>

      {/* Independent presentation toggles. */}
      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Display
        </h3>
        <label className={rowButton}>
          <input
            type="checkbox"
            checked={showOverlay}
            onChange={(e) => dispatch({ type: "graph.overlay.show", show: e.target.checked })}
            className="h-3.5 w-3.5 accent-primary"
          />
          <span>Show overlay states</span>
        </label>
        <label className={rowButton}>
          <input
            type="checkbox"
            checked={showPaths}
            onChange={(e) => dispatch({ type: "graph.overlay.showPaths", show: e.target.checked })}
            className="h-3.5 w-3.5 accent-primary"
          />
          <span>Show supporting paths</span>
        </label>
        <label className={rowButton}>
          <input
            type="checkbox"
            checked={restrict}
            onChange={(e) =>
              dispatch({
                type: "graph.overlay.restrictToOverlayFocus",
                restrict: e.target.checked,
              })
            }
            className="h-3.5 w-3.5 accent-primary"
          />
          <span>{restrictLabel}</span>
        </label>
      </section>

      {/* Supplied supporting paths (select one to isolate emphasis). */}
      {paths.length > 0 ? (
        <section className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Supporting paths
          </h3>
          <ul className="flex flex-col gap-0.5">
            <li>
              <button
                type="button"
                className={`${rowButton} w-full ${!view?.activePathId ? "bg-muted" : ""}`}
                onClick={() => dispatch({ type: "graph.overlay.selectPath", pathId: undefined })}
              >
                All paths
              </button>
            </li>
            {paths.map((path) => (
              <li key={path.id}>
                <button
                  type="button"
                  className={`${rowButton} w-full ${
                    view?.activePathId === path.id ? "bg-muted" : ""
                  }`}
                  onClick={() => dispatch({ type: "graph.overlay.selectPath", pathId: path.id })}
                >
                  <span className="truncate">{path.label ?? path.id}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {path.edgeIds.length} edges
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* State legend, from the active overlays' OWN supplied states. */}
      {legend.length > 0 ? (
        <section className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            State legend
          </h3>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs">
            {legend.map((entry) => (
              <span key={`${entry.state}:${entry.tone ?? ""}`} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-sm border border-border"
                  style={{ backgroundColor: `var(--graph-${entry.tone ?? "unknown"})` }}
                />
                <span className="text-foreground">{entry.state}</span>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {/* Unresolved references — always surfaced, never silently dropped. */}
      {unresolvedCount > 0 ? (
        <section
          className="rounded-md border border-border bg-muted/60 px-2.5 py-2 text-xs text-muted-foreground"
          role="status"
        >
          {unresolvedCount} supplied reference{unresolvedCount === 1 ? "" : "s"} not present in the
          loaded graph ({unresolvedNodeIds.length} node, {unresolvedEdgeIds.length} edge).
        </section>
      ) : null}
    </div>
  )
}
