"use client"

import { useCallback, useMemo, useState } from "react"
import type {
  GraphModel,
  GraphOverlayFreshness,
  GraphPatch,
  GraphSemanticEvent,
  GraphViewEdge,
  GraphViewNode,
} from "@neoarc/graph-contracts"
import { GraphExplorer } from "@neoarc/graph-ui"
import { applyGraphPatch, resolveOverlayFreshness } from "@neoarc/graph-core"
import { cytoscapeRenderer } from "@neoarc/graph-cytoscape"
import { showcaseRegistries } from "../graph-lab/registries"
import { IMPACT_CHANGE_INTENT, IMPACT_SYSTEM_GRAPH } from "./impact-scenario"
import { IMPACT_RESULT } from "./impact-result"
import { ImpactReport } from "./impact-report"

/** Supplied per-node extras (reason/hop) rendered via the reusable inspector seam. */
function renderNodeExtras(node: GraphViewNode) {
  const entry = node.overlays?.[0]
  if (!entry) return null
  const reason = typeof entry.properties?.reason === "string" ? entry.properties.reason : undefined
  const hop = entry.properties?.hop
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/60 px-2.5 py-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-semibold uppercase tracking-wide text-muted-foreground">Impact</span>
        <span
          className="rounded-sm px-1.5 py-0.5 font-medium text-background"
          style={{ backgroundColor: `var(--graph-${entry.tone ?? "unknown"})` }}
        >
          {entry.state}
        </span>
        {typeof hop === "number" ? (
          <span className="text-muted-foreground">{hop} hop{hop === 1 ? "" : "s"}</span>
        ) : null}
      </div>
      {reason ? <p className="text-pretty text-foreground">{reason}</p> : null}
      {node.onSupportingPathIds && node.onSupportingPathIds.length > 0 ? (
        <p className="text-muted-foreground">
          On {node.onSupportingPathIds.length} supporting path
          {node.onSupportingPathIds.length === 1 ? "" : "s"}.
        </p>
      ) : null}
    </div>
  )
}

/** Supplied per-edge extras (state + supporting-path membership). */
function renderEdgeExtras(edge: GraphViewEdge) {
  const entry = edge.overlays?.[0]
  const onPaths = edge.onSupportingPathIds ?? []
  if (!entry && onPaths.length === 0) return null
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/60 px-2.5 py-2 text-xs">
      {entry ? (
        <div className="flex items-center gap-2">
          <span className="font-semibold uppercase tracking-wide text-muted-foreground">Impact</span>
          <span
            className="rounded-sm px-1.5 py-0.5 font-medium text-background"
            style={{ backgroundColor: `var(--graph-${entry.tone ?? "unknown"})` }}
          >
            {entry.state}
          </span>
        </div>
      ) : null}
      {onPaths.length > 0 ? (
        <p className="text-muted-foreground">
          On supporting path{onPaths.length === 1 ? "" : "s"}: {onPaths.join(", ")}
        </p>
      ) : null}
    </div>
  )
}

/**
 * SHOWCASE ONLY. Demonstrates query-aware IMPACT VISUALIZATION end to end:
 * a supplied impact overlay is layered over the graph, the report is derived
 * purely from supplied fields, and an agent update bumps the model revision
 * to flip the report STALE — WITHOUT any recompute or any change to the
 * overlay itself, proving the "continuous graph, no silent recompute"
 * invariant. Impact logic lives nowhere in this app; only supplied data does.
 */
