"use client"

import { useEffect, useImperativeHandle, useRef, forwardRef } from "react"
import type { GraphSemanticEvent, GraphViewModel } from "@neoarc/graph-contracts"
import type { GraphRegistries } from "@neoarc/graph-core"
import type {
  GraphRenderer,
  GraphRendererHandle,
  RendererLayoutDescriptor,
} from "@neoarc/graph-renderer"
import { resolveRendererTheme } from "./theme"
import { getSpatialSnapshot, setSpatialSnapshot } from "./spatial-memory"

export interface GraphCanvasProps {
  /** The pluggable renderer. Defaults are provided by the host, not this file. */
  readonly renderer: GraphRenderer
  readonly viewModel: GraphViewModel
  readonly registries: GraphRegistries
  readonly layoutId?: string
  readonly onEvent?: (event: GraphSemanticEvent) => void
  /** Fired once the renderer mounts (and with `null` on unmount) — lets a host wire a minimap. */
  readonly onRendererReady?: (handle: GraphRendererHandle | null) => void
  /**
   * Session-scoped spatial-memory cache key (see `spatial-memory.ts`). When
   * supplied, positions/viewport are restored on mount if a snapshot exists
   * for this key, and every later change of this key (without the renderer
   * itself unmounting — e.g. switching layout while staying on one view)
   * snapshots the arrangement being left and restores the arrangement being
   * returned to, if any. Omit entirely to opt out (no behavior change from
   * before this existed).
   */
  readonly spatialMemoryKey?: string
  readonly className?: string
}

/** Imperative handle the shell uses for viewport controls (fit/zoom/center). */
export interface GraphCanvasHandle {
  fit(padding?: number): void
  zoomBy(factor: number): void
  center(): void
  runLayout(): void
  readonly layouts: readonly RendererLayoutDescriptor[]
  /** The live renderer handle, for callers that need the spatial boundary (e.g. a minimap). */
  getRendererHandle(): GraphRendererHandle | null
}

/**
 * Renderer-agnostic React host. It owns the DOM container lifecycle and pushes
 * view-model / theme / layout changes into whichever `GraphRenderer` it is
 * given. It never imports Cytoscape — swapping engines is a prop change.
 */
export const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(function GraphCanvas(
  { renderer, viewModel, registries, layoutId, onEvent, onRendererReady, spatialMemoryKey, className },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const handleRef = useRef<GraphRendererHandle | null>(null)
  // The spatial-memory key this instance is currently "sitting on" — used by
  // the key-change effect to know what to save (the key being left) vs. what
  // to restore (the key being entered), and by final unmount to save the last
  // active arrangement.
  const activeSpatialKeyRef = useRef<string | undefined>(spatialMemoryKey)
  // Keep latest props in refs so the mount effect stays mount-only.
  const latest = useRef({ viewModel, registries, layoutId, onEvent, onRendererReady, spatialMemoryKey })
  latest.current = { viewModel, registries, layoutId, onEvent, onRendererReady, spatialMemoryKey }

  // Mount / unmount the renderer once per renderer instance.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const { viewModel, registries, layoutId, spatialMemoryKey } = latest.current
    const restored = spatialMemoryKey ? getSpatialSnapshot(spatialMemoryKey) : undefined
    const handle = renderer.mount({
      container,
      viewModel,
      nodeTypeRegistry: registries.nodeTypes,
      edgeTypeRegistry: registries.edgeTypes,
      iconRegistry: registries.icons,
      theme: resolveRendererTheme(container),
      layoutId,
      restoreNodePositions: restored?.positions,
      restoreViewport: restored?.viewport,
      onEvent: (event) => latest.current.onEvent?.(event),
    })
    handleRef.current = handle
    activeSpatialKeyRef.current = spatialMemoryKey
    latest.current.onRendererReady?.(handle)

    // Re-resolve theme when the host toggles light/dark (class on <html>).
    const observer = new MutationObserver(() => {
      handleRef.current?.setTheme(resolveRendererTheme(container))
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    })

    return () => {
      observer.disconnect()
      // Save the arrangement being left so it can be restored verbatim if
      // this exact view/renderer/layout key is mounted again later.
      if (activeSpatialKeyRef.current) {
        setSpatialSnapshot(activeSpatialKeyRef.current, handle.getSpatialSnapshot())
      }
      handle.destroy()
      handleRef.current = null
      latest.current.onRendererReady?.(null)
    }
  }, [renderer])

  // Push view-model updates (selection, filters, topology) into the renderer.
  useEffect(() => {
    handleRef.current?.setViewModel(viewModel)
  }, [viewModel])

  // Push layout switches.
  useEffect(() => {
    if (layoutId) handleRef.current?.setLayout(layoutId)
  }, [layoutId])

  // Spatial-memory boundary: fires when `spatialMemoryKey` changes without
  // the renderer unmounting (e.g. switching layout or scenario while staying
  // mounted). Runs after the view-model and layout-switch effects above, so
  // it observes the post-switch state before deciding what to snapshot/
  // restore. Save the arrangement being left, then restore the arrangement
  // being entered if this key has ever been visited before; otherwise leave
  // whatever the layout/view-model effects just produced untouched.
  useEffect(() => {
    const previousKey = activeSpatialKeyRef.current
    if (previousKey === spatialMemoryKey) return
    const handle = handleRef.current
    if (handle) {
      if (previousKey) setSpatialSnapshot(previousKey, handle.getSpatialSnapshot())
      if (spatialMemoryKey) {
        const snapshot = getSpatialSnapshot(spatialMemoryKey)
        if (snapshot) handle.restoreSpatialSnapshot(snapshot)
      }
    }
    activeSpatialKeyRef.current = spatialMemoryKey
  }, [spatialMemoryKey])

  useImperativeHandle(
    ref,
    () => ({
      fit: (padding) => handleRef.current?.fit(padding),
      zoomBy: (factor) => handleRef.current?.zoomBy(factor),
      center: () => handleRef.current?.center(),
      runLayout: () => handleRef.current?.runLayout(),
      getRendererHandle: () => handleRef.current,
      get layouts() {
        return handleRef.current?.layouts ?? renderer.availableLayouts
      },
    }),
    [renderer],
  )

  return (
    <div
      ref={containerRef}
      className={className}
      role="application"
      aria-label="Graph canvas"
      aria-roledescription="Interactive node-link graph. Use the node list panel for keyboard-accessible inspection."
    />
  )
})
