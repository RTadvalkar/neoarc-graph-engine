import { describe, expect, it } from "vitest"
import type { GraphModel, GraphPatch } from "@neoarc/graph-contracts"
import { applyGraphPatch } from "./graph-patch"

/**
 * Invariant coverage for patch application: immutability, atomicity, and the
 * rejection rules around stale/conflicting/dangling patches are easy to
 * silently break and hard to catch by eye, so they get automated coverage
 * per the G2 gate checklist. One focused file, folded checks — no matrix.
 */

const model: GraphModel = Object.freeze({
  id: "m",
  revision: 5,
  nodes: [
    { id: "a", type: "Service" },
    { id: "b", type: "Service" },
    { id: "c", type: "Service" },
  ],
  edges: [{ id: "ab", type: "dependsOn", source: "a", target: "b" }],
}) as GraphModel

describe("applyGraphPatch", () => {
  it("applies add/update/remove correctly and bumps revision from resultRevision", () => {
    const patch: GraphPatch = {
      baseRevision: 5,
      resultRevision: 6,
      addNodes: [{ id: "d", type: "Service" }],
      updateNodes: [{ id: "b", type: "Service", label: "Renamed B" }],
      removeNodeIds: ["c"],
      addEdges: [{ id: "ad", type: "dependsOn", source: "a", target: "d" }],
    }
    const result = applyGraphPatch(model, patch)
    expect(result.status).toBe("applied")
    expect(result.model.revision).toBe(6)
    expect(result.model.nodes.map((n) => n.id).sort()).toEqual(["a", "b", "d"])
    expect(result.model.nodes.find((n) => n.id === "b")?.label).toBe("Renamed B")
    expect(result.model.edges.map((e) => e.id).sort()).toEqual(["ab", "ad"])
  })

  it("never mutates the input model, and returns the same reference on rejection", () => {
    const originalNodes = model.nodes
    const originalEdges = model.edges
    const stale = applyGraphPatch(model, { baseRevision: 1, addNodes: [{ id: "x", type: "Service" }] })
    expect(stale.status).toBe("stale")
    expect(stale.model).toBe(model)
    expect(model.nodes).toBe(originalNodes)
    expect(model.edges).toBe(originalEdges)

    const invalid = applyGraphPatch(model, { addNodes: [{ id: "a", type: "Service" }] })
    expect(invalid.status).toBe("invalid")
    expect(invalid.model).toBe(model)
    expect(model.nodes).toBe(originalNodes)
  })

  it("rejects a stale patch when baseRevision does not match model.revision, with a reason", () => {
    const result = applyGraphPatch(model, { baseRevision: 4, addNodes: [{ id: "x", type: "Service" }] })
    expect(result.status).toBe("stale")
    expect(result.reason).toMatch(/baseRevision/)
  })

  it("rejects a duplicate id within a single operation array", () => {
    const result = applyGraphPatch(model, {
      addNodes: [{ id: "x", type: "Service" }, { id: "x", type: "Service" }],
    })
    expect(result.status).toBe("invalid")
    expect(result.reason).toMatch(/duplicate id/)
  })

  it("rejects an id appearing in two conflicting operations for the same entity (no operation-order semantics)", () => {
    const result = applyGraphPatch(model, {
      addNodes: [{ id: "a", type: "Service" }],
      updateNodes: [{ id: "a", type: "Service" }],
    })
    expect(result.status).toBe("invalid")
    expect(result.reason).toMatch(/addNodes/)
    expect(result.reason).toMatch(/updateNodes/)
  })

  it("rejects addNodes/addEdges targeting an id that already exists (no upsert semantics)", () => {
    const nodeResult = applyGraphPatch(model, { addNodes: [{ id: "a", type: "Service" }] })
    expect(nodeResult.status).toBe("invalid")
    expect(nodeResult.reason).toMatch(/addNodes/)

    const edgeResult = applyGraphPatch(model, {
      addEdges: [{ id: "ab", type: "dependsOn", source: "a", target: "b" }],
    })
    expect(edgeResult.status).toBe("invalid")
    expect(edgeResult.reason).toMatch(/addEdges/)
  })

  it("rejects updateNodes/updateEdges targeting an unknown id", () => {
    const nodeResult = applyGraphPatch(model, { updateNodes: [{ id: "zzz", type: "Service" }] })
    expect(nodeResult.status).toBe("invalid")
    expect(nodeResult.reason).toMatch(/updateNodes/)

    const edgeResult = applyGraphPatch(model, {
      updateEdges: [{ id: "zzz", type: "dependsOn", source: "a", target: "b" }],
    })
    expect(edgeResult.status).toBe("invalid")
    expect(edgeResult.reason).toMatch(/updateEdges/)
  })

  it("rejects removeNodeIds/removeEdgeIds targeting an unknown id", () => {
    const nodeResult = applyGraphPatch(model, { removeNodeIds: ["zzz"] })
    expect(nodeResult.status).toBe("invalid")
    expect(nodeResult.reason).toMatch(/removeNodeIds/)

    const edgeResult = applyGraphPatch(model, { removeEdgeIds: ["zzz"] })
    expect(edgeResult.status).toBe("invalid")
    expect(edgeResult.reason).toMatch(/removeEdgeIds/)
  })

  it("rejects a patch that would leave a dangling edge endpoint, rather than cascading the delete", () => {
    const result = applyGraphPatch(model, { removeNodeIds: ["b"] })
    expect(result.status).toBe("invalid")
    expect(result.reason).toMatch(/dangling/)
    expect(result.model).toBe(model)
  })

  it("applies atomically: a patch mixing one valid op with one invalid op changes nothing", () => {
    const result = applyGraphPatch(model, {
      addNodes: [{ id: "valid-new", type: "Service" }],
      removeNodeIds: ["not-real"],
    })
    expect(result.status).toBe("invalid")
    expect(result.model).toBe(model)
    expect(model.nodes.some((n) => n.id === "valid-new")).toBe(false)
  })
})
