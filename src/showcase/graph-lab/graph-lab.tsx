"use client"

import { useCallback, useState } from "react"
import type {
  GraphChangeSet,
  GraphId,
  GraphModel,
  GraphPatch,
  GraphSemanticEvent,
} from "@neoarc/graph-contracts"
import { GraphExplorer } from "@neoarc/graph-ui"
import { applyGraphPatch, deriveGraphChangeSet } from "@neoarc/graph-core"
import { cytoscapeRenderer } from "@neoarc/graph-cytoscape"
import { showcaseRegistries } from "./registries"
import { buildAgentUpdatePatch, expandFromBackend } from "./system-graph"
import { GRAPH_LAB_SCENARIOS } from "./scenarios"
import { GraphDevPanel } from "./graph-dev-panel"

/**
 * SHOWCASE ONLY. Renders a `GraphChangeSet` (derived against the pre-patch
 * model, which is why edge endpoint labels are looked up there) as a short,
 * structured list of what an agent-supplied patch changed — never inferred,
 * only what the patch itself declared.
 */
function formatChangeSummary(
  changeSet: GraphChangeSet,
  patch: GraphPatch,
  preModel: GraphModel,
): string[] {
  const labelOf = (id: GraphId): string =>
    patch.addNodes?.find((n) => n.id === id)?.label ??
    patch.updateNodes?.find((n) => n.id === id)?.label ??
    preModel.nodes.find((n) => n.id === id)?.label ??
    id

  const lines: string[] = []
  for (const id of changeSet.addedNodeIds ?? []) lines.push(`+ ${labelOf(id)}`)
  const relCount = changeSet.addedEdgeIds?.length ?? 0
  if (relCount > 0) lines.push(`+ ${relCount} relationship${relCount === 1 ? "" : "s"}`)
  for (const id of changeSet.updatedNodeIds ?? []) lines.push(`~ ${labelOf(id)}`)
  for (const ref of changeSet.removedEdgeRefs ?? []) {
    const sourceLabel = preModel.nodes.find((n) => n.id === ref.source)?.label ?? ref.source
    const targetLabel = preModel.nodes.find((n) => n.id === ref.target)?.label ?? ref.target
    lines.push(`- ${ref.type} ${sourceLabel} → ${targetLabel}`)
  }
  for (const ref of changeSet.removedNodeRefs ?? []) lines.push(`- ${ref.label ?? ref.id}`)
  return lines
}

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
  const [changeSummary, setChangeSummary] = useState<readonly string[] | null>(null)
  const [lastEvent, setLastEvent] = useState<GraphSemanticEvent | undefined>(undefined)
  const [eventCount, setEventCount] = useState(0)

  const handleScenarioChange = useCallback((id: string) => {
    const next = GRAPH_LAB_SCENARIOS.find((s) => s.id === id) ?? GRAPH_LAB_SCENARIOS[0]
    setScenarioId(id)
    setModel(next.model)
    setStatus(`Loaded ${next.model.nodes.length} nodes, ${next.model.edges.length} relationships.`)
    setChangeSummary(null)
    setLastEvent(undefined)
    setEventCount(0)
  }, [])

  /**
   * Renderer-boundary proof: purely observational — records the latest
   * dispatched event for the dev panel. Never fulfills anything; `onIntent`
   * remains the sole authoritative-intent path below.
   */
  const handleEvent = useCallback((event: GraphSemanticEvent) => {
    setLastEvent(event)
    setEventCount((c) => c + 1)
  }, [])

  /**
   * Fulfills `registries.actions` entries. Showcase-only: node/edge actions
   * just report status text (no backend wiring per G4 scope); the canvas
   * "Reset view" action clears selection through the ordinary selection
   * event path via a ref set by GraphExplorer would be ideal, but since
   * clearing selection is a view-only concern the Explorer already owns
   * internally, this demo simply surfaces what was requested.
   */
  const handleAction = useCallback(
    (actionId: string, context: { target: "node" | "edge" | "canvas" | "selection"; id?: string }) => {
      setStatus(
        context.id
          ? `Action "${actionId}" requested for ${context.target} "${context.id}" (no backend wired in this demo).`
          : `Action "${actionId}" requested for ${context.target} (no backend wired in this demo).`,
      )
    },
    [],
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
      // Every model change — including expansion — goes through the same
      // supplied-patch application path as an agent update, rather than
      // hand-rolling a merge here.
      const existingEdgeIds = new Set(current.edges.map((e) => e.id))
      const newEdges = edges.filter((e) => !existingEdgeIds.has(e.id))
      const patch: GraphPatch = {
        baseRevision: current.revision,
        resultRevision: (current.revision ?? 1) + 1,
        addNodes: nodes,
        addEdges: newEdges,
      }
      const result = applyGraphPatch(current, patch)
      if (result.status !== "applied") {
        setStatus(`Expansion rejected (${result.status}): ${result.reason ?? "unknown reason"}.`)
        return current
      }
      setStatus(
        `Expanded ${rootNodeIds.length} node(s) ${direction}, ${maxHops} hop(s): +${nodes.length} nodes, +${newEdges.length} relationships.`,
      )
      setChangeSummary(null)
      return result.model
    })
  }, [])

  /**
   * Simulates an autonomous agent proposing a supplied `GraphPatch` against
   * whatever model is currently loaded — proving `applyGraphPatch` and
   * `deriveGraphChangeSet` end to end, including the removal-visibility
   * case, without ever mutating selection or exploration focus (those live
   * in the Explorer's own view state and are untouched by a model update).
   */
  const handleSimulateAgentUpdate = useCallback(() => {
    setModel((current) => {
      const simulation = buildAgentUpdatePatch(current)
      if (!simulation) {
        setStatus("Simulate agent update: nothing to simulate on an empty graph.")
        return current
      }
      const { patch, sourceRefs } = simulation
      const result = applyGraphPatch(current, patch)
      if (result.status !== "applied") {
        setStatus(`Simulated agent update rejected (${result.status}): ${result.reason ?? "unknown reason"}.`)
        return current
      }
      const changeSet = deriveGraphChangeSet(
        current,
        patch,
        `agent-update-${current.revision ?? 1}`,
        sourceRefs,
      )
      setStatus("Simulated agent update applied — see change summary below.")
      setChangeSummary(formatChangeSummary(changeSet, patch, current))
      return result.model
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

        <div className="flex flex-wrap items-center justify-between gap-2">
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

          <button
            type="button"
            onClick={handleSimulateAgentUpdate}
            title="Apply a supplied GraphPatch as if an autonomous agent proposed it — proves patch application and the change summary end to end."
            className="inline-flex h-7 items-center rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Simulate agent update
          </button>
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
          viewIdentity={scenarioId}
          onIntent={handleIntent}
          onEvent={handleEvent}
          onAction={handleAction}
        />
      </div>

      <GraphDevPanel
        model={model}
        lastEvent={lastEvent}
        eventCount={eventCount}
        rendererId={cytoscapeRenderer.id}
      />

      {changeSummary && changeSummary.length > 0 ? (
        <div
          className="flex flex-col gap-1 rounded-md border border-border bg-card px-3 py-2 text-xs"
          aria-live="polite"
        >
          <span className="font-medium text-foreground">Agent update — change summary</span>
          <ul className="flex flex-col gap-0.5 font-mono text-muted-foreground">
            {changeSummary.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <footer
        className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground"
        aria-live="polite"
      >
        {status}
      </footer>
    </div>
  )
}
