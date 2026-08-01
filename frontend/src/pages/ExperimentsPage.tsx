import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export default function ExperimentsPage() {
  const [selected, setSelected] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['ml-status'],
    queryFn: () => api.getMlStatus(),
  })

  const runsQuery = useQuery({
    queryKey: ['ml-experiment-runs', selected],
    queryFn: () => api.getExperimentRuns(selected as string),
    enabled: !!selected,
  })

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Experiments</h1>
        <p className="text-sm text-slate-500">Real MLflow experiments and their runs, params and metrics.</p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading experiments…</p>}
      {error && <p className="text-sm text-red-600">Failed to load experiments.</p>}
      {data && !data.available && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          MLflow is not reachable.
        </p>
      )}

      <div className="flex gap-4">
        <div className="w-64 shrink-0 rounded-lg border border-slate-200 bg-white p-2">
          {data?.experiments.map((e) => (
            <button
              key={e.experiment_id}
              onClick={() => setSelected(e.experiment_id)}
              className={`block w-full rounded px-3 py-2 text-left text-sm ${
                selected === e.experiment_id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {e.name}
            </button>
          ))}
        </div>

        <div className="flex-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 transition-shadow hover:shadow-md">
          {!selected && <p className="text-sm text-slate-500">Select an experiment to view its runs.</p>}
          {selected && runsQuery.isLoading && <p className="text-sm text-slate-500">Loading runs…</p>}
          {selected && runsQuery.data && runsQuery.data.length === 0 && (
            <p className="text-sm text-slate-500">No runs recorded for this experiment yet.</p>
          )}
          {selected && runsQuery.data && runsQuery.data.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2">Run</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Params</th>
                  <th className="py-2">Metrics</th>
                </tr>
              </thead>
              <tbody>
                {runsQuery.data.map((r) => (
                  <tr key={r.run_id} className="border-b border-slate-100 align-top last:border-0 hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 font-mono text-xs">{r.run_id.slice(0, 8)}</td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          r.status === 'FINISHED' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 text-xs">
                      {Object.entries(r.params).map(([k, v]) => (
                        <div key={k}>
                          {k}: {v}
                        </div>
                      ))}
                    </td>
                    <td className="py-2 text-xs">
                      {Object.entries(r.metrics).map(([k, v]) => (
                        <div key={k}>
                          {k}: {v}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
