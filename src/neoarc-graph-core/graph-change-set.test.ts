import { describe, expect, it } from "vitest"
import type { GraphModel, GraphPatch } from "@neoarc/graph-contracts"
import { deriveGraphChangeSet } from "./graph-change-set"

const model: GraphModel = Object.freeze({
  id: "m",
  revision: 5,
  nodes: [
    { id: "a", type: "Service", label: "Alpha" },
    { id: "b", type: "Service", label: "Beta" },
  ],
  edges: [{ id: "ab", type: "dependsOn", source: "a", target: "b", label: "depends on" }],
}) as GraphModel

describe("deriveGraphChangeSet", () => {
  it("captures removed node/edge refs from the pre-patch model even though the ids no longer resolve afterward", () => {
    const patch: GraphPatch = {
      resultRevision: 6,
      removeNodeIds: ["b"],
      removeEdgeIds: ["ab"],
    }
    const changeSet = deriveGraphChangeSet(model, patch, "cs-1")
    expect(changeSet.removedNodeRefs).toEqual([{ id: "b", type: "Service", label: "Beta" }])
    expect(changeSet.removedEdgeRefs).toEqual([
      { id: "ab", type: "dependsOn", source: "a", target: "b", label: "depends on" },
    ])
  })

  it("carries added/updated id lists straight from the patch", () => {
    const patch: GraphPatch = {
      addNodes: [{ id: "c", type: "Service" }],
      updateNodes: [{ id: "a", type: "Service", label: "Alpha 2" }],
      addEdges: [{ id: "bc", type: "dependsOn", source: "b", target: "c" }],
    }
    const changeSet = deriveGraphChangeSet(model, patch, "cs-2")
    expect(changeSet.addedNodeIds).toEqual(["c"])
    expect(changeSet.updatedNodeIds).toEqual(["a"])
    expect(changeSet.addedEdgeIds).toEqual(["bc"])
    expect(changeSet.fromRevision).toBe(5)
  })

  it("passes structured sourceRefs through unchanged", () => {
    const sourceRefs = [{ kind: "agent", id: "demo-agent", label: "Demo agent" }]
    const changeSet = deriveGraphChangeSet(model, {}, "cs-3", sourceRefs)
    expect(changeSet.sourceRefs).toBe(sourceRefs)
  })
})
