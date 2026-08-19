import type {
  GraphChangeSetSource,
  GraphEdge,
  GraphId,
  GraphModel,
  GraphNode,
  GraphPatch,
  GraphTraversalDirection,
} from "@neoarc/graph-contracts"

/**
 * SHOWCASE ONLY. A realistic multi-service software-system graph used to prove
 * reusable behavior: compound groups (services containing APIs/entities),
 * parallel edges, a self-loop, a cycle, and intentionally UNREGISTERED types
 * ("Deployment"/"runsOn"/"retries") to exercise safe fallback.
 *
 * `BACKEND_NODES/EDGES` model the authoritative store. The initial view loads
 * only a subset; expansion intents are fulfilled by the showcase controller
 * reading from this "backend" — never by hidden fetches inside the library.
 *
 * G4 note: "Deployment"/"streamsTo" are now REGISTERED in `registries.ts`
 * (configuration-only proof), so the unknown-type fallback proof instead
 * uses the intentionally-unregistered "QuantumGateway"/"teleportsTo" here.
 */

const BACKEND_NODES: GraphNode[] = [
  // Checkout service + members
  { id: "svc-checkout", type: "Service", label: "Checkout Service", properties: { team: "Payments", language: "TypeScript", tier: 1 } },
  { id: "api-checkout", type: "Api", label: "POST /checkout", containerId: "svc-checkout" },
  { id: "ent-order", type: "Entity", label: "Order", containerId: "svc-checkout" },
  // Payments service + members
  { id: "svc-payments", type: "Service", label: "Payments Service", properties: { team: "Payments", language: "Go", tier: 1 } },
  { id: "api-charge", type: "Api", label: "POST /charge", containerId: "svc-payments" },
  { id: "ent-payment", type: "Entity", label: "Payment", containerId: "svc-payments" },
  // Catalog service + members
  { id: "svc-catalog", type: "Service", label: "Catalog Service", properties: { team: "Growth", language: "TypeScript", tier: 2 } },
  { id: "api-products", type: "Api", label: "GET /products", containerId: "svc-catalog" },
  { id: "ent-product", type: "Entity", label: "Product", containerId: "svc-catalog" },
  // Identity service + members
  { id: "svc-identity", type: "Service", label: "Identity Service", properties: { team: "Platform", language: "Rust", tier: 1 } },
  { id: "api-token", type: "Api", label: "POST /token", containerId: "svc-identity" },
  { id: "ent-user", type: "Entity", label: "User", containerId: "svc-identity" },
  // Capabilities & requirements
  { id: "cap-payments", type: "Capability", label: "Accept payments" },
  { id: "cap-catalog", type: "Capability", label: "Browse catalog" },
  { id: "cap-auth", type: "Capability", label: "Authenticate users" },
  {
    id: "req-pci",
    type: "Requirement",
    label: "PCI DSS compliance",
    // Facets without combinatorial types: still a plain "Requirement" node.
    // Facets are read from properties.facets (an open string vocabulary).
    properties: { facets: ["security", "approved", "high-impact"] },
  },
  { id: "req-latency", type: "Requirement", label: "Sub-200ms checkout" },
  { id: "req-gdpr", type: "Requirement", label: "GDPR data handling" },
  // Stories & tests
  { id: "story-guest", type: "Story", label: "Guest checkout" },
  { id: "story-refund", type: "Story", label: "Issue refund" },
  { id: "test-checkout-e2e", type: "Test", label: "Checkout E2E" },
  { id: "test-charge-unit", type: "Test", label: "Charge unit test" },
  // Findings
  {
    id: "find-secret",
    type: "Finding",
    label: "Hardcoded API secret",
    properties: { severity: "high", status: "open", facets: ["security"] },
  },
  { id: "find-nplus1", type: "Finding", label: "N+1 query in catalog", properties: { severity: "medium", status: "triaged" } },
  // External systems
  { id: "ext-stripe", type: "ExternalSystem", label: "Stripe" },
  // Registered "Deployment" nodes (configuration-only proof — see registries.ts).
  {
    id: "deploy-checkout-prod",
    type: "Deployment",
    label: "checkout-prod-cluster",
    properties: {
      owner: "Payments",
      version: "2.4.1",
      environment: "production",
      region: "us-east-1",
      confidence: 0.92,
      risk: "low",
      changeSet: "PR-4821",
      source: "argo-cd",
      lastModified: "2025-01-14T09:30:00.000Z",
    },
  },
  {
    id: "deploy-payments-prod",
    type: "Deployment",
    label: "payments-prod-cluster",
    properties: {
      owner: "Payments",
      version: "1.9.0",
      environment: "production",
      region: "us-east-1",
      confidence: 0.78,
      risk: "medium",
      changeSet: "PR-4790",
      source: "argo-cd",
      lastModified: "2025-01-12T16:05:00.000Z",
    },
  },
  // Intentionally UNREGISTERED node type — must render via safe fallback.
  { id: "gateway-1", type: "QuantumGateway", label: "gateway-1" },

  // ---- Backend-only (revealed via expansion) ----
  { id: "svc-notifications", type: "Service", label: "Notification Service", properties: { team: "Platform", language: "TypeScript", tier: 2 } },
  { id: "api-notify", type: "Api", label: "POST /notify", containerId: "svc-notifications" },
  { id: "ent-message", type: "Entity", label: "Message", containerId: "svc-notifications" },
  { id: "cap-notify", type: "Capability", label: "Send notifications" },
  { id: "ext-sendgrid", type: "ExternalSystem", label: "SendGrid" },
  { id: "find-timeout", type: "Finding", label: "Webhook timeout", properties: { severity: "low", status: "open" } },
]

