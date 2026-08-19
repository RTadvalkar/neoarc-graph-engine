import { describe, expect, it } from "vitest"
import { SYSTEM_GRAPH, expandFromBackend } from "./system-graph"

/**
 * N-hop and directional traversal correctness — the classic place semantic
 * errors hide. Exercises arbitrary N (not a 1|2|3 union), direction filtering,
 * and container-member inclusion of revealed nodes.
 */

const loaded = () => new Set(SYSTEM_GRAPH.nodes.map((n) => n.id))

describe("expandFromBackend", () => {
  it("reveals the backend-only neighbor at 1 outgoing hop", () => {
    const { nodes } = expandFromBackend(loaded(), ["svc-checkout"], "outgoing", 1)
    const ids = nodes.map((n) => n.id)
    expect(ids).toContain("svc-notifications")
    // Its container members come along so the compound group stays intact.
    expect(ids).toContain("api-notify")
    expect(ids).toContain("ent-message")
  })

  it("respects arbitrary N: more hops reach further", () => {
    const oneHop = expandFromBackend(loaded(), ["svc-checkout"], "outgoing", 1)
    const threeHop = expandFromBackend(loaded(), ["svc-checkout"], "outgoing", 3)
    const oneIds = new Set(oneHop.nodes.map((n) => n.id))
    const threeIds = new Set(threeHop.nodes.map((n) => n.id))
    // ext-sendgrid is svc-checkout -> svc-notifications -> ext-sendgrid (2 hops).
    expect(oneIds.has("ext-sendgrid")).toBe(false)
    expect(threeIds.has("ext-sendgrid")).toBe(true)
  })

  it("direction filters traversal: incoming finds the affecting finding", () => {
    // find-timeout --affects--> svc-notifications, so from svc-notifications the
    // finding is only reachable via an INCOMING traversal.
    const withNotifications = new Set([...loaded(), "svc-notifications"])
    const incoming = expandFromBackend(withNotifications, ["svc-notifications"], "incoming", 1)
    const outgoing = expandFromBackend(withNotifications, ["svc-notifications"], "outgoing", 1)
    expect(incoming.nodes.map((n) => n.id)).toContain("find-timeout")
    expect(outgoing.nodes.map((n) => n.id)).not.toContain("find-timeout")
  })

  it("returns only edges whose endpoints are all present", () => {
    const result = expandFromBackend(loaded(), ["svc-checkout"], "both", 5)
    const present = new Set([...loaded(), ...result.nodes.map((n) => n.id)])
    for (const edge of result.edges) {
      expect(present.has(edge.source)).toBe(true)
      expect(present.has(edge.target)).toBe(true)
    }
  })
})
