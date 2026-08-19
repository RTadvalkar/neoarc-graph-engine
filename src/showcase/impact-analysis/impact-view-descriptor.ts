import type { GraphViewDescriptor } from "@neoarc/graph-contracts"
import { IMPACT_CHANGE_INTENT, IMPACT_SYSTEM_GRAPH } from "./impact-scenario"
import { IMPACT_RESULT } from "./impact-result"

/**
 * SHOWCASE-SUPPLIED handoff object. This is the single, product-route-neutral
 * description a product would hand to the reusable Graph Explorer: the facts
 * (`model`), the supplied `overlays`, and the `initialViewState`. The
 * `/impact-analysis` FAB conceptually produces THIS descriptor, and the
 * showcase feeds its fields straight into `GraphExplorer` — proving the
 * GraphViewDescriptor → GraphExplorer handoff rather than bypassing it.
 *
 * Registries are still supplied separately (showcaseRegistries); building a
 * registry-construction subsystem is out of scope for this slice.
 */
export const IMPACT_VIEW_DESCRIPTOR: GraphViewDescriptor = {
  id: "impact-spring-ai",
  title: IMPACT_CHANGE_INTENT.title,
  model: IMPACT_SYSTEM_GRAPH,
  overlays: [IMPACT_RESULT],
  initialViewState: {
    layoutId: "fcose",
    selectedNodeIds: [...IMPACT_CHANGE_INTENT.rootEntityIds],
    overlay: {
      showOverlay: true,
      showPaths: true,
    },
  },
  fitOnLoad: true,
}
