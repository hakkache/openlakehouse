import { FormEvent, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, QueryStatus } from '../services/api'
import { useAuth } from '../app/AuthContext'

const DEFAULT_SQL = 'SELECT * FROM bronze.test ORDER BY id LIMIT 20'
const POLL_INTERVAL_MS = 1000

export default function SQLPage() {
  const queryClient = useQueryClient()
  const { authenticated, login } = useAuth()
  const [sql, setSql] = useState(DEFAULT_SQL)
  const [activeQuery, setActiveQuery] = useState<QueryStatus | null>(null)
  const [saveName, setSaveName] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: history } = useQuery({
    queryKey: ['sql-history'],
    queryFn: api.listQueryHistory,
    enabled: authenticated,
  })

  const { data: savedQueries } = useQuery({
    queryKey: ['sql-saved'],
    queryFn: api.listSavedQueries,
    enabled: authenticated,
  })

  const submitMutation = useMutation({
    mutationFn: () => api.submitQuery(sql),
    onSuccess: (status) => {
      setActiveQuery(status)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.cancelQuery(id),
  })

  const saveMutation = useMutation({
    mutationFn: () => api.createSavedQuery(saveName, sql),
    onSuccess: () => {
      setSaveName('')
      queryClient.invalidateQueries({ queryKey: ['sql-saved'] })
    },
  })

  const deleteSavedMutation = useMutation({
    mutationFn: (id: string) => api.deleteSavedQuery(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sql-saved'] }),
  })

  useEffect(() => {
    if (!activeQuery || activeQuery.status !== 'RUNNING') {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      if (activeQuery && activeQuery.status !== 'RUNNING') {
        queryClient.invalidateQueries({ queryKey: ['sql-history'] })
      }
      return
    }
    pollRef.current = setInterval(async () => {
      const updated = await api.getQueryStatus(activeQuery.id)
      setActiveQuery(updated)
    }, POLL_INTERVAL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuery?.status, activeQuery?.id])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!sql.trim()) return
    submitMutation.mutate()
  }

  function handleExportCsv() {
    if (!activeQuery?.columns || !activeQuery.rows) return
    const header = activeQuery.columns.join(',')
    const lines = activeQuery.rows.map((row) =>
      row
        .map((cell) => {
          const value = cell === null || cell === undefined ? '' : String(cell)
          return value.includes(',') || value.includes('"')
            ? `"${value.replace(/"/g, '""')}"`
            : value
        })
        .join(','),
    )
    const csv = [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query-${activeQuery.id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!authenticated) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">SQL Analytics</h1>
        <p className="mt-4 text-sm text-slate-500">
          Sign in with your OpenLakehouse account to run SQL queries against the lakehouse.
        </p>
        <button
          onClick={login}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500 hover:shadow-md"
        >
          Login
        </button>
      </div>
    )
  }

  const isRunning = activeQuery?.status === 'RUNNING'

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">SQL Analytics</h1>
      <p className="mt-1 text-sm text-slate-500">
        Backed by the real Trino engine querying Iceberg tables via the Polaris REST catalog.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-sm">
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          rows={8}
          spellCheck={false}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
          placeholder="SELECT * FROM bronze.test"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="submit"
            disabled={submitMutation.isPending || isRunning}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500 hover:shadow-md disabled:opacity-50"
          >
            {isRunning ? 'Running…' : 'Run query'}
          </button>
          {isRunning && activeQuery && (
            <button
              type="button"
              onClick={() => cancelMutation.mutate(activeQuery.id)}
              disabled={cancelMutation.isPending}
              className="rounded-lg px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-950"
            >
              Cancel
            </button>
          )}
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Name to save this query"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={!saveName.trim() || saveMutation.isPending}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </form>

      {submitMutation.isError && (
        <p className="mt-2 text-sm text-red-600">{(submitMutation.error as Error).message}</p>
      )}

      {activeQuery && (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-sm">
          <div className="flex items-center gap-3 text-sm">
            <span
              className={
                activeQuery.status === 'FINISHED'
                  ? 'text-emerald-400'
                  : activeQuery.status === 'FAILED'
                    ? 'text-red-400'
                    : activeQuery.status === 'CANCELLED'
                      ? 'text-yellow-400'
                      : 'text-slate-400'
              }
            >
              {activeQuery.status}
            </span>
            {activeQuery.duration_ms !== null && (
              <span className="text-slate-500">{activeQuery.duration_ms} ms</span>
            )}
            {activeQuery.row_count !== null && (
              <span className="text-slate-500">{activeQuery.row_count} rows</span>
            )}
            {activeQuery.columns && activeQuery.rows && (
              <button
                onClick={handleExportCsv}
                className="rounded-md border border-slate-700 px-2 py-1 text-xs font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Export CSV
              </button>
            )}
          </div>

          {activeQuery.error && (
            <p className="mt-2 whitespace-pre-wrap rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">
              {activeQuery.error}
            </p>
          )}

          {activeQuery.columns && activeQuery.rows && (
            <div className="slim-scroll mt-3 max-h-96 overflow-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-900">
                  <tr>
                    {activeQuery.columns.map((col) => (
                      <th key={col} className="px-3 py-2 font-medium text-slate-300">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeQuery.rows.map((row, i) => (
                    <tr key={i} className="border-t border-slate-800">
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-1.5 text-slate-200">
                          {cell === null || cell === undefined ? (
                            <span className="text-slate-600">NULL</span>
                          ) : (
                            String(cell)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Saved queries</h2>
          <div className="mt-2 space-y-2">
            {savedQueries?.length === 0 && <p className="text-sm text-slate-500">No saved queries yet.</p>}
            {savedQueries?.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
              >
                <button
                  onClick={() => setSql(q.sql_text)}
                  className="truncate text-left text-sm text-slate-900 hover:text-indigo-600 hover:underline"
                  title={q.sql_text}
                >
                  {q.name}
                </button>
                <button
                  onClick={() => deleteSavedMutation.mutate(q.id)}
                  className="ml-2 shrink-0 rounded-md px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Recent history</h2>
          <div className="mt-2 space-y-2">
            {history?.length === 0 && <p className="text-sm text-slate-500">No query history yet.</p>}
            {history?.map((h) => (
              <button
                key={h.id}
                onClick={() => setSql(h.sql_text)}
                className="block w-full truncate rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                title={h.sql_text}
              >
                <span
                  className={
                    h.status === 'FINISHED'
                      ? 'text-emerald-600'
                      : h.status === 'FAILED'
                        ? 'text-red-600'
                        : 'text-slate-400'
                  }
                >
                  {h.status}
                </span>{' '}
                <span className="text-slate-700">{h.sql_text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
