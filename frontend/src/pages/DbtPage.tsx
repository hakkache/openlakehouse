import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, DbtElementType, DbtModelInfo, DbtModelLayer, DbtRunDetail } from '../services/api'

const LAYER_ORDER = ['staging', 'intermediate', 'marts']
const ELEMENT_TYPES: { value: DbtElementType; label: string }[] = [
  { value: 'model', label: 'Model' },
  { value: 'macro', label: 'Macro' },
  { value: 'snapshot', label: 'Snapshot' },
  { value: 'test', label: 'Test (singular)' },
]
const MATERIALIZATIONS = ['view', 'table', 'incremental', 'ephemeral'] as const
type Materialization = (typeof MATERIALIZATIONS)[number]

function buildTemplate(
  elementType: DbtElementType,
  name: string,
  materialized: Materialization,
): string {
  const safeName = name || 'my_model'
  switch (elementType) {
    case 'model':
      return `{{ config(materialized='${materialized}') }}\n\nselect\n    *\nfrom {{ source('silver', 'REPLACE_ME') }}\n`
    case 'macro':
      return `{% macro ${safeName}() %}\n    -- macro body\n{% endmacro %}\n`
    case 'snapshot':
      return (
        `{% snapshot ${safeName} %}\n` +
        `{{\n` +
        `    config(\n` +
        `      target_schema='dbt_snapshots',\n` +
        `      unique_key='id',\n` +
        `      strategy='check',\n` +
        `      check_cols=['REPLACE_ME'],\n` +
        `    )\n` +
        `}}\n` +
        `select * from {{ source('silver', 'REPLACE_ME') }}\n` +
        `{% endsnapshot %}\n`
      )
    case 'test':
      return `-- this test FAILS if it returns any rows\nselect *\nfrom {{ ref('REPLACE_ME') }}\nwhere 1 = 0\n`
    default:
      return ''
  }
}

function layerOf(model: DbtModelInfo): string {
  const path = model.original_file_path ?? ''
  for (const layer of LAYER_ORDER) {
    if (path.includes(`models/${layer}/`) || path.includes(`models\\${layer}\\`)) return layer
  }
  return model.schema_name?.replace('dbt_', '') ?? 'other'
}

function groupByLayer(models: DbtModelInfo[]): [string, DbtModelInfo[]][] {
  const groups = new Map<string, DbtModelInfo[]>()
  for (const m of models) {
    const layer = layerOf(m)
    if (!groups.has(layer)) groups.set(layer, [])
    groups.get(layer)!.push(m)
  }
  const known = LAYER_ORDER.filter((l) => groups.has(l)).map((l) => [l, groups.get(l)!] as [string, DbtModelInfo[]])
  const rest = Array.from(groups.entries()).filter(([l]) => !LAYER_ORDER.includes(l))
  return [...known, ...rest]
}

function formatTime(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString()
}

