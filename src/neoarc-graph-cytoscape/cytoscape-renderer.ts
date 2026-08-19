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
  GraphSpatialSnapshot,
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

/**
 * Small deterministic per-id offset (not random) so several new nodes seeded
 * from the same anchor don't stack exactly on top of one another, while a
 * given id always seeds at the same relative spot across runs.
 */
function deterministicOffset(id: string, radius = 44): GraphNodePosition {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  const angle = (hash % 360) * (Math.PI / 180)
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
}

function offsetFrom(anchor: GraphNodePosition, id: string): GraphNodePosition {
  const offset = deterministicOffset(id)
  return { x: anchor.x + offset.x, y: anchor.y + offset.y }
}

function centroidOf(positions: readonly GraphNodePosition[]): GraphNodePosition {
  const sum = positions.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / positions.length, y: sum.y / positions.length }
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
  /**
   * Every GraphId this instance has ever positioned, including ids currently
   * hidden by collapse/filter/focus or left behind by a spatial-snapshot
   * restore for a different key. Never aggressively pruned — a stale entry
   * for an id that never reappears is harmless, and restoration always
   * intersects against the live view model.
   */
  private lastKnownPositions = new Map<string, GraphNodePosition>()
  /** True when this instance's initial elements were seeded from a restored spatial snapshot rather than laid out from scratch. */
  private restoredAtMount = false
  /** Mutable mirror of the last view model set via the constructor/`setViewModel` (mount options are readonly). */
  private currentViewModel: GraphViewModel

  constructor(options: GraphRendererMountOptions) {
    ensureFcoseRegistered()
    this.options = options
    this.theme = options.theme
    this.layoutId = options.layoutId ?? DEFAULT_LAYOUT_ID
    this.currentViewModel = options.viewModel

    const restoreNodePositions = options.restoreNodePositions
    if (restoreNodePositions) {
      for (const [id, pos] of restoreNodePositions) this.lastKnownPositions.set(id, pos)
    }

    const baseElements = mapViewModelToElements(options.viewModel, {
      nodeTypeRegistry: options.nodeTypeRegistry,
      edgeTypeRegistry: options.edgeTypeRegistry,
      iconRegistry: options.iconRegistry,
      theme: this.theme,
    })
    // Seed any element for which we have a remembered/restored position so the
    // very first render already reflects it, instead of the layout's default
    // placement briefly flashing first.
    const elements = restoreNodePositions
      ? baseElements.map((el) => {
          const pos = restoreNodePositions.get(String(el.data.id))
          return pos ? { ...el, position: { x: pos.x, y: pos.y } } : el
        })
      : baseElements

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

    const restoredNodeIds = restoreNodePositions
      ? [...restoreNodePositions.keys()].filter((id) => this.nodeIds.has(id))
      : []
    this.restoredAtMount = restoredNodeIds.length > 0

    this.observeResize()

    if (this.restoredAtMount) {
      // A usable spatial snapshot exists for this exact view/renderer/layout
      // key: never randomize from scratch. If the active layout can settle
      // incrementally, nudge any element with no restored position (should be
      // none on a pure restore, but keeps this correct if the model also
      // changed) around the restored/fixed ones; otherwise just render at the
      // restored positions with no automatic layout run at all.
      if (this.currentLayoutSupportsIncremental()) {
        const fixedNodeConstraint = this.fixedConstraintFor(restoredNodeIds, options.viewModel)
        this.runLayout(false, fixedNodeConstraint)
      } else {
        this.updateSemanticZoom()
        this.notifySpatialChange()
      }
      if (options.restoreViewport) this.setViewport(options.restoreViewport)
    } else {
      this.runLayout(true)
    }
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
        // Only the from-scratch mount path needs this workaround; a
        // restored-at-mount instance already has real positions/viewport that
        // must not be silently overwritten by a fresh full layout.
        if (!this.restoredAtMount) this.runLayout()
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
      this.currentViewModel = viewModel
      this.updateSemanticZoom()
      return
    }

    // Topology changed — could be a local view operation (expand/collapse/
    // filter/N-hop/focus) or an automatic data update (add/update/remove from
    // the product/backend). Either way: never randomize automatically. Remove
    // only what left (remembering its position first), add only what's new
    // (seeded deterministically, never at (0,0)), and — only if the active
    // layout can settle incrementally — nudge the new/returning nodes around
    // every survivor pinned via `fixedNodeConstraint`. A layout with no
    // incremental-settle concept (e.g. Hierarchy) never auto-runs at all here;
    // only an explicit Re-layout may recompute it from scratch.
    this.topologyKey = nextKey
    const nextNodeIds = new Set(viewModel.nodes.map((n) => n.id))
    const nextElementIds = new Set([...nextNodeIds, ...viewModel.edges.map((e) => e.id)])

    // Remember the position of every node about to leave the rendered view —
    // outright removed, or hidden by whatever produced this topology change —
    // so it can be restored verbatim if this GraphId reappears later.
    this.cy.nodes().forEach((node) => {
      if (!nextNodeIds.has(node.id())) {
        const pos = node.position()
        this.lastKnownPositions.set(node.id(), { x: pos.x, y: pos.y })
      }
    })

    const present = (id: string): GraphNodePosition | undefined => {
      const el = this.cy.getElementById(id)
      if (el.empty()) return undefined
      const pos = el.position()
      return { x: pos.x, y: pos.y }
    }

    const survivingIds: string[] = []
    const newNodeIds: string[] = []
    for (const id of nextNodeIds) {
      if (this.nodeIds.has(id) && this.cy.getElementById(id).nonempty()) {
        survivingIds.push(id)
      } else {
        newNodeIds.push(id)
      }
    }

    this.cy.batch(() => {
      this.cy.elements().forEach((el) => {
        if (!nextElementIds.has(el.id())) el.remove()
      })
      const toAdd = elements
        .filter((el) => this.cy.getElementById(String(el.data.id)).empty())
        .map((el) => {
          const id = String(el.data.id)
          if (!newNodeIds.includes(id)) return el
          const seeded = this.seedPosition(id, viewModel, present)
          return { ...el, position: { x: seeded.x, y: seeded.y } }
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
    this.currentViewModel = viewModel

    if (this.currentLayoutSupportsIncremental()) {
      const fixedNodeConstraint = this.fixedConstraintFor(survivingIds, viewModel)
      this.runLayout(false, fixedNodeConstraint)
    } else {
      this.updateSemanticZoom()
      this.notifySpatialChange()
    }
  }

  private currentLayoutSupportsIncremental(): boolean {
    return CYTOSCAPE_LAYOUTS.find((l) => l.id === this.layoutId)?.supportsIncrementalLayout ?? false
  }

  /**
   * Fixed-position constraints for fCoSE's incremental settle. Targets only
   * simple/surviving leaf nodes — never compound parent (container) nodes,
   * whose position fCoSE derives from their children rather than accepting
   * directly.
   */
  private fixedConstraintFor(
    ids: readonly string[],
    viewModel: GraphViewModel,
  ): FixedNodePosition[] {
    const containerIds = new Set(
      viewModel.nodes.filter((n) => n.isContainer === true).map((n) => n.id),
    )
    const constraint: FixedNodePosition[] = []
    for (const id of ids) {
      if (containerIds.has(id)) continue
      const el = this.cy.getElementById(id)
      if (el.empty()) continue
      const pos = el.position()
      constraint.push({ nodeId: id, position: { x: pos.x, y: pos.y } })
    }
    return constraint
  }

  /**
   * Deterministic seed position for a genuinely new (or returning) node,
   * tried in priority order:
   *   1. a previously known position for this exact GraphId (returning from
   *      collapse/filter/focus, or restored from a spatial snapshot)
   *   2. a same-container connected neighbor, or the container itself, or a
   *      sibling centroid
   *   3. any other connected neighbor
   *   4. the centroid of everything currently visible
   *   5. the origin, if nothing else is available (first-ever, isolated node)
   * A small deterministic per-id offset is applied around any anchor so
   * multiple new nodes seeded from the same anchor don't stack exactly.
   */
  private seedPosition(
    id: string,
    viewModel: GraphViewModel,
    present: (nodeId: string) => GraphNodePosition | undefined,
  ): GraphNodePosition {
    const known = this.lastKnownPositions.get(id)
    if (known) return known

    const node = viewModel.nodes.find((n) => n.id === id)
    const containerId = node?.containerId

    const neighborIds = new Set<string>()
    for (const edge of viewModel.edges) {
      if (edge.source === id) neighborIds.add(edge.target)
      if (edge.target === id) neighborIds.add(edge.source)
    }

    if (containerId) {
      for (const neighborId of neighborIds) {
        const neighbor = viewModel.nodes.find((n) => n.id === neighborId)
        if (neighbor?.containerId === containerId) {
          const pos = present(neighborId)
          if (pos) return offsetFrom(pos, id)
        }
      }
      const containerPos = present(containerId)
      if (containerPos) return offsetFrom(containerPos, id)
      const siblingPositions = viewModel.nodes
        .filter((n) => n.containerId === containerId && n.id !== id)
        .map((n) => present(n.id))
        .filter((p): p is GraphNodePosition => !!p)
      if (siblingPositions.length > 0) return offsetFrom(centroidOf(siblingPositions), id)
    }

    for (const neighborId of neighborIds) {
      const pos = present(neighborId)
      if (pos) return offsetFrom(pos, id)
    }

    const allPositions = viewModel.nodes
      .map((n) => present(n.id))
      .filter((p): p is GraphNodePosition => !!p)
    if (allPositions.length > 0) return offsetFrom(centroidOf(allPositions), id)

    return { x: 0, y: 0 }
  }

  setTheme(theme: GraphRendererTheme): void {
    this.theme = theme
    const elements = mapViewModelToElements(this.currentViewModel, this.mapping())
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
   * @param randomize   true for a from-scratch layout — only ever passed by an
   *                    initial mount with no restorable snapshot, an explicit
   *                    layout switch, or an explicit Re-layout action; false
   *                    for every automatic topology change (add/update/remove
   *                    or a local view operation), which must only settle
   *                    incrementally around fixed survivors and never
   *                    randomize the whole drawing.
   * @param fixedNodeConstraint  positions of nodes that must not move; the
   *                    mental-map-preservation mechanism for automatic
   *                    topology changes and spatial-snapshot restores.
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

  getSpatialSnapshot(): GraphSpatialSnapshot {
    // Start from everything ever remembered (including currently-hidden
    // ids), then let live positions win for whatever is actually rendered.
    const positions = new Map<string, GraphNodePosition>(this.lastKnownPositions)
    this.cy.nodes().forEach((node) => {
      const pos = node.position()
      positions.set(node.id(), { x: pos.x, y: pos.y })
    })
    return { positions, viewport: this.getViewport() }
  }

  restoreSpatialSnapshot(snapshot: GraphSpatialSnapshot): void {
    const containerIds = new Set(
      this.currentViewModel.nodes.filter((n) => n.isContainer === true).map((n) => n.id),
    )
    const fixedNodeConstraint: FixedNodePosition[] = []
    this.cy.batch(() => {
      for (const [id, pos] of snapshot.positions) {
        const el = this.cy.getElementById(id)
        if (el.nonempty()) {
          el.position({ x: pos.x, y: pos.y })
          if (!containerIds.has(id)) fixedNodeConstraint.push({ nodeId: id, position: pos })
        }
        // Merge every id regardless of whether it's currently rendered, so an
        // id hidden by collapse/filter/focus at the moment of this restore
        // still surfaces at its remembered spot if it later reappears.
        this.lastKnownPositions.set(id, pos)
      }
    })

    if (this.currentLayoutSupportsIncremental() && fixedNodeConstraint.length > 0) {
      this.runLayout(false, fixedNodeConstraint)
    } else {
      this.updateSemanticZoom()
      this.notifySpatialChange()
    }

    if (snapshot.viewport) this.setViewport(snapshot.viewport)
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
