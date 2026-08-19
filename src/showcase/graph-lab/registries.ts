import type {
  GraphEdgeTypeDefinition,
  GraphNodeTypeDefinition,
} from "@neoarc/graph-contracts"
import { createGraphRegistries, type GraphIconDefinition } from "@neoarc/graph-core"

/**
 * SHOWCASE ONLY. This is a product-style configuration proving that node/edge
 * appearance and behavior are fully declarative. Adding a new type (e.g.
 * "Deployment") here requires zero changes to graph-core or graph-ui. Tones map
 * to `--graph-*` design tokens resolved by the Graph UI theme resolver.
 */

const nodeTypes: GraphNodeTypeDefinition[] = [
  {
    type: "Service",
    label: "Service",
    tone: "service",
    // Microservice → container: a distinct silhouette from ordinary nodes,
    // signaling "this groups/hosts other things" without a closed enum.
    shape: "container",
    icon: "service",
    properties: [
      { key: "team", label: "Owning team" },
      { key: "language", label: "Language" },
      { key: "tier", label: "Tier" },
    ],
  },
  // Requirement → rounded-rectangle (per the amendment's worked example).
  { type: "Requirement", label: "Requirement", tone: "requirement", shape: "rounded-rectangle", icon: "requirement" },
  { type: "Capability", label: "Capability", tone: "capability", shape: "hexagon", icon: "capability" },
  // API → hexagon (per the amendment's worked example).
  { type: "Api", label: "API", tone: "api", shape: "hexagon", icon: "api" },
  { type: "Entity", label: "Entity", tone: "entity", shape: "ellipse", icon: "entity" },
  // Story → pill. Proof point: this line is the ONLY change needed to alter
  // every Story node's silhouette across the whole graph — no edits to
  // graph-core, graph-contracts, or the Cytoscape renderer are required.
  { type: "Story", label: "Story", tone: "story", shape: "pill", icon: "story" },
  // Test Case → diamond (per the amendment's worked example).
  { type: "Test", label: "Test", tone: "test", shape: "diamond", icon: "test" },
  {
    type: "Finding",
    label: "Finding",
    tone: "finding",
    // Finding → octagon (per the amendment's worked example) — visually
    // distinct from Test's diamond even though both previously used diamond.
    shape: "octagon",
    icon: "finding",
    properties: [
      { key: "severity", label: "Severity" },
      { key: "status", label: "Status" },
    ],
  },
  { type: "ExternalSystem", label: "External system", tone: "external", shape: "rectangle", icon: "external" },
]

const edgeTypes: GraphEdgeTypeDefinition[] = [
  { type: "dependsOn", label: "depends on", tone: "service", lineStyle: "solid", targetArrow: "triangle" },
  { type: "implements", label: "implements", tone: "capability", lineStyle: "dashed", targetArrow: "triangle" },
  { type: "satisfies", label: "satisfies", tone: "requirement", lineStyle: "dashed", targetArrow: "triangle" },
  { type: "exposes", label: "exposes", tone: "api", lineStyle: "solid", targetArrow: "triangle" },
  { type: "persists", label: "persists", tone: "entity", lineStyle: "dotted", targetArrow: "circle" },
  { type: "covers", label: "covers", tone: "test", lineStyle: "dashed", targetArrow: "triangle" },
  { type: "verifies", label: "verifies", tone: "test", lineStyle: "solid", targetArrow: "triangle" },
  { type: "affects", label: "affects", tone: "finding", lineStyle: "solid", targetArrow: "triangle" },
  { type: "integratesWith", label: "integrates with", tone: "external", lineStyle: "dashed", targetArrow: "chevron" },
]

const icons: GraphIconDefinition[] = [
  { id: "service", glyph: "SVC" },
  { id: "requirement", glyph: "REQ" },
  { id: "capability", glyph: "CAP" },
  { id: "api", glyph: "API" },
  { id: "entity", glyph: "ENT" },
  { id: "story", glyph: "STY" },
  { id: "test", glyph: "TST" },
  { id: "finding", glyph: "!" },
  { id: "external", glyph: "EXT" },
]

export const showcaseRegistries = createGraphRegistries({
  nodeTypes,
  edgeTypes,
  icons,
  propertyFormatters: {
    severity: (value) => String(value).toUpperCase(),
    tier: (value) => `Tier ${value}`,
  },
})
