"use client"

import type { GraphModel, GraphSemanticEvent } from "@neoarc/graph-contracts"

/**
 * SHOWCASE ONLY. Renderer-boundary proof: surfaces the supplied `GraphModel`
 * and the latest `GraphSemanticEvent` observed via the reusable Explorer's
 * `onEvent` hook — fired for every dispatched event, view-only and
 * authoritative alike, purely for observability. This never becomes a second
 * fulfillment path: the showcase still only reacts to authoritative intents
 * via `onIntent`. This component knows nothing about Cytoscape.
 */
export interface GraphDevPanelProps {
  readonly model: GraphModel
  readonly lastEvent?: GraphSemanticEvent
  readonly eventCount: number
  readonly rendererId: string
}

/** A short, generic one-line summary of an event's own fields — no domain vocabulary. */
function describeEvent(event: GraphSemanticEvent): string {
  const { type, ...rest } = event as GraphSemanticEvent & Record<string, unknown>
  const detailKeys = Object.keys(rest)
  if (detailKeys.length === 0) return type
  const detail = detailKeys
    .slice(0, 2)
    .map((key) => `${key}=${JSON.stringify((rest as Record<string, unknown>)[key])}`)
    .join(" ")
  return `${type} (${detail})`
}

export function GraphDevPanel({ model, lastEvent, eventCount, rendererId }: GraphDevPanelProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border bg-card px-3 py-2 font-mono text-[11px] text-muted-foreground">
      <span>
        <span className="text-foreground">GraphModel</span> {model.id} rev {model.revision} ·{" "}
        {model.nodes.length}n/{model.edges.length}e
      </span>
      <span>
        <span className="text-foreground">Renderer</span> {rendererId}
      </span>
      <span>
        <span className="text-foreground">Events observed</span> {eventCount}
      </span>
      <span className="truncate">
        <span className="text-foreground">Last event</span>{" "}
        {lastEvent ? describeEvent(lastEvent) : "—"}
      </span>
    </div>
  )
}
