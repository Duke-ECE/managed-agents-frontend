/**
 * Tiny stale-while-revalidate cache for chat transcripts.
 *
 * Component-lifetime and in-memory only: it lives in a ref on ChatPage and
 * dies with the page. Deliberately NOT localStorage — stale transcripts
 * shared across tabs are a bigger risk than a cold cache after a reload.
 *
 * Pure module: no React imports, no chat types. Callers render the cached
 * value immediately and revalidate in the background, then `set` the fresh
 * value.
 */
export class SwrCache<V> {
  private readonly map = new Map<string, V>()

  get(key: string): V | undefined {
    return this.map.get(key)
  }

  set(key: string, value: V): void {
    this.map.set(key, value)
  }

  has(key: string): boolean {
    return this.map.has(key)
  }

  delete(key: string): void {
    this.map.delete(key)
  }

  clear(): void {
    this.map.clear()
  }
}
