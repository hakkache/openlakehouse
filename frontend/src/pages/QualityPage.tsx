import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

const STATUS_STYLES: Record<string, string> = {
  SUCCESS: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  SKIPPED: 'bg-slate-100 text-slate-600',
  RUNNING: 'bg-blue-100 text-blue-800',
  PENDING: 'bg-slate-100 text-slate-600',
}

function ScoreCard({ label, value, valueClass }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <div className="flex-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 transition-shadow hover:shadow-md">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${valueClass ?? 'text-slate-900'}`}>{value}</p>
    </div>
  )
}

export default function QualityPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['quality-summary'],
    queryFn: () => api.getQualitySummary(),
  })

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Data Quality</h1>
        <p className="text-sm text-slate-500">
          Results of every quality-check node executed by a real pipeline run, aggregated across the
          platform.
        </p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading quality summary…</p>}
      {error && <p className="text-sm text-red-600">Failed to load quality summary.</p>}

      {data && (
        <>
          <div className="flex gap-4">
            <ScoreCard
              label="Quality Score"
              value={`${data.quality_score}%`}
              valueClass={data.quality_score >= 90 ? 'text-green-600' : data.quality_score >= 70 ? 'text-amber-600' : 'text-red-600'}
            />
            <ScoreCard label="Passed" value={data.passed} valueClass="text-green-600" />
            <ScoreCard label="Failed" value={data.failed} valueClass="text-red-600" />
            <ScoreCard label="Warnings" value={data.warnings} />
            <ScoreCard label="Total Checks" value={data.total_checks} />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Execution History</h2>
            </div>
            {data.history.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">
                No quality checks have run yet — add a quality node to a pipeline and run it to see
                results here.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-2">Pipeline</th>
                    <th className="px-4 py-2">Check</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Value</th>
                    <th className="px-4 py-2">Message</th>
                    <th className="px-4 py-2">Run At</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((h) => (
                    <tr key={`${h.run_id}:${h.node_id}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-2">{h.pipeline_name}</td>
                      <td className="px-4 py-2 font-mono text-xs">{h.check_type}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[h.status] ?? 'bg-slate-100 text-slate-600'}`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="px-4 py-2">{h.row_count ?? '—'}</td>
                      <td className="px-4 py-2 text-slate-600">{h.message ?? '—'}</td>
                      <td className="px-4 py-2 text-slate-500">
                        {h.started_at ? new Date(h.started_at).toLocaleString() : '—'}
                      </td>
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
