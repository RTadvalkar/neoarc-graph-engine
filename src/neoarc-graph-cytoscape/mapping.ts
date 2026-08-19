import type { ElementDefinition } from "cytoscape"
import type {
  GraphAppliedOverlayEdgeState,
  GraphAppliedOverlayNodeState,
  GraphViewModel,
} from "@neoarc/graph-contracts"
import type { EdgeTypeRegistry, IconRegistry, NodeTypeRegistry } from "@neoarc/graph-core"
import type { GraphRendererTheme } from "@neoarc/graph-renderer"
import { mapNodeShapeToCytoscape } from "./shape-mapping"

/**
 * Translates a renderer-neutral GraphViewModel into Cytoscape element
 * definitions. All Cytoscape vocabulary (element data, classes, shapes) is
 * confined to this package. Tone -> concrete color resolution happens here so
 * the stylesheet can stay data-driven (`data(bg)`), keeping mappers type-clean.
 */

export interface CytoscapeMappingContext {
  readonly nodeTypeRegistry: NodeTypeRegistry
  readonly edgeTypeRegistry: EdgeTypeRegistry
  readonly iconRegistry: IconRegistry
  readonly theme: GraphRendererTheme
}

function toneColor(theme: GraphRendererTheme, tone: string | undefined, fallback: string): string {
  if (!tone) return fallback
  return theme.tones[tone] ?? fallback
}

/**
 * Resolve a concrete overlay color for a decorated node/edge. Cytoscape has NO
 * knowledge of impact/state vocabulary — it consumes only the supplied `tone`.
 * When several supplied states project onto one visible (aggregate) element,
 * the FIRST applicable supplied tone wins as a deterministic render tie-break;
 * all states remain retained on the view model (no precedence is inferred).
 * When no supplied state carries a resolvable tone, a single generic highlight
 * fallback is used — never a per-state color table.
 */
function overlayColor(
  theme: GraphRendererTheme,
  overlays:
    | readonly GraphAppliedOverlayNodeState[]
    | readonly GraphAppliedOverlayEdgeState[]
    | undefined,
): string | undefined {
  if (!overlays || overlays.length === 0) return undefined
  for (const entry of overlays) {
    if (entry.tone && theme.tones[entry.tone]) return theme.tones[entry.tone]
  }
  return theme.highlight
}

export function classesFor(flags: {
  selected?: boolean
  focused?: boolean
  highlighted?: boolean
  container?: boolean
  pill?: boolean
  collapsed?: boolean
  aggregate?: boolean
  hasOverlay?: boolean
  onPath?: boolean
}): string {
  const classes: string[] = []
  if (flags.container) classes.push("container")
  if (flags.pill) classes.push("pill")
  if (flags.selected) classes.push("selected")
  if (flags.focused) classes.push("focused")
  if (flags.highlighted) classes.push("highlight")
  if (flags.collapsed) classes.push("collapsed")
  if (flags.aggregate) classes.push("aggregate")
  if (flags.hasOverlay) classes.push("has-overlay")
  if (flags.onPath) classes.push("on-path")
  return classes.join(" ")
}

/**
 * Builds the three zoom-driven label variants for a leaf node, used by the
 * type-driven semantic zoom feature (see `updateSemanticZoom` in the renderer).
 * Compound container labels are never swapped — they stay legible at every
 * zoom level so the group/service identity is what survives at low zoom.
 *   - rich    (high zoom):    icon + label + a supplied property, if any
 *   - default (medium zoom):  icon + label
 *   - compact (low zoom):     icon only — a compact identity
 * Very-low zoom hides the label entirely via a stylesheet class instead of a
 * data field, so no variant is needed for that bucket.
 */
function firstPropertyEntry(
  properties: Record<string, unknown> | undefined,
): string | undefined {
  if (!properties) return undefined
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return `${key}: ${value}`
    }
  }
  return undefined
}

export function mapViewModelToElements(
  viewModel: GraphViewModel,
  ctx: CytoscapeMappingContext,
): ElementDefinition[] {
  const { nodeTypeRegistry, edgeTypeRegistry, iconRegistry, theme } = ctx
  const elements: ElementDefinition[] = []

  for (const node of viewModel.nodes) {
    const def = nodeTypeRegistry.get(node.type)
    const icon = iconRegistry.get(def.icon ?? "unknown")
    const isContainer = node.isContainer === true
    const bg = isContainer
      ? theme.containerFill
      : toneColor(theme, def.tone, theme.nodeFill)
    const border = isContainer
      ? theme.containerBorder
      : toneColor(theme, def.tone, theme.nodeBorder)
    const label = node.label ?? def.label ?? node.id
    const extra = firstPropertyEntry(node.properties)
    const nodeOverlayColor = overlayColor(theme, node.overlays)
    const nodeOnPath = (node.onSupportingPathIds?.length ?? 0) > 0
    elements.push({
      group: "nodes",
      data: {
        id: node.id,
        label,
        // Zoom-driven variants (leaf nodes only; containers always show `label`).
        labelDefault: `${icon.glyph}  ${label}`,
        labelRich: extra ? `${icon.glyph}  ${label}\n${extra}` : `${icon.glyph}  ${label}`,
        labelCompact: icon.glyph,
        parent: node.containerId,
        shape: isContainer ? undefined : mapNodeShapeToCytoscape(def.shape),
        glyph: icon.glyph,
        bg,
        border,
        text: isContainer ? theme.containerText : theme.nodeText,
        // Supplied overlay accent; absent when this node carries no overlay.
        overlayColor: nodeOverlayColor ?? theme.highlight,
      },
      classes: classesFor({
        selected: node.selected,
        focused: node.focused,
        highlighted: node.searchHighlighted,
        container: isContainer,
        collapsed: node.collapsed === true,
        // "pill" is a Cytoscape-only presentation refinement (tighter corner
        // radius) layered on top of the mapped `round-rectangle` shape. It is
        // derived from the semantic shape, never stored on the node record.
        pill: !isContainer && def.shape === "pill",
        hasOverlay: nodeOverlayColor !== undefined,
        onPath: nodeOnPath,
      }),
    })
  }

  for (const edge of viewModel.edges) {
    const isAggregate = (edge.aggregatedEdgeIds?.length ?? 0) > 0
    const def = edgeTypeRegistry.get(edge.type)
    const line = isAggregate ? theme.highlight : toneColor(theme, def.tone, theme.edgeLine)
    const edgeOverlayColor = overlayColor(theme, edge.overlays)
    const edgeOnPath = (edge.onSupportingPathIds?.length ?? 0) > 0
    elements.push({
      group: "edges",
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label ?? def.label ?? edge.type,
        line,
        arrow: def.targetArrow ?? "triangle",
        lineStyle: isAggregate ? "dashed" : def.lineStyle ?? "solid",
        // Supplied overlay accent; absent when this edge carries no overlay.
        overlayColor: edgeOverlayColor ?? theme.highlight,
      },
      classes: classesFor({
        selected: edge.selected,
        highlighted: edge.searchHighlighted,
        aggregate: isAggregate,
        hasOverlay: edgeOverlayColor !== undefined,
        onPath: edgeOnPath,
      }),
    })
  }

  return elements
}
