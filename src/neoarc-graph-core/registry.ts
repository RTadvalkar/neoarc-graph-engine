/**
 * A tiny, generic registry primitive. Every extension seam (node types, edge
 * types, icons, formatters, custom renderers, actions) is one of these. The
 * defining feature: a lookup for an unknown key NEVER throws — it resolves to
 * a caller-provided fallback. This is what makes "unknown types render safely"
 * a structural guarantee rather than scattered defensive checks.
 */
export class Registry<T> {
  private readonly entries = new Map<string, T>()
  private readonly fallback: (key: string) => T

  constructor(fallback: (key: string) => T, initial?: Iterable<[string, T]>) {
    this.fallback = fallback
    if (initial) {
      for (const [key, value] of initial) this.entries.set(key, value)
    }
  }

  register(key: string, value: T): this {
    this.entries.set(key, value)
    return this
  }

  registerMany(items: Iterable<[string, T]>): this {
    for (const [key, value] of items) this.entries.set(key, value)
    return this
  }

  has(key: string): boolean {
    return this.entries.has(key)
  }

  /** Returns the registered value, or a safe fallback for unknown keys. */
  get(key: string): T {
    const found = this.entries.get(key)
    return found !== undefined ? found : this.fallback(key)
  }

  /** True when the returned value came from the fallback path. */
  isFallback(key: string): boolean {
    return !this.entries.has(key)
  }

  keys(): string[] {
    return [...this.entries.keys()]
  }

  values(): T[] {
    return [...this.entries.values()]
  }
}
