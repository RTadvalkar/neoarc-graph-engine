import type { GraphEdge, GraphModel, GraphNode, GraphViewState } from "@neoarc/graph-contracts"
import { SYSTEM_GRAPH } from "./system-graph"

/**
 * SHOWCASE ONLY. Five focused Graph Lab scenarios that each exercise a
 * different reusable exploration behavior over realistic software-system
 * data. Kept deliberately small per the cost-discipline guidance — this is
 * not a fixture library, just enough variety to prove the interactions.
 */
export interface GraphLabScenario {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly model: GraphModel
  readonly initialViewState?: Partial<GraphViewState>
}

// A straight 6-service dependency chain, deep enough that a 1/2/3-hop preset
// clearly under-reaches and only maxHops: 5+ (or "Custom") reveals the tail —
// proving maxHops is a genuine arbitrary number, not a disguised 1|2|3 union.
const chainNodes: GraphNode[] = Array.from({ length: 6 }, (_, i) => ({
  id: `chain-svc-${i}`,
  type: "Service",
  label: `Service ${String.fromCharCode(65 + i)}`,
  properties: { team: "Platform", tier: i === 0 ? 1 : 2 },
}))
const chainEdges: GraphEdge[] = Array.from({ length: 5 }, (_, i) => ({
  id: `chain-e${i}`,
  type: "dependsOn",
  source: `chain-svc-${i}`,
  target: `chain-svc-${i + 1}`,
}))
const DEEP_CHAIN_GRAPH: GraphModel = {
  id: "deep-chain",
  revision: 1,
  nodes: chainNodes,
  edges: chainEdges,
  metadata: { domain: "software-system", source: "NeoArc showcase fixture" },
}

// A dense mesh of services that all integrate with each other plus a shared
// external system — many parallel cross-service edges, so collapsing any one
// group produces multiple simultaneous meta-edges to exercise aggregation at
// a slightly larger scale than the two-edge unit test fixture.
const meshServiceIds = ["mesh-a", "mesh-b", "mesh-c", "mesh-d", "mesh-e"]
const meshNodes: GraphNode[] = [
  ...meshServiceIds.flatMap((id) => [
    { id, type: "Service", label: `Mesh ${id.split("-")[1].toUpperCase()}` },
    { id: `${id}-api`, type: "Api", label: `${id} API`, containerId: id },
    { id: `${id}-ent`, type: "Entity", label: `${id} data`, containerId: id },
  ]),
  { id: "mesh-ext", type: "ExternalSystem", label: "Shared message bus" },
]
const meshEdges: GraphEdge[] = []
for (let i = 0; i < meshServiceIds.length; i++) {
  for (let j = 0; j < meshServiceIds.length; j++) {
    if (i === j) continue
    meshEdges.push({
      id: `mesh-e${i}-${j}`,
      type: "dependsOn",
      source: meshServiceIds[i],
      target: meshServiceIds[j],
    })
  }
  meshEdges.push({
    id: `mesh-bus-${i}`,
    type: "integratesWith",
    source: meshServiceIds[i],
    target: "mesh-ext",
  })
}
const DENSE_MESH_GRAPH: GraphModel = {
  id: "dense-mesh",
  revision: 1,
  nodes: meshNodes,
  edges: meshEdges,
  metadata: { domain: "software-system", source: "NeoArc showcase fixture" },
}

export const GRAPH_LAB_SCENARIOS: readonly GraphLabScenario[] = [
  {
    id: "requirement-neighborhood",
    label: "Requirement neighborhood",
    description:
      "Focused on a single compliance requirement — 'open branch as focus' restricts the view to its local, loaded-graph neighborhood.",
    model: SYSTEM_GRAPH,
    initialViewState: {
      selectedNodeIds: ["req-pci"],
      explorationFocus: { nodeId: "req-pci", maxHops: 2, direction: "both" },
    },
  },
  {
    id: "multi-service-architecture",
    label: "Multi-service architecture",
    description:
      "The full e-commerce platform: compound service groups, parallel edges, a cycle, a self-loop, and unregistered types falling back safely.",
    model: SYSTEM_GRAPH,
    initialViewState: { layoutId: "fcose" },
  },
  {
    id: "deep-dependency-chain",
    label: "Deep N-hop dependency graph",
    description:
      "A 6-service dependency chain. Try the 1/2/3 hop presets from Service A, then Custom to reach the far end — maxHops is a plain number.",
    model: DEEP_CHAIN_GRAPH,
    initialViewState: { selectedNodeIds: ["chain-svc-0"] },
  },
  {
    id: "collapsed-service-graph",
    label: "Collapsed service graph",
    description:
      "Every service group starts collapsed; cross-boundary relationships appear as aggregate meta-edges until you expand a group.",
    model: SYSTEM_GRAPH,
    initialViewState: {
      collapsedContainerIds: ["svc-checkout", "svc-payments", "svc-catalog", "svc-identity"],
    },
  },
  {
    id: "dense-cross-service",
    label: "Dense cross-service graph",
    description:
      "Five services, each depending on every other plus a shared external bus — a stress case for layout spacing and meta-edge aggregation.",
    model: DENSE_MESH_GRAPH,
    initialViewState: { layoutId: "fcose" },
  },
]
