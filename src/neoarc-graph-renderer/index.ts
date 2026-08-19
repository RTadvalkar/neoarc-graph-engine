/**
 * neoarc-graph-renderer
 *
 * The renderer-neutral rendering boundary. Concrete engines (Cytoscape today,
 * Ogma/Sigma/yFiles tomorrow) implement `GraphRenderer`. This package exposes
 * ZERO engine-specific types.
 */
export type {
  GraphRenderer,
  GraphRendererHandle,
  GraphRendererMountOptions,
  GraphRendererTheme,
  RendererLayoutDescriptor,
} from "./renderer"
