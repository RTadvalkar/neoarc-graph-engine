"use client"

import { useState } from "react"
import { useRef } from "react"
import type {
  GraphModel,
  GraphOverlay,
  GraphQueryRequest,
  GraphSemanticEvent,
  GraphTraversalDirection,
  GraphViewEdge,
  GraphViewNode,
  GraphViewState,
} from "@neoarc/graph-contracts"
import type { GraphRegistries } from "@neoarc/graph-core"
import type { GraphRenderer, GraphRendererHandle } from "@neoarc/graph-renderer"
import { GraphCanvas, type GraphCanvasHandle } from "./graph-canvas"
import { GraphToolbar } from "./graph-toolbar"
import { GraphInspector } from "./graph-inspector"
import { GraphNodeList } from "./graph-node-list"
import { GraphFiltersPanel } from "./graph-filters-panel"
import { GraphOverlayPanel } from "./graph-overlay-panel"
import { GraphLegend } from "./graph-legend"
import { GraphMinimap } from "./graph-minimap"
import { useGraphExplorer } from "./use-graph-explorer"
import { buildSpatialMemoryKey } from "./spatial-memory"

export interface GraphExplorerProps {
  readonly model: GraphModel
  readonly registries: GraphRegistries
  readonly renderer: GraphRenderer
  readonly initialViewState?: Partial<GraphViewState>
  /** Supplied overlays (impact/search/risk). When present, the overlay panel is enabled. */
  readonly overlays?: readonly GraphOverlay[]
  /** Label for the overlay focus-restriction toggle (e.g. "Impacted only"). */
  readonly overlayRestrictLabel?: string
  /** Authoritative intents (expand/search/path/impact) the host must fulfill. */
  readonly onIntent?: (event: GraphSemanticEvent) => void
  /**
   * Observational only: fired exactly once for every dispatched
   * `GraphSemanticEvent`, forwarded verbatim from the controller.
   */
  readonly onEvent?: (event: GraphSemanticEvent) => void
  /**
   * Host fulfillment for a `registries.actions` entry. `context.target` is
   * always the action's own `target` ("node"/"edge"/"canvas"/"selection");
   * `context.id` is the node/edge id for node/edge-targeted actions.
   */
  readonly onAction?: (
    actionId: string,
    context: { readonly target: "node" | "edge" | "canvas" | "selection"; readonly id?: string },
  ) => void
  /**
   * Stable identity for "the thing being explored" (e.g. a scenario id, a
   * saved query id, or a root node id) — distinct from `GraphModel`'s
   * revision, which changes on every automatic data update. Used as part of
   * the spatial-memory cache key so a scenario switch gets a fresh/restored
   * arrangement while an in-place data update on the *same* scenario never
   * evicts the mental map. Defaults to `"default"` when the host has only
   * one view to explore.
   */
  readonly viewIdentity?: string
  readonly renderNodeExtras?: (node: GraphViewNode) => React.ReactNode
  readonly renderEdgeExtras?: (edge: GraphViewEdge) => React.ReactNode
  readonly className?: string
}

/**
 * The reusable Graph Explorer shell. Domain- and renderer-neutral: it wires the
 * headless controller (state + view-model), a pluggable canvas, and inspection
 * panels. Products supply the model, registries, a renderer, and intent
 * handlers — nothing here knows about TestCopilot, Neo4j, or Cytoscape.
 */
