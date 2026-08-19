import { describe, expect, it } from "vitest"
import type { GraphModel } from "@neoarc/graph-contracts"
import { localNeighborhood } from "./traversal"

/**
 * Invariant coverage for local traversal: arbitrary N-hop correctness and
 * incoming/outgoing/both direction semantics are easy to silently break (off
 * by one, direction swap) and hard to catch by eye, so they get automated
 * coverage per the G2 gate checklist.
 */

// a -> b -> c -> d -> e, a straight chain long enough to exercise arbitrary N.
const chain: GraphModel = Object.freeze({
  id: "m",
  revision: 1,
  nodes: [
    { id: "a", type: "Node" },
    { id: "b", type: "Node" },
    { id: "c", type: "Node" },
    { id: "d", type: "Node" },
    { id: "e", type: "Node" },
  ],
  edges: [
    { id: "ab", type: "next", source: "a", target: "b" },
    { id: "bc", type: "next", source: "b", target: "c" },
    { id: "cd", type: "next", source: "c", target: "d" },
    { id: "de", type: "next", source: "d", target: "e" },
  ],
}) as GraphModel

describe("localNeighborhood", () => {
  it("supports arbitrary maxHops, not just 1/2/3", () => {
    expect(localNeighborhood(chain, ["a"], { maxHops: 0, direction: "both" })).toEqual(new Set(["a"]))
    expect(localNeighborhood(chain, ["a"], { maxHops: 1, direction: "both" })).toEqual(
      new Set(["a", "b"]),
    )
    expect(localNeighborhood(chain, ["a"], { maxHops: 4, direction: "both" })).toEqual(
      new Set(["a", "b", "c", "d", "e"]),
    )
    // 10 hops on a 4-edge chain reaches the same fixed point — never throws,
    // never presented as globally authoritative, just stops when the
    // loaded-graph frontier is exhausted.
    expect(localNeighborhood(chain, ["a"], { maxHops: 10, direction: "both" })).toEqual(
      new Set(["a", "b", "c", "d", "e"]),
    )
  })

  it("honors outgoing direction only", () => {
    const result = localNeighborhood(chain, ["c"], { maxHops: 5, direction: "outgoing" })
    expect(result).toEqual(new Set(["c", "d", "e"]))
  })

  it("honors incoming direction only", () => {
    const result = localNeighborhood(chain, ["c"], { maxHops: 5, direction: "incoming" })
    expect(result).toEqual(new Set(["c", "b", "a"]))
  })

  it("both traverses edges regardless of direction", () => {
    const result = localNeighborhood(chain, ["c"], { maxHops: 1, direction: "both" })
    expect(result).toEqual(new Set(["c", "b", "d"]))
  })

  it("respects an edge-type allowlist", () => {
    const withBranch: GraphModel = {
      ...chain,
      edges: [...chain.edges, { id: "ae", type: "shortcut", source: "a", target: "e" }],
    }
    const result = localNeighborhood(withBranch, ["a"], {
      maxHops: 1,
      direction: "outgoing",
      edgeTypes: ["next"],
    })
    expect(result).toEqual(new Set(["a", "b"]))
  })

  it("never mutates the supplied GraphModel", () => {
    const snapshot = JSON.stringify(chain)
    localNeighborhood(chain, ["a"], { maxHops: 3, direction: "both" })
    expect(JSON.stringify(chain)).toBe(snapshot)
  })
})
