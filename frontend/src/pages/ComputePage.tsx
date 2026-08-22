import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, JupyterKernel, SparkApplication, TrinoQuery } from '../services/api'
import { useAuth } from '../app/AuthContext'
import { useToast } from '../components/Toast'

function EngineCard({
  title,
  available,
  rows,
}: {
  title: string
  available: boolean
  rows: Array<[string, string | number]>
}) {
  return (
    <div className="flex-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 transition-shadow hover:shadow-md">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            available ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {available ? 'Online' : 'Unavailable'}
        </span>
      </div>
      {available ? (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="font-medium text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-slate-500">Not reachable — this engine may not be running.</p>
      )}
    </div>
  )
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}m ${rem}s`
}

function StateBadge({ state }: { state: string }) {
  const upper = (state || '').toUpperCase()
  const tone =
    upper === 'RUNNING' || upper === 'STARTING' || upper === 'BUSY'
      ? 'bg-blue-100 text-blue-800'
      : upper === 'FINISHED' || upper === 'IDLE'
        ? 'bg-green-100 text-green-800'
        : upper === 'FAILED' || upper === 'KILLED' || upper === 'DEAD'
          ? 'bg-red-100 text-red-800'
          : 'bg-slate-100 text-slate-600'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{state}</span>
}

function KillButton({ onKill, disabled }: { onKill: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onKill}
      disabled={disabled}
      className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Kill
    </button>
  )
}

export default function ComputePage() {
  const { roles } = useAuth()
  const canManage = roles.includes('ADMIN') || roles.includes('DATA_ENGINEER')
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['compute-status'],
    queryFn: () => api.getComputeStatus(),
    refetchInterval: 5000,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['compute-status'] })

  const killSparkMutation = useMutation({
    mutationFn: (appId: string) => api.killSparkApplication(appId),
    onSuccess: (_data, appId) => {
      showToast(`Killed Spark application ${appId}`)
      invalidate()
    },
    onError: () => showToast('Failed to kill the Spark application', 'error'),
  })

  const killTrinoMutation = useMutation({
    mutationFn: (queryId: string) => api.killTrinoQuery(queryId),
    onSuccess: (_data, queryId) => {
      showToast(`Killed Trino query ${queryId}`)
      invalidate()
    },
    onError: () => showToast('Failed to kill the Trino query', 'error'),
  })

  const killKernelMutation = useMutation({
    mutationFn: (kernelId: string) => api.killJupyterKernel(kernelId),
    onSuccess: (_data, kernelId) => {
      showToast(`Killed Jupyter kernel ${kernelId}`)
      invalidate()
    },
    onError: () => showToast('Failed to kill the Jupyter kernel', 'error'),
  })

  const confirmKillSpark = (app: SparkApplication) => {
    if (!window.confirm(`Kill Spark application "${app.name}" (${app.id})? This cannot be undone.`)) return
    killSparkMutation.mutate(app.id)
  }
  const confirmKillTrino = (q: TrinoQuery) => {
    if (!window.confirm(`Kill Trino query ${q.id}? This cannot be undone.`)) return
    killTrinoMutation.mutate(q.id)
  }
  const confirmKillKernel = (k: JupyterKernel) => {
    if (!window.confirm(`Kill Jupyter kernel "${k.name}" (${k.id})? Any in-progress cell will be lost.`)) return
    killKernelMutation.mutate(k.id)
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Compute</h1>
        <p className="text-sm text-slate-500">
          Real status, workers and job/query activity for Spark, Trino and Jupyter — with a detailed process
          dashboard and the ability to kill a runaway application, query or kernel.
        </p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading compute status…</p>}
      {error && <p className="text-sm text-red-600">Failed to load compute status.</p>}

      {data && (
        <>
          <div className="flex flex-col gap-4 md:flex-row">
            <EngineCard
              title="Spark"
              available={!!data.spark}
              rows={
                data.spark
                  ? [
                      ['Status', data.spark.status],
                      ['Workers', `${data.spark.workers_alive} / ${data.spark.workers_total}`],
                      ['Cores', `${data.spark.cores_used} / ${data.spark.cores_total}`],
                      ['Memory (MB)', `${data.spark.memory_used_mb} / ${data.spark.memory_total_mb}`],
                      ['Active Apps', data.spark.active_apps],
                      ['Completed Apps', data.spark.completed_apps],
                    ]
                  : []
              }
            />
            <EngineCard
              title="Trino"
              available={!!data.trino}
              rows={
                data.trino
                  ? [
                      ['Status', data.trino.status],
                      ['Version', data.trino.version],
                      ['Workers', data.trino.workers_total],
                      ['Running Queries', data.trino.running_queries],
                      ['Queued Queries', data.trino.queued_queries],
                      ['Tracked Queries', data.trino.total_queries_tracked],
                    ]
                  : []
              }
            />
            <EngineCard
              title="Jupyter"
              available={!!data.jupyter}
              rows={
                data.jupyter
                  ? [
                      ['Status', data.jupyter.status],
                      ['Running Kernels', data.jupyter.kernels_running],
                      ['Connections', data.jupyter.connections],
                    ]
                  : []
              }
            />
          </div>

          {!canManage && (
            <p className="text-xs text-slate-400">
              Killing a process requires the ADMIN or DATA_ENGINEER role — you can still view the tables below.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Spark applications ({data.spark_applications.length})
              </h3>
              {data.spark_applications.length === 0 ? (
                <p className="text-sm text-slate-500">No Spark applications tracked by the master yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-2 py-1.5 font-medium">Name</th>
                        <th className="px-2 py-1.5 font-medium">User</th>
                        <th className="px-2 py-1.5 font-medium">State</th>
                        <th className="px-2 py-1.5 font-medium">Cores</th>
                        <th className="px-2 py-1.5 font-medium">Mem/Exec</th>
                        <th className="px-2 py-1.5 font-medium">Duration</th>
                        {canManage && <th className="px-2 py-1.5 font-medium">Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {data.spark_applications.map((app) => (
                        <tr key={app.id} className="border-b border-slate-100 last:border-0">
                          <td className="max-w-[160px] truncate px-2 py-1.5" title={`${app.name} (${app.id})`}>
                            {app.name || app.id}
                          </td>
                          <td className="px-2 py-1.5">{app.user}</td>
                          <td className="px-2 py-1.5">
                            <StateBadge state={app.state} />
                          </td>
                          <td className="px-2 py-1.5">{app.cores}</td>
                          <td className="px-2 py-1.5">{app.memory_per_executor_mb} MB</td>
                          <td className="px-2 py-1.5">{formatDuration(app.duration_ms)}</td>
                          {canManage && (
                            <td className="px-2 py-1.5">
                              {app.running ? (
                                <KillButton
                                  onKill={() => confirmKillSpark(app)}
                                  disabled={killSparkMutation.isPending}
                                />
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Trino queries ({data.trino_queries.length})
              </h3>
              {data.trino_queries.length === 0 ? (
                <p className="text-sm text-slate-500">No queries tracked by the coordinator right now.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-2 py-1.5 font-medium">Query</th>
                        <th className="px-2 py-1.5 font-medium">User</th>
                        <th className="px-2 py-1.5 font-medium">State</th>
                        <th className="px-2 py-1.5 font-medium">Elapsed</th>
                        {canManage && <th className="px-2 py-1.5 font-medium">Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {data.trino_queries.map((q) => {
                        const killable = q.state === 'RUNNING' || q.state === 'QUEUED'
                        return (
                          <tr key={q.id} className="border-b border-slate-100 last:border-0">
                            <td className="max-w-[220px] truncate px-2 py-1.5" title={q.query}>
                              {q.query || q.id}
                            </td>
                            <td className="px-2 py-1.5">{q.user}</td>
                            <td className="px-2 py-1.5">
                              <StateBadge state={q.state} />
                            </td>
                            <td className="px-2 py-1.5">{q.elapsed_time || '—'}</td>
                            {canManage && (
                              <td className="px-2 py-1.5">
                                {killable ? (
                                  <KillButton
                                    onKill={() => confirmKillTrino(q)}
                                    disabled={killTrinoMutation.isPending}
                                  />
                                ) : (
                                  <span className="text-xs text-slate-300">—</span>
                                )}
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Jupyter kernels ({data.jupyter_kernels.length})
              </h3>
              {data.jupyter_kernels.length === 0 ? (
                <p className="text-sm text-slate-500">No kernels currently running.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-2 py-1.5 font-medium">Name</th>
                        <th className="px-2 py-1.5 font-medium">State</th>
                        <th className="px-2 py-1.5 font-medium">Connections</th>
                        <th className="px-2 py-1.5 font-medium">Last activity</th>
                        {canManage && <th className="px-2 py-1.5 font-medium">Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {data.jupyter_kernels.map((k) => (
                        <tr key={k.id} className="border-b border-slate-100 last:border-0">
                          <td className="max-w-[140px] truncate px-2 py-1.5" title={k.id}>
                            {k.name}
                          </td>
                          <td className="px-2 py-1.5">
                            <StateBadge state={k.execution_state} />
                          </td>
                          <td className="px-2 py-1.5">{k.connections}</td>
                          <td className="px-2 py-1.5">
                            {k.last_activity ? new Date(k.last_activity).toLocaleTimeString() : '—'}
                          </td>
                          {canManage && (
                            <td className="px-2 py-1.5">
                              <KillButton
                                onKill={() => confirmKillKernel(k)}
                                disabled={killKernelMutation.isPending}
                              />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
