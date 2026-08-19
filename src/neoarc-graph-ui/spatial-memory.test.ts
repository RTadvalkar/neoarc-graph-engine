import { describe, expect, it } from "vitest"
import { buildAnalyticalViewScope } from "./spatial-memory"

/**
 * Determinism of the USER-DRIVEN analytical-view scope key. Pure string
 * identity only — never Cytoscape coordinates. Guards the locked distinction
 * between a visibility RESTRICTION (new spatial workspace) and mere
 * selection/highlight churn (same workspace).
 */
describe("buildAnalyticalViewScope", () => {
  it("is order-independent: same filters in different order → same scope key", () => {
    const a = buildAnalyticalViewScope({
      filters: { nodeTypes: ["Api", "Capability", "Requirement"] },
    })
    const b = buildAnalyticalViewScope({
      filters: { nodeTypes: ["Requirement", "Api", "Capability"] },
    })
    expect(a).toBe(b)
    expect(a).not.toBe("base")
  })

  it("ignores search query (highlight, not filter) → same scope key", () => {
    const withoutQuery = buildAnalyticalViewScope({ filters: { nodeTypes: ["Api"] } })
    const withQuery = buildAnalyticalViewScope({
      filters: { nodeTypes: ["Api"], query: "checkout" },
    })
    expect(withQuery).toBe(withoutQuery)
  })

  it("presentation-only overlay toggles do not change scope", () => {
    const a = buildAnalyticalViewScope({ filters: { nodeTypes: ["Api"] } })
    const b = buildAnalyticalViewScope({
      filters: { nodeTypes: ["Api"] },
      overlay: { showOverlay: false, showPaths: true, activePathId: "p1" },
    })
    expect(b).toBe(a)
  })

  it("relationship (edge-type) filter change → different scope key", () => {
    const before = buildAnalyticalViewScope({ filters: { nodeTypes: ["Api"] } })
    const after = buildAnalyticalViewScope({
      filters: { nodeTypes: ["Api"], edgeTypes: ["implements", "satisfies"] },
    })
    expect(after).not.toBe(before)
  })

  it("overlay focus restriction (Impacted only) → different scope key from base", () => {
    const base = buildAnalyticalViewScope({})
    const restricted = buildAnalyticalViewScope(
      { overlay: { restrictToOverlayFocus: true } },
      "impact-1#n1,n2",
    )
    expect(base).toBe("base")
    expect(restricted).not.toBe("base")
  })
})
