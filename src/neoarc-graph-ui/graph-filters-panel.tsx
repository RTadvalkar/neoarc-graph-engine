"use client"

import { useMemo } from "react"
import type { GraphFilterState, GraphModel } from "@neoarc/graph-contracts"
import type { GraphRegistries } from "@neoarc/graph-core"

export interface GraphFiltersPanelProps {
  readonly model: GraphModel
  readonly registries: GraphRegistries
  readonly filters: GraphFilterState
  readonly onChange: (filters: GraphFilterState) => void
  readonly onClose: () => void
}

function toggle(list: readonly string[] | undefined, value: string): string[] {
  const set = new Set(list ?? [])
  if (set.has(value)) set.delete(value)
  else set.add(value)
  return [...set]
}

function distinctNodeTypes(model: GraphModel): string[] {
  return [...new Set(model.nodes.map((n) => n.type))].sort()
}

function distinctEdgeTypes(model: GraphModel): string[] {
  return [...new Set(model.edges.map((e) => e.type))].sort()
}

function distinctStatuses(model: GraphModel): string[] {
  const values = new Set<string>()
  for (const node of model.nodes) {
    const status = node.properties?.status
    if (typeof status === "string") values.add(status)
  }
  return [...values].sort()
}

function distinctFacets(model: GraphModel): string[] {
  const values = new Set<string>()
  for (const node of model.nodes) {
    const facets = node.properties?.facets
    if (Array.isArray(facets)) {
      for (const f of facets) if (typeof f === "string") values.add(f)
    }
  }
  return [...values].sort()
}

const checkboxRow = "flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted"

function FilterGroup({
  title,
  options,
  selected,
  onToggle,
  emptyLabel,
}: {
  title: string
  options: readonly string[]
  selected: readonly string[] | undefined
  onToggle: (value: string) => void
  emptyLabel: string
}) {
  if (options.length === 0) {
    return (
      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        <p className="px-2 text-xs text-muted-foreground">{emptyLabel}</p>
      </section>
    )
  }
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ul className="flex flex-col gap-0.5">
        {options.map((option) => (
          <li key={option}>
            <label className={checkboxRow}>
              <input
                type="checkbox"
                checked={(selected ?? []).includes(option)}
                onChange={() => onToggle(option)}
                className="h-3.5 w-3.5 accent-primary"
              />
              <span className="truncate text-foreground">{option}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Reusable node/edge/status/facet filter panel. Reads its facet vocabulary
 * straight from the loaded `GraphModel` (open strings, never a closed
 * per-product enum) and emits ordinary `GraphFilterState` updates — the
 * exact same shape `buildViewModel` already consumes.
 */
export function GraphFiltersPanel({
  model,
  registries,
  filters,
  onChange,
  onClose,
}: GraphFiltersPanelProps) {
  const nodeTypes = useMemo(() => distinctNodeTypes(model), [model])
  const edgeTypes = useMemo(() => distinctEdgeTypes(model), [model])
  const statuses = useMemo(() => distinctStatuses(model), [model])
  const facets = useMemo(() => distinctFacets(model), [model])

  const hasActiveFilters =
    (filters.nodeTypes?.length ?? 0) > 0 ||
    (filters.edgeTypes?.length ?? 0) > 0 ||
    (filters.statuses?.length ?? 0) > 0 ||
    (filters.facets?.length ?? 0) > 0

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Filters</h2>
        <div className="flex items-center gap-2">
          {hasActiveFilters ? (
            <button
              type="button"
              className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
              onClick={() =>
                onChange({ query: filters.query })
              }
            >
              Clear all
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Close filters"
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </header>

      <FilterGroup
        title="Node type"
        options={nodeTypes.map((t) => registries.nodeTypes.get(t).label ?? t)}
        selected={filters.nodeTypes?.map((t) => registries.nodeTypes.get(t).label ?? t)}
        onToggle={(label) => {
          const type = nodeTypes.find((t) => (registries.nodeTypes.get(t).label ?? t) === label)
          if (type) onChange({ ...filters, nodeTypes: toggle(filters.nodeTypes, type) })
        }}
        emptyLabel="No node types loaded."
      />

      <FilterGroup
        title="Relationship type"
        options={edgeTypes.map((t) => registries.edgeTypes.get(t).label ?? t)}
        selected={filters.edgeTypes?.map((t) => registries.edgeTypes.get(t).label ?? t)}
        onToggle={(label) => {
          const type = edgeTypes.find((t) => (registries.edgeTypes.get(t).label ?? t) === label)
          if (type) onChange({ ...filters, edgeTypes: toggle(filters.edgeTypes, type) })
        }}
        emptyLabel="No relationship types loaded."
      />

      <FilterGroup
        title="Status"
        options={statuses}
        selected={filters.statuses}
        onToggle={(value) => onChange({ ...filters, statuses: toggle(filters.statuses, value) })}
        emptyLabel="No supplied status values."
      />

      <FilterGroup
        title="Facet"
        options={facets}
        selected={filters.facets}
        onToggle={(value) => onChange({ ...filters, facets: toggle(filters.facets, value) })}
        emptyLabel="No supplied facets."
      />
    </div>
  )
}
