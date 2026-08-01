import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

function formatTime(t: number | null): string {
  if (t === null) return '—'
  return new Date(t * 1000).toLocaleString()
}

export default function JobsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['jobs-status'],
    queryFn: () => api.getJobsStatus(),
    refetchInterval: 10000,
  })

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Jobs</h1>
          <p className="text-sm text-slate-500">Real Dagster jobs, schedules and recent runs.</p>
        </div>
        {data?.available && (
          <a
            href={data.dagster_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500 hover:shadow-md"
          >
            Open Dagster
          </a>
        )}
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading job status…</p>}
      {error && <p className="text-sm text-red-600">Failed to load job status.</p>}

      {data && !data.available && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Dagster is not reachable. Start it with the <code>data-engineering</code> compose profile.
        </p>
      )}

      {data && data.available && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 transition-shadow hover:shadow-md">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Jobs &amp; Schedules</h2>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2">Job</th>
                  <th className="py-2">Schedule</th>
                  <th className="py-2">Cron</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.jobs.map((j) => {
                  const schedule = data.schedules.find((s) => s.name.startsWith(j.name))
                  return (
                    <tr key={j.name} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 font-medium text-slate-900">{j.name}</td>
                      <td className="py-2">{schedule?.name ?? '—'}</td>
                      <td className="py-2 font-mono text-xs">{schedule?.cron_schedule ?? '—'}</td>
                      <td className="py-2">
                        {schedule && (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              schedule.status === 'RUNNING'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {schedule.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 transition-shadow hover:shadow-md">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Recent Runs</h2>
            {data.recent_runs.length === 0 ? (
              <p className="text-sm text-slate-500">No runs yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-2">Run ID</th>
                    <th className="py-2">Job</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Started</th>
                    <th className="py-2">Finished</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_runs.map((r) => (
                    <tr key={r.run_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 font-mono text-xs">{r.run_id.slice(0, 8)}</td>
                      <td className="py-2">{r.job_name}</td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            r.status === 'SUCCESS'
                              ? 'bg-green-100 text-green-800'
                              : r.status === 'FAILURE'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 text-xs">{formatTime(r.start_time)}</td>
                      <td className="py-2 text-xs">{formatTime(r.end_time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
