"use client"

import { useMemo } from "react"
import type {
  GraphModel,
  GraphOverlay,
  GraphOverlayFreshness,
} from "@neoarc/graph-contracts"

export interface ImpactReportProps {
  readonly overlay: GraphOverlay
  readonly model: GraphModel
  readonly changeIntentTitle: string
  readonly freshness: GraphOverlayFreshness
}

/**
 * SHOWCASE ONLY. A read-only Impact Report derived ENTIRELY from the supplied
 * overlay + the current model revision — no persistence, no canvas
 * coordinates, no recomputation. Affected entities are grouped by their
 * SUPPLIED `state` string (the report is the one place the showcase reads
 * those strings, for display grouping only). Staleness comes straight from
 * the passed-in `resolveOverlayFreshness` result.
 */
export function ImpactReport({
  overlay,
  model,
  changeIntentTitle,
  freshness,
}: ImpactReportProps) {
  const labelOf = (id: string) => model.nodes.find((n) => n.id === id)?.label ?? id

  // Group supplied node states by their supplied `state` string (display only).
  const grouped = useMemo(() => {
    const groups = new Map<string, { id: string; label: string; tone?: string }[]>()
    for (const ns of overlay.nodeStates ?? []) {
      if (ns.state === "none") continue
      const bucket = groups.get(ns.state) ?? []
      bucket.push({ id: ns.nodeId, label: labelOf(ns.nodeId), tone: ns.tone })
      groups.set(ns.state, bucket)
    }
    return [...groups.entries()]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay, model])

  const meta = overlay.metadata ?? {}
  const isStale = freshness !== "current"

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-foreground">Impact Report</h2>
        <p className="text-xs text-muted-foreground">Supplied result — not recomputed in browser.</p>
      </header>

      {isStale ? (
        <div
          className="rounded-md border border-[color:var(--graph-danger)] bg-[color:var(--graph-danger)]/10 px-3 py-2 text-xs"
          role="alert"
        >
          <p className="font-semibold text-[color:var(--graph-danger)]">STALE — {freshness}</p>
          <p className="text-muted-foreground">
            Generated at revision {overlay.sourceRevision ?? "?"}; current model revision{" "}
            {model.revision ?? "?"}. The result was NOT recomputed.
          </p>
        </div>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div className="col-span-2 flex flex-col gap-0.5">
          <dt className="text-muted-foreground">Change intent</dt>
          <dd className="text-foreground">{changeIntentTitle}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground">Graph revision</dt>
          <dd className="text-foreground">{model.revision ?? "?"}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground">Result revision</dt>
          <dd className="text-foreground">{overlay.sourceRevision ?? "?"}</dd>
        </div>
        {typeof meta.effectiveHops === "number" ? (
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Effective hops</dt>
            <dd className="text-foreground">{meta.effectiveHops}</dd>
          </div>
        ) : null}
        {overlay.completeness ? (
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Completeness</dt>
            <dd className="text-foreground">{overlay.completeness}</dd>
          </div>
        ) : null}
        {typeof meta.policyVersion === "string" ? (
          <div className="col-span-2 flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Policy</dt>
            <dd className="text-foreground">{meta.policyVersion}</dd>
          </div>
        ) : null}
      </dl>

      {typeof meta.summary === "string" ? (
        <section className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Summary
          </h3>
          <p className="text-pretty text-xs text-foreground">{meta.summary}</p>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Affected entities
        </h3>
        {grouped.map(([state, entries]) => (
          <div key={state} className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: `var(--graph-${entries[0]?.tone ?? "unknown"})` }}
              />
              <span className="text-xs font-medium text-foreground">{state}</span>
              <span className="text-xs text-muted-foreground">({entries.length})</span>
            </div>
            <ul className="flex flex-col gap-0.5 pl-4">
              {entries.map((e) => (
                <li key={e.id} className="truncate text-xs text-muted-foreground">
                  {e.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {overlay.paths && overlay.paths.length > 0 ? (
        <section className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Supporting paths
          </h3>
          <ul className="flex flex-col gap-1">
            {overlay.paths.map((p) => (
              <li key={p.id} className="flex flex-col gap-0.5 text-xs">
                <span className="text-foreground">{p.label ?? p.id}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {(p.nodeIds ?? []).map(labelOf).join(" → ") || `${p.edgeIds.length} edges`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {typeof meta.additionalRelationshipsAvailable === "number" &&
      meta.additionalRelationshipsAvailable > 0 ? (
        <p className="rounded-md bg-muted px-2.5 py-1.5 text-[11px] text-muted-foreground">
          {meta.additionalRelationshipsAvailable} further relationships available beyond the
          truncated result.
        </p>
      ) : null}
    </div>
  )
}
