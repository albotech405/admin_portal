import React from 'react'

interface TableProps<T extends object = Record<string, unknown>> {
  columns: Array<{ key: string; label: string; width?: string; render?: (value: unknown, row: T) => React.ReactNode }>
  data: Array<T>
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string
  isLoading?: boolean
}

export const Table = <T extends object>({
  columns,
  data,
  onRowClick,
  rowClassName,
  isLoading = false,
}: TableProps<T>) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">No data available</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80">
      <div className="overflow-x-auto overscroll-x-contain">
      <table className="min-w-full text-sm md:w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/90">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`whitespace-nowrap px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:px-4 sm:text-xs sm:tracking-[0.18em] ${col.width || ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className={`border-b border-slate-200/80 transition-colors last:border-b-0 hover:bg-blue-50/70 ${onRowClick ? 'cursor-pointer' : ''} ${rowClassName ? rowClassName(row) : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-3 align-top text-slate-900 sm:px-4">
                  {col.render
                    ? col.render((row as Record<string, unknown>)[col.key], row)
                    : String((row as Record<string, unknown>)[col.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
