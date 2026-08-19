import { describe, expect, it } from "vitest"
import type { GraphModel, GraphOverlay, GraphOverlayViewState } from "@neoarc/graph-contracts"
import { buildViewModel } from "./view-model"
import { applyOverlays, resolveOverlayFreshness } from "./overlay"
import { createInitialViewState, toggleContainerCollapsed } from "./view-state"

/**
 * Overlay invariants where manual inspection would easily miss corruption or
 * semantic drift: no mutation, stable identity, supplied-only path/state
 * projection, unresolved-reference reporting, aggregate/meta-edge projection,
 * 4-way freshness, and the locked active-set / independent-gating semantics.
 */

const model: GraphModel = Object.freeze({
  id: "m",
  revision: 41,
  nodes: [
    { id: "a", type: "Service", label: "A" },
    { id: "b", type: "Service", label: "B" },
    { id: "c", type: "Service", label: "C" },
  ],
  edges: [
    { id: "e-ab", type: "dependsOn", source: "a", target: "b" },
    { id: "e-bc", type: "dependsOn", source: "b", target: "c" },
  ],
}) as GraphModel

const loadedNodeIds = new Set(model.nodes.map((n) => n.id))
const loadedEdgeIds = new Set(model.edges.map((e) => e.id))

function apply(
  m: GraphModel,
  overlays: readonly GraphOverlay[],
  overlayState: GraphOverlayViewState | undefined,
  viewState = createInitialViewState(),
) {
  const vm = buildViewModel(m, viewState)
  return applyOverlays(
    vm,
    overlays,
    new Set(m.nodes.map((n) => n.id)),
    new Set(m.edges.map((e) => e.id)),
    overlayState,
  )
}

const impactOverlay: GraphOverlay = {
  id: "impact",
  kind: "impact",
  sourceModelId: "m",
  sourceRevision: 41,
  nodeStates: [
    { nodeId: "a", state: "root", tone: "brand" },
    { nodeId: "b", state: "direct", tone: "danger" },
  ],
  edgeStates: [{ edgeId: "e-ab", state: "direct", tone: "danger" }],
  focusNodeIds: ["a", "b"],
  focusEdgeIds: ["e-ab"],
  paths: [{ id: "p1", edgeIds: ["e-ab"], nodeIds: ["a", "b"] }],
}

describe("applyOverlays", () => {
  it("never mutates the input view model or the canonical model", () => {
    const vm = buildViewModel(model)
    const vmSnapshot = JSON.stringify(vm)
    const modelSnapshot = JSON.stringify(model)
    applyOverlays(vm, [impactOverlay], loadedNodeIds, loadedEdgeIds, {
      showOverlay: true,
      showPaths: true,
    })
    expect(JSON.stringify(vm)).toBe(vmSnapshot)
    expect(JSON.stringify(model)).toBe(modelSnapshot)
  })

  it("decorates nodes/edges without changing their canonical ids", () => {
    const { viewModel } = apply(model, [impactOverlay], { showOverlay: true })
    expect(viewModel.nodes.map((n) => n.id).sort()).toEqual(["a", "b", "c"])
    expect(viewModel.edges.map((e) => e.id).sort()).toEqual(["e-ab", "e-bc"])
    const a = viewModel.nodes.find((n) => n.id === "a")
    expect(a?.overlays?.[0]).toMatchObject({ overlayId: "impact", state: "root", tone: "brand" })
    expect(viewModel.nodes.find((n) => n.id === "c")?.overlays).toBeUndefined()
  })

  it("marks only supplied path edges, never topological neighbors", () => {
    const { viewModel } = apply(model, [impactOverlay], { showPaths: true })
    // e-ab is on path p1; e-bc is adjacent but NOT supplied → must stay unmarked.
    expect(viewModel.edges.find((e) => e.id === "e-ab")?.onSupportingPathIds).toEqual(["p1"])
    expect(viewModel.edges.find((e) => e.id === "e-bc")?.onSupportingPathIds).toBeUndefined()
  })

  it("reports unresolved references without fabricating them", () => {
    const dangling: GraphOverlay = {
      id: "impact",
      kind: "impact",
      nodeStates: [{ nodeId: "ghost", state: "direct" }],
      edgeStates: [{ edgeId: "e-ghost", state: "direct" }],
      paths: [{ id: "p", edgeIds: ["e-missing"] }],
      focusNodeIds: ["ghost2"],
    }
    const { unresolvedNodeIds, unresolvedEdgeIds } = apply(model, [dangling], { showOverlay: true })
    expect([...unresolvedNodeIds].sort()).toEqual(["ghost", "ghost2"])
    expect([...unresolvedEdgeIds].sort()).toEqual(["e-ghost", "e-missing"])
  })

  it("still reports unresolved refs even when all presentation is hidden", () => {
    const dangling: GraphOverlay = {
      id: "impact",
      kind: "impact",
      nodeStates: [{ nodeId: "ghost", state: "direct" }],
    }
    const { unresolvedNodeIds } = apply(model, [dangling], {
      showOverlay: false,
      showPaths: false,
    })
    expect([...unresolvedNodeIds]).toEqual(["ghost"])
  })
})

