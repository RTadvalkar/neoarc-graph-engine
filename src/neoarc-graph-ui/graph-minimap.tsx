"use client"

import { useEffect, useRef, useState } from "react"
import type { GraphRendererHandle } from "@neoarc/graph-renderer"

export interface GraphMinimapProps {
  /** The live renderer handle to read positions/viewport from. Null while unmounted. */
  readonly handle: GraphRendererHandle | null
  readonly className?: string
}

const MINIMAP_WIDTH = 160
const MINIMAP_HEIGHT = 110
const PADDING = 8

/**
 * Renderer-neutral minimap: reads only `GraphNodePosition`/`GraphBoundingBox`/
 * `onSpatialChange` off the `GraphRendererHandle` boundary — no Cytoscape
 * import, so it works unmodified against any future renderer that implements
 * the same handle contract.
 */
export function GraphMinimap({ handle, className }: GraphMinimapProps) {
  const [, forceRender] = useState(0)
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (!handle) return
    const unsubscribe = handle.onSpatialChange(() => forceRender((n) => n + 1))
    return unsubscribe
  }, [handle])

  if (!handle) return null

  const bbox = handle.getBoundingBox()
  const positions = handle.getNodePositions()
  const viewport = handle.getViewport()

  const width = Math.max(1, bbox.x2 - bbox.x1)
  const height = Math.max(1, bbox.y2 - bbox.y1)
  const scale = Math.min(
    (MINIMAP_WIDTH - PADDING * 2) / width,
    (MINIMAP_HEIGHT - PADDING * 2) / height,
  )

  const toMini = (x: number, y: number) => ({
    x: PADDING + (x - bbox.x1) * scale,
    y: PADDING + (y - bbox.y1) * scale,
  })

  // Approximate the current viewport rectangle in model space from pan/zoom.
  const viewW = svgRef.current?.parentElement?.clientWidth ?? 0
  const viewH = svgRef.current?.parentElement?.clientHeight ?? 0
  const zoom = viewport.zoom || 1
  const pan = viewport.pan ?? { x: 0, y: 0 }
  const modelViewX1 = -pan.x / zoom
  const modelViewY1 = -pan.y / zoom
  const modelViewW = viewW / zoom
  const modelViewH = viewH / zoom
  const viewportTL = toMini(modelViewX1, modelViewY1)

  const handlePan = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const clickY = event.clientY - rect.top
    const modelX = bbox.x1 + (clickX - PADDING) / scale
    const modelY = bbox.y1 + (clickY - PADDING) / scale
    handle.setViewport({
      zoom: viewport.zoom,
      pan: { x: -modelX * zoom + viewW / 2, y: -modelY * zoom + viewH / 2 },
    })
  }

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label="Graph overview minimap. Click to pan the canvas."
      width={MINIMAP_WIDTH}
      height={MINIMAP_HEIGHT}
      onClick={handlePan}
      className={`cursor-pointer rounded-md border border-border bg-card/95 shadow-sm backdrop-blur-sm ${className ?? ""}`}
    >
      {[...positions.entries()].map(([id, pos]) => {
        const p = toMini(pos.x, pos.y)
        return <circle key={id} cx={p.x} cy={p.y} r={1.5} className="fill-muted-foreground" />
      })}
      <rect
        x={viewportTL.x}
        y={viewportTL.y}
        width={Math.max(2, modelViewW * scale)}
        height={Math.max(2, modelViewH * scale)}
        className="fill-none stroke-primary"
        strokeWidth={1}
      />
    </svg>
  )
}
