import type { ElementDefinition } from "cytoscape"
import type { GraphViewModel } from "@neoarc/graph-contracts"
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

export function classesFor(flags: {
  selected?: boolean
  focused?: boolean
  highlighted?: boolean
  container?: boolean
  pill?: boolean
}): string {
  const classes: string[] = []
  if (flags.container) classes.push("container")
  if (flags.pill) classes.push("pill")
  if (flags.selected) classes.push("selected")
  if (flags.focused) classes.push("focused")
  if (flags.highlighted) classes.push("highlight")
  return classes.join(" ")
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
    elements.push({
      group: "nodes",
      data: {
        id: node.id,
        label: node.label ?? def.label ?? node.id,
        parent: node.containerId,
        shape: isContainer ? undefined : mapNodeShapeToCytoscape(def.shape),
        glyph: icon.glyph,
        bg,
        border,
        text: isContainer ? theme.containerText : theme.nodeText,
      },
      classes: classesFor({
        selected: node.selected,
        focused: node.focused,
        highlighted: node.searchHighlighted,
        container: isContainer,
        // "pill" is a Cytoscape-only presentation refinement (tighter corner
        // radius) layered on top of the mapped `round-rectangle` shape. It is
        // derived from the semantic shape, never stored on the node record.
        pill: !isContainer && def.shape === "pill",
      }),
    })
  }

  for (const edge of viewModel.edges) {
    const def = edgeTypeRegistry.get(edge.type)
    const line = toneColor(theme, def.tone, theme.edgeLine)
    elements.push({
      group: "edges",
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label ?? def.label ?? edge.type,
        line,
        arrow: def.targetArrow ?? "triangle",
        lineStyle: def.lineStyle ?? "solid",
      },
      classes: classesFor({
        selected: edge.selected,
        highlighted: edge.searchHighlighted,
      }),
    })
  }

  return elements
}
