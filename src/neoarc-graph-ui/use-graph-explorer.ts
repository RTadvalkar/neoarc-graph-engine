"use client"

import { useCallback, useMemo, useState } from "react"
import type {
  GraphFilterState,
  GraphId,
  GraphModel,
  GraphSemanticEvent,
  GraphViewModel,
  GraphViewState,
} from "@neoarc/graph-contracts"
import {
  buildViewModel,
  clearSelection,
  createInitialViewState,
  selectEdge,
  selectNode,
  setFilters,
  setLayout,
  toggleContainerCollapsed,
} from "@neoarc/graph-core"

export interface UseGraphExplorerOptions {
  readonly model: GraphModel
  readonly initialViewState?: Partial<GraphViewState>
  /**
   * Intents the reusable library cannot fulfill locally (expand/search/path/
   * impact requiring authoritative data) are forwarded here. No hidden fetches.
   */
  readonly onIntent?: (event: GraphSemanticEvent) => void
}

export interface GraphExplorerController {
  readonly viewState: GraphViewState
  readonly viewModel: GraphViewModel
  /** Feed any renderer/UI semantic event through the single reducer path. */
  dispatch(event: GraphSemanticEvent): void
  setViewState(next: GraphViewState): void
  setQuery(query: string): void
  setFilterState(filters: GraphFilterState): void
  setLayoutId(layoutId: string): void
  toggleCollapse(containerId: GraphId): void
  clear(): void
}

/**
 * Headless controller for the Graph Explorer. Holds GraphViewState, derives the
 * GraphViewModel purely from graph-core, and routes semantic events: view-only
 * concerns are applied locally; authoritative concerns are emitted as intents.
 */
export function useGraphExplorer(options: UseGraphExplorerOptions): GraphExplorerController {
  const { model, initialViewState, onIntent } = options
  const [viewState, setViewState] = useState<GraphViewState>(() =>
    createInitialViewState(initialViewState),
  )

  const viewModel = useMemo(() => buildViewModel(model, viewState), [model, viewState])

  const dispatch = useCallback(
    (event: GraphSemanticEvent) => {
      switch (event.type) {
        case "graph.node.select":
          setViewState((s) => selectNode(s, event.nodeId, event.additive))
          break
        case "graph.edge.select":
          setViewState((s) => selectEdge(s, event.edgeId, event.additive))
          break
        case "graph.selection.clear":
        case "graph.background.tap":
          setViewState((s) => clearSelection(s))
          break
        case "graph.focus.change":
          setViewState((s) => ({ ...s, focusedNodeId: event.nodeId }))
          break
        case "graph.filters.change":
          setViewState((s) => setFilters(s, event.filters))
          break
        case "graph.layout.change":
          setViewState((s) => setLayout(s, event.layoutId))
          break
        case "graph.collapse":
        case "graph.expand":
          setViewState((s) => toggleContainerCollapsed(s, event.containerId))
          break
        case "graph.viewport.change":
          setViewState((s) => ({ ...s, viewport: event.viewport }))
          break
        // Authoritative intents: the library never fulfills these itself.
        case "graph.expand.request":
        case "graph.search.request":
        case "graph.path.request":
          onIntent?.(event)
          break
        default:
          onIntent?.(event)
      }
    },
    [onIntent],
  )

  const setQuery = useCallback((query: string) => {
    setViewState((s) => setFilters(s, { ...s.filters, query }))
  }, [])

  const setFilterState = useCallback((filters: GraphFilterState) => {
    setViewState((s) => setFilters(s, filters))
  }, [])

  const setLayoutId = useCallback((layoutId: string) => {
    setViewState((s) => setLayout(s, layoutId))
  }, [])

  const toggleCollapse = useCallback((containerId: GraphId) => {
    setViewState((s) => toggleContainerCollapsed(s, containerId))
  }, [])

  const clear = useCallback(() => setViewState((s) => clearSelection(s)), [])

  return {
    viewState,
    viewModel,
    dispatch,
    setViewState,
    setQuery,
    setFilterState,
    setLayoutId,
    toggleCollapse,
    clear,
  }
}
