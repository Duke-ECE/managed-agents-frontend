import { useMemo, useState } from 'react'

type SortDir = 'asc' | 'desc'

/**
 * Generic column sorter for DataTable.
 * Pass a `getters` map from column key -> value accessor.
 */
export function useTableSort<T>(rows: T[] | null | undefined, getters: Record<string, (row: T) => string | number>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const onSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    const list = rows ?? []
    if (!sortKey || !getters[sortKey]) return list
    const get = getters[sortKey]
    const dir = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      const va = get(a)
      const vb = get(b)
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })
  }, [rows, sortKey, sortDir, getters])

  return { sorted, sortKey, sortDir, onSort }
}
