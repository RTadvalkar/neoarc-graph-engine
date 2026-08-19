import type { GraphEdge, GraphModel, GraphNode } from "@neoarc/graph-contracts"

/**
 * SHOWCASE ONLY. A realistic AI-platform software-system graph used to
 * demonstrate SUPPLIED impact visualization. It reuses the same domain
 * vocabulary as Graph Lab (Service/Api/Entity/Capability/Requirement/Story/
 * Test/Finding/ExternalSystem) so it can share `showcaseRegistries`.
 *
 * The proposed change under analysis is "Introduce Spring AI in the
 * Intelligence Service". The graph revision starts at 41 — the exact value
 * the mock impact result was generated against — so the staleness demo can
 * later bump it and flip the report to STALE without any recompute.
 */

const NODES: GraphNode[] = [
  // Intelligence Service (the change site) + members
  {
    id: "svc-intelligence",
    type: "Service",
    label: "Intelligence Service",
    properties: { team: "AI Platform", language: "Java", tier: 1 },
  },
  { id: "api-infer", type: "Api", label: "POST /infer", containerId: "svc-intelligence" },
  { id: "api-embed", type: "Api", label: "POST /embed", containerId: "svc-intelligence" },
  { id: "ent-prompt", type: "Entity", label: "Prompt", containerId: "svc-intelligence" },

  // Downstream / dependent services + members
  {
    id: "svc-knowledge",
    type: "Service",
    label: "Knowledge Retrieval Service",
    properties: { team: "AI Platform", language: "Python", tier: 1 },
  },
  { id: "api-search", type: "Api", label: "GET /search", containerId: "svc-knowledge" },
  { id: "ent-document", type: "Entity", label: "Document", containerId: "svc-knowledge" },

  {
    id: "svc-summarization",
    type: "Service",
    label: "Summarization Service",
    properties: { team: "AI Platform", language: "Python", tier: 2 },
  },
  { id: "api-summarize", type: "Api", label: "POST /summarize", containerId: "svc-summarization" },

  {
    id: "svc-assistant",
    type: "Service",
    label: "Assistant Gateway",
    properties: { team: "Experiences", language: "TypeScript", tier: 1 },
  },
  { id: "api-chat", type: "Api", label: "POST /chat", containerId: "svc-assistant" },

  // Capabilities
  { id: "cap-retrieval", type: "Capability", label: "Knowledge retrieval" },
  { id: "cap-summarize", type: "Capability", label: "Summarization" },
  { id: "cap-inference", type: "Capability", label: "Model inference" },

  // Requirements
  { id: "req-latency", type: "Requirement", label: "Sub-2s response" },
  { id: "req-grounding", type: "Requirement", label: "Answer grounding" },
  { id: "req-privacy", type: "Requirement", label: "Data residency" },

  // Stories & tests
  { id: "story-answer", type: "Story", label: "Grounded answer" },
  { id: "test-infer-e2e", type: "Test", label: "Inference E2E" },
  { id: "test-retrieval-unit", type: "Test", label: "Retrieval unit test" },

  // Findings
  {
    id: "find-token-leak",
    type: "Finding",
    label: "Token budget overflow",
    properties: { severity: "medium", status: "open" },
  },

  // External systems (ACP = an agent/model control plane)
  { id: "ext-acp", type: "ExternalSystem", label: "Agent Control Plane (ACP)" },
  { id: "ext-vectordb", type: "ExternalSystem", label: "Vector Database" },
]

const EDGES: GraphEdge[] = [
  // Intelligence Service dependencies
  { id: "e-int-know", type: "dependsOn", source: "svc-intelligence", target: "svc-knowledge" },
  { id: "e-int-acp", type: "integratesWith", source: "svc-intelligence", target: "ext-acp" },
  { id: "e-int-cap", type: "implements", source: "svc-intelligence", target: "cap-inference" },

  // Knowledge Retrieval
  { id: "e-know-vdb", type: "integratesWith", source: "svc-knowledge", target: "ext-vectordb" },
  { id: "e-know-cap", type: "implements", source: "svc-knowledge", target: "cap-retrieval" },

  // Summarization depends on Intelligence
  { id: "e-sum-int", type: "dependsOn", source: "svc-summarization", target: "svc-intelligence" },
  { id: "e-sum-cap", type: "implements", source: "svc-summarization", target: "cap-summarize" },

  // Assistant Gateway sits on top of everything
  { id: "e-asst-int", type: "dependsOn", source: "svc-assistant", target: "svc-intelligence" },
  { id: "e-asst-sum", type: "dependsOn", source: "svc-assistant", target: "svc-summarization" },

  // Capabilities → requirements
  { id: "e-cap-inf-lat", type: "satisfies", source: "cap-inference", target: "req-latency" },
  { id: "e-cap-ret-gr", type: "satisfies", source: "cap-retrieval", target: "req-grounding" },
  { id: "e-cap-ret-pr", type: "satisfies", source: "cap-retrieval", target: "req-privacy" },

  // Stories / tests
  { id: "e-story-cover", type: "covers", source: "test-infer-e2e", target: "story-answer" },
  { id: "e-test-int", type: "verifies", source: "test-infer-e2e", target: "svc-intelligence" },
  { id: "e-test-know", type: "verifies", source: "test-retrieval-unit", target: "svc-knowledge" },

  // Findings
  { id: "e-find-int", type: "affects", source: "find-token-leak", target: "svc-intelligence" },
]

/**
 * Authoritative model handed to the Explorer. `revision: 41` is deliberate: it
 * matches the supplied impact result's `sourceRevision`, so the report reads
 * as CURRENT until a later agent update bumps the revision.
 */
export const IMPACT_SYSTEM_GRAPH: GraphModel = {
  id: "ai-platform",
  revision: 41,
  nodes: NODES,
  edges: EDGES,
  metadata: { domain: "software-system", source: "NeoArc impact showcase fixture" },
}

/** The change intent under analysis (display metadata only). */
export const IMPACT_CHANGE_INTENT = {
  title: "Introduce Spring AI in Intelligence Service",
  rootEntityIds: ["svc-intelligence"] as const,
}
