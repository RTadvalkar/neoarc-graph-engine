/**
 * `cytoscape-fcose` ships no type declarations. This is a minimal ambient
 * module declaration scoped to this package — the only place Cytoscape and
 * its extensions may be imported. The extension's registration surface is a
 * single `register(cytoscape)` default export.
 */
declare module "cytoscape-fcose" {
  import type cytoscape from "cytoscape"
  const register: (cy: typeof cytoscape) => void
  export default register
}
