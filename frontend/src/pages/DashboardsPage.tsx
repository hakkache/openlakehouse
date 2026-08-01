import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export default function DashboardsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboards-status'],
    queryFn: () => api.getDashboardsStatus(),
  })

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboards</h1>
        <p className="text-sm text-slate-500">
          Real Superset dashboards published on this lakehouse.
        </p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading dashboards…</p>}
      {error && <p className="text-sm text-red-600">Failed to load dashboards.</p>}

      {data && !data.available && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Superset is not reachable. Start it with the <code>bi</code> compose profile to see dashboards here.
        </p>
      )}

      {data && data.available && data.dashboards.length === 0 && (
        <p className="text-sm text-slate-500">Superset is running but no dashboards have been published yet.</p>
      )}

      {data && data.dashboards.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.dashboards.map((d) => (
            <a
              key={d.id}
              href={d.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 transition-shadow hover:border-indigo-300 hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">{d.title}</h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    d.published ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {d.published ? 'Published' : 'Draft'}
                </span>
              </div>
              <p className="text-xs text-slate-500">Updated {d.changed_on}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
