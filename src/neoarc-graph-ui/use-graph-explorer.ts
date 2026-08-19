"use client"

import { useCallback, useMemo, useState } from "react"
import type {
  GraphFilterState,
  GraphId,
  GraphModel,
  GraphOverlay,
  GraphOverlayFreshness,
  GraphSemanticEvent,
  GraphViewModel,
  GraphViewState,
} from "@neoarc/graph-contracts"
import {
  applyOverlays,
  buildViewModel,
  clearExplorationFocus,
  clearOverlayState,
  clearSelection,
  createInitialViewState,
  resolveOverlayFreshness,
  selectEdge,
  selectNode,
  setActiveOverlayPath,
  setActiveOverlays,
  setExplorationFocus,
  setFilters,
  setLayout,
  setOverlayRestrictToFocus,
  setOverlayShow,
  setOverlayShowPaths,
  toggleContainerCollapsed,
} from "@neoarc/graph-core"

/** Freshness of one supplied overlay against the current canonical model. */
export interface OverlayFreshnessEntry {
  readonly overlayId: string
  readonly label?: string
  readonly freshness: GraphOverlayFreshness
}

export interface UseGraphExplorerOptions {
  readonly model: GraphModel
  readonly initialViewState?: Partial<GraphViewState>
  /** Supplied overlays (impact/search/risk). Decorate the view; never mutate facts. */
  readonly overlays?: readonly GraphOverlay[]
  /**
   * Intents the reusable library cannot fulfill locally (expand/search/path/
   * impact requiring authoritative data) are forwarded here. No hidden fetches.
   */
  readonly onIntent?: (event: GraphSemanticEvent) => void
}

export interface GraphExplorerController {
  readonly viewState: GraphViewState
  readonly viewModel: GraphViewModel
  /** Supplied overlays passed in (unchanged). */
  readonly overlays: readonly GraphOverlay[]
  /** Overlay ids/refs not present in the loaded model — surfaced, never dropped. */
  readonly unresolvedOverlayNodeIds: readonly GraphId[]
  readonly unresolvedOverlayEdgeIds: readonly GraphId[]
  /** Per-overlay freshness (4-way; never a boolean). */
  readonly overlayFreshness: readonly OverlayFreshnessEntry[]
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
const EMPTY_OVERLAYS: readonly GraphOverlay[] = []

export function useGraphExplorer(options: UseGraphExplorerOptions): GraphExplorerController {
  const { model, initialViewState, onIntent } = options
  const overlays = options.overlays ?? EMPTY_OVERLAYS
  const [viewState, setViewState] = useState<GraphViewState>(() =>
    createInitialViewState(initialViewState),
  )

  const baseViewModel = useMemo(() => buildViewModel(model, viewState), [model, viewState])

  // Loaded canonical ids (whole GraphModel, not just the current view) so
  // unresolved-reference reporting reflects the real data, not filtered-out ids.
  const loadedNodeIds = useMemo(() => new Set(model.nodes.map((n) => n.id)), [model])
  const loadedEdgeIds = useMemo(() => new Set(model.edges.map((e) => e.id)), [model])

  // Overlays are a derived view decoration applied AFTER the base view model,
  // so they compose with filters/focus/collapse and never touch canonical facts.
  const applied = useMemo(
    () => applyOverlays(baseViewModel, overlays, loadedNodeIds, loadedEdgeIds, viewState.overlay),
    [baseViewModel, overlays, loadedNodeIds, loadedEdgeIds, viewState.overlay],
  )
  const viewModel = applied.viewModel

  const overlayFreshness = useMemo<readonly OverlayFreshnessEntry[]>(
    () =>
      overlays.map((overlay) => ({
        overlayId: overlay.id,
        label: overlay.label,
        freshness: resolveOverlayFreshness(model, overlay),
      })),
    [overlays, model],
  )

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
        case "graph.focus.explore":
          setViewState((s) => setExplorationFocus(s, event.focus))
          break
        case "graph.focus.reset":
          setViewState((s) => clearExplorationFocus(s))
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
        // View-only overlay intents: fulfilled locally against viewState.overlay.
        case "graph.overlay.setActive":
          setViewState((s) => setActiveOverlays(s, event.overlayIds))
          break
        case "graph.overlay.show":
          setViewState((s) => setOverlayShow(s, event.show))
          break
        case "graph.overlay.showPaths":
          setViewState((s) => setOverlayShowPaths(s, event.show))
          break
        case "graph.overlay.restrictToOverlayFocus":
          setViewState((s) => setOverlayRestrictToFocus(s, event.restrict))
          break
        case "graph.overlay.selectPath":
          setViewState((s) => setActiveOverlayPath(s, event.pathId))
          break
        case "graph.overlay.clear":
          setViewState((s) => clearOverlayState(s))
          break
        // Authoritative intents: the library never fulfills these itself.
        case "graph.expand.request":
        case "graph.search.request":
        case "graph.path.request":
        case "graph.impact.request":
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
    overlays,
    unresolvedOverlayNodeIds: applied.unresolvedNodeIds,
    unresolvedOverlayEdgeIds: applied.unresolvedEdgeIds,
    overlayFreshness,
    dispatch,
    setViewState,
    setQuery,
    setFilterState,
    setLayoutId,
    toggleCollapse,
    clear,
  }
}
