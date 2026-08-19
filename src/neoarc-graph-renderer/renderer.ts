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
  /**
   * Whether this layout can settle new/changed nodes incrementally (fixed
   * constraints over survivors) without disturbing the rest of the drawing.
   * When false or absent, the UI/core layers must never trigger this
   * layout's full algorithm automatically just because the model changed —
   * only an explicit user-triggered Re-layout may fully recompute it. This
   * flag is deliberately renderer-neutral: callers only need to know
   * whether to skip auto full-layout, never why.
   */
  readonly supportsIncrementalLayout?: boolean
}

/** Plain 2D point in the renderer's model space. Never a renderer-specific type. */
export interface GraphNodePosition {
  readonly x: number
  readonly y: number
}

/** Axis-aligned bounding box in the renderer's model space. */
export interface GraphBoundingBox {
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
}

/**
 * Renderer-neutral, plain-data snapshot of "everything spatial a renderer
 * instance currently knows" — including positions of GraphIds that are not
 * presently rendered (hidden by collapse/filter/focus, or left behind by a
 * layout/view-identity switch). This is intentionally broader than
 * `getNodePositions()`, which stays scoped to currently-rendered nodes only
 * (the minimap depends on that narrower contract).
 */
export interface GraphSpatialSnapshot {
  readonly positions: ReadonlyMap<string, GraphNodePosition>
  readonly viewport?: GraphViewport
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
  /**
   * Previously remembered positions/viewport to seed the very first mount
   * with (e.g. from session-scoped spatial memory). Only meaningful at
   * mount time — restoring into an already-mounted renderer goes through
   * `GraphRendererHandle.restoreSpatialSnapshot` instead.
   */
  readonly restoreNodePositions?: ReadonlyMap<string, GraphNodePosition>
  readonly restoreViewport?: GraphViewport
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
  /**
   * Current node positions in renderer model space, for a minimap or other
   * lightweight spatial overview. Plain numbers only — no renderer types.
   */
  getNodePositions(): ReadonlyMap<string, GraphNodePosition>
  /**
   * Every GraphId this renderer instance has ever known the position of —
   * currently rendered or not — plus the current viewport. Used to persist
   * a full spatial workspace across a view-identity/layout switch or an
   * unmount, so nodes temporarily hidden by collapse/filter/focus are not
   * silently forgotten.
   */
  getSpatialSnapshot(): GraphSpatialSnapshot
  /**
   * Re-apply a previously captured spatial snapshot to this already-mounted
   * renderer instance. Positions for currently-rendered ids are applied
   * directly; positions for ids not currently rendered are merged into the
   * renderer's own remembered-position store so they surface later if that
   * id reappears. Must never trigger a full non-incremental layout's
   * algorithm — only an incremental settle (if the active layout supports
   * it) over the restored fixed positions.
   */
  restoreSpatialSnapshot(snapshot: GraphSpatialSnapshot): void
  /** Bounding box of all currently drawn elements, in the same model space. */
  getBoundingBox(): GraphBoundingBox
  /** Subscribe to position/viewport changes (layout settle, pan, zoom, drag). */
  onSpatialChange(listener: () => void): () => void
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
