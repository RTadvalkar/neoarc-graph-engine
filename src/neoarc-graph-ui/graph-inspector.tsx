"use client"

import { useMemo } from "react"
import type {
  GraphProperties,
  GraphViewEdge,
  GraphViewModel,
  GraphViewNode,
} from "@neoarc/graph-contracts"
import type { GraphRegistries } from "@neoarc/graph-core"

export interface GraphInspectorProps {
  readonly viewModel: GraphViewModel
  readonly registries: GraphRegistries
  /**
   * Product-contributed extra content (e.g. an "Open in backend" tab). This is
   * the extension seam — reusable UI stays domain-neutral.
   */
  readonly renderNodeExtras?: (node: GraphViewNode) => React.ReactNode
  readonly renderEdgeExtras?: (edge: GraphViewEdge) => React.ReactNode
}

function PropertyRows({
  properties,
  registries,
  hidden,
}: {
  properties: GraphProperties | undefined
  registries: GraphRegistries
  hidden?: ReadonlySet<string>
}) {
  const entries = properties ? Object.entries(properties) : []
  const visible = entries.filter(([key]) => !hidden?.has(key))
  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground">No properties.</p>
  }
  return (
    <dl className="grid grid-cols-[minmax(0,7rem)_1fr] gap-x-3 gap-y-1.5 text-sm">
      {visible.map(([key, value]) => {
        const formatter = registries.propertyFormatters.get(key)
        return (
          <div key={key} className="contents">
            <dt className="truncate font-medium text-muted-foreground">{key}</dt>
            <dd className="break-words text-foreground">{formatter(value, { key, properties })}</dd>
          </div>
        )
      })}
    </dl>
  )
}

export function GraphInspector({
  viewModel,
  registries,
  renderNodeExtras,
  renderEdgeExtras,
}: GraphInspectorProps) {
  const selectedNode = useMemo(
    () => viewModel.nodes.find((n) => n.selected),
    [viewModel.nodes],
  )
  const selectedEdge = useMemo(
    () => viewModel.edges.find((e) => e.selected),
    [viewModel.edges],
  )

  if (selectedNode) {
    const def = registries.nodeTypes.get(selectedNode.type)
    const hidden = new Set(def.properties?.filter((p) => p.hidden).map((p) => p.key))
    return (
      <div className="flex flex-col gap-4 p-4">
        <header className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {def.label ?? selectedNode.type}
          </span>
          <h2 className="text-balance text-lg font-semibold text-foreground">
            {selectedNode.label ?? selectedNode.id}
          </h2>
          <span className="font-mono text-xs text-muted-foreground">{selectedNode.id}</span>
        </header>
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Properties
          </h3>
          <PropertyRows properties={selectedNode.properties} registries={registries} hidden={hidden} />
        </section>
        {renderNodeExtras?.(selectedNode)}
      </div>
    )
  }

  if (selectedEdge) {
    const def = registries.edgeTypes.get(selectedEdge.type)
    return (
      <div className="flex flex-col gap-4 p-4">
        <header className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Relationship
          </span>
          <h2 className="text-balance text-lg font-semibold text-foreground">
            {def.label ?? selectedEdge.type}
          </h2>
          <span className="font-mono text-xs text-muted-foreground">
            {selectedEdge.source} → {selectedEdge.target}
          </span>
        </header>
        {selectedEdge.aggregatedEdgeIds && selectedEdge.aggregatedEdgeIds.length > 0 ? (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Aggregate of {selectedEdge.aggregatedEdgeIds.length} underlying relationships.
          </p>
        ) : null}
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Properties
          </h3>
          <PropertyRows properties={selectedEdge.properties} registries={registries} />
        </section>
        {renderEdgeExtras?.(selectedEdge)}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
      <p className="text-sm font-medium text-foreground">Nothing selected</p>
      <p className="text-pretty text-xs text-muted-foreground">
        Select a node or relationship on the canvas or in the node list to inspect its supplied
        facts.
      </p>
    </div>
  )
}