const BACKEND_EDGES: GraphEdge[] = [
  { id: "e1", type: "dependsOn", source: "svc-checkout", target: "svc-payments" },
  { id: "e2", type: "dependsOn", source: "svc-checkout", target: "svc-identity" },
  { id: "e3", type: "dependsOn", source: "svc-checkout", target: "svc-catalog" },
  // Parallel edge: a second, differently-typed relationship on the same pair.
  { id: "e4", type: "integratesWith", source: "svc-payments", target: "ext-stripe" },
  { id: "e5", type: "dependsOn", source: "svc-catalog", target: "svc-identity" },
  { id: "e6", type: "dependsOn", source: "svc-identity", target: "svc-catalog" }, // cycle
  // Self-loop with an UNREGISTERED edge type — must fall back safely.
  { id: "e7", type: "retries", source: "svc-payments", target: "svc-payments" },
  // Unregistered edge type to an unregistered node type — safe fallback proof.
  { id: "e8", type: "teleportsTo", source: "svc-checkout", target: "gateway-1" },
  // Registered "streamsTo" edges to the registered "Deployment" nodes above.
  { id: "e8a", type: "streamsTo", source: "svc-checkout", target: "deploy-checkout-prod" },
  { id: "e8b", type: "streamsTo", source: "svc-payments", target: "deploy-payments-prod" },
  { id: "e9", type: "implements", source: "svc-payments", target: "cap-payments" },
  { id: "e10", type: "implements", source: "svc-catalog", target: "cap-catalog" },
  { id: "e11", type: "implements", source: "svc-identity", target: "cap-auth" },
  { id: "e12", type: "satisfies", source: "cap-payments", target: "req-pci" },
  { id: "e13", type: "satisfies", source: "cap-payments", target: "req-latency" },
  { id: "e14", type: "satisfies", source: "cap-auth", target: "req-gdpr" },
  { id: "e15", type: "covers", source: "test-checkout-e2e", target: "story-guest" },
  { id: "e16", type: "verifies", source: "test-checkout-e2e", target: "svc-checkout" },
  { id: "e17", type: "verifies", source: "test-charge-unit", target: "svc-payments" },
  { id: "e18", type: "affects", source: "find-secret", target: "svc-payments" },
  { id: "e19", type: "affects", source: "find-nplus1", target: "svc-catalog" },
  { id: "e20", type: "covers", source: "test-checkout-e2e", target: "story-refund" },

  // ---- Backend-only (revealed via expansion) ----
  { id: "e21", type: "dependsOn", source: "svc-checkout", target: "svc-notifications" },
  { id: "e22", type: "integratesWith", source: "svc-notifications", target: "ext-sendgrid" },
  { id: "e23", type: "implements", source: "svc-notifications", target: "cap-notify" },
  { id: "e24", type: "affects", source: "find-timeout", target: "svc-notifications" },
]

/** Ids present in the initial view. The notification subsystem is backend-only. */
const BACKEND_ONLY = new Set<GraphId>([
  "svc-notifications",
  "api-notify",
  "ent-message",
  "cap-notify",
  "ext-sendgrid",
  "find-timeout",
])

const byId = new Map(BACKEND_NODES.map((n) => [n.id, n] as const))

function childrenOf(nodeId: GraphId): GraphNode[] {
  return BACKEND_NODES.filter((n) => n.containerId === nodeId)
}

/** Initial authoritative model handed to the Explorer (revision 1). */
export const SYSTEM_GRAPH: GraphModel = {
  id: "ecommerce-platform",
  revision: 1,
  nodes: BACKEND_NODES.filter((n) => !BACKEND_ONLY.has(n.id)),
  edges: BACKEND_EDGES.filter(
    (e) => !BACKEND_ONLY.has(e.source) && !BACKEND_ONLY.has(e.target),
  ),
  metadata: { domain: "software-system", source: "NeoArc showcase fixture" },
}

