/**
 * Canonical, renderer-neutral graph facts.
 *
 * These types describe what the product/backend supplied. They are the single
 * source of truth. Nothing here may import a renderer (Cytoscape, Sigma, etc.)
 * or a product DTO. `GraphModel` is treated as immutable: view behavior derives
 * new structures instead of mutating these facts.
 */

/** Stable, authoritative identifier for a node or edge. */
export type GraphId = string

/** JSON-ish property value. Kept permissive so any domain can attach data. */
export type GraphPropertyValue =
  | string
  | number
  | boolean
  | null
  | GraphPropertyValue[]
  | { [key: string]: GraphPropertyValue }

/** Free-form property bag carried on nodes, edges, and models. */
export type GraphProperties = Record<string, GraphPropertyValue>

export interface GraphNode {
  /** Stable node identity supplied by the product. */
  readonly id: GraphId
  /**
   * Open string discriminator (e.g. "Service", "Requirement", "Deployment").
   * NEVER a closed product enum — unknown types must resolve to a safe fallback.
   */
  readonly type: string
  /** Human-facing label; falls back to id when absent. */
  readonly label?: string
  /**
   * Visual containment only (compound/group membership). This is NOT a semantic
   * relationship — `partOf`/`ownedBy`/`dependsOn` remain real edges.
   */
  readonly containerId?: GraphId
  readonly properties?: GraphProperties
}

export interface GraphEdge {
  /**
   * Stable, authoritative edge identity. Edges are NEVER deduplicated by
   * source+target: parallel edges (A supports B, A dependsOn B) are valid.
   */
  readonly id: GraphId
  /** Open string discriminator (e.g. "dependsOn", "implements"). */
  readonly type: string
  readonly source: GraphId
  readonly target: GraphId
  readonly label?: string
  readonly properties?: GraphProperties
}

export interface GraphModel {
  readonly id?: string
  /**
   * Monotonic revision supplied by the product. Used to detect stale patches;
   * the reusable library never invents authoritative revisions.
   */
  readonly revision?: number
  readonly nodes: readonly GraphNode[]
  readonly edges: readonly GraphEdge[]
  readonly metadata?: GraphProperties
}
