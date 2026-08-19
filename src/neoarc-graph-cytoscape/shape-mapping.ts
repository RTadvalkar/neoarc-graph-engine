import type { GraphNodeShape } from "@neoarc/graph-contracts"

/**
 * Cytoscape-specific node shape vocabulary. This module is the ONLY place in
 * the codebase permitted to know Cytoscape's shape names. It translates the
 * renderer-neutral `GraphNodeShape` (owned by graph-contracts) into a
 * Cytoscape `shape` value. No other package may reference Cytoscape shape
 * strings, and this mapping must never be imported outside
 * `neoarc-graph-cytoscape`.
 *
 * A container node is drawn as a shape too (`getContainerShape`) but has
 * separate presentation (dashed border, opacity) applied by the stylesheet.
 */

/** Safe fallback when a shape is unknown/unsupported by this renderer. */
export const CYTOSCAPE_FALLBACK_SHAPE = "ellipse"

const SHAPE_MAP: Readonly<Record<string, string>> = {
  rectangle: "rectangle",
  "rounded-rectangle": "round-rectangle",
  ellipse: "ellipse",
  circle: "ellipse",
  diamond: "diamond",
  hexagon: "hexagon",
  octagon: "octagon",
  triangle: "triangle",
  pill: "round-rectangle",
  container: "round-rectangle",
  tag: "tag",
  generic: CYTOSCAPE_FALLBACK_SHAPE,
}

/**
 * Map a semantic `GraphNodeShape` to a Cytoscape shape value. Any shape this
 * renderer does not recognize (including future contract additions) falls
 * back safely to `CYTOSCAPE_FALLBACK_SHAPE` rather than throwing or rendering
 * nothing.
 */
export function mapNodeShapeToCytoscape(shape: GraphNodeShape | undefined): string {
  if (!shape) return CYTOSCAPE_FALLBACK_SHAPE
  return SHAPE_MAP[shape] ?? CYTOSCAPE_FALLBACK_SHAPE
}
