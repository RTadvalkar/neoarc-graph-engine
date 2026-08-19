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

/**
 * Renderer-neutral semantic node silhouette. This is a closed vocabulary of
 * intent, not a renderer's shape vocabulary — no Cytoscape shape name may be
 * exposed here. Each renderer adapter owns its own mapping from these values
 * to renderer-specific primitives (see `neoarc-graph-cytoscape/shape-mapping`
 * for the Cytoscape v1 mapping) and MUST fall back safely to `generic` for
 * any value it does not understand, so a future Ogma/yFiles/Sigma renderer
 * can adopt the same contract without graph-core or graph-contracts changes.
 */
export type GraphNodeShape =
  | "rectangle"
  | "rounded-rectangle"
  | "ellipse"
  | "circle"
  | "diamond"
  | "hexagon"
  | "octagon"
  | "triangle"
  | "pill"
  | "container"
  | "tag"
  | "generic"
  | (string & {})

/** Safe, renderer-neutral fallback for any shape value a renderer can't map. */
export const DEFAULT_NODE_SHAPE: GraphNodeShape = "generic"

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
