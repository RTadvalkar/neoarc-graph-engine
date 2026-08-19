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

export interface GraphCanvasProps {
  /** The pluggable renderer. Defaults are provided by the host, not this file. */
  readonly renderer: GraphRenderer
  readonly viewModel: GraphViewModel
  readonly registries: GraphRegistries
  readonly layoutId?: string
  readonly onEvent?: (event: GraphSemanticEvent) => void
  readonly className?: string
}

/** Imperative handle the shell uses for viewport controls (fit/zoom/center). */
export interface GraphCanvasHandle {
  fit(padding?: number): void
  zoomBy(factor: number): void
  center(): void
  runLayout(): void
  readonly layouts: readonly RendererLayoutDescriptor[]
}

/**
 * Renderer-agnostic React host. It owns the DOM container lifecycle and pushes
 * view-model / theme / layout changes into whichever `GraphRenderer` it is
 * given. It never imports Cytoscape — swapping engines is a prop change.
 */
export const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(function GraphCanvas(
  { renderer, viewModel, registries, layoutId, onEvent, className },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const handleRef = useRef<GraphRendererHandle | null>(null)
  // Keep latest props in refs so the mount effect stays mount-only.
  const latest = useRef({ viewModel, registries, layoutId, onEvent })
  latest.current = { viewModel, registries, layoutId, onEvent }

  // Mount / unmount the renderer once per renderer instance.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const { viewModel, registries, layoutId, onEvent } = latest.current
    const handle = renderer.mount({
      container,
      viewModel,
      nodeTypeRegistry: registries.nodeTypes,
      edgeTypeRegistry: registries.edgeTypes,
      iconRegistry: registries.icons,
      theme: resolveRendererTheme(container),
      layoutId,
      onEvent: (event) => latest.current.onEvent?.(event),
    })
    handleRef.current = handle

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
      handle.destroy()
      handleRef.current = null
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

  useImperativeHandle(
    ref,
    () => ({
      fit: (padding) => handleRef.current?.fit(padding),
      zoomBy: (factor) => handleRef.current?.zoomBy(factor),
      center: () => handleRef.current?.center(),
      runLayout: () => handleRef.current?.runLayout(),
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
