"use client"

import type { GraphRendererTheme } from "@neoarc/graph-renderer"

/**
 * Resolves a GraphRendererTheme from CSS custom properties defined in
 * globals.css. This keeps the renderer package free of any hardcoded palette:
 * the reusable Graph UI owns the token->theme mapping, and any host app can
 * restyle the graph purely through CSS variables. Node "tone" names (see
 * GraphTone in the contracts) map 1:1 to `--graph-<tone>` tokens.
 */

const TONE_TOKENS = [
  "service",
  "requirement",
  "capability",
  "api",
  "entity",
  "story",
  "test",
  "finding",
  "external",
  "unknown",
] as const

/**
 * Resolve a CSS color string to concrete `rgb(...)`. Canvas renderers (like
 * Cytoscape) parse colors themselves and do NOT understand modern spaces such
 * as `oklch()`; a probe element lets the browser normalize any value to rgb.
 */
function toRgb(color: string): string {
  if (typeof document === "undefined") return color
  const probe = document.createElement("span")
  probe.style.color = color
  probe.style.display = "none"
  document.body.appendChild(probe)
  const computed = getComputedStyle(probe).color
  document.body.removeChild(probe)
  return computed || color
}

function readVar(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = styles.getPropertyValue(name).trim()
  return toRgb(value.length > 0 ? value : fallback)
}

export function resolveRendererTheme(
  element: HTMLElement = document.documentElement,
): GraphRendererTheme {
  const styles = getComputedStyle(element)

  const tones: Record<string, string> = {}
  for (const tone of TONE_TOKENS) {
    tones[tone] = readVar(styles, `--graph-${tone}`, "oklch(0.6 0.14 330)")
  }

  return {
    background: readVar(styles, "--card", "oklch(1 0 0)"),
    nodeFill: readVar(styles, "--graph-unknown", "oklch(0.6 0.14 330)"),
    nodeBorder: readVar(styles, "--border", "oklch(0.9 0 0)"),
    nodeText: readVar(styles, "--graph-node-text", "oklch(0.99 0 0)"),
    containerFill: readVar(styles, "--graph-container-fill", "oklch(0.62 0.03 260)"),
    containerBorder: readVar(styles, "--border", "oklch(0.9 0 0)"),
    containerText: readVar(styles, "--foreground", "oklch(0.2 0 0)"),
    edgeLine: readVar(styles, "--graph-edge", "oklch(0.62 0.02 260)"),
    edgeText: readVar(styles, "--muted-foreground", "oklch(0.5 0 0)"),
    selected: readVar(styles, "--graph-selected", "oklch(0.72 0.16 255)"),
    focused: readVar(styles, "--graph-focused", "oklch(0.82 0.16 90)"),
    highlight: readVar(styles, "--graph-highlight", "oklch(0.75 0.18 330)"),
    tones,
  }
}
