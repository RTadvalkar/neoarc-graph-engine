"use client"

import { useRef } from "react"
import type {
  GraphModel,
  GraphQueryRequest,
  GraphSemanticEvent,
  GraphViewEdge,
  GraphViewNode,
  GraphViewState,
} from "@neoarc/graph-contracts"
import type { GraphRegistries } from "@neoarc/graph-core"
import type { GraphRenderer } from "@neoarc/graph-renderer"
import { GraphCanvas, type GraphCanvasHandle } from "./graph-canvas"
import { GraphToolbar } from "./graph-toolbar"
import { GraphInspector } from "./graph-inspector"
import { GraphNodeList } from "./graph-node-list"
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
  const controller = useGraphExplorer({ model, initialViewState, onIntent })
  const { viewState, viewModel, dispatch, setQuery, setLayoutId } = controller

  const activeLayoutId = viewState.layoutId ?? renderer.availableLayouts[0]?.id

  const handleExpand = (request: GraphQueryRequest) => {
    dispatch({ type: "graph.expand.request", request })
  }

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card ${className ?? ""}`}
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
            className="absolute inset-0 h-full w-full"
          />
        </div>

        <aside className="hidden min-h-0 overflow-y-auto border-l border-border bg-card md:block">
          <GraphInspector
            viewModel={viewModel}
            registries={registries}
            renderNodeExtras={renderNodeExtras}
            renderEdgeExtras={renderEdgeExtras}
          />
        </aside>
      </div>
    </div>
  )
}
