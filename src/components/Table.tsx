import React from 'react'

interface TableProps<T extends object = Record<string, unknown>> {
  columns: Array<{ key: string; label: string; width?: string }>
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
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/90">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 ${col.width || ''}`}
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
                <td key={col.key} className="px-4 py-3 text-slate-900">
                  {String((row as Record<string, unknown>)[String(col.key)] || '-')}
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
