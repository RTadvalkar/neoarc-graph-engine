import { describe, expect, it } from "vitest"
import type { GraphModel } from "@neoarc/graph-contracts"
import { buildViewModel } from "./view-model"
import {
  clearSelection,
  createInitialViewState,
  selectNode,
  toggleContainerCollapsed,
} from "./view-state"

/**
 * Invariant coverage where manual inspection would easily miss corruption:
 * canonical immutability, collapse round-trips, filter visibility, parallel
 * edges / self-loops surviving derivation, and stable selection identity.
 */

const model: GraphModel = Object.freeze({
  id: "m",
  revision: 3,
  nodes: [
    { id: "svc", type: "Service", label: "Svc" },
    { id: "api", type: "Api", label: "Api", containerId: "svc" },
    { id: "ent", type: "Entity", label: "Ent", containerId: "svc" },
    { id: "other", type: "Service", label: "Other" },
  ],
  edges: [
    { id: "e1", type: "dependsOn", source: "svc", target: "other" },
    { id: "e2", type: "callsAsync", source: "svc", target: "other" }, // parallel
    { id: "e3", type: "retries", source: "other", target: "other" }, // self-loop
  ],
}) as GraphModel

describe("buildViewModel", () => {
  it("never mutates the canonical GraphModel", () => {
    const snapshot = JSON.stringify(model)
    buildViewModel(model, createInitialViewState({ selectedNodeIds: ["svc"] }))
    expect(JSON.stringify(model)).toBe(snapshot)
  })

  it("preserves parallel edges and self-loops by stable id", () => {
    const vm = buildViewModel(model)
    expect(vm.edges.map((e) => e.id).sort()).toEqual(["e1", "e2", "e3"])
    const selfLoop = vm.edges.find((e) => e.id === "e3")
    expect(selfLoop?.source).toBe(selfLoop?.target)
  })

  it("marks compound containers as containers", () => {
    const vm = buildViewModel(model)
    expect(vm.nodes.find((n) => n.id === "svc")?.isContainer).toBe(true)
    expect(vm.nodes.find((n) => n.id === "api")?.isContainer).toBeFalsy()
  })

  it("collapse -> expand is a faithful round trip", () => {
    const base = createInitialViewState()
    const collapsed = toggleContainerCollapsed(base, "svc")
    const vmCollapsed = buildViewModel(model, collapsed)
    // Children hidden while collapsed.
    expect(vmCollapsed.nodes.map((n) => n.id).sort()).toEqual(["other", "svc"])

    const expanded = toggleContainerCollapsed(collapsed, "svc")
    const vmExpanded = buildViewModel(model, expanded)
    const vmInitial = buildViewModel(model, base)
    expect(vmExpanded.nodes.map((n) => n.id).sort()).toEqual(
      vmInitial.nodes.map((n) => n.id).sort(),
    )
    expect(vmExpanded.edges.map((e) => e.id).sort()).toEqual(
      vmInitial.edges.map((e) => e.id).sort(),
    )
  })

  it("filters nodes by type and drops now-dangling edges", () => {
    const vm = buildViewModel(
      model,
      createInitialViewState({ filters: { nodeTypes: ["Service"] } }),
    )
    expect(vm.nodes.map((n) => n.id).sort()).toEqual(["other", "svc"])
    // e1/e2 connect the two visible services; e3 is the self-loop on "other".
    expect(vm.edges.map((e) => e.id).sort()).toEqual(["e1", "e2", "e3"])
  })

  it("carries the source revision onto the derived view", () => {
    expect(buildViewModel(model).sourceRevision).toBe(3)
  })
})

describe("selection identity", () => {
  it("keeps selection stable and idempotent by id", () => {
    const s1 = selectNode(createInitialViewState(), "svc")
    expect(s1.selectedNodeIds).toEqual(["svc"])
    // Re-selecting the same single node clears it (toggle semantics).
    const s2 = selectNode(s1, "svc")
    expect(s2.selectedNodeIds).toEqual([])
    // Additive selection accumulates distinct ids.
    const s3 = selectNode(selectNode(createInitialViewState(), "svc", true), "other", true)
    expect([...s3.selectedNodeIds].sort()).toEqual(["other", "svc"])
    expect(clearSelection(s3).selectedNodeIds).toEqual([])
  })
})
