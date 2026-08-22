import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, TargetHealth } from '../services/api'

interface JobSummary {
  job: string
  up: number
  total: number
}

function summarizeByJob(targets: TargetHealth[]): JobSummary[] {
  const byJob = new Map<string, JobSummary>()
  for (const t of targets) {
    const entry = byJob.get(t.job) ?? { job: t.job, up: 0, total: 0 }
    entry.total += 1
    if (t.up) entry.up += 1
    byJob.set(t.job, entry)
  }
  return Array.from(byJob.values()).sort((a, b) => a.job.localeCompare(b.job))
}

function healthColor(up: number, total: number) {
  if (total === 0) return 'bg-slate-100 text-slate-600 border-slate-200'
  if (up === total) return 'bg-green-50 text-green-800 border-green-200'
  if (up === 0) return 'bg-red-50 text-red-800 border-red-200'
  return 'bg-amber-50 text-amber-800 border-amber-200'
}

export default function MonitoringPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['monitoring-status'],
    queryFn: () => api.getMonitoringStatus(),
    refetchInterval: 10000,
  })

  const jobSummaries = useMemo(() => summarizeByJob(data?.targets ?? []), [data?.targets])
  const totalTargets = data?.targets.length ?? 0
  const upTargets = data?.targets.filter((t) => t.up).length ?? 0
  const downTargets = totalTargets - upTargets
  const healthPct = totalTargets > 0 ? Math.round((upTargets / totalTargets) * 100) : 0

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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overall health</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{healthPct}%</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total targets</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalTargets}</p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-green-700">Healthy</p>
            <p className="mt-1 text-2xl font-bold text-green-800">{upTargets}</p>
          </div>
          <div className={`rounded-lg border p-4 ${downTargets > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider ${downTargets > 0 ? 'text-red-700' : 'text-slate-400'}`}>
              Down
            </p>
            <p className={`mt-1 text-2xl font-bold ${downTargets > 0 ? 'text-red-800' : 'text-slate-900'}`}>{downTargets}</p>
          </div>
        </div>
      )}

      {data && jobSummaries.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">By service</p>
          <div className="flex flex-wrap gap-2">
            {jobSummaries.map((j) => (
              <span
                key={j.job}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${healthColor(j.up, j.total)}`}
                title={`${j.up}/${j.total} instances up`}
              >
                {j.job}: {j.up}/{j.total}
              </span>
            ))}
          </div>
        </div>
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
