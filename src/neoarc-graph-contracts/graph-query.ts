import type { GraphId, GraphProperties } from "./graph-model"
import type { GraphModel } from "./graph-model"
import type { GraphPatch } from "./graph-patch"
import type { GraphOverlay, GraphOverlayCompleteness } from "./graph-overlay"

/**
 * The Graph Explorer is query-AWARE, not the authoritative query engine.
 * Reusable UI emits a GraphQueryRequest (intent) and the product returns a
 * GraphQueryResult. Neo4j/Cypher/impact algorithms live entirely in the
 * product/backend — never here.
 */

export type GraphTraversalDirection = "incoming" | "outgoing" | "both"

/** Open discriminator so products can add query kinds. */
export type GraphQueryKind = "expand" | "search" | "path" | "impact" | (string & {})

export interface GraphQueryRequest {
  readonly kind: GraphQueryKind
  readonly rootNodeIds?: readonly GraphId[]
  /**
   * Arbitrary N-hop. Locked invariant: this is a number, never a 1|2|3 union.
   * The UI may offer presets but the contract stays open.
   */
  readonly maxHops?: number
  readonly direction?: GraphTraversalDirection
  readonly edgeTypes?: readonly string[]
  readonly nodeTypes?: readonly string[]
  readonly query?: string
  readonly params?: GraphProperties
}

export interface GraphQueryResult {
  readonly requestKind: GraphQueryKind
  /** A product may return a fresh model, a patch, or both. */
  readonly model?: GraphModel
  readonly patch?: GraphPatch
  readonly overlay?: GraphOverlay
  readonly completeness?: GraphOverlayCompleteness
  readonly revision?: number
}