describe("independent gating", () => {
  it("shows paths even when overlay state presentation is hidden", () => {
    const { viewModel } = apply(model, [impactOverlay], { showOverlay: false, showPaths: true })
    // State presentation suppressed…
    expect(viewModel.nodes.find((n) => n.id === "a")?.overlays).toBeUndefined()
    // …but supplied supporting path still renders.
    expect(viewModel.edges.find((e) => e.id === "e-ab")?.onSupportingPathIds).toEqual(["p1"])
  })

  it("restricts to overlay focus independently of showOverlay", () => {
    const { viewModel } = apply(model, [impactOverlay], {
      showOverlay: false,
      restrictToOverlayFocus: true,
    })
    // focusNodeIds = [a,b]; c must be filtered out.
    expect(viewModel.nodes.map((n) => n.id).sort()).toEqual(["a", "b"])
    // Only the focus edge between two kept nodes survives.
    expect(viewModel.edges.map((e) => e.id)).toEqual(["e-ab"])
  })
})

describe("active-set + clear semantics", () => {
  const overlays: GraphOverlay[] = [
    { id: "o1", kind: "impact", nodeStates: [{ nodeId: "a", state: "root", tone: "brand" }] },
    { id: "o2", kind: "risk", nodeStates: [{ nodeId: "b", state: "high", tone: "warning" }] },
  ]

  it("treats undefined activeOverlayIds as all overlays active", () => {
    const { viewModel } = apply(model, overlays, { showOverlay: true })
    expect(viewModel.nodes.find((n) => n.id === "a")?.overlays).toHaveLength(1)
    expect(viewModel.nodes.find((n) => n.id === "b")?.overlays).toHaveLength(1)
  })

  it("treats [] activeOverlayIds as none active (distinct from undefined)", () => {
    const { viewModel } = apply(model, overlays, { showOverlay: true, activeOverlayIds: [] })
    expect(viewModel.nodes.every((n) => !n.overlays)).toBe(true)
  })

  it("activates only the listed overlay id", () => {
    const { viewModel } = apply(model, overlays, { showOverlay: true, activeOverlayIds: ["o2"] })
    expect(viewModel.nodes.find((n) => n.id === "a")?.overlays).toBeUndefined()
    expect(viewModel.nodes.find((n) => n.id === "b")?.overlays).toHaveLength(1)
  })
})

