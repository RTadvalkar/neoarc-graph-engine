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
  readonly query: string
  readonly onQueryChange: (query: string) => void
  /** Node ids currently selected — expansion roots for the query intent. */
  readonly selectedNodeIds: readonly GraphId[]
  /** Emits an authoritative expand intent; the host fulfills it. */
  readonly onExpandRequest: (request: GraphQueryRequest) => void
}

const DIRECTIONS: readonly GraphTraversalDirection[] = ["both", "outgoing", "incoming"]

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
  query,
  onQueryChange,
  selectedNodeIds,
  onExpandRequest,
}: GraphToolbarProps) {
  const [maxHops, setMaxHops] = useState(1)
  const [direction, setDirection] = useState<GraphTraversalDirection>("both")

  const canExpand = selectedNodeIds.length > 0

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
      </div>

      <div className="h-6 w-px bg-border" aria-hidden="true" />

      {/* Arbitrary N-hop expansion — emits a typed intent only. */}
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="graph-hops">
          Hops
        </label>
        <input
          id="graph-hops"
          type="number"
          min={1}
          max={99}
          value={maxHops}
          onChange={(e) => setMaxHops(Math.max(1, Number(e.target.value) || 1))}
          className={`${fieldClass} w-14`}
        />
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
          disabled={!canExpand}
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

      <div className="ml-auto flex items-center gap-1.5">
        <input
          type="search"
          placeholder="Search nodes…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className={`${fieldClass} w-48`}
          aria-label="Search loaded nodes"
        />
      </div>
    </div>
  )
}
