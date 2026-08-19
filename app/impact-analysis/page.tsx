import type { Metadata } from "next"
import { ImpactAnalysis } from "@/src/showcase/impact-analysis/impact-analysis"

export const metadata: Metadata = {
  title: "Impact Analysis — NeoArc Graph Engine",
  description:
    "Query-aware impact visualization: a supplied impact result rendered as an overlay over a software-system graph, with supporting paths, a derived report, and revision-based staleness — no client-side impact computation.",
}

export default function ImpactAnalysisPage() {
  return <ImpactAnalysis />
}
