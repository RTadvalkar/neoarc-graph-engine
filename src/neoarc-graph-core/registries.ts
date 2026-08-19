import type {
  GraphEdgeTypeDefinition,
  GraphNodeTypeDefinition,
  GraphProperties,
  GraphPropertyValue,
} from "@neoarc/graph-contracts"
import { DEFAULT_NODE_SHAPE } from "@neoarc/graph-contracts"
import { Registry } from "./registry"

/** Visual descriptor for a node/edge icon, kept renderer-neutral. */
export interface GraphIconDefinition {
  readonly id: string
  /** Short glyph a canvas renderer can draw (e.g. "SVC", "REQ", "?"). */
  readonly glyph: string
  readonly description?: string
}

/** Formats a property value into a display string. */
export type GraphPropertyFormatter = (
  value: GraphPropertyValue,
  context: { readonly key: string; readonly properties?: GraphProperties },
) => string

/**
 * Escape-hatch custom node renderer descriptor. A renderer adapter MAY honor
 * this for types that declare `rendererId`; declarative type definitions remain
 * the default. Kept as an opaque, renderer-neutral marker in G1.
 */
export interface GraphNodeRendererDefinition {
  readonly id: string
  readonly description?: string
}

/** Where a graph action may be invoked from. */
export type GraphActionTarget = "node" | "edge" | "canvas" | "selection"

/**
 * A product-contributed action surfaced in toolbars/context menus. Actions
 * describe intent; the host decides fulfillment. No execution logic lives here.
 */
export interface GraphActionDefinition {
  readonly id: string
  readonly label: string
  readonly target: GraphActionTarget
  readonly icon?: string
  readonly description?: string
  /**
   * Restricts a "node"/"edge" targeted action to specific open-string
   * node/edge types. Omitted (or empty) means "applies to every type" —
   * this is a plain string allow-list, never a closed enum.
   */
  readonly appliesToTypes?: readonly string[]
}

export type NodeTypeRegistry = Registry<GraphNodeTypeDefinition>
export type EdgeTypeRegistry = Registry<GraphEdgeTypeDefinition>
export type IconRegistry = Registry<GraphIconDefinition>
export type PropertyFormatterRegistry = Registry<GraphPropertyFormatter>
export type NodeRendererRegistry = Registry<GraphNodeRendererDefinition | null>
export type GraphActionRegistry = Registry<GraphActionDefinition>

const humanizeType = (type: string): string =>
  type
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim()

/** Safe fallback node definition for unregistered types. */
export const fallbackNodeTypeDefinition = (type: string): GraphNodeTypeDefinition => ({
  type,
  label: humanizeType(type) || "Node",
  shape: DEFAULT_NODE_SHAPE,
  tone: "neutral",
  icon: "unknown",
})

/** Safe fallback edge definition for unregistered types. */
export const fallbackEdgeTypeDefinition = (type: string): GraphEdgeTypeDefinition => ({
  type,
  label: humanizeType(type) || "related",
  tone: "neutral",
  lineStyle: "dashed",
  targetArrow: "triangle",
})

const fallbackIcon = (id: string): GraphIconDefinition => ({
  id,
  glyph: "?",
  description: "Fallback icon for an unregistered icon id",
})

const defaultFormatter: GraphPropertyFormatter = (value) => {
  if (value === null || value === undefined) return "—"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (Array.isArray(value)) return value.map((v) => defaultFormatter(v, { key: "" })).join(", ")
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

export interface GraphRegistries {
  readonly nodeTypes: NodeTypeRegistry
  readonly edgeTypes: EdgeTypeRegistry
  readonly icons: IconRegistry
  readonly propertyFormatters: PropertyFormatterRegistry
  readonly nodeRenderers: NodeRendererRegistry
  readonly actions: GraphActionRegistry
}

export interface CreateRegistriesInput {
  readonly nodeTypes?: readonly GraphNodeTypeDefinition[]
  readonly edgeTypes?: readonly GraphEdgeTypeDefinition[]
  readonly icons?: readonly GraphIconDefinition[]
  readonly propertyFormatters?: Readonly<Record<string, GraphPropertyFormatter>>
  readonly nodeRenderers?: readonly GraphNodeRendererDefinition[]
  readonly actions?: readonly GraphActionDefinition[]
}

/**
 * Assemble a full set of extension registries with safe fallbacks pre-wired.
 * Products call this with their declarative definitions.
 */
export function createGraphRegistries(input: CreateRegistriesInput = {}): GraphRegistries {
  return {
    nodeTypes: new Registry<GraphNodeTypeDefinition>(
      fallbackNodeTypeDefinition,
      (input.nodeTypes ?? []).map((d) => [d.type, d] as const),
    ),
    edgeTypes: new Registry<GraphEdgeTypeDefinition>(
      fallbackEdgeTypeDefinition,
      (input.edgeTypes ?? []).map((d) => [d.type, d] as const),
    ),
    icons: new Registry<GraphIconDefinition>(
      fallbackIcon,
      (input.icons ?? []).map((d) => [d.id, d] as const),
    ),
    propertyFormatters: new Registry<GraphPropertyFormatter>(
      () => defaultFormatter,
      Object.entries(input.propertyFormatters ?? {}),
    ),
    nodeRenderers: new Registry<GraphNodeRendererDefinition | null>(
      () => null,
      (input.nodeRenderers ?? []).map((d) => [d.id, d] as const),
    ),
    actions: new Registry<GraphActionDefinition>(
      (id) => ({ id, label: id, target: "node" }),
      (input.actions ?? []).map((d) => [d.id, d] as const),
    ),
  }
}

export { humanizeType }
