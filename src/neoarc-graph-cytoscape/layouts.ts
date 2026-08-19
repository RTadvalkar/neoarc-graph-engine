import type { LayoutOptions } from "cytoscape"
import type { RendererLayoutDescriptor } from "@neoarc/graph-renderer"

/**
 * Built-in Cytoscape layouts exposed through renderer-neutral descriptors. The
 * UI only ever sees the `id`/`label`; the concrete layout options stay here.
 */
export const CYTOSCAPE_LAYOUTS: readonly RendererLayoutDescriptor[] = [
  { id: "cose", label: "Force" },
  { id: "breadthfirst", label: "Hierarchy" },
  { id: "concentric", label: "Concentric" },
  { id: "grid", label: "Grid" },
]

export const DEFAULT_LAYOUT_ID = "cose"

export function buildLayoutOptions(layoutId: string): LayoutOptions {
  switch (layoutId) {
    case "breadthfirst":
      return {
        name: "breadthfirst",
        directed: true,
        padding: 36,
        spacingFactor: 1.35,
        animate: false,
        fit: true,
      }
    case "concentric":
      return {
        name: "concentric",
        padding: 36,
        minNodeSpacing: 44,
        animate: false,
        fit: true,
        concentric: (node) => node.degree(false),
        levelWidth: () => 2,
      }
    case "grid":
      return {
        name: "grid",
        padding: 36,
        animate: false,
        fit: true,
        avoidOverlap: true,
      }
    case "cose":
    default:
      return {
        name: "cose",
        padding: 36,
        animate: false,
        fit: true,
        nodeRepulsion: () => 9000,
        idealEdgeLength: () => 130,
        nestingFactor: 1.2,
        gravity: 0.3,
        componentSpacing: 90,
      } as LayoutOptions
  }
}
