import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export default function MonitoringPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['monitoring-status'],
    queryFn: () => api.getMonitoringStatus(),
    refetchInterval: 10000,
  })

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Monitoring</h1>
          <p className="text-sm text-slate-500">
            Real Prometheus target health across every scraped service in the stack.
          </p>
        </div>
        {data && (
          <div className="flex gap-2">
            <a
              href={data.grafana_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500 hover:shadow-md"
            >
              Open Grafana
            </a>
            <a
              href={data.prometheus_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
            >
              Open Prometheus
            </a>
          </div>
        )}
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading monitoring status…</p>}
      {error && <p className="text-sm text-red-600">Failed to load monitoring status.</p>}

      {data && !data.available && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Prometheus is not reachable. Start it with the <code>monitoring</code> compose profile.
        </p>
      )}

      {data && data.targets.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-2">Job</th>
                <th className="px-4 py-2">Instance</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.targets.map((t) => (
                <tr key={`${t.job}-${t.instance}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-2 font-medium text-slate-900">{t.job}</td>
                  <td className="px-4 py-2 font-mono text-xs">{t.instance}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        t.up ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {t.up ? 'Up' : 'Down'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
