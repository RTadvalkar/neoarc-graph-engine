"use client"

import { useCallback, useState } from "react"
import type { GraphModel, GraphSemanticEvent } from "@neoarc/graph-contracts"
import { GraphExplorer } from "@neoarc/graph-ui"
import { cytoscapeRenderer } from "@neoarc/graph-cytoscape"
import { showcaseRegistries } from "./registries"
import { SYSTEM_GRAPH, expandFromBackend } from "./system-graph"

/**
 * SHOWCASE controller. It owns the authoritative GraphModel and fulfills the
 * expansion INTENTS the reusable Explorer emits — standing in for a product
 * backend. The library performs no fetches itself; every model change is an
 * explicit response to a typed intent handled here.
 */
export function GraphLab() {
  const [model, setModel] = useState<GraphModel>(SYSTEM_GRAPH)
  const [status, setStatus] = useState<string>(
    `Loaded ${SYSTEM_GRAPH.nodes.length} nodes, ${SYSTEM_GRAPH.edges.length} relationships.`,
  )

  const handleIntent = useCallback((event: GraphSemanticEvent) => {
    if (event.type !== "graph.expand.request") {
      setStatus(`Intent emitted: ${event.type} (no product handler wired in this demo).`)
      return
    }
    const { rootNodeIds = [], direction = "both", maxHops = 1 } = event.request
    setModel((current) => {
      const loaded = new Set(current.nodes.map((n) => n.id))
      const { nodes, edges } = expandFromBackend(loaded, rootNodeIds, direction, maxHops)
      if (nodes.length === 0 && edges.length === 0) {
        setStatus(
          `Expanded ${rootNodeIds.length} node(s) ${direction}, ${maxHops} hop(s): nothing new from backend.`,
        )
        return current
      }
      const existingEdgeIds = new Set(current.edges.map((e) => e.id))
      const mergedEdges = [...current.edges, ...edges.filter((e) => !existingEdgeIds.has(e.id))]
      setStatus(
        `Expanded ${rootNodeIds.length} node(s) ${direction}, ${maxHops} hop(s): +${nodes.length} nodes, +${edges.length} relationships.`,
      )
      return {
        ...current,
        revision: (current.revision ?? 1) + 1,
        nodes: [...current.nodes, ...nodes],
        edges: mergedEdges,
      }
    })
  }, [])

  return (
    <div className="flex h-[100dvh] flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold text-foreground">NeoArc Graph Lab</h1>
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
            renderer: Cytoscape v1
          </span>
        </div>
        <p className="text-pretty text-sm text-muted-foreground">
          Reusable graph exploration over a multi-service system. Select a node, then Expand to emit
          an N-hop intent the showcase backend fulfills. Canvas, state, and renderer are fully
          decoupled layers.
        </p>
      </header>

      <div className="min-h-0 flex-1">
        <GraphExplorer
          model={model}
          registries={showcaseRegistries}
          renderer={cytoscapeRenderer}
          initialViewState={{ layoutId: "breadthfirst" }}
          onIntent={handleIntent}
        />
      </div>

      <footer
        className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground"
        aria-live="polite"
      >
        {status}
      </footer>
    </div>
  )
}