export function ImpactAnalysis() {
  const [stage, setStage] = useState<"trigger" | "graph">("trigger")
  const [model, setModel] = useState<GraphModel>(IMPACT_SYSTEM_GRAPH)
  const [reportOpen, setReportOpen] = useState(false)
  const [status, setStatus] = useState<string>(
    "Impact analysis completed. Open the impact graph to review the supplied result.",
  )

  // Freshness is a live comparison of the SUPPLIED overlay vs. the CURRENT
  // model — the only thing that changes when an agent update bumps revision.
  const freshness: GraphOverlayFreshness = useMemo(
    () => resolveOverlayFreshness(model, IMPACT_RESULT),
    [model],
  )

  const overlays = useMemo(() => [IMPACT_RESULT], [])

  const handleIntent = useCallback((event: GraphSemanticEvent) => {
    if (event.type === "graph.impact.request") {
      // "Fulfill" the authoritative impact intent by re-supplying the SAME
      // mock result — proving the emit/consume seam without any impact logic.
      setStatus(
        "Re-analyze impact: backend returned the supplied result (revision 41). No client-side impact computation.",
      )
      return
    }
    setStatus(`Intent emitted: ${event.type} (no product handler wired for this demo).`)
  }, [])

  // Simulate a downstream agent update: a tiny supplied patch that bumps the
  // model revision to 43. It must NOT touch the overlay — the report simply
  // reads STALE via resolveOverlayFreshness. The graph stays spatially stable.
  const handleSimulateAgentUpdate = useCallback(() => {
    setModel((current) => {
      if ((current.revision ?? 0) >= 43) {
        setStatus("Model already at revision 43 — the supplied impact result is stale.")
        return current
      }
      const patch: GraphPatch = {
        baseRevision: current.revision,
        resultRevision: 43,
        addNodes: [
          {
            id: "svc-guardrails",
            type: "Service",
            label: "Guardrails Service",
            properties: { team: "AI Platform", introducedBy: "agent" },
          },
        ],
        addEdges: [
          {
            id: "e-int-guard",
            type: "dependsOn",
            source: "svc-intelligence",
            target: "svc-guardrails",
          },
        ],
      }
      const result = applyGraphPatch(current, patch)
      if (result.status !== "applied") {
        setStatus(`Agent update rejected (${result.status}): ${result.reason ?? "unknown"}.`)
        return current
      }
      setStatus(
        "Downstream agent update applied → model is now revision 43. The impact result (revision 41) is STALE — it was NOT recomputed.",
      )
      return result.model
    })
  }, [])

  if (stage === "trigger") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center p-6">
        <div className="flex max-w-lg flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
            Impact analysis completed
          </span>
          <h1 className="text-balance text-xl font-semibold text-foreground">
            {IMPACT_CHANGE_INTENT.title}
          </h1>
          <p className="text-pretty text-sm text-muted-foreground">
            A supplied impact result is ready for review. Root entity: Intelligence Service.
            Completeness: truncated at 3 hops. Nothing is computed in the browser — the graph
            visualizes a result the backend produced.
          </p>
          <button
            type="button"
            onClick={() => setStage("graph")}
            className="inline-flex h-9 w-fit items-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            View impact graph
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[100dvh] flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-xl font-semibold text-foreground">NeoArc Impact Analysis</h1>
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
            renderer: Cytoscape v1
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              freshness === "current"
                ? "bg-muted text-foreground"
                : "border border-[color:var(--graph-danger)] text-[color:var(--graph-danger)]"
            }`}
          >
            report: {freshness === "current" ? "current" : freshness.toUpperCase()}
          </span>
        </div>

        <p className="text-pretty text-sm text-muted-foreground">
          Change under analysis: <span className="text-foreground">{IMPACT_CHANGE_INTENT.title}</span>.
          Use the <span className="text-foreground">Overlays</span> toolbar button to toggle state
          presentation, supporting paths, and “Impacted only”.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleIntent({ type: "graph.impact.request", request: { kind: "impact", rootNodeIds: IMPACT_CHANGE_INTENT.rootEntityIds } })}
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Re-analyze impact
          </button>
          <button
            type="button"
            onClick={() => setReportOpen((v) => !v)}
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            {reportOpen ? "Hide impact report" : "Save impact report"}
          </button>
          <button
            type="button"
            onClick={handleSimulateAgentUpdate}
            title="Apply a supplied GraphPatch bumping the model revision to 43. The overlay is NOT recomputed — the report flips to STALE."
            className="inline-flex h-8 items-center rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Simulate downstream agent update
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <GraphExplorer
          model={model}
          registries={showcaseRegistries}
          renderer={cytoscapeRenderer}
          overlays={overlays}
          overlayRestrictLabel="Impacted only"
          initialViewState={{
            layoutId: "fcose",
            selectedNodeIds: [...IMPACT_CHANGE_INTENT.rootEntityIds],
            overlay: { showOverlay: true, showPaths: true },
          }}
          viewIdentity="impact-spring-ai"
          renderNodeExtras={renderNodeExtras}
          renderEdgeExtras={renderEdgeExtras}
          onIntent={handleIntent}
        />
      </div>

      <footer
        className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground"
        aria-live="polite"
      >
        {status}
      </footer>

      {/* Impact report: a floating drawer so it never steals canvas width. */}
      {reportOpen ? (
        <>
          <button
            type="button"
            aria-label="Close impact report"
            className="fixed inset-0 z-40 bg-background/60"
            onClick={() => setReportOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-border bg-card shadow-xl">
            <ImpactReport
              overlay={IMPACT_RESULT}
              model={model}
              changeIntentTitle={IMPACT_CHANGE_INTENT.title}
              freshness={freshness}
            />
          </aside>
        </>
      ) : null}
    </div>
  )
}
