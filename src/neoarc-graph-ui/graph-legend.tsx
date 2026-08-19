"use client"

import { useMemo } from "react"
import type { GraphModel } from "@neoarc/graph-contracts"
import type { GraphRegistries } from "@neoarc/graph-core"

export interface GraphLegendProps {
  readonly model: GraphModel
  readonly registries: GraphRegistries
  readonly className?: string
}

/**
 * A small always-visible key mapping each node type present in the loaded
 * graph to its registered tone + icon glyph. Purely a read of the
 * NodeTypeRegistry a product already supplied — no new visual vocabulary.
 */
export function GraphLegend({ model, registries, className }: GraphLegendProps) {
  const types = useMemo(() => {
    const seen = new Set<string>()
    const ordered: string[] = []
    for (const node of model.nodes) {
      if (!seen.has(node.type)) {
        seen.add(node.type)
        ordered.push(node.type)
      }
    }
    return ordered
  }, [model.nodes])

  if (types.length === 0) return null

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-border bg-card/95 px-3 py-2 text-xs shadow-sm backdrop-blur-sm ${className ?? ""}`}
      aria-label="Node type legend"
    >
      {types.map((type) => {
        const def = registries.nodeTypes.get(type)
        const icon = registries.icons.get(def.icon ?? "unknown")
        return (
          <span key={type} className="flex items-center gap-1.5 text-muted-foreground">
            <span
              aria-hidden="true"
              className="flex h-4 w-4 items-center justify-center rounded-sm text-[9px] font-semibold text-foreground"
              style={{ backgroundColor: `var(--graph-${def.tone ?? "unknown"})` }}
            >
              {icon.glyph.slice(0, 2)}
            </span>
            <span className="text-foreground">{def.label ?? type}</span>
          </span>
        )
      })}
    </div>
  )
}
