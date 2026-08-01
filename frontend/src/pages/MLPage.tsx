import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export default function MLPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ml-status'],
    queryFn: () => api.getMlStatus(),
  })

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Machine Learning</h1>
        <p className="text-sm text-slate-500">
          Real MLflow experiments, runs and registered models tracked on this lakehouse.
        </p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading ML status…</p>}
      {error && <p className="text-sm text-red-600">Failed to load ML status.</p>}

      {data && !data.available && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          MLflow is not reachable. Start it with the <code>ml</code> compose profile.
        </p>
      )}

      {data?.available && (
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 transition-shadow hover:shadow-md">
            <p className="text-xs uppercase tracking-wide text-slate-500">Experiments</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{data.experiments.length}</p>
            <Link to="/experiments" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">
              View experiments →
            </Link>
          </div>
          <div className="flex-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 transition-shadow hover:shadow-md">
            <p className="text-xs uppercase tracking-wide text-slate-500">Registered Models</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{data.registered_models.length}</p>
            <Link to="/models" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">
              View models →
            </Link>
          </div>
        </div>
      )}

      {data?.available && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-2">Experiment</th>
                <th className="px-4 py-2">Stage</th>
                <th className="px-4 py-2">Artifact Location</th>
              </tr>
            </thead>
            <tbody>
              {data.experiments.map((e) => (
                <tr key={e.experiment_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-2 font-medium text-slate-900">{e.name}</td>
                  <td className="px-4 py-2">{e.lifecycle_stage}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500">{e.artifact_location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
