import type { Metadata } from "next"
import { GraphLab } from "@/src/showcase/graph-lab/graph-lab"

export const metadata: Metadata = {
  title: "Graph Lab — NeoArc Graph Engine",
  description:
    "Reusable graph exploration over a multi-service software system, rendered with the Cytoscape v1 adapter.",
}

export default function GraphLabPage() {
  return <GraphLab />
}
