import type { GraphId, GraphProperties } from "./graph-model"
import type { GraphTone } from "./graph-type-definitions"

/**
 * A supplied visual interpretation layered on top of the graph (impact,
 * search, risk, coverage, provenance…). Overlays are SUPPLIED by the product;
 * the reusable library never infers them. Applying an overlay must not mutate
 * GraphModel. The same shape supports many `kind`s so one overlay engine can
 * serve impact today and risk/coverage later.
 */

export interface GraphOverlayNodeState {
  readonly nodeId: GraphId
  /** e.g. "root" | "direct" | "transitive" | "potential" | "none" — open. */
  readonly state: string
  readonly tone?: GraphTone
  readonly label?: string
  readonly properties?: GraphProperties
}

export interface GraphOverlayEdgeState {
  readonly edgeId: GraphId
  readonly state: string
  readonly tone?: GraphTone
}

export type GraphOverlayCompleteness = "complete" | "truncated" | "partial" | (string & {})

export interface GraphOverlay {
  readonly id: string
  /** Open discriminator: "impact" | "search" | "risk" | … */
  readonly kind: string
  readonly nodeStates?: readonly GraphOverlayNodeState[]
  readonly edgeStates?: readonly GraphOverlayEdgeState[]
  /** Supplied supporting-path edge ids (never inferred locally). */
  readonly pathEdgeIds?: readonly GraphId[]
  readonly completeness?: GraphOverlayCompleteness
  readonly metadata?: GraphProperties
}