describe("aggregate / meta-edge projection", () => {
  // "svc" contains api & ent; both cross to "other". Collapsing folds e-api and
  // e-ent into one meta-edge. A supplied overlay/path referencing an underlying
  // CANONICAL edge id must still light up the visible meta-edge.
  const compoundModel: GraphModel = Object.freeze({
    id: "cm",
    revision: 1,
    nodes: [
      { id: "svc", type: "Service" },
      { id: "api", type: "Api", containerId: "svc" },
      { id: "ent", type: "Entity", containerId: "svc" },
      { id: "other", type: "Service" },
    ],
    edges: [
      { id: "e-api", type: "calls", source: "api", target: "other" },
      { id: "e-ent", type: "dependsOn", source: "ent", target: "other" },
    ],
  }) as GraphModel

  const overlay: GraphOverlay = {
    id: "impact",
    kind: "impact",
    // References the UNDERLYING canonical edge id, not the meta-edge id.
    edgeStates: [{ edgeId: "e-api", state: "direct", tone: "danger" }],
    paths: [{ id: "pmeta", edgeIds: ["e-ent"] }],
  }

  it("projects canonical edge overlay/path onto the collapsed meta-edge", () => {
    const collapsed = toggleContainerCollapsed(createInitialViewState(), "svc")
    const { viewModel } = apply(compoundModel, [overlay], { showOverlay: true, showPaths: true }, collapsed)

    const meta = viewModel.edges.find((e) => e.aggregatedEdgeIds)
    expect(meta).toBeTruthy()
    expect([...(meta?.aggregatedEdgeIds ?? [])].sort()).toEqual(["e-api", "e-ent"])
    // Overlay state reached the meta-edge via the underlying canonical id.
    expect(meta?.overlays?.[0]).toMatchObject({ state: "direct", viaEdgeId: "e-api" })
    // Supporting path also projected onto the same visible meta-edge.
    expect(meta?.onSupportingPathIds).toEqual(["pmeta"])
  })

  it("retains all supplied states on one meta-edge without inferring precedence", () => {
    const multi: GraphOverlay = {
      id: "impact",
      kind: "impact",
      edgeStates: [
        { edgeId: "e-api", state: "direct", tone: "danger" },
        { edgeId: "e-ent", state: "transitive", tone: "warning" },
      ],
    }
    const collapsed = toggleContainerCollapsed(createInitialViewState(), "svc")
    const { viewModel } = apply(compoundModel, [multi], { showOverlay: true }, collapsed)
    const meta = viewModel.edges.find((e) => e.aggregatedEdgeIds)
    expect(meta?.overlays).toHaveLength(2)
    expect(meta?.overlays?.map((o) => o.state).sort()).toEqual(["direct", "transitive"])
  })
})

describe("resolveOverlayFreshness", () => {
  const base = { id: "impact", kind: "impact" } as const

  it("is current when identity + revision match", () => {
    expect(resolveOverlayFreshness(model, { ...base, sourceModelId: "m", sourceRevision: 41 })).toBe(
      "current",
    )
  })

  it("is stale when revision differs but identity matches", () => {
    expect(resolveOverlayFreshness(model, { ...base, sourceModelId: "m", sourceRevision: 40 })).toBe(
      "stale",
    )
  })

  it("is unknown when the overlay supplies no revision", () => {
    expect(resolveOverlayFreshness(model, { ...base, sourceModelId: "m" })).toBe("unknown")
  })

  it("is unknown when the model has no revision", () => {
    const noRev = { ...model, revision: undefined } as unknown as GraphModel
    expect(resolveOverlayFreshness(noRev, { ...base, sourceRevision: 41 })).toBe("unknown")
  })

  it("is incompatible only when both identities exist and differ", () => {
    expect(
      resolveOverlayFreshness(model, { ...base, sourceModelId: "other", sourceRevision: 41 }),
    ).toBe("incompatible")
  })

  it("is unknown when sourceModelId is supplied but the model has no id", () => {
    const noId = { ...model, id: undefined } as unknown as GraphModel
    expect(
      resolveOverlayFreshness(noId, { ...base, sourceModelId: "m", sourceRevision: 41 }),
    ).toBe("unknown")
  })
})
