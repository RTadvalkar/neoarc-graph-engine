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

export const DEFAULT_LAYOUT_ID = "breadthfirst"

export function buildLayoutOptions(layoutId: string): LayoutOptions {
  switch (layoutId) {
    case "breadthfirst":
      return {
        name: "breadthfirst",
        directed: true,
        padding: 36,
        spacingFactor: 0.9,
        avoidOverlap: true,
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
        randomize: true,
        nodeRepulsion: () => 4000,
        idealEdgeLength: () => 70,
        edgeElasticity: () => 100,
        nestingFactor: 1.1,
        gravity: 0.8,
        numIter: 1200,
        componentSpacing: 60,
      } as LayoutOptions
  }
}
