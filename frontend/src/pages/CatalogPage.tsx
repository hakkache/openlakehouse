import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export default function CatalogPage() {
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
  const columnsQuery = useQuery({
    queryKey: ['columns', catalog, schema, table],
    queryFn: () => api.listColumns(catalog as string, schema as string, table as string),
    enabled: !!catalog && !!schema && !!table,
  })

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Catalog</h1>
        <p className="text-sm text-slate-500">
          Real Trino/Iceberg catalog browser: catalogs, schemas, tables and column definitions.
        </p>
      </div>

      {catalogsQuery.error && <p className="text-sm text-red-600">Failed to load catalogs.</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <h2 className="border-b border-slate-100 px-2 py-1 text-xs font-semibold uppercase text-slate-500">
            Catalogs
          </h2>
          {catalogsQuery.data?.map((c) => (
            <button
              key={c}
              onClick={() => {
                setCatalog(c)
                setSchema(null)
                setTable(null)
              }}
              className={`block w-full rounded px-2 py-1.5 text-left text-sm ${
                catalog === c ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <h2 className="border-b border-slate-100 px-2 py-1 text-xs font-semibold uppercase text-slate-500">
            Schemas
          </h2>
          {!catalog && <p className="px-2 py-1.5 text-sm text-slate-400">Select a catalog</p>}
          {schemasQuery.data?.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSchema(s)
                setTable(null)
              }}
              className={`block w-full rounded px-2 py-1.5 text-left text-sm ${
                schema === s ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <h2 className="border-b border-slate-100 px-2 py-1 text-xs font-semibold uppercase text-slate-500">
            Tables
          </h2>
          {!schema && <p className="px-2 py-1.5 text-sm text-slate-400">Select a schema</p>}
          {tablesQuery.data?.map((t) => (
            <button
              key={t}
              onClick={() => setTable(t)}
              className={`block w-full rounded px-2 py-1.5 text-left text-sm ${
                table === t ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {table && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <h2 className="border-b border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900">
            {catalog}.{schema}.{table} — Columns
          </h2>
          {columnsQuery.isLoading && <p className="p-4 text-sm text-slate-500">Loading columns…</p>}
          {columnsQuery.data && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-2">Column</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Comment</th>
                </tr>
              </thead>
              <tbody>
                {columnsQuery.data.map((c) => (
                  <tr key={c.name} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-2 font-medium text-slate-900">{c.name}</td>
                    <td className="px-4 py-2 font-mono text-xs">{c.type}</td>
                    <td className="px-4 py-2 text-slate-500">{c.comment || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
