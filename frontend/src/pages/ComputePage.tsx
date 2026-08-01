import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

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

export default function ComputePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['compute-status'],
    queryFn: () => api.getComputeStatus(),
    refetchInterval: 5000,
  })

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Compute</h1>
        <p className="text-sm text-slate-500">
          Real status, workers and job/query activity for Spark, Trino and Jupyter.
        </p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading compute status…</p>}
      {error && <p className="text-sm text-red-600">Failed to load compute status.</p>}

      {data && (
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
      )}
    </div>
  )
}
