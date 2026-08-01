import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export default function ExplorerPage() {
  const [catalog, setCatalog] = useState<string | null>(null)
  const [schema, setSchema] = useState<string | null>(null)
  const [table, setTable] = useState<string | null>(null)

  const catalogsQuery = useQuery({ queryKey: ['catalogs'], queryFn: () => api.listCatalogs() })
  const schemasQuery = useQuery({
    queryKey: ['schemas', catalog],
    queryFn: () => api.listSchemas(catalog as string),
    enabled: !!catalog,
  })
  const tablesQuery = useQuery({
    queryKey: ['tables', catalog, schema],
    queryFn: () => api.listTables(catalog as string, schema as string),
    enabled: !!catalog && !!schema,
  })
  const previewQuery = useQuery({
    queryKey: ['preview', catalog, schema, table],
    queryFn: () => api.previewTable(catalog as string, schema as string, table as string, 50),
    enabled: !!catalog && !!schema && !!table,
  })

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Data Explorer</h1>
        <p className="text-sm text-slate-500">Browse a table and preview its real rows via Trino.</p>
      </div>

      <div className="flex gap-3">
        <select
          value={catalog ?? ''}
          onChange={(e) => {
            setCatalog(e.target.value || null)
            setSchema(null)
            setTable(null)
          }}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">Select catalog…</option>
          {catalogsQuery.data?.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={schema ?? ''}
          onChange={(e) => {
            setSchema(e.target.value || null)
            setTable(null)
          }}
          disabled={!catalog}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:bg-slate-50"
        >
          <option value="">Select schema…</option>
          {schemasQuery.data?.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={table ?? ''}
          onChange={(e) => setTable(e.target.value || null)}
          disabled={!schema}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:bg-slate-50"
        >
          <option value="">Select table…</option>
          {tablesQuery.data?.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {previewQuery.isLoading && <p className="text-sm text-slate-500">Loading preview…</p>}
      {previewQuery.error && <p className="text-sm text-red-600">Failed to load preview.</p>}

      {previewQuery.data && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <p className="border-b border-slate-200 px-4 py-2 text-xs text-slate-500">
            Showing {previewQuery.data.row_count} row(s)
          </p>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                {previewQuery.data.columns.map((c) => (
                  <th key={c} className="whitespace-nowrap px-4 py-2">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewQuery.data.rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                  {row.map((cell, j) => (
                    <td key={j} className="whitespace-nowrap px-4 py-2 font-mono text-xs">
                      {cell === null ? 'NULL' : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
