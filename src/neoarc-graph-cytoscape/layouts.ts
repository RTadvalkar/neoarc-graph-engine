import type { LayoutOptions } from "cytoscape"
import type { RendererLayoutDescriptor } from "@neoarc/graph-renderer"

/**
 * Built-in Cytoscape layouts exposed through renderer-neutral descriptors. The
 * UI only ever sees the `id`/`label`; the concrete layout options — including
 * every fCoSE-specific tuning knob — stay confined to this module. Keeping the
 * set small and useful per the G2 spec: one force/compound-friendly layout
 * (fCoSE, the default "Explore" layout for complex relationship graphs) and
 * one hierarchical layout (breadthfirst, for tree/DAG-oriented views).
 */
export const CYTOSCAPE_LAYOUTS: readonly RendererLayoutDescriptor[] = [
  { id: "fcose", label: "Explore" },
  { id: "breadthfirst", label: "Hierarchy" },
]

export const DEFAULT_LAYOUT_ID = "fcose"

/** A pinned node position fed to fCoSE so already-visible nodes stay put. */
export interface FixedNodePosition {
  readonly nodeId: string
  readonly position: { readonly x: number; readonly y: number }
}

export interface BuildLayoutOptionsInput {
  /**
   * Positions of nodes that must not move — the mechanism that preserves the
   * user's mental map across incremental topology changes (expand/collapse/
   * filter). Only meaningful for fCoSE; ignored by other layouts.
   */
  readonly fixedNodeConstraint?: readonly FixedNodePosition[]
  /**
   * false when doing an incremental settle of a handful of new nodes around
   * already-fixed neighbors; true for a from-scratch layout of the whole
   * graph (initial mount or an explicit "re-layout" action).
   */
  readonly randomize?: boolean
}

export function buildLayoutOptions(
  layoutId: string,
  input: BuildLayoutOptionsInput = {},
): LayoutOptions {
  const { fixedNodeConstraint, randomize = true } = input

  switch (layoutId) {
    case "breadthfirst":
      return {
        name: "breadthfirst",
        directed: true,
        padding: 36,
        spacingFactor: 1.1,
        avoidOverlap: true,
        animate: false,
        fit: true,
      }
    case "fcose":
    default:
      // fCoSE tuned for compound/relationship-dense enterprise graphs:
      // generous node separation and repulsion keep sibling services apart,
      // a longer ideal edge length reduces crossing in dense clusters, a low
      // nesting factor keeps compound children close to their parent, and
      // component packing avoids disconnected clusters drifting apart or
      // overlapping. `fixedNodeConstraint` is the mental-map mechanism: nodes
      // already on screen are pinned so only new nodes need to find a home.
      return {
        name: "fcose",
        quality: "default",
        animate: false,
        fit: true,
        padding: 48,
        randomize,
        nodeDimensionsIncludeLabels: true,
        uniformNodeDimensions: false,
        packComponents: true,
        tile: true,
        tilingPaddingVertical: 40,
        tilingPaddingHorizontal: 40,
        nodeSeparation: 90,
        nodeRepulsion: 6500,
        idealEdgeLength: 110,
        edgeElasticity: 0.35,
        nestingFactor: 0.12,
        gravity: 0.3,
        gravityRangeCompound: 1.6,
        gravityCompound: 1.2,
        numIter: 2500,
        initialEnergyOnIncremental: 0.35,
        ...(fixedNodeConstraint && fixedNodeConstraint.length > 0
          ? { fixedNodeConstraint: fixedNodeConstraint.map((f) => ({ ...f })) }
          : {}),
      } as LayoutOptions
  }
}
