"use client"

import { useMemo } from "react"
import type {
  GraphProperties,
  GraphPropertyDefinition,
  GraphViewEdge,
  GraphViewModel,
  GraphViewNode,
} from "@neoarc/graph-contracts"
import type { GraphActionDefinition, GraphRegistries } from "@neoarc/graph-core"

export interface GraphInspectorProps {
  readonly viewModel: GraphViewModel
  readonly registries: GraphRegistries
  /**
   * Product-contributed extra content (e.g. an "Open in backend" tab). This is
   * the extension seam — reusable UI stays domain-neutral.
   */
  readonly renderNodeExtras?: (node: GraphViewNode) => React.ReactNode
  readonly renderEdgeExtras?: (edge: GraphViewEdge) => React.ReactNode
  /** Only relevant for a selected compound container node. */
  readonly onToggleCollapse?: (containerId: string) => void
  /**
   * Host fulfillment for a "node"/"edge" targeted action from
   * `registries.actions`. The inspector only renders/dispatches — it never
   * decides what an action does.
   */
  readonly onAction?: (
    actionId: string,
    context: { readonly target: "node" | "edge"; readonly id: string },
  ) => void
}

/** True when an action targets this type: no allow-list means "applies to all". */
function actionAppliesToType(action: GraphActionDefinition, type: string): boolean {
  return !action.appliesToTypes || action.appliesToTypes.length === 0 || action.appliesToTypes.includes(type)
}

function ActionButtons({
  actions,
  target,
  type,
  id,
  onAction,
}: {
  actions: readonly GraphActionDefinition[]
  target: "node" | "edge"
  type: string
  id: string
  onAction?: GraphInspectorProps["onAction"]
}) {
  const applicable = actions.filter((a) => a.target === target && actionAppliesToType(a, type))
  if (applicable.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {applicable.map((action) => (
        <button
          key={action.id}
          type="button"
          title={action.description}
          className="inline-flex h-7 items-center justify-center rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          onClick={() => onAction?.(action.id, { target, id })}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}

function PropertyRows({
  properties,
  registries,
  definitions,
  hidden,
}: {
  properties: GraphProperties | undefined
  registries: GraphRegistries
  definitions?: readonly GraphPropertyDefinition[]
  hidden?: ReadonlySet<string>
}) {
  const entries = properties ? Object.entries(properties) : []
  const visible = entries.filter(([key]) => !hidden?.has(key))
  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground">No properties.</p>
  }
  const definitionByKey = new Map((definitions ?? []).map((d) => [d.key, d] as const))
  return (
    <dl className="grid grid-cols-[minmax(0,7rem)_1fr] gap-x-3 gap-y-1.5 text-sm">
      {visible.map(([key, value]) => {
        // Unknown/unconfigured properties still render safely: raw key label
        // and the default formatter (via the registry's own fallback).
        const definition = definitionByKey.get(key)
        const label = definition?.label ?? key
        const formatter = registries.propertyFormatters.get(definition?.formatterId ?? key)
        return (
          <div key={key} className="contents">
            <dt className="truncate font-medium text-muted-foreground">{label}</dt>
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
  onToggleCollapse,
  onAction,
}: GraphInspectorProps) {
  const selectedNode = useMemo(
    () => viewModel.nodes.find((n) => n.selected),
    [viewModel.nodes],
  )
  const selectedEdge = useMemo(
    () => viewModel.edges.find((e) => e.selected),
    [viewModel.edges],
  )
  const actions = [...registries.actions.values()]

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
        {selectedNode.isContainer ? (
          <button
            type="button"
            className="inline-flex h-8 w-fit items-center justify-center rounded-md border border-border bg-background px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            onClick={() => onToggleCollapse?.(selectedNode.id)}
          >
            {selectedNode.collapsed ? "Expand group" : "Collapse group"}
          </button>
        ) : null}
        <ActionButtons
          actions={actions}
          target="node"
          type={selectedNode.type}
          id={selectedNode.id}
          onAction={onAction}
        />
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Properties
          </h3>
          <PropertyRows
            properties={selectedNode.properties}
            registries={registries}
            definitions={def.properties}
            hidden={hidden}
          />
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
        <ActionButtons
          actions={actions}
          target="edge"
          type={selectedEdge.type}
          id={selectedEdge.id}
          onAction={onAction}
        />
        {selectedEdge.aggregatedEdgeIds && selectedEdge.aggregatedEdgeIds.length > 0 ? (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Aggregate of {selectedEdge.aggregatedEdgeIds.length} underlying relationships.
          </p>
        ) : null}
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Properties
          </h3>
          <PropertyRows
            properties={selectedEdge.properties}
            registries={registries}
            definitions={def.properties}
          />
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
