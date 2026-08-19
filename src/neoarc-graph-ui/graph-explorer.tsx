"use client"

import { useState } from "react"
import { useRef } from "react"
import type {
  GraphModel,
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
import { GraphLegend } from "./graph-legend"
import { GraphMinimap } from "./graph-minimap"
import { useGraphExplorer } from "./use-graph-explorer"

export interface GraphExplorerProps {
  readonly model: GraphModel
  readonly registries: GraphRegistries
  readonly renderer: GraphRenderer
  readonly initialViewState?: Partial<GraphViewState>
  /** Authoritative intents (expand/search/path/impact) the host must fulfill. */
  readonly onIntent?: (event: GraphSemanticEvent) => void
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
  onIntent,
  renderNodeExtras,
  renderEdgeExtras,
  className,
}: GraphExplorerProps) {
  const canvasRef = useRef<GraphCanvasHandle | null>(null)
  const [rendererHandle, setRendererHandle] = useState<GraphRendererHandle | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const controller = useGraphExplorer({ model, initialViewState, onIntent })
  const { viewState, viewModel, dispatch, setQuery, setFilterState, setLayoutId, toggleCollapse } =
    controller

  const activeLayoutId = viewState.layoutId ?? renderer.availableLayouts[0]?.id
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
        onLayoutChange={(id) => {
          setLayoutId(id)
          canvasRef.current?.runLayout()
        }}
        onFit={() => canvasRef.current?.fit()}
        onZoomIn={() => canvasRef.current?.zoomBy(1.2)}
        onZoomOut={() => canvasRef.current?.zoomBy(1 / 1.2)}
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
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[16rem_1fr_20rem]">
        <aside className="hidden min-h-0 border-r border-border bg-background md:block">
          <GraphNodeList
            viewModel={viewModel}
            registries={registries}
            onSelect={(nodeId) => dispatch({ type: "graph.node.select", nodeId })}
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
        </div>

        <aside className="hidden min-h-0 overflow-y-auto border-l border-border bg-card md:block">
          <GraphInspector
            viewModel={viewModel}
            registries={registries}
            renderNodeExtras={renderNodeExtras}
            renderEdgeExtras={renderEdgeExtras}
            onToggleCollapse={toggleCollapse}
          />
        </aside>
      </div>
    </div>
  )
}
