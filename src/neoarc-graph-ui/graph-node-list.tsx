"use client"

import { useMemo } from "react"
import type { GraphId, GraphViewModel } from "@neoarc/graph-contracts"
import type { GraphRegistries } from "@neoarc/graph-core"

export interface GraphNodeListProps {
  readonly viewModel: GraphViewModel
  readonly registries: GraphRegistries
  readonly onSelect: (nodeId: GraphId) => void
}

/**
 * Keyboard-accessible, non-canvas path to every visible node. Groups by type so
 * a screen-reader user can navigate the same graph the canvas shows. Selection
 * here flows through the same semantic event path as canvas taps.
 */
export function GraphNodeList({ viewModel, registries, onSelect }: GraphNodeListProps) {
  const grouped = useMemo(() => {
    const byType = new Map<string, typeof viewModel.nodes[number][]>()
    for (const node of viewModel.nodes) {
      const list = byType.get(node.type) ?? []
      list.push(node)
      byType.set(node.type, list)
    }
    return [...byType.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [viewModel.nodes])

  return (
    <nav aria-label="Graph nodes" className="flex h-full flex-col overflow-y-auto p-2">
      {grouped.length === 0 ? (
        <p className="p-3 text-sm text-muted-foreground">No visible nodes.</p>
      ) : (
        grouped.map(([type, nodes]) => {
          const def = registries.nodeTypes.get(type)
          return (
            <div key={type} className="mb-3">
              <h3 className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {def.label ?? type} <span className="font-normal">({nodes.length})</span>
              </h3>
              <ul className="flex flex-col gap-0.5">
                {nodes.map((node) => (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(node.id)}
                      aria-current={node.selected}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                        node.selected
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground"
                      } ${node.searchHighlighted ? "ring-1 ring-ring" : ""}`}
                    >
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: `var(--graph-${def.tone ?? "unknown"})` }}
                      />
                      <span className="truncate">{node.label ?? node.id}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })
      )}
    </nav>
  )
}
