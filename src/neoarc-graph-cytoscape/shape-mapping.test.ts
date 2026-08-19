import { describe, expect, it } from "vitest"
import { CYTOSCAPE_FALLBACK_SHAPE, mapNodeShapeToCytoscape } from "./shape-mapping"

describe("mapNodeShapeToCytoscape", () => {
  it("maps known semantic shapes to their Cytoscape equivalents", () => {
    expect(mapNodeShapeToCytoscape("hexagon")).toBe("hexagon")
    expect(mapNodeShapeToCytoscape("diamond")).toBe("diamond")
    expect(mapNodeShapeToCytoscape("octagon")).toBe("octagon")
    expect(mapNodeShapeToCytoscape("rounded-rectangle")).toBe("round-rectangle")
    expect(mapNodeShapeToCytoscape("container")).toBe("round-rectangle")
  })

  it("falls back safely for the generic semantic shape", () => {
    expect(mapNodeShapeToCytoscape("generic")).toBe(CYTOSCAPE_FALLBACK_SHAPE)
  })

  it("falls back safely for unknown/future shape values instead of throwing", () => {
    expect(mapNodeShapeToCytoscape("some-future-shape")).toBe(CYTOSCAPE_FALLBACK_SHAPE)
    expect(mapNodeShapeToCytoscape(undefined)).toBe(CYTOSCAPE_FALLBACK_SHAPE)
  })
})
