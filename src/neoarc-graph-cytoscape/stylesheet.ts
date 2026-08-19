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
        // Medium zoom (the resting default): icon + label.
        label: "data(labelDefault)",
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
      // High zoom: type-driven, richer node — icon + label + a supplied
      // property. Never applied to compound containers (see `container`
      // below), which keep a stable identity at every zoom level.
      selector: "node.zoom-rich",
      style: { label: "data(labelRich)", "text-max-width": "160px" },
    },
    {
      // Low zoom: compact identity — icon glyph only.
      selector: "node.zoom-compact",
      style: { label: "data(labelCompact)", "font-size": 9 },
    },
    {
      // Very low zoom: leaf nodes collapse to an unlabeled dot so only
      // compound service/group structure (which never gets this class)
      // remains legible — "group/service emphasis".
      selector: "node.zoom-hidden",
      style: { label: "", width: 14, height: 14, padding: "4px" },
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
      // A collapsed compound group still renders — folded children are a
      // view-only concern — but reads visually as "closed": a solid border
      // and stronger fill instead of the expanded dashed outline.
      selector: "node.container.collapsed",
      style: {
        "background-opacity": 0.55,
        "border-style": "solid",
        "border-width": 2.5,
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
