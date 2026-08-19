import type { GraphOverlay } from "@neoarc/graph-contracts"

/**
 * SHOWCASE ONLY. A mock, fully-SUPPLIED impact result — the kind of payload a
 * product backend (Neo4j/GDS + an impact service) would hand the Explorer.
 *
 * CRITICAL ARCHITECTURE NOTE: the impact vocabulary lives ENTIRELY here, in
 * showcase fixture data. Every state → tone mapping (root→brand, direct→danger,
 * transitive→warning, potential→info, none→neutral) is supplied explicitly on
 * each entry. graph-core and the Cytoscape adapter never know these state
 * strings exist; they only ever consume the generic `tone`. Nothing here is
 * computed — it is a static, supplied interpretation.
 *
 * `sourceRevision: 41` matches `IMPACT_SYSTEM_GRAPH.revision`, so freshness
 * reads "current" until an agent update bumps the model revision.
 */
export const IMPACT_RESULT: GraphOverlay = {
  id: "impact-spring-ai",
  kind: "impact",
  label: "Impact: Introduce Spring AI",
  sourceModelId: "ai-platform",
  sourceRevision: 41,
  completeness: "truncated",

  nodeStates: [
    // Root: the change site itself.
    {
      nodeId: "svc-intelligence",
      state: "root",
      tone: "brand",
      properties: {
        reason: "Direct change site: Spring AI replaces the inference client.",
        hop: 0,
      },
    },
    // Direct: one hop from the change, highest confidence.
    {
      nodeId: "svc-summarization",
      state: "direct",
      tone: "danger",
      properties: {
        reason: "Calls POST /infer synchronously; SDK contract change affects it directly.",
        hop: 1,
      },
    },
    {
      nodeId: "svc-knowledge",
      state: "direct",
      tone: "danger",
      properties: {
        reason: "Intelligence Service depends on retrieval; embedding call path changes.",
        hop: 1,
      },
    },
    {
      nodeId: "cap-inference",
      state: "direct",
      tone: "danger",
      properties: { reason: "Model inference capability is implemented by the change site.", hop: 1 },
    },
    // Transitive: reachable through a direct-impact node.
    {
      nodeId: "svc-assistant",
      state: "transitive",
      tone: "warning",
      properties: {
        reason: "Depends on Summarization and Intelligence; propagated latency risk.",
        hop: 2,
      },
    },
    {
      nodeId: "req-latency",
      state: "transitive",
      tone: "warning",
      properties: { reason: "Sub-2s response satisfied by an impacted capability.", hop: 2 },
    },
    // Potential: lower-confidence, needs review.
    {
      nodeId: "ext-acp",
      state: "potential",
      tone: "info",
      properties: {
        reason: "Agent Control Plane integration MAY require a protocol bump — unverified.",
        hop: 1,
      },
    },
    {
      nodeId: "test-infer-e2e",
      state: "potential",
      tone: "info",
      properties: { reason: "Inference E2E test likely needs updated fixtures.", hop: 2 },
    },
    // Explicit "no impact" state (neutral, tone omitted on purpose).
    { nodeId: "svc-knowledge-cache", state: "none", label: "excluded" },
  ],

  edgeStates: [
    { edgeId: "e-sum-int", state: "direct", tone: "danger" },
    { edgeId: "e-int-know", state: "direct", tone: "danger" },
    { edgeId: "e-int-cap", state: "direct", tone: "danger" },
    { edgeId: "e-asst-int", state: "transitive", tone: "warning" },
    { edgeId: "e-asst-sum", state: "transitive", tone: "warning" },
    { edgeId: "e-cap-inf-lat", state: "transitive", tone: "warning" },
    { edgeId: "e-int-acp", state: "potential", tone: "info" },
  ],

  // Supplied supporting paths (canonical edge ids). Never inferred locally.
  paths: [
    {
      id: "path-assistant",
      label: "Assistant Gateway → Intelligence → Knowledge",
      edgeIds: ["e-asst-int", "e-int-know"],
      nodeIds: ["svc-assistant", "svc-intelligence", "svc-knowledge"],
    },
    {
      id: "path-latency",
      label: "Change → inference capability → latency requirement",
      edgeIds: ["e-int-cap", "e-cap-inf-lat"],
      nodeIds: ["svc-intelligence", "cap-inference", "req-latency"],
    },
    {
      id: "path-acp",
      label: "Change → ACP integration (potential)",
      edgeIds: ["e-int-acp"],
      nodeIds: ["svc-intelligence", "ext-acp"],
    },
  ],

  // Focus set = every impacted (non-"none") node/edge, for the "Impacted only"
  // view restriction. Supplied ids only; graph-core never derives this.
  focusNodeIds: [
    "svc-intelligence",
    "svc-summarization",
    "svc-knowledge",
    "cap-inference",
    "svc-assistant",
    "req-latency",
    "ext-acp",
    "test-infer-e2e",
  ],
  focusEdgeIds: [
    "e-sum-int",
    "e-int-know",
    "e-int-cap",
    "e-asst-int",
    "e-asst-sum",
    "e-cap-inf-lat",
    "e-int-acp",
  ],

  metadata: {
    effectiveHops: 3,
    additionalRelationshipsAvailable: 12,
    policyVersion: "impact-policy@2.4.0",
    generatedAt: "2026-08-19T09:14:00Z",
    summary:
      "Introducing Spring AI in the Intelligence Service directly affects Summarization and Knowledge Retrieval and the model-inference capability. Latency-sensitive paths through the Assistant Gateway are transitively impacted. The ACP integration is a potential impact pending protocol review. Result truncated at 3 hops; 12 further relationships available.",
  },
}

/**
 * The supplied node id referenced by the `"none"` state above that is NOT
 * present in the loaded graph — used to prove unresolved-reference surfacing
 * end to end (the panel reports it; the engine never fabricates it).
 */
export const IMPACT_UNRESOLVED_NODE_ID = "svc-knowledge-cache"
