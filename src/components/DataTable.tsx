import { useEffect, useState, type ReactNode } from 'react'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../utils/format'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

export interface Column<T> {
  key: string
  header: ReactNode
  className?: string
  sortable?: boolean
  render: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  sortKey?: string | null
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  pageSize?: number
  tableClassName?: string
}

export default function DataTable<T>({
  columns, rows, rowKey, onRowClick, sortKey, sortDir, onSort, pageSize = 8, tableClassName,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))

  // Reset to page 1 when the filtered row set changes size
  useEffect(() => { setPage(1) }, [rows.length])

  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const pageRows = rows.slice(start, start + pageSize)

  const pageNumbers: number[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - safePage) <= 1) pageNumbers.push(i)
    else if (pageNumbers[pageNumbers.length - 1] !== -1) pageNumbers.push(-1)
  }

  return (
    <div>
      <Table className={cn('border-collapse text-left', tableClassName)}>
          <TableHeader>
            <TableRow className="border-b border-ink-800 hover:bg-transparent">
              {columns.map(col => (
                <TableHead
                  key={col.key}
                  className={cn(
                    'h-auto px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400',
                    col.className,
                  )}
                >
                  {col.sortable && onSort ? (
                    <button
                      onClick={() => onSort(col.key)}
                      className={cn(
                        'inline-flex items-center gap-1 transition-colors hover:text-ink-200',
                        sortKey === col.key && 'text-ink-100',
                      )}
                    >
                      {col.header}
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? <ChevronUp className="h-3 w-3 text-accent" /> : <ChevronDown className="h-3 w-3 text-accent" />
                      ) : (
                        <ChevronUp className="h-3 w-3 opacity-25" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map(row => (
              <TableRow
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(event) => { if (onRowClick && event.target === event.currentTarget && event.key === 'Enter') onRowClick(row) }}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  'group last:border-0',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {columns.map(col => (
                  <TableCell key={col.key} className={cn('px-5 py-3.5 text-[13px] text-ink-200', col.className)}>
                    {col.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
      </Table>

      {/* Pagination footer */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between border-t border-ink-800 px-5 py-3">
          <span className="text-[11px] text-ink-500">
            Showing <span className="font-mono text-ink-300">{start + 1}–{Math.min(start + pageSize, rows.length)}</span> of{' '}
            <span className="font-mono text-ink-300">{rows.length}</span>
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                aria-label="Previous page"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-ink-700 text-ink-400 transition-colors hover:border-ink-500 hover:text-ink-100 disabled:pointer-events-none disabled:opacity-35"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {pageNumbers.map((n, i) =>
                n === -1 ? (
                  <span key={`e${i}`} className="px-1 text-[11px] text-ink-600">…</span>
                ) : (
                  <button
                    aria-label={`Page ${n}`}
                    aria-current={n === safePage ? 'page' : undefined}
                    key={n}
                    onClick={() => setPage(n)}
                    className={cn(
                      'flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 font-mono text-[11px] transition-all',
                      n === safePage
                        ? 'border-accent bg-info-soft text-accent-fg'
                        : 'border-ink-700 text-ink-400 hover:border-ink-500 hover:text-ink-100',
                    )}
                  >
                    {n}
                  </button>
                ),
              )}
              <button
                aria-label="Next page"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-ink-700 text-ink-400 transition-colors hover:border-ink-500 hover:text-ink-100 disabled:pointer-events-none disabled:opacity-35"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
