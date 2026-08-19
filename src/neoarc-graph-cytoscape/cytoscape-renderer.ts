import cytoscape from "cytoscape"
import type { Core, EventObject } from "cytoscape"
import fcose from "cytoscape-fcose"
import type {
  GraphSemanticEvent,
  GraphViewModel,
  GraphViewport,
} from "@neoarc/graph-contracts"
import type {
  GraphBoundingBox,
  GraphNodePosition,
  GraphRenderer,
  GraphRendererHandle,
  GraphRendererMountOptions,
  GraphRendererTheme,
} from "@neoarc/graph-renderer"
import { mapViewModelToElements } from "./mapping"
import { buildStylesheet } from "./stylesheet"
import { CYTOSCAPE_LAYOUTS, DEFAULT_LAYOUT_ID, buildLayoutOptions } from "./layouts"
import type { FixedNodePosition } from "./layouts"

/**
 * Cytoscape.js renderer — the first concrete implementation of the renderer
 * boundary. Every Cytoscape import/type/instance lives inside this package.
 * The Graph UI depends only on `GraphRenderer`/`GraphRendererHandle`.
 */

let fcoseRegistered = false
function ensureFcoseRegistered() {
  if (fcoseRegistered) return
  cytoscape.use(fcose)
  fcoseRegistered = true
}

/** Zoom thresholds for the type-driven semantic zoom classes. */
const ZOOM_RICH_AT = 1.4
const ZOOM_COMPACT_BELOW = 0.5
const ZOOM_HIDDEN_BELOW = 0.22

function idSet(viewModel: GraphViewModel): { nodes: string; edges: string } {
  return {
    nodes: viewModel.nodes.map((n) => n.id).sort().join("|"),
    edges: viewModel.edges.map((e) => e.id).sort().join("|"),
  }
}

function additiveFrom(evt: EventObject): boolean {
  const oe = evt.originalEvent as MouseEvent | undefined
  return !!(oe && (oe.shiftKey || oe.metaKey || oe.ctrlKey))
}

class CytoscapeRendererHandle implements GraphRendererHandle {
  readonly layouts = CYTOSCAPE_LAYOUTS

  private cy: Core
  private options: GraphRendererMountOptions
  private theme: GraphRendererTheme
  private layoutId: string
  private topologyKey: string
  private nodeIds: Set<string>
  private resizeObserver?: ResizeObserver
  private hadRealSize = false
  private spatialListeners = new Set<() => void>()

  constructor(options: GraphRendererMountOptions) {
    ensureFcoseRegistered()
    this.options = options
    this.theme = options.theme
    this.layoutId = options.layoutId ?? DEFAULT_LAYOUT_ID

    const elements = mapViewModelToElements(options.viewModel, {
      nodeTypeRegistry: options.nodeTypeRegistry,
      edgeTypeRegistry: options.edgeTypeRegistry,
      iconRegistry: options.iconRegistry,
      theme: this.theme,
    })
    this.topologyKey = JSON.stringify(idSet(options.viewModel))
    this.nodeIds = new Set(options.viewModel.nodes.map((n) => n.id))

    this.cy = cytoscape({
      container: options.container,
      elements,
      style: buildStylesheet(this.theme),
      minZoom: 0.05,
      maxZoom: 3,
    })

    this.wireEvents()
    this.observeResize()
    this.runLayout(true)
  }

  /**
   * The container often mounts at (near-)zero height inside a flex/grid cell,
   * so an initial layout would pack every node at the top. Watch for the
   * container acquiring real dimensions and, on the first real size, re-run the
   * layout and fit so the graph fills the viewport. Subsequent resizes just
   * keep the canvas backing store in sync.
   */
  private observeResize() {
    if (typeof ResizeObserver === "undefined") return
    this.resizeObserver = new ResizeObserver(() => {
      const w = this.cy.width()
      const h = this.cy.height()
      this.cy.resize()
      if (!this.hadRealSize && w > 0 && h > 0) {
        this.hadRealSize = true
        this.runLayout()
      }
    })
    this.resizeObserver.observe(this.options.container)
  }