export function GraphExplorer({
  model,
  registries,
  renderer,
  initialViewState,
  overlays,
  overlayRestrictLabel,
  onIntent,
  onEvent,
  onAction,
  viewIdentity = "default",
  renderNodeExtras,
  renderEdgeExtras,
  className,
}: GraphExplorerProps) {
  const canvasRef = useRef<GraphCanvasHandle | null>(null)
  const [rendererHandle, setRendererHandle] = useState<GraphRendererHandle | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const controller = useGraphExplorer({ model, initialViewState, overlays, onIntent, onEvent })
  const {
    viewState,
    viewModel,
    overlayFreshness,
    unresolvedOverlayNodeIds,
    unresolvedOverlayEdgeIds,
    dispatch,
    setQuery,
    setFilterState,
    setLayoutId,
    toggleCollapse,
  } = controller
  const hasOverlays = (overlays?.length ?? 0) > 0

  const activeLayoutId = viewState.layoutId ?? renderer.availableLayouts[0]?.id
  const spatialMemoryKey = buildSpatialMemoryKey(viewIdentity, renderer.id, activeLayoutId ?? "default")
  const filters = viewState.filters ?? {}
  const filtersActive =
    (filters.nodeTypes?.length ?? 0) > 0 ||
    (filters.edgeTypes?.length ?? 0) > 0 ||
    (filters.statuses?.length ?? 0) > 0 ||
    (filters.facets?.length ?? 0) > 0

  const handleExpand = (request: GraphQueryRequest) => {
    dispatch({ type: "graph.expand.request", request })
  }

  const handleFocus = (maxHops: number, direction: GraphTraversalDirection) => {
    const nodeId = viewState.selectedNodeIds[0]
    if (!nodeId) return
    dispatch({ type: "graph.focus.explore", focus: { nodeId, maxHops, direction } })
  }

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""
      } ${className ?? ""}`}
    >
      <GraphToolbar
        layouts={renderer.availableLayouts}
        activeLayoutId={activeLayoutId}
        onLayoutChange={setLayoutId}
        onFit={() => canvasRef.current?.fit()}
        onZoomIn={() => canvasRef.current?.zoomBy(1.2)}
        onZoomOut={() => canvasRef.current?.zoomBy(1 / 1.2)}
        onRelayout={() => canvasRef.current?.runLayout()}
        query={viewState.filters?.query ?? ""}
        onQueryChange={setQuery}
        selectedNodeIds={viewState.selectedNodeIds}
        onExpandRequest={handleExpand}
        onFocusRequest={handleFocus}
        isFocused={!!viewState.explorationFocus}
        onResetFocus={() => dispatch({ type: "graph.focus.reset" })}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen((v) => !v)}
        onToggleFilters={() => setFiltersOpen((v) => !v)}
        filtersActive={filtersActive}
        onToggleOverlays={hasOverlays ? () => setOverlayOpen((v) => !v) : undefined}
        overlaysActive={overlayOpen}
        actions={registries.actions.values()}
        onAction={onAction}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[16rem_1fr_20rem]">
        <aside className="hidden min-h-0 border-r border-border bg-background md:block">
          <GraphNodeList
            viewModel={viewModel}
            registries={registries}
            onSelect={(nodeId) => dispatch({ type: "graph.node.select", nodeId })}
            onSelectEdge={(edgeId) => dispatch({ type: "graph.edge.select", edgeId })}
          />
        </aside>

        <div className="relative min-h-0 min-w-0 bg-background">
          <GraphCanvas
            ref={canvasRef}
            renderer={renderer}
            viewModel={viewModel}
            registries={registries}
            layoutId={activeLayoutId}
            onEvent={dispatch}
            onRendererReady={setRendererHandle}
            spatialMemoryKey={spatialMemoryKey}
            className="absolute inset-0 h-full w-full"
          />

          <GraphLegend
            model={model}
            registries={registries}
            className="pointer-events-none absolute left-3 top-3"
          />

          <GraphMinimap handle={rendererHandle} className="absolute bottom-3 right-3" />

          {filtersOpen ? (
            <div className="absolute inset-y-0 left-0 w-64 border-r border-border bg-card shadow-lg">
              <GraphFiltersPanel
                model={model}
                registries={registries}
                filters={filters}
                onChange={setFilterState}
                onClose={() => setFiltersOpen(false)}
              />
            </div>
          ) : null}

          {hasOverlays && overlayOpen ? (
            <div className="absolute inset-y-0 right-0 w-72 border-l border-border bg-card shadow-lg">
              <GraphOverlayPanel
                overlays={overlays ?? []}
                view={viewState.overlay}
                freshness={overlayFreshness}
                unresolvedNodeIds={unresolvedOverlayNodeIds}
                unresolvedEdgeIds={unresolvedOverlayEdgeIds}
                dispatch={dispatch}
                restrictLabel={overlayRestrictLabel}
              />
            </div>
          ) : null}
        </div>

        <aside className="hidden min-h-0 overflow-y-auto border-l border-border bg-card md:block">
          <GraphInspector
            viewModel={viewModel}
            registries={registries}
            renderNodeExtras={renderNodeExtras}
            renderEdgeExtras={renderEdgeExtras}
            onToggleCollapse={toggleCollapse}
            onAction={onAction}
          />
        </aside>
      </div>
    </div>
  )
}
