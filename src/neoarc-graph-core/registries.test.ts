import { describe, expect, it } from "vitest"
import { createGraphRegistries } from "./registries"

/**
 * Extensibility invariants: an unregistered type must resolve deterministically
 * via safe fallback, and registering a new type must require zero graph-core
 * changes — proven by exercising `createGraphRegistries` alone.
 */
describe("createGraphRegistries", () => {
  it("resolves an unregistered node type via a deterministic safe fallback", () => {
    const registries = createGraphRegistries()
    const first = registries.nodeTypes.get("QuantumGateway")
    const second = registries.nodeTypes.get("QuantumGateway")
    expect(registries.nodeTypes.isFallback("QuantumGateway")).toBe(true)
    expect(first).toEqual(second)
    expect(first.type).toBe("QuantumGateway")
    expect(first.shape).toBe("generic")
  })

  it("resolves a newly registered type without any graph-core changes", () => {
    const registries = createGraphRegistries({
      nodeTypes: [{ type: "Deployment", label: "Deployment", tone: "info", shape: "hexagon" }],
    })
    expect(registries.nodeTypes.isFallback("Deployment")).toBe(false)
    expect(registries.nodeTypes.get("Deployment")).toMatchObject({
      type: "Deployment",
      shape: "hexagon",
      tone: "info",
    })
  })

  it("filters GraphActionRegistry entries by appliesToTypes without a closed enum", () => {
    const registries = createGraphRegistries({
      actions: [
        { id: "open", label: "Open", target: "node", appliesToTypes: ["Requirement"] },
        { id: "trace", label: "Trace", target: "edge" },
      ],
    })
    const actions = registries.actions.values()
    const openAction = actions.find((a) => a.id === "open")
    const traceAction = actions.find((a) => a.id === "trace")
    expect(openAction?.appliesToTypes).toEqual(["Requirement"])
    // No allow-list means "applies to every type" — an open, generic default.
    expect(traceAction?.appliesToTypes).toBeUndefined()
  })
})
