import type { StylesheetJson } from "cytoscape"
import type { GraphRendererTheme } from "@neoarc/graph-renderer"

/**
 * Builds the Cytoscape stylesheet from the host theme. Tone-specific colors are
 * carried on element data (`data(bg)`, `data(line)`), so this stylesheet only
 * encodes structural/theme rules. Rebuilt on theme change via `cy.style()`.
 */
export function buildStylesheet(theme: GraphRendererTheme): StylesheetJson {
  return [
    {
      selector: "node",
      style: {
        shape: "data(shape)",
        "background-color": "data(bg)",
        "border-color": "data(border)",
        "border-width": 2,
        label: "data(label)",
        color: "data(text)",
        "font-size": 11,
        "font-weight": 500,
        "text-valign": "center",
        "text-halign": "center",
        "text-wrap": "wrap",
        "text-max-width": "120px",
        width: "label",
        height: "label",
        padding: "12px",
        "transition-property": "border-color, border-width, background-color",
        "transition-duration": 0.12,
      },
    },
    {
      selector: "node.container",
      style: {
        "background-opacity": 0.35,
        "border-width": 1.5,
        "border-style": "dashed",
        shape: "round-rectangle",
        "text-valign": "top",
        "text-halign": "center",
        "font-size": 12,
        "font-weight": 700,
        padding: "26px",
        width: "label",
        height: "label",
      },
    },
    {
      selector: "node.pill",
      style: {
        "corner-radius": "999",
      },
    },
    {
      selector: "node.selected",
      style: {
        "border-color": theme.selected,
        "border-width": 4,
      },
    },
    {
      selector: "node.focused",
      style: {
        "border-color": theme.focused,
        "border-width": 4,
      },
    },
    {
      selector: "node.highlight",
      style: {
        "border-color": theme.highlight,
        "border-width": 3,
      },
    },
    {
      selector: "edge",
      style: {
        width: 1.6,
        "line-color": "data(line)",
        "line-style": "data(lineStyle)",
        "target-arrow-color": "data(line)",
        "target-arrow-shape": "data(arrow)",
        "curve-style": "bezier",
        label: "data(label)",
        "font-size": 9,
        color: theme.edgeText,
        "text-rotation": "autorotate",
        "text-background-color": theme.background,
        "text-background-opacity": 1,
        "text-background-padding": "2px",
      },
    },
    {
      selector: "edge.selected",
      style: {
        "line-color": theme.selected,
        "target-arrow-color": theme.selected,
        width: 3.5,
        color: theme.nodeText,
      },
    },
    {
      selector: "edge.highlight",
      style: {
        "line-color": theme.highlight,
        "target-arrow-color": theme.highlight,
        width: 2.6,
      },
    },
  ] as unknown as StylesheetJson
}