/**
 * Simulates an authoritative expansion. Given already-loaded ids, expansion
 * roots, direction, and arbitrary N hops, returns the additional nodes/edges
 * the "backend" would return. Container children of revealed nodes are always
 * included so compound groups stay intact.
 */
export function expandFromBackend(
  loadedNodeIds: ReadonlySet<GraphId>,
  roots: readonly GraphId[],
  direction: GraphTraversalDirection,
  maxHops: number,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const reached = new Set<GraphId>(roots)
  let frontier = new Set<GraphId>(roots)

  for (let hop = 0; hop < Math.max(1, maxHops); hop++) {
    const next = new Set<GraphId>()
    for (const edge of BACKEND_EDGES) {
      const outMatch = direction !== "incoming" && frontier.has(edge.source)
      const inMatch = direction !== "outgoing" && frontier.has(edge.target)
      if (outMatch && !reached.has(edge.target)) next.add(edge.target)
      if (inMatch && !reached.has(edge.source)) next.add(edge.source)
    }
    if (next.size === 0) break
    for (const id of next) reached.add(id)
    frontier = next
  }

  // Include container members of everything reached.
  for (const id of [...reached]) {
    for (const child of childrenOf(id)) reached.add(child.id)
  }

  const newNodeIds = [...reached].filter((id) => !loadedNodeIds.has(id) && byId.has(id))
  const newNodeIdSet = new Set(newNodeIds)
  const resultNodeIds = new Set([...loadedNodeIds, ...newNodeIdSet])

  const nodes = newNodeIds.map((id) => byId.get(id) as GraphNode)
  const edges = BACKEND_EDGES.filter(
    (e) =>
      resultNodeIds.has(e.source) &&
      resultNodeIds.has(e.target) &&
      (newNodeIdSet.has(e.source) || newNodeIdSet.has(e.target)),
  )
  return { nodes, edges }
}

export interface AgentUpdateSimulation {
  readonly patch: GraphPatch
  readonly sourceRefs: readonly GraphChangeSetSource[]
}

let agentSimulationCounter = 0

/**
 * SHOWCASE ONLY. Simulates an autonomous agent (e.g. a migration/upgrade
 * agent) proposing a supplied `GraphPatch` against WHATEVER model is
 * currently loaded — it never assumes `SYSTEM_GRAPH` specifically, so the
 * "Simulate agent update" demo works against any of the five scenarios. The
 * patch always adds two new services wired together, updates one already-
 * loaded node's properties, and removes one already-loaded relationship —
 * enough variety to exercise every `GraphChangeSet` bucket (add/update/
 * remove, nodes/edges) in a single supplied patch.
 */
export function buildAgentUpdatePatch(model: GraphModel): AgentUpdateSimulation | undefined {
  if (model.nodes.length === 0) return undefined

  agentSimulationCounter += 1
  const suffix = `sim${agentSimulationCounter}`

  const anchor = model.nodes.find((n) => n.type === "Service") ?? model.nodes[0]
  const updateTarget = model.nodes.find((n) => n.id !== anchor.id) ?? anchor
  const removableEdge = model.edges[0]

  const runtimeNode: GraphNode = {
    id: `agent-runtime-${suffix}`,
    type: "Service",
    label: "Spring AI Runtime",
    properties: { team: "Platform", introducedBy: "agent" },
  }
  const resolverNode: GraphNode = {
    id: `agent-resolver-${suffix}`,
    type: "Service",
    label: "Model Resolver",
    properties: { team: "Platform", introducedBy: "agent" },
  }

  const patch: GraphPatch = {
    baseRevision: model.revision,
    resultRevision: (model.revision ?? 1) + 1,
    addNodes: [runtimeNode, resolverNode],
    addEdges: [
      { id: `agent-edge-anchor-${suffix}`, type: "dependsOn", source: anchor.id, target: runtimeNode.id },
      { id: `agent-edge-resolver-${suffix}`, type: "dependsOn", source: runtimeNode.id, target: resolverNode.id },
    ],
    updateNodes: [
      {
        ...updateTarget,
        properties: { ...updateTarget.properties, lastAgentTouch: new Date().toISOString() },
      },
    ],
    removeEdgeIds: removableEdge ? [removableEdge.id] : undefined,
  }

  return {
    patch,
    sourceRefs: [{ kind: "agent", id: `agent-run-${suffix}`, label: "Migration agent" }],
  }
}
