/**
 * neoarc-graph-cytoscape
 *
 * Cytoscape.js renderer v1. This package is the ONLY place Cytoscape may be
 * imported. It exposes a `GraphRenderer` — no Cytoscape type crosses this
 * boundary. A future engine gets its own sibling package implementing the same
 * seam, with zero changes upstream.
 */
export { cytoscapeRenderer } from "./cytoscape-renderer"