  private emit(event: GraphSemanticEvent) {
    this.options.onEvent?.(event)
  }

  private wireEvents() {
    this.cy.on("tap", "node", (evt) => {
      this.emit({
        type: "graph.node.select",
        nodeId: evt.target.id(),
        additive: additiveFrom(evt),
      })
    })
    this.cy.on("tap", "edge", (evt) => {
      this.emit({
        type: "graph.edge.select",
        edgeId: evt.target.id(),
        additive: additiveFrom(evt),
      })
    })
    this.cy.on("tap", (evt) => {
      if (evt.target === this.cy) this.emit({ type: "graph.background.tap" })
    })
    this.cy.on("zoom", () => this.updateSemanticZoom())
    this.cy.on("zoom pan position drag free", () => this.notifySpatialChange())
  }

  /**
   * Type-driven semantic zoom for leaf nodes: swaps a label-detail class as
   * the camera zoom crosses thresholds, from a rich icon+label+property view
   * down to icon-only and finally an unlabeled dot. Compound containers never
   * receive these classes — their identity stays legible at every zoom level
   * so structural/group context survives even when zoomed far out.
   */
  private updateSemanticZoom(): void {
    const zoom = this.cy.zoom()
    const leaves = this.cy.nodes().not(".container")
    leaves.removeClass("zoom-rich zoom-compact zoom-hidden")
    if (zoom >= ZOOM_RICH_AT) {
      leaves.addClass("zoom-rich")
    } else if (zoom < ZOOM_HIDDEN_BELOW) {
      leaves.addClass("zoom-hidden")
    } else if (zoom < ZOOM_COMPACT_BELOW) {
      leaves.addClass("zoom-compact")
    }
  }

  private notifySpatialChange(): void {
    for (const listener of this.spatialListeners) listener()
  }

  private mapping() {
    return {
      nodeTypeRegistry: this.options.nodeTypeRegistry,
      edgeTypeRegistry: this.options.edgeTypeRegistry,
      iconRegistry: this.options.iconRegistry,
      theme: this.theme,
    }
  }

  setViewModel(viewModel: GraphViewModel): void {
    const nextKey = JSON.stringify(idSet(viewModel))
    const elements = mapViewModelToElements(viewModel, this.mapping())

    if (nextKey === this.topologyKey) {
      // Same node/edge set: update data + classes in place, preserve positions
      // and mental map. Selection/highlight changes take this path.
      this.cy.batch(() => {
        for (const el of elements) {
          const existing = this.cy.getElementById(String(el.data.id))
          if (existing.nonempty()) {
            existing.data(el.data)
            existing.classes(el.classes ?? "")
          }
        }
      })
      this.updateSemanticZoom()
      return
    }

    // Topology changed (expand/collapse/filter/N-hop). Rather than a full
    // rebuild, remove only what left and add only what's new, then re-run
    // fCoSE with every still-present node pinned via `fixedNodeConstraint` —
    // this is the mental-map-preservation mechanism: only genuinely new
    // nodes move, everything the user was already looking at stays put.
    this.topologyKey = nextKey
    const nextNodeIds = new Set(viewModel.nodes.map((n) => n.id))
    const nextElementIds = new Set([
      ...viewModel.nodes.map((n) => n.id),
      ...viewModel.edges.map((e) => e.id),
    ])

    const fixedNodeConstraint: FixedNodePosition[] = []
    for (const id of this.nodeIds) {
      if (!nextNodeIds.has(id)) continue
      const el = this.cy.getElementById(id)
      if (el.nonempty()) {
        const pos = el.position()
        fixedNodeConstraint.push({ nodeId: id, position: { x: pos.x, y: pos.y } })
      }
    }
    const isPureGrowth = fixedNodeConstraint.length === this.nodeIds.size

    this.cy.batch(() => {
      this.cy.elements().forEach((el) => {
        if (!nextElementIds.has(el.id())) el.remove()
      })
      const toAdd = elements.filter((el) => {
        const id = String(el.data.id)
        return this.cy.getElementById(id).empty()
      })
      this.cy.add(toAdd)
      for (const el of elements) {
        const existing = this.cy.getElementById(String(el.data.id))
        if (existing.nonempty()) {
          existing.data(el.data)
          existing.classes(el.classes ?? "")
        }
      }
    })
    this.nodeIds = nextNodeIds

    // Pure growth (nothing removed) keeps the whole existing layout pinned so
    // new nodes settle in around it. Any removal (collapse/filter shrinking
    // the view) re-lays-out from scratch since the freed space should be
    // reclaimed rather than left as a hole.
    this.runLayout(!isPureGrowth, isPureGrowth ? fixedNodeConstraint : undefined)
  }

