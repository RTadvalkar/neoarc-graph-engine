import type {
  GraphSemanticEvent,
  GraphViewModel,
  GraphViewport,
} from "@neoarc/graph-contracts"
import type {
  EdgeTypeRegistry,
  IconRegistry,
  NodeTypeRegistry,
} from "@neoarc/graph-core"

/**
 * The renderer boundary. This is the ONLY seam a concrete engine implements.
 *
 * Locked invariant: nothing renderer-specific (no Cytoscape instance, element,
 * stylesheet, or layout object) may appear in these types. A future
 * Ogma/yFiles/Sigma/WebGL renderer implements `GraphRenderer` without any
 * change to contracts, core, product adapters, or Graph UI.
 */

/** Palette resolved from the host theme, expressed as plain CSS color strings. */
export interface GraphRendererTheme {
  readonly background: string
  readonly nodeFill: string
  readonly nodeBorder: string
  readonly nodeText: string
  readonly containerFill: string
  readonly containerBorder: string
  readonly containerText: string
  readonly edgeLine: string
  readonly edgeText: string
  readonly selected: string
  readonly focused: string
  readonly highlight: string
  /** Tone name -> CSS color, sourced from the host design tokens. */
  readonly tones: Readonly<Record<string, string>>
}

export interface RendererLayoutDescriptor {
  readonly id: string
  readonly label: string
}

/** Everything a renderer needs to draw a view and speak semantic events. */
export interface GraphRendererMountOptions {
  readonly container: HTMLElement
  readonly viewModel: GraphViewModel
  readonly nodeTypeRegistry: NodeTypeRegistry
  readonly edgeTypeRegistry: EdgeTypeRegistry
  readonly iconRegistry: IconRegistry
  readonly theme: GraphRendererTheme
  readonly layoutId?: string
  /** Renderer emits renderer-neutral semantic intents through this callback. */
  readonly onEvent?: (event: GraphSemanticEvent) => void
}

/** Imperative handle returned by a mounted renderer. Engine-agnostic. */
export interface GraphRendererHandle {
  setViewModel(viewModel: GraphViewModel): void
  setTheme(theme: GraphRendererTheme): void
  setLayout(layoutId: string): void
  runLayout(): void
  fit(padding?: number): void
  zoomBy(factor: number): void
  center(): void
  getViewport(): GraphViewport
  setViewport(viewport: GraphViewport): void
  destroy(): void
  readonly layouts: readonly RendererLayoutDescriptor[]
}

/** A pluggable graph renderer. Concrete engines implement this. */
export interface GraphRenderer {
  readonly id: string
  readonly label: string
  readonly availableLayouts: readonly RendererLayoutDescriptor[]
  mount(options: GraphRendererMountOptions): GraphRendererHandle
}
