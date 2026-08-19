import cytoscape from "cytoscape"
import type { Core, EventObject } from "cytoscape"
import type { GraphSemanticEvent, GraphViewModel, GraphViewport } from "@neoarc/graph-contracts"
import type {
  GraphRenderer,
  GraphRendererHandle,
  GraphRendererMountOptions,
  GraphRendererTheme,
} from "@neoarc/graph-renderer"
import { mapViewModelToElements } from "./mapping"
import { buildStylesheet } from "./stylesheet"
import { CYTOSCAPE_LAYOUTS, DEFAULT_LAYOUT_ID, buildLayoutOptions } from "./layouts"

/**
 * Cytoscape.js renderer — the first concrete implementation of the renderer
 * boundary. Every Cytoscape import/type/instance lives inside this package.
 * The Graph UI depends only on `GraphRenderer`/`GraphRendererHandle`.
 */

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

  constructor(options: GraphRendererMountOptions) {
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

    this.cy = cytoscape({
      container: options.container,
      elements,
      style: buildStylesheet(this.theme),
      wheelSensitivity: 0.2,
      minZoom: 0.2,
      maxZoom: 3,
    })

    this.wireEvents()
    this.runLayout()
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
      return
    }

    // Topology changed: rebuild and re-run layout.
    this.topologyKey = nextKey
    this.cy.batch(() => {
      this.cy.elements().remove()
      this.cy.add(elements)
    })
    this.runLayout()
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
    this.runLayout()
  }

  runLayout(): void {
    this.cy.layout(buildLayoutOptions(this.layoutId)).run()
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

  destroy(): void {
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
