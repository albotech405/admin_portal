import React from 'react'

interface TableProps<T extends object = Record<string, unknown>> {
  columns: Array<{ key: string; label: string; width?: string }>
  data: Array<T>
  onRowClick?: (row: T) => void
  isLoading?: boolean
  rowClassName?: (row: T) => string
}

export const Table = <T extends object>({
  columns,
  data,
  onRowClick,
  isLoading = false,
  rowClassName,
}: TableProps<T>) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        <p className="text-sm text-slate-500">Loading data...</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <svg className="mb-3 h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-sm text-slate-500">No data available</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-brand-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-brand-100 bg-brand-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-brand-700 ${col.width || ''}`}
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
              className={`border-b border-brand-50 transition-colors ${
                idx % 2 === 0 ? 'bg-white' : 'bg-brand-50/30'
              } ${onRowClick ? 'cursor-pointer hover:bg-brand-50' : ''} ${rowClassName?.(row) || ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-brand-900">
                  {String((row as Record<string, unknown>)[String(col.key)] || '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
