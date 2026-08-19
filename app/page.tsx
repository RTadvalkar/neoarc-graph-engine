import Link from "next/link"

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      <main className="flex w-full max-w-3xl flex-col items-start gap-8 px-6 py-16">
        <div className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Graph exploration primitive
          </span>
          <h1 className="text-balance text-4xl font-bold tracking-tight">NeoArc Graph Engine</h1>
          <p className="max-w-xl text-pretty text-lg text-muted-foreground">
            A reusable, renderer-neutral graph exploration platform. Canonical graph facts, derived
            view models, and pluggable renderers are strictly separated layers. Cytoscape.js is
            renderer v1.
          </p>
        </div>
        <Link
          href="/graph-lab"
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
        >
          Open Graph Lab
        </Link>
      </main>
    </div>
  )
}
