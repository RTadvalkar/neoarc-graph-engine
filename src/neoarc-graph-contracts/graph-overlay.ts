import type { GraphId, GraphProperties } from "./graph-model"
import type { GraphTone } from "./graph-type-definitions"

/**
 * A supplied visual interpretation layered on top of the graph (impact,
 * search, risk, coverage, provenance…). Overlays are SUPPLIED by the product;
 * the reusable library never infers them. Applying an overlay must not mutate
 * GraphModel. The same shape supports many `kind`s so one overlay engine can
 * serve impact today and risk/coverage later.
 *
 * Renderer- and domain-neutral: `state` is an OPEN string and graph-core never
 * interprets it (no "root"/"direct"/… special-casing). Visual intent travels
 * only through the supplied `tone`. Membership decisions (focus restriction,
 * path highlighting) are pure id-set tests over supplied ids.
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

/**
 * A supplied supporting path (e.g. an impact propagation path). Never inferred
 * locally. `edgeIds` are canonical GraphModel edge ids; `nodeIds` are optional
 * and used only for node-level path emphasis / inspection.
 */
export interface GraphOverlayPath {
  readonly id: string
  readonly edgeIds: readonly GraphId[]
  readonly nodeIds?: readonly GraphId[]
  readonly label?: string
  readonly properties?: GraphProperties
}

export type GraphOverlayCompleteness = "complete" | "truncated" | "partial" | (string & {})

/**
 * Result of comparing a supplied overlay's provenance against the current
 * canonical model. A 4-way result (never a boolean) so missing revision or
 * identity data is reported as `"unknown"` instead of being misclassified as
 * stale/incompatible. Freshness is derived purely from supplied fields — it
 * NEVER triggers any impact/overlay recomputation.
 */
export type GraphOverlayFreshness = "current" | "stale" | "unknown" | "incompatible"

export interface GraphOverlay {
  readonly id: string
  /** Open discriminator: "impact" | "search" | "risk" | … */
  readonly kind: string
  /** Optional short display name for the overlay. */
  readonly label?: string
  readonly nodeStates?: readonly GraphOverlayNodeState[]
  readonly edgeStates?: readonly GraphOverlayEdgeState[]
  /** Supplied supporting-path edge ids (never inferred locally). */
  readonly pathEdgeIds?: readonly GraphId[]
  /** Richer supplied supporting paths; preferred over `pathEdgeIds`. */
  readonly paths?: readonly GraphOverlayPath[]
  /**
   * Generic supplied focus set. Impact-neutral: graph-core treats these as
   * opaque ids for "restrict to overlay focus" and NEVER derives membership
   * from `state` strings. A product labels the corresponding control however
   * it wishes (e.g. "Impacted only").
   */
  readonly focusNodeIds?: readonly GraphId[]
  readonly focusEdgeIds?: readonly GraphId[]
  /** Supplied identity of the model this overlay was computed against. */
  readonly sourceModelId?: string
  /** Supplied revision of the model this overlay was computed against. */
  readonly sourceRevision?: number
  readonly completeness?: GraphOverlayCompleteness
  readonly metadata?: GraphProperties
}

/**
 * A supplied overlay node-state as APPLIED to a derived view node. Carries the
 * originating `overlayId` so multiple overlays can coexist on one node without
 * losing provenance. `tone`/`state` pass through verbatim.
 */
export interface GraphAppliedOverlayNodeState extends GraphOverlayNodeState {
  readonly overlayId: string
}

/** Edge equivalent of {@link GraphAppliedOverlayNodeState}. */
export interface GraphAppliedOverlayEdgeState extends GraphOverlayEdgeState {
  readonly overlayId: string
  /**
   * When this applied state reached a visible aggregate/meta-edge through one
   * of its underlying canonical edge ids, that canonical id is recorded here
   * so provenance survives collapse. Equal to `edgeId` for direct matches.
   */
  readonly viaEdgeId?: GraphId
}