  setTheme(theme: GraphRendererTheme): void {
    this.theme = theme
    const elements = mapViewModelToElements(this.options.viewModel, this.mapping())
    this.cy.batch(() => {
      for (const el of elements) {
        const existing = this.cy.getElementById(String(el.data.id))
        if (existing.nonempty()) existing.data(el.data)
      }
    })
    this.cy.style(buildStylesheet(theme))
  }

  setLayout(layoutId: string): void {
    this.layoutId = layoutId
    this.runLayout(true)
  }

  /**
   * @param randomize   true for a from-scratch layout (initial mount, layout
   *                    switch, or any change that shrank the view); false to
   *                    incrementally settle new nodes around fixed neighbors.
   * @param fixedNodeConstraint  positions of nodes that must not move; the
   *                    mental-map-preservation mechanism for growth-only
   *                    topology changes (expand neighbors, load more, etc).
   */
  runLayout(randomize = true, fixedNodeConstraint?: readonly FixedNodePosition[]): void {
    const layout = this.cy.layout(
      buildLayoutOptions(this.layoutId, { randomize, fixedNodeConstraint }),
    )
    layout.one("layoutstop", () => {
      if (randomize) this.fit()
      this.updateSemanticZoom()
      this.notifySpatialChange()
    })
    layout.run()
  }

  fit(padding = 40): void {
    this.cy.fit(undefined, padding)
  }

  zoomBy(factor: number): void {
    const zoom = this.cy.zoom() * factor
    this.cy.zoom({
      level: zoom,
      renderedPosition: { x: this.cy.width() / 2, y: this.cy.height() / 2 },
    })
  }

  center(): void {
    this.cy.center()
  }

  getViewport(): GraphViewport {
    const pan = this.cy.pan()
    return { zoom: this.cy.zoom(), pan: { x: pan.x, y: pan.y } }
  }

  setViewport(viewport: GraphViewport): void {
    if (typeof viewport.zoom === "number") this.cy.zoom(viewport.zoom)
    if (viewport.pan) this.cy.pan({ x: viewport.pan.x, y: viewport.pan.y })
  }

  getNodePositions(): ReadonlyMap<string, GraphNodePosition> {
    const positions = new Map<string, GraphNodePosition>()
    this.cy.nodes().forEach((node) => {
      const pos = node.position()
      positions.set(node.id(), { x: pos.x, y: pos.y })
    })
    return positions
  }

  getBoundingBox(): GraphBoundingBox {
    const bb = this.cy.elements().boundingBox()
    return { x1: bb.x1, y1: bb.y1, x2: bb.x2, y2: bb.y2 }
  }

  onSpatialChange(listener: () => void): () => void {
    this.spatialListeners.add(listener)
    return () => this.spatialListeners.delete(listener)
  }

  destroy(): void {
    this.resizeObserver?.disconnect()
    this.spatialListeners.clear()
    this.cy.destroy()
  }
}

export const cytoscapeRenderer: GraphRenderer = {
  id: "cytoscape",
  label: "Cytoscape.js",
  availableLayouts: CYTOSCAPE_LAYOUTS,
  mount(options: GraphRendererMountOptions): GraphRendererHandle {
    return new CytoscapeRendererHandle(options)
  },
}