export default function DbtPage() {
  const queryClient = useQueryClient()
  const [select, setSelect] = useState('')
  const [command, setCommand] = useState<'run' | 'test' | 'build'>('run')
  const [fullRefresh, setFullRefresh] = useState(false)
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<DbtRunDetail | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [createElementType, setCreateElementType] = useState<DbtElementType>('model')
  const [createLayer, setCreateLayer] = useState<DbtModelLayer>('staging')
  const [createMaterialized, setCreateMaterialized] = useState<Materialization>('view')
  const [createName, setCreateName] = useState('')
  const [createContent, setCreateContent] = useState(() => buildTemplate('model', '', 'view'))
  const [createError, setCreateError] = useState<string | null>(null)
  const [viewingPath, setViewingPath] = useState<string | null>(null)

  const status = useQuery({ queryKey: ['dbt-status'], queryFn: () => api.getDbtStatus(), refetchInterval: 15000 })
  const models = useQuery({ queryKey: ['dbt-models'], queryFn: () => api.getDbtModels() })
  const runs = useQuery({ queryKey: ['dbt-runs'], queryFn: () => api.getDbtRuns(), refetchInterval: 5000 })
  const files = useQuery({ queryKey: ['dbt-files'], queryFn: () => api.getDbtFiles() })
  const fileContent = useQuery({
    queryKey: ['dbt-file-content', viewingPath],
    queryFn: () => api.getDbtFileContent(viewingPath as string),
    enabled: !!viewingPath,
  })
  const runDetail = useQuery({
    queryKey: ['dbt-run', expandedRunId],
    queryFn: () => api.getDbtRun(expandedRunId as string),
    enabled: !!expandedRunId,
  })

  const runMutation = useMutation({
    mutationFn: () => api.runDbt({ command, select: select || undefined, full_refresh: fullRefresh }),
    onSuccess: (result) => {
      setLastResult(result)
      queryClient.invalidateQueries({ queryKey: ['dbt-runs'] })
    },
  })

  const createMutation = useMutation({
    mutationFn: () =>
      api.createDbtFile({
        element_type: createElementType,
        layer: createElementType === 'model' ? createLayer : undefined,
        name: createName.trim(),
        content: createContent,
      }),
    onSuccess: (created) => {
      setCreateError(null)
      setShowCreate(false)
      setCreateName('')
      queryClient.invalidateQueries({ queryKey: ['dbt-files'] })
      queryClient.invalidateQueries({ queryKey: ['dbt-models'] })
      setViewingPath(created.path)
    },
    onError: (err: unknown) => {
      setCreateError(err instanceof Error ? err.message : 'Failed to create file')
    },
  })

  function resetCreateContent(elementType: DbtElementType, materialized: Materialization) {
    setCreateContent(buildTemplate(elementType, createName, materialized))
  }

  const grouped = useMemo(() => groupByLayer(models.data ?? []), [models.data])
  const filesByType = useMemo(() => {
    const groups = new Map<string, { path: string; name: string }[]>()
    for (const f of files.data ?? []) {
      if (!groups.has(f.element_type)) groups.set(f.element_type, [])
      groups.get(f.element_type)!.push(f)
    }
    return groups
  }, [files.data])

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">dbt</h1>
          <p className="text-sm text-slate-500">
            Browse dbt models, trigger real `dbt run`/`test`/`build` invocations, and review run history/logs.
          </p>
        </div>
        {status.data && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              status.data.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {status.data.available ? 'dbt runner reachable' : 'dbt runner unreachable'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-1">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Run dbt</p>
          <label className="mb-1 block text-xs text-slate-500">Command</label>
          <select
            className="mb-2 w-full rounded border border-slate-300 px-2 py-1 text-sm"
            value={command}
            onChange={(e) => setCommand(e.target.value as 'run' | 'test' | 'build')}
          >
            <option value="run">run — build models</option>
            <option value="test">test — run data tests</option>
            <option value="build">build — run + test</option>
          </select>
          <label className="mb-1 block text-xs text-slate-500">--select (blank = everything)</label>
          <input
            className="mb-2 w-full rounded border border-slate-300 px-2 py-1 text-sm"
            placeholder="stg_olist_orders or tag:marts"
            value={select}
            onChange={(e) => setSelect(e.target.value)}
          />
          <label className="mb-3 flex items-center gap-2 text-xs text-slate-500">
            <input type="checkbox" checked={fullRefresh} onChange={(e) => setFullRefresh(e.target.checked)} />
            Full refresh
          </label>
          <button
            type="button"
            disabled={runMutation.isPending}
            onClick={() => runMutation.mutate()}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500 hover:shadow-md disabled:opacity-50"
          >
            {runMutation.isPending ? 'Running…' : `Run dbt ${command}`}
          </button>

          {lastResult && (
            <div className="mt-4">
              <p
                className={`mb-1 text-xs font-semibold ${
                  lastResult.status === 'SUCCESS' ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {lastResult.status} (exit {lastResult.return_code})
              </p>
              <pre className="max-h-64 overflow-auto rounded bg-slate-900 p-2 text-[11px] text-slate-100">
                {(lastResult.stdout || lastResult.stderr || '(no output)').slice(-4000)}
              </pre>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Models</p>
          {models.isLoading && <p className="text-sm text-slate-500">Loading models…</p>}
          {models.isError && <p className="text-sm text-red-600">Failed to load dbt models.</p>}
          {models.data && models.data.length === 0 && (
            <p className="text-sm text-slate-500">No models found — check the dbt project mount and connectivity.</p>
          )}
          <div className="max-h-96 space-y-4 overflow-auto">
            {grouped.map(([layer, layerModels]) => (
              <div key={layer}>
                <p className="mb-1 text-xs font-semibold capitalize text-slate-600">{layer}</p>
                <div className="divide-y divide-slate-100 rounded border border-slate-100">
                  {layerModels.map((m) => (
                    <div key={m.name} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{m.name}</p>
                        {m.description && <p className="text-xs text-slate-500">{m.description}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelect(m.name)}
                        className="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Project files</p>
          <button
            type="button"
            onClick={() => {
              setCreateError(null)
              setShowCreate((v) => !v)
            }}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-rose-600/30 hover:bg-rose-500"
          >
            {showCreate ? 'Cancel' : '+ New model / macro / snapshot / test'}
          </button>
        </div>

        {showCreate && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50/50 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Element type</label>
                <select
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  value={createElementType}
                  onChange={(e) => {
                    const next = e.target.value as DbtElementType
                    setCreateElementType(next)
                    resetCreateContent(next, createMaterialized)
                  }}
                >
                  {ELEMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              {createElementType === 'model' && (
                <>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Layer</label>
                    <select
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      value={createLayer}
                      onChange={(e) => setCreateLayer(e.target.value as DbtModelLayer)}
                    >
                      {LAYER_ORDER.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Materialization (model type)</label>
                    <select
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      value={createMaterialized}
                      onChange={(e) => {
                        const next = e.target.value as Materialization
                        setCreateMaterialized(next)
                        resetCreateContent(createElementType, next)
                      }}
                    >
                      {MATERIALIZATIONS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div className={createElementType === 'model' ? '' : 'sm:col-span-3'}>
                <label className="mb-1 block text-xs text-slate-500">Name (no extension)</label>
                <input
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  placeholder="my_new_model"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
              </div>
            </div>

            <label className="mb-1 mt-3 block text-xs text-slate-500">
              SQL content{' '}
              <button
                type="button"
                className="text-indigo-600 hover:underline"
                onClick={() => resetCreateContent(createElementType, createMaterialized)}
              >
                (reset to template)
              </button>
            </label>
            <textarea
              className="h-40 w-full rounded border border-slate-300 p-2 font-mono text-xs"
              value={createContent}
              onChange={(e) => setCreateContent(e.target.value)}
            />

            {createError && <p className="mt-2 text-xs text-red-600">{createError}</p>}

            <button
              type="button"
              disabled={!createName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating…' : `Create ${createElementType}`}
            </button>
          </div>
        )}

        {files.isLoading && <p className="text-sm text-slate-500">Loading project files…</p>}
        {files.isError && <p className="text-sm text-red-600">Failed to load project files.</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {['model', 'macro', 'snapshot', 'test'].map((type) => (
            <div key={type}>
              <p className="mb-1 text-xs font-semibold capitalize text-slate-600">{type}s</p>
              <div className="divide-y divide-slate-100 rounded border border-slate-100">
                {(filesByType.get(type) ?? []).map((f) => (
                  <button
                    key={f.path}
                    type="button"
                    onClick={() => setViewingPath(viewingPath === f.path ? null : f.path)}
                    className={`block w-full px-3 py-2 text-left text-xs font-mono hover:bg-slate-50 ${
                      viewingPath === f.path ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
                {(filesByType.get(type) ?? []).length === 0 && (
                  <p className="px-3 py-2 text-xs text-slate-400">none yet</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {viewingPath && (
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold text-slate-600">{viewingPath}</p>
            {fileContent.isLoading && <p className="text-xs text-slate-500">Loading…</p>}
            {fileContent.data && (
              <pre className="max-h-72 overflow-auto rounded bg-slate-900 p-3 text-[11px] text-slate-100">
                {fileContent.data.content}
              </pre>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Run history</p>
        {runs.isLoading && <p className="text-sm text-slate-500">Loading run history…</p>}
        {runs.data && runs.data.length === 0 && <p className="text-sm text-slate-500">No dbt runs yet.</p>}
        {runs.data && runs.data.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2">Command</th>
                <th className="px-3 py-2">Select</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Triggered by</th>
                <th className="px-3 py-2">Started</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {runs.data.map((r) => (
                <>
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <td className="px-3 py-2 font-mono text-xs">{r.command}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.select || '(all)'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          r.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">{r.triggered_by}</td>
                    <td className="px-3 py-2 text-xs">{formatTime(r.started_at)}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-xs text-indigo-600 hover:underline"
                        onClick={() => setExpandedRunId(expandedRunId === r.id ? null : r.id)}
                      >
                        {expandedRunId === r.id ? 'Hide log' : 'View log'}
                      </button>
                    </td>
                  </tr>
                  {expandedRunId === r.id && (
                    <tr key={`${r.id}-detail`}>
                      <td colSpan={6} className="bg-slate-50 px-3 py-2">
                        {runDetail.isLoading && <p className="text-xs text-slate-500">Loading log…</p>}
                        {runDetail.data && (
                          <pre className="max-h-72 overflow-auto rounded bg-slate-900 p-2 text-[11px] text-slate-100">
                            {(runDetail.data.stdout || runDetail.data.stderr || '(no output)').slice(-6000)}
                          </pre>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
