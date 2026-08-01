import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export default function ModelsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ml-status'],
    queryFn: () => api.getMlStatus(),
  })

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Models</h1>
        <p className="text-sm text-slate-500">Real MLflow Model Registry entries and their versions.</p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading models…</p>}
      {error && <p className="text-sm text-red-600">Failed to load models.</p>}
      {data && !data.available && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          MLflow is not reachable.
        </p>
      )}
      {data?.available && data.registered_models.length === 0 && (
        <p className="text-sm text-slate-500">No models have been registered yet.</p>
      )}

      <div className="flex flex-col gap-4">
        {data?.registered_models.map((m) => (
          <div key={m.name} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 transition-shadow hover:shadow-md">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">{m.name}</h2>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2">Version</th>
                  <th className="py-2">Stage</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Run</th>
                </tr>
              </thead>
              <tbody>
                {m.latest_versions.map((v) => (
                  <tr key={v.version} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                    <td className="py-2">{v.version}</td>
                    <td className="py-2">{v.current_stage}</td>
                    <td className="py-2">{v.status}</td>
                    <td className="py-2 font-mono text-xs text-slate-500">{v.run_id?.slice(0, 8) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
