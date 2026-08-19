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
  // fCoSE understands `fixedNodeConstraint`, so it can settle new/changed
  // nodes incrementally without disturbing survivors — an automatic topology
  // change may safely re-run it with `randomize: false`.
  { id: "fcose", label: "Explore", supportsIncrementalLayout: true },
  // breadthfirst has no fixed-node/incremental-settle concept in Cytoscape:
  // re-running it at all rearranges every node from its root. It therefore
  // gets no flag (defaults falsy) — an automatic topology change must never
  // trigger it; only an explicit Re-layout may recompute it from scratch.
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
        // Only a true from-scratch layout (initial mount or explicit
        // Re-layout, both of which pass randomize: true — breadthfirst has
        // no incremental mode, so "randomize" here just distinguishes those
        // from a restored/no-op invocation) auto-fits the viewport; a
        // restore/no-op call must not silently move the camera.
        fit: randomize,
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
        // cytoscape-fcose requires quality: "proof" whenever randomize is
        // false — "default"/"draft" quality assumes a from-scratch
        // (randomized) run and silently misbehaves on an incremental,
        // fixed-constraint settle.
        quality: randomize ? "default" : "proof",
        animate: false,
        // Only a true from-scratch layout auto-fits the viewport; an
        // incremental settle over fixed survivors must not silently move
        // the camera. Explicit Fit stays a separate, always-available
        // toolbar action.
        fit: randomize,
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
