/**
 * Declarative, data-driven appearance/behavior definitions for node and edge
 * types. Products register these to control presentation without touching
 * graph-core. Everything is renderer-neutral: a definition expresses intent
 * (shape, tone, icon) that any renderer adapter can translate.
 */

/** Semantic color intent. Open string so products can add tones. */
export type GraphTone =
  | "neutral"
  | "brand"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | (string & {})

/** Renderer-neutral node silhouette. Open string; adapters map to their vocab. */
export type GraphNodeShape =
  | "round-rectangle"
  | "rectangle"
  | "ellipse"
  | "hexagon"
  | "diamond"
  | "tag"
  | (string & {})

export type GraphEdgeLineStyle = "solid" | "dashed" | "dotted" | (string & {})

export type GraphEdgeArrow = "triangle" | "chevron" | "circle" | "none" | (string & {})

export interface GraphPropertyDefinition {
  readonly key: string
  readonly label?: string
  /** Key into PropertyFormatterRegistry; falls back to a default formatter. */
  readonly formatterId?: string
  readonly hidden?: boolean
}

export interface GraphNodeTypeDefinition {
  readonly type: string
  readonly label?: string
  /** Key into IconRegistry. */
  readonly icon?: string
  readonly shape?: GraphNodeShape
  readonly tone?: GraphTone
  readonly properties?: readonly GraphPropertyDefinition[]
  /**
   * Escape hatch: key into NodeRendererRegistry for a fully custom renderer.
   * Declarative fields above are the preferred/default path.
   */
  readonly rendererId?: string
  readonly description?: string
}

export interface GraphEdgeTypeDefinition {
  readonly type: string
  readonly label?: string
  readonly tone?: GraphTone
  readonly lineStyle?: GraphEdgeLineStyle
  readonly targetArrow?: GraphEdgeArrow
  readonly properties?: readonly GraphPropertyDefinition[]
  readonly description?: string
}
