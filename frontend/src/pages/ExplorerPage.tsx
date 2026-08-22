import { FormEvent, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ColumnInfo, QueryEngine, QueryStatus, SparkCodeStatus } from '../services/api'
import { useAuth } from '../app/AuthContext'
import { ChevronDownIcon, DatabaseIcon, FolderIcon, BoxStackIcon } from '../components/icons'
import { ContextMenu, ContextMenuItem } from '../components/ContextMenu'
import { useToast } from '../components/Toast'

type TreeContextTarget =
  | { kind: 'catalog'; catalog: string }
  | { kind: 'schema'; catalog: string; schema: string }
  | { kind: 'table'; catalog: string; schema: string; table: string }
  | { kind: 'column'; catalog: string; schema: string; table: string; column: string }

const DEFAULT_SQL = 'SELECT * FROM bronze.test ORDER BY id LIMIT 20'
const DEFAULT_PYSPARK_CODE = `# "spark" (SparkSession) and "sc" (SparkContext) are pre-bound - write real PySpark.
df = spark.sql("SELECT * FROM catalog.bronze.test LIMIT 20")
df.show()
print("rows:", df.count())
`
const POLL_INTERVAL_MS = 1000

function TreeRow({
  depth,
  icon,
  label,
  open,
  onToggle,
  onClick,
  onContextMenu,
  expandable = true,
}: {
  depth: number
  icon?: React.ReactNode
  label: string
  open?: boolean
  onToggle?: () => void
  onClick?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  expandable?: boolean
}) {
  return (
    <div
      className="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-sm text-slate-700 hover:bg-slate-100"
      style={{ paddingLeft: depth * 14 + 4 }}
      onClick={() => {
        if (expandable && onToggle) onToggle()
        if (onClick) onClick()
      }}
      onContextMenu={onContextMenu}
    >
      {expandable ? (
        <ChevronDownIcon
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`}
        />
      ) : (
        <span className="inline-block w-3.5 shrink-0" />
      )}
      {icon}
      <span className="truncate">{label}</span>
    </div>
  )
}

function ColumnLeaf({
  column,
  onContextMenu,
}: {
  column: ColumnInfo
  onContextMenu?: (e: React.MouseEvent) => void
}) {
  return (
    <div
      className="flex items-center gap-1.5 py-0.5 text-xs text-slate-500"
      style={{ paddingLeft: 4 * 14 + 22 }}
      onContextMenu={onContextMenu}
    >
      <span className="truncate">{column.name}</span>
      <span className="ml-auto shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
        {column.type}
      </span>
    </div>
  )
}

function TableNode({
  catalog,
  schema,
  table,
  onSelectTable,
  selected,
  onContextMenu,
}: {
  catalog: string
  schema: string
  table: string
  onSelectTable: (catalog: string, schema: string, table: string) => void
  selected: boolean
  onContextMenu: (e: React.MouseEvent, target: TreeContextTarget) => void
}) {
  const [open, setOpen] = useState(false)
  const columnsQuery = useQuery({
    queryKey: ['columns', catalog, schema, table],
    queryFn: () => api.listColumns(catalog, schema, table),
    enabled: open,
  })

  return (
    <div>
      <div className={selected ? 'rounded bg-indigo-50' : ''}>
        <TreeRow
          depth={3}
          icon={<BoxStackIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
          label={table}
          open={open}
          onToggle={() => setOpen((o) => !o)}
          onClick={() => onSelectTable(catalog, schema, table)}
          onContextMenu={(e) => onContextMenu(e, { kind: 'table', catalog, schema, table })}
        />
      </div>
      {open && (
        <div>
          {columnsQuery.isLoading && <p className="pl-16 text-xs text-slate-400">Loading columns…</p>}
          {columnsQuery.data?.map((c) => (
            <ColumnLeaf
              key={c.name}
              column={c}
              onContextMenu={(e) => onContextMenu(e, { kind: 'column', catalog, schema, table, column: c.name })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SchemaNode({
  catalog,
  schema,
  onSelectTable,
  selectedTable,
  onContextMenu,
}: {
  catalog: string
  schema: string
  onSelectTable: (catalog: string, schema: string, table: string) => void
  selectedTable: { catalog: string; schema: string; table: string } | null
  onContextMenu: (e: React.MouseEvent, target: TreeContextTarget) => void
}) {
  const [open, setOpen] = useState(false)
  const tablesQuery = useQuery({
    queryKey: ['tables', catalog, schema],
    queryFn: () => api.listTables(catalog, schema),
    enabled: open,
  })

  return (
    <div>
      <TreeRow
        depth={2}
        icon={<FolderIcon className="h-3.5 w-3.5 shrink-0 text-amber-600" />}
        label={schema}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        onContextMenu={(e) => onContextMenu(e, { kind: 'schema', catalog, schema })}
      />
      {open && (
        <div>
          {tablesQuery.isLoading && <p className="pl-14 text-xs text-slate-400">Loading tables…</p>}
          {tablesQuery.data?.length === 0 && <p className="pl-14 text-xs text-slate-400">No tables</p>}
          {tablesQuery.data?.map((t) => (
            <TableNode
              key={t}
              catalog={catalog}
              schema={schema}
              table={t}
              onSelectTable={onSelectTable}
              selected={
                selectedTable?.catalog === catalog && selectedTable?.schema === schema && selectedTable?.table === t
              }
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CatalogNode({
  catalog,
  onSelectTable,
  selectedTable,
  onContextMenu,
}: {
  catalog: string
  onSelectTable: (catalog: string, schema: string, table: string) => void
  selectedTable: { catalog: string; schema: string; table: string } | null
  onContextMenu: (e: React.MouseEvent, target: TreeContextTarget) => void
}) {
  const [open, setOpen] = useState(false)
  const schemasQuery = useQuery({
    queryKey: ['schemas', catalog],
    queryFn: () => api.listSchemas(catalog),
    enabled: open,
  })

  return (
    <div>
      <TreeRow
        depth={1}
        icon={<DatabaseIcon className="h-3.5 w-3.5 shrink-0 text-indigo-600" />}
        label={catalog}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        onContextMenu={(e) => onContextMenu(e, { kind: 'catalog', catalog })}
      />
      {open && (
        <div>
          {schemasQuery.isLoading && <p className="pl-10 text-xs text-slate-400">Loading schemas…</p>}
          {schemasQuery.data?.map((s) => (
            <SchemaNode
              key={s}
              catalog={catalog}
              schema={s}
              onSelectTable={onSelectTable}
              selectedTable={selectedTable}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ExplorerPage() {
  const queryClient = useQueryClient()
  const { authenticated, login, roles } = useAuth()
  const { showToast } = useToast()
  const canRunSparkCode = roles.includes('ADMIN') || roles.includes('DATA_ENGINEER')
  const [mode, setMode] = useState<'sql' | 'pyspark'>('sql')
  const [sql, setSql] = useState(DEFAULT_SQL)
  const [engine, setEngine] = useState<QueryEngine>('trino')
  const [activeQuery, setActiveQuery] = useState<QueryStatus | null>(null)
  const [pysparkCode, setPysparkCode] = useState(DEFAULT_PYSPARK_CODE)
  const [activeCodeJob, setActiveCodeJob] = useState<SparkCodeStatus | null>(null)
  const [selectedTable, setSelectedTable] = useState<{ catalog: string; schema: string; table: string } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const codePollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const catalogsQuery = useQuery({ queryKey: ['catalogs'], queryFn: () => api.listCatalogs(), enabled: authenticated })

  const submitMutation = useMutation({
    mutationFn: (query: string) => api.submitQuery(query, engine),
    onSuccess: (status) => setActiveQuery(status),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.cancelQuery(id),
  })

  const submitCodeMutation = useMutation({
    mutationFn: (code: string) => api.submitSparkCode(code),
    onSuccess: (status) => setActiveCodeJob(status),
  })

  const cancelCodeMutation = useMutation({
    mutationFn: (id: string) => api.cancelSparkCode(id),
  })

  const sessionStatusQuery = useQuery({
    queryKey: ['spark-code-session-status'],
    queryFn: () => api.getSparkCodeSessionStatus(),
    enabled: authenticated && canRunSparkCode && mode === 'pyspark',
    refetchInterval: 15000,
  })

  const stopSessionMutation = useMutation({
    mutationFn: () => api.stopSparkCodeSession(),
    onSuccess: () => {
      showToast('Spark session stopped')
      queryClient.invalidateQueries({ queryKey: ['spark-code-session-status'] })
    },
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

  useEffect(() => {
    if (!activeCodeJob || activeCodeJob.status !== 'RUNNING') {
      if (codePollRef.current) {
        clearInterval(codePollRef.current)
        codePollRef.current = null
      }
      return
    }
    codePollRef.current = setInterval(async () => {
      const updated = await api.getSparkCodeStatus(activeCodeJob.id)
      setActiveCodeJob(updated)
    }, POLL_INTERVAL_MS)
    return () => {
      if (codePollRef.current) clearInterval(codePollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCodeJob?.status, activeCodeJob?.id])

  function runQuery(query: string) {
    if (!query.trim()) return
    submitMutation.mutate(query)
  }

  function runPysparkCode(code: string) {
    if (!code.trim()) return
    submitCodeMutation.mutate(code)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (mode === 'pyspark') {
      runPysparkCode(pysparkCode)
    } else {
      runQuery(sql)
    }
  }

  function handleSelectTable(catalog: string, schema: string, table: string) {
    setSelectedTable({ catalog, schema, table })
    setMode('sql')
    const query = `SELECT * FROM ${qualifyCatalog(catalog)}.${schema}.${table} LIMIT 100`
    setSql(query)
    runQuery(query)
  }

  // Trino and Spark expose the same underlying Iceberg/Polaris warehouse under
  // different catalog aliases (Trino: "iceberg", Spark: "catalog"). Translate
  // so a name copied/queried from Trino's catalog listing still resolves
  // correctly against whichever engine is currently selected.
  function qualifyCatalog(catalog: string) {
    return engine === 'spark' && catalog === 'iceberg' ? 'catalog' : catalog
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      showToast(`Copied "${text}"`)
    } catch {
      showToast('Failed to copy to clipboard', 'error')
    }
  }

  function handleTreeContextMenu(e: React.MouseEvent, target: TreeContextTarget) {
    e.preventDefault()
    e.stopPropagation()
    let items: ContextMenuItem[]
    if (target.kind === 'catalog') {
      items = [{ label: 'Copy catalog name', onSelect: () => copyText(target.catalog) }]
    } else if (target.kind === 'schema') {
      const qualified = `${qualifyCatalog(target.catalog)}.${target.schema}`
      items = [
        { label: 'Copy schema name', onSelect: () => copyText(target.schema) },
        { label: 'Copy fully qualified schema', onSelect: () => copyText(qualified) },
      ]
    } else if (target.kind === 'table') {
      const qualified = `${qualifyCatalog(target.catalog)}.${target.schema}.${target.table}`
      items = [
        {
          label: 'Preview first 100 rows',
          onSelect: () => handleSelectTable(target.catalog, target.schema, target.table),
        },
        { label: 'Copy table name', onSelect: () => copyText(target.table) },
        { label: 'Copy fully qualified name', onSelect: () => copyText(qualified) },
        { label: 'Copy SELECT statement', onSelect: () => copyText(`SELECT * FROM ${qualified} LIMIT 100`) },
        {
          label: 'Row count',
          onSelect: () => {
            setMode('sql')
            const query = `SELECT COUNT(*) AS row_count FROM ${qualified}`
            setSql(query)
            runQuery(query)
          },
        },
      ]
    } else {
      items = [
        { label: 'Copy column name', onSelect: () => copyText(target.column) },
        { label: 'Copy qualified column', onSelect: () => copyText(`${target.table}.${target.column}`) },
      ]
    }
    setContextMenu({ x: e.clientX, y: e.clientY, items })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (mode === 'pyspark') {
        runPysparkCode(pysparkCode)
      } else {
        runQuery(sql)
      }
    }
  }

  if (!authenticated) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Data Explorer</h1>
        <p className="mt-4 text-sm text-slate-500">
          Sign in with your OpenLakehouse account to browse the catalog and run SQL queries.
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
  const isCodeRunning = activeCodeJob?.status === 'RUNNING'

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Data Explorer</h1>
        <p className="text-sm text-slate-500">
          Browse catalogs, schemas, tables and columns, and run SQL against Trino or Spark - or write real PySpark
          code.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="w-72 shrink-0 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
          <h2 className="px-1.5 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Catalog tree</h2>
          <p className="px-1.5 pb-1 text-[10px] text-slate-400">Right-click any item for more actions.</p>
          {catalogsQuery.isLoading && <p className="px-1.5 py-1 text-xs text-slate-400">Loading catalogs…</p>}
          {catalogsQuery.error && <p className="px-1.5 py-1 text-xs text-red-600">Failed to load catalogs.</p>}
          {catalogsQuery.data?.map((c) => (
            <CatalogNode
              key={c}
              catalog={c}
              onSelectTable={handleSelectTable}
              selectedTable={selectedTable}
              onContextMenu={handleTreeContextMenu}
            />
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex overflow-hidden rounded-lg border border-slate-200 self-start">
            <button
              type="button"
              onClick={() => setMode('sql')}
              className={`px-3 py-1.5 text-xs font-semibold transition ${
                mode === 'sql' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              SQL Editor
            </button>
            <button
              type="button"
              disabled={!canRunSparkCode}
              title={canRunSparkCode ? undefined : 'Requires the ADMIN or DATA_ENGINEER role'}
              onClick={() => setMode('pyspark')}
              className={`px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                mode === 'pyspark' ? 'bg-orange-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              PySpark Code
            </button>
          </div>

          {mode === 'sql' ? (
            <form onSubmit={handleSubmit} className="rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-sm">
              <textarea
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={7}
                spellCheck={false}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                placeholder="SELECT * FROM catalog.schema.table"
              />
              <div className="mt-2 flex items-center gap-2">
                <div className="flex overflow-hidden rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setEngine('trino')}
                    className={`px-3 py-1.5 text-xs font-medium transition ${
                      engine === 'trino' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Run via Trino
                  </button>
                  <button
                    type="button"
                    onClick={() => setEngine('spark')}
                    className={`px-3 py-1.5 text-xs font-medium transition ${
                      engine === 'spark' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Run via Spark
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={isRunning}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRunning ? 'Running…' : 'Run (Ctrl+Enter)'}
                </button>
                {isRunning && activeQuery && (
                  <button
                    type="button"
                    onClick={() => cancelMutation.mutate(activeQuery.id)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                )}
                <span className="ml-auto text-[11px] text-slate-500">
                  Tip: click a table in the tree to preview it instantly.
                </span>
              </div>
            </form>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-sm"
            >
              <textarea
                value={pysparkCode}
                onChange={(e) => setPysparkCode(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={12}
                spellCheck={false}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 focus:border-orange-500 focus:outline-none"
                placeholder='df = spark.sql("SELECT * FROM catalog.bronze.table")&#10;df.show()'
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isCodeRunning}
                  className="rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCodeRunning ? 'Running…' : 'Run PySpark (Ctrl+Enter)'}
                </button>
                {isCodeRunning && activeCodeJob && (
                  <button
                    type="button"
                    onClick={() => cancelCodeMutation.mutate(activeCodeJob.id)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                )}
                <span className="ml-auto text-[11px] text-slate-500">
                  Runs against a real, shared SparkSession (catalog alias: <code>catalog</code>). Output is
                  whatever your code prints.
                </span>
              </div>
              {sessionStatusQuery.data && (
                <div className="mt-2 flex items-center gap-2 border-t border-slate-800 pt-2">
                  <span
                    className={`h-2 w-2 rounded-full ${sessionStatusQuery.data.running ? 'bg-emerald-500' : 'bg-slate-600'}`}
                  />
                  <span className="text-[11px] text-slate-400">
                    {sessionStatusQuery.data.running
                      ? `Spark session active - idle ${sessionStatusQuery.data.idle_seconds ?? 0}s (auto-stops after ${sessionStatusQuery.data.idle_timeout_seconds}s idle)`
                      : 'No Spark session running'}
                  </span>
                  {sessionStatusQuery.data.running && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Stop the shared Spark session? Any running PySpark code will fail.')) {
                          stopSessionMutation.mutate()
                        }
                      }}
                      disabled={stopSessionMutation.isPending}
                      className="ml-auto rounded-lg border border-red-800 px-2.5 py-1 text-[11px] font-medium text-red-300 hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Stop session
                    </button>
                  )}
                </div>
              )}
            </form>
          )}

          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
            {mode === 'sql' ? (
              <>
                {!activeQuery && (
                  <p className="p-4 text-sm text-slate-400">Run a query or click a table in the tree to see results.</p>
                )}
                {activeQuery?.status === 'FAILED' && <p className="p-4 text-sm text-red-600">{activeQuery.error}</p>}
                {activeQuery?.status === 'CANCELLED' && <p className="p-4 text-sm text-slate-500">Query cancelled.</p>}
                {activeQuery?.status === 'FINISHED' && activeQuery.columns && activeQuery.rows && (
                  <>
                    <p className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 text-xs text-slate-500">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          activeQuery.engine === 'spark' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {activeQuery.engine}
                      </span>
                      {activeQuery.row_count} row(s) in {activeQuery.duration_ms} ms
                    </p>
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        <tr>
                          {activeQuery.columns.map((c) => (
                            <th key={c} className="whitespace-nowrap px-4 py-2">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeQuery.rows.map((row, i) => (
                          <tr
                            key={i}
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors"
                          >
                            {row.map((cell, j) => (
                              <td
                                key={j}
                                className={`whitespace-nowrap px-4 py-2 font-mono text-xs ${
                                  cell === null ? 'italic text-slate-400' : 'text-slate-700'
                                }`}
                              >
                                {cell === null ? 'NULL' : String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            ) : (
              <>
                {!activeCodeJob && (
                  <p className="p-4 text-sm text-slate-400">Run some PySpark code to see its output here.</p>
                )}
                {activeCodeJob && (
                  <>
                    <p className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 text-xs text-slate-500">
                      <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-orange-700">
                        pyspark
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          activeCodeJob.status === 'FAILED'
                            ? 'bg-red-100 text-red-700'
                            : activeCodeJob.status === 'CANCELLED'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {activeCodeJob.status}
                      </span>
                      {activeCodeJob.duration_ms != null && <span>{activeCodeJob.duration_ms} ms</span>}
                    </p>
                    <pre className="whitespace-pre-wrap p-4 font-mono text-xs text-slate-800">
                      {activeCodeJob.output}
                      {activeCodeJob.error && (
                        <span className="text-red-600">{activeCodeJob.output ? '\n' : ''}{activeCodeJob.error}</span>
                      )}
                    </pre>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}

