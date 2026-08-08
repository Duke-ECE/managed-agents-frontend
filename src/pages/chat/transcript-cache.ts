/**
 * Tiny stale-while-revalidate cache for chat transcripts.
 *
 * Lives in a ref on ChatPage and dies with the page, but writes through to
 * sessionStorage so a reload still renders instantly. sessionStorage (not
 * localStorage) keeps stale transcripts scoped to the tab/session; entries
 * are keyed by session id, so a different account can never collide with
 * them, `signOut` wipes the prefix, and a purged session deletes its entry.
 *
 * Pure module: no React imports, no chat types (values must be JSON-
 * serializable when storage is enabled). Callers render the cached value
 * immediately and revalidate in the background, then `set` the fresh value.
 */
export const TRANSCRIPT_STORAGE_PREFIX = 'ma.transcript.'

function storage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

/** Remove every persisted transcript entry (logout, account switch). */
export function clearTranscriptStorage(): void {
  const store = storage()
  if (!store) return
  try {
    const doomed: string[] = []
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i)
      if (key?.startsWith(TRANSCRIPT_STORAGE_PREFIX)) doomed.push(key)
    }
    for (const key of doomed) store.removeItem(key)
  } catch {
    // storage unavailable — nothing to clear
  }
}

export class SwrCache<V> {
  private readonly map = new Map<string, V>()
  private readonly storagePrefix?: string

  /**
   * @param storagePrefix optional sessionStorage key prefix enabling
   * persistence (hydrate on read, write-through on set). All storage
   * failures — parse errors, quota, disabled storage — degrade to the
   * in-memory map.
   */
  constructor(storagePrefix?: string) {
    this.storagePrefix = storagePrefix
  }

  private storageKey(key: string): string {
    return `${this.storagePrefix}${key}`
  }

  get(key: string): V | undefined {
    const hit = this.map.get(key)
    if (hit !== undefined) return hit
    const store = this.storagePrefix ? storage() : null
    if (!store) return undefined
    try {
      const raw = store.getItem(this.storageKey(key))
      if (raw === null) return undefined
      const value = JSON.parse(raw) as V
      this.map.set(key, value)
      return value
    } catch {
      // Corrupt entry — drop it and treat as a miss.
      try { store.removeItem(this.storageKey(key)) } catch { /* ignore */ }
      return undefined
    }
  }

  set(key: string, value: V): void {
    this.map.set(key, value)
    const store = this.storagePrefix ? storage() : null
    if (!store) return
    try {
      store.setItem(this.storageKey(key), JSON.stringify(value))
    } catch {
      // Quota exceeded or serialization failed — the in-memory copy stands.
    }
  }

  has(key: string): boolean {
    return this.map.has(key) || this.get(key) !== undefined
  }

  delete(key: string): void {
    this.map.delete(key)
    const store = this.storagePrefix ? storage() : null
    if (!store) return
    try { store.removeItem(this.storageKey(key)) } catch { /* ignore */ }
  }

  clear(): void {
    this.map.clear()
    if (this.storagePrefix) clearTranscriptStorage()
  }
}
