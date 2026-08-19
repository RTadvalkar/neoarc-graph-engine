"use client"

import { useState } from "react"
import type {
  GraphId,
  GraphQueryRequest,
  GraphTraversalDirection,
} from "@neoarc/graph-contracts"
import type { RendererLayoutDescriptor } from "@neoarc/graph-renderer"

export interface GraphToolbarProps {
  readonly layouts: readonly RendererLayoutDescriptor[]
  readonly activeLayoutId?: string
  readonly onLayoutChange: (layoutId: string) => void
  readonly onFit: () => void
  readonly onZoomIn: () => void
  readonly onZoomOut: () => void
  /**
   * Forces a full, from-scratch recompute of the *current* layout. This is
   * the only mechanism that may fully re-layout automatically-stable
   * layouts (e.g. Hierarchy) — automatic topology changes never do this on
   * their own, so a deliberate action is always available.
   */
  readonly onRelayout: () => void
  readonly query: string
  readonly onQueryChange: (query: string) => void
  /** Node ids currently selected — expansion roots for the query intent. */
  readonly selectedNodeIds: readonly GraphId[]
  /** Emits an authoritative expand intent; the host fulfills it. */
  readonly onExpandRequest: (request: GraphQueryRequest) => void
  /** "Open branch as focus": local, loaded-graph-only neighborhood restriction. */
  readonly onFocusRequest: (maxHops: number, direction: GraphTraversalDirection) => void
  readonly isFocused: boolean
  readonly onResetFocus: () => void
  readonly isFullscreen: boolean
  readonly onToggleFullscreen: () => void
  readonly onToggleFilters: () => void
  readonly filtersActive: boolean
}

const DIRECTIONS: readonly GraphTraversalDirection[] = ["both", "outgoing", "incoming"]

/** Fixed hop presets plus an arbitrary custom value — maxHops itself stays a plain number. */
const HOP_PRESETS = [1, 2, 3, 5, 10] as const

const fieldClass =
  "h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
const btnClass =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"

export function GraphToolbar({
  layouts,
  activeLayoutId,
  onLayoutChange,
  onFit,
  onZoomIn,
  onZoomOut,
  onRelayout,
  query,
  onQueryChange,
  selectedNodeIds,
  onExpandRequest,
  onFocusRequest,
  isFocused,
  onResetFocus,
  isFullscreen,
  onToggleFullscreen,
  onToggleFilters,
  filtersActive,
}: GraphToolbarProps) {
  const [maxHops, setMaxHops] = useState<number>(1)
  const [hopPreset, setHopPreset] = useState<string>("1")
  const [direction, setDirection] = useState<GraphTraversalDirection>("both")

  const canExpand = selectedNodeIds.length > 0
  const canFocus = selectedNodeIds.length === 1

  const handleHopPresetChange = (value: string) => {
    setHopPreset(value)
    if (value !== "custom") setMaxHops(Number(value))
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="graph-layout">
          Layout
        </label>
        <select
          id="graph-layout"
          className={fieldClass}
          value={activeLayoutId ?? layouts[0]?.id}
          onChange={(e) => onLayoutChange(e.target.value)}
        >
          {layouts.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <button type="button" className={btnClass} onClick={onZoomOut} aria-label="Zoom out">
          −
        </button>
        <button type="button" className={btnClass} onClick={onZoomIn} aria-label="Zoom in">
          +
        </button>
        <button type="button" className={btnClass} onClick={onFit}>
          Fit
        </button>
        <button
          type="button"
          className={btnClass}
          title="Force a full recompute of the current layout"
          onClick={onRelayout}
        >
          Re-layout
        </button>
      </div>

      <div className="h-6 w-px bg-border" aria-hidden="true" />

      {/* Arbitrary N-hop exploration. maxHops is always a plain number — the
          presets below are UI convenience only, never a closed contract union. */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="graph-hops">
          Hops
        </label>
        <select
          id="graph-hops"
          aria-label="Hop preset"
          className={fieldClass}
          value={hopPreset}
          onChange={(e) => handleHopPresetChange(e.target.value)}
        >
          {HOP_PRESETS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
        {hopPreset === "custom" ? (
          <input
            type="number"
            min={1}
            max={999}
            value={maxHops}
            aria-label="Custom hop count"
            onChange={(e) => setMaxHops(Math.max(1, Number(e.target.value) || 1))}
            className={`${fieldClass} w-14`}
          />
        ) : null}
        <select
          aria-label="Traversal direction"
          className={fieldClass}
          value={direction}
          onChange={(e) => setDirection(e.target.value as GraphTraversalDirection)}
        >
          {DIRECTIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={btnClass}
          disabled={!canFocus}
          title="Restrict the view to this node's local neighborhood (loaded-graph only)"
          onClick={() => onFocusRequest(maxHops, direction)}
        >
          Focus
        </button>
        <button
          type="button"
          className={btnClass}
          disabled={!isFocused}
          onClick={onResetFocus}
        >
          Reset focus
        </button>
        <button
          type="button"
          className={btnClass}
          disabled={!canExpand}
          title="Request authoritative expansion from the host (may fetch)"
          onClick={() =>
            onExpandRequest({
              kind: "expand",
              rootNodeIds: selectedNodeIds,
              maxHops,
              direction,
            })
          }
        >
          Expand
        </button>
      </div>

      <div className="h-6 w-px bg-border" aria-hidden="true" />

      <button
        type="button"
        className={`${btnClass} ${filtersActive ? "border-ring bg-muted" : ""}`}
        aria-pressed={filtersActive}
        onClick={onToggleFilters}
      >
        Filters
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <input
          type="search"
          placeholder="Search nodes…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className={`${fieldClass} w-48`}
          aria-label="Search loaded nodes"
        />
        <button
          type="button"
          className={btnClass}
          aria-pressed={isFullscreen}
          onClick={onToggleFullscreen}
        >
          {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        </button>
      </div>
    </div>
  )
}
