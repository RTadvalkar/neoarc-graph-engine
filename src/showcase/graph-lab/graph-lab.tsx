"use client"

import { useCallback, useState } from "react"
import type { GraphModel, GraphSemanticEvent } from "@neoarc/graph-contracts"
import { GraphExplorer } from "@neoarc/graph-ui"
import { cytoscapeRenderer } from "@neoarc/graph-cytoscape"
import { showcaseRegistries } from "./registries"
import { expandFromBackend } from "./system-graph"
import { GRAPH_LAB_SCENARIOS } from "./scenarios"

/**
 * SHOWCASE controller. It owns the authoritative GraphModel and fulfills the
 * expansion INTENTS the reusable Explorer emits — standing in for a product
 * backend. The library performs no fetches itself; every model change is an
 * explicit response to a typed intent handled here.
 */
export function GraphLab() {
  const [scenarioId, setScenarioId] = useState(GRAPH_LAB_SCENARIOS[0].id)
  const scenario = GRAPH_LAB_SCENARIOS.find((s) => s.id === scenarioId) ?? GRAPH_LAB_SCENARIOS[0]
  const [model, setModel] = useState<GraphModel>(scenario.model)
  const [status, setStatus] = useState<string>(
    `Loaded ${scenario.model.nodes.length} nodes, ${scenario.model.edges.length} relationships.`,
  )

  const handleScenarioChange = useCallback((id: string) => {
    const next = GRAPH_LAB_SCENARIOS.find((s) => s.id === id) ?? GRAPH_LAB_SCENARIOS[0]
    setScenarioId(id)
    setModel(next.model)
    setStatus(`Loaded ${next.model.nodes.length} nodes, ${next.model.edges.length} relationships.`)
  }, [])

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
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-xl font-semibold text-foreground">NeoArc Graph Lab</h1>
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
            renderer: Cytoscape v1
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Graph Lab scenarios">
          {GRAPH_LAB_SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={s.id === scenarioId}
              onClick={() => handleScenarioChange(s.id)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                s.id === scenarioId
                  ? "border-ring bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:bg-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <p className="text-pretty text-sm text-muted-foreground">{scenario.description}</p>
      </header>

      <div className="min-h-0 flex-1">
        <GraphExplorer
          key={scenarioId}
          model={model}
          registries={showcaseRegistries}
          renderer={cytoscapeRenderer}
          initialViewState={scenario.initialViewState}
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
