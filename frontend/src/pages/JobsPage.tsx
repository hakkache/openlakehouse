import { Fragment, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, PipelineNodeStatus } from '../services/api'
import { describeCron } from '../utils/cron'

function formatTime(t: number | null): string {
  if (t === null) return '—'
  return new Date(t * 1000).toLocaleString()
}

function formatIso(t: string | null): string {
  if (!t) return '—'
  return new Date(t).toLocaleString()
}

function formatRelative(epochSeconds: number | null): string {
  if (epochSeconds === null) return ''
  const diffSec = Math.round((Date.now() - epochSeconds * 1000) / 1000)
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.round(diffHr / 24)}d ago`
}

function formatFutureRelative(iso: string | null): string {
  if (!iso) return ''
  const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  if (diffSec <= 0) return 'due now'
  if (diffSec < 60) return `in ${diffSec}s`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `in ${diffMin}m`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `in ${diffHr}h`
  return `in ${Math.round(diffHr / 24)}d`
}

// Dagster run statuses that mean "still in flight" and can be cancelled.
const IN_PROGRESS_STATUSES = new Set(['QUEUED', 'NOT_STARTED', 'STARTING', 'STARTED', 'CANCELING'])

const NODE_STATUS_STYLE: Record<PipelineNodeStatus, string> = {
  PENDING: 'bg-slate-300',
  RUNNING: 'bg-blue-500 animate-pulse',
  SUCCESS: 'bg-green-500',
  FAILED: 'bg-red-500',
  SKIPPED: 'bg-slate-300',
}

const NODE_DONE_STATUSES = new Set<PipelineNodeStatus>(['SUCCESS', 'FAILED', 'SKIPPED'])

/** Expandable step-by-step progress for one run, fetched on demand (and polled while running). */
function RunProgress({ localRunId, inProgress }: { localRunId: string; inProgress: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ['run-progress', localRunId],
    queryFn: () => api.getPipelineRun(localRunId),
    refetchInterval: inProgress ? 3000 : false,
  })

  if (isLoading || !data) {
    return <p className="px-2 py-2 text-xs text-slate-400">Loading step progress…</p>
  }

  const total = data.nodes.length
  const done = data.nodes.filter((n) => NODE_DONE_STATUSES.has(n.status)).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="px-2 py-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-slate-200">
          <div
            className={`h-1.5 rounded-full transition-all ${data.status === 'FAILED' ? 'bg-red-500' : 'bg-indigo-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="whitespace-nowrap text-xs text-slate-500">
          {done}/{total} steps
        </span>
      </div>
      <ul className="space-y-1">
        {data.nodes.map((n) => (
          <li key={n.node_id} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${NODE_STATUS_STYLE[n.status]}`} />
              <span className="font-mono text-slate-700">{n.node_id}</span>
              <span className="text-slate-400">{n.status}</span>
            </span>
            <span className="text-slate-400">
              {n.row_count !== null ? `${n.row_count} rows` : ''}
              {n.duration_ms !== null ? ` · ${(n.duration_ms / 1000).toFixed(1)}s` : ''}
            </span>
          </li>
        ))}
      </ul>
      {data.error && <p className="mt-2 text-xs text-red-600">{data.error}</p>}
    </div>
  )
}

export default function JobsPage() {
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set())

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['jobs-status'],
    queryFn: () => api.getJobsStatus(),
    refetchInterval: 10000,
  })

  const triggerMutation = useMutation({
    mutationFn: (pipelineId: string) => api.triggerPipelineJob(pipelineId),
    onSuccess: (result) => {
      setActionError(null)
      setActionMessage(`Run launched (Dagster run ${result.dagster_run_id.slice(0, 8)}…).`)
      queryClient.invalidateQueries({ queryKey: ['jobs-status'] })
    },
    onError: (err: unknown) => setActionError(`Failed to launch the run: ${(err as Error).message}`),
  })

  const terminateMutation = useMutation({
    mutationFn: (dagsterRunId: string) => api.terminateJobRun(dagsterRunId),
    onSuccess: () => {
      setActionError(null)
      setActionMessage('Run cancellation requested.')
      queryClient.invalidateQueries({ queryKey: ['jobs-status'] })
    },
    onError: (err: unknown) => setActionError(`Failed to cancel the run: ${(err as Error).message}`),
  })

  const busyPipelineId = triggerMutation.isPending ? triggerMutation.variables : null
  const busyRunId = terminateMutation.isPending ? terminateMutation.variables : null

  function toggleExpanded(runId: string) {
    setExpandedRuns((prev) => {
      const next = new Set(prev)
      if (next.has(runId)) next.delete(runId)
      else next.add(runId)
      return next
    })
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Jobs</h1>
          <p className="text-sm text-slate-500">Schedule and trigger real Dagster runs for your saved pipelines.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
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
      </div>

      {actionError && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>
      )}
      {actionMessage && !actionError && (
        <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{actionMessage}</p>
      )}

      {isLoading && <p className="text-sm text-slate-500">Loading job status…</p>}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>Failed to load job status.</span>
          <button onClick={() => refetch()} className="font-medium underline underline-offset-2">
            Retry
          </button>
        </div>
      )}

      {data && !data.available && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Dagster is not reachable. Start it with the <code>data-engineering</code> compose profile.
        </p>
      )}

      {data && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 transition-shadow hover:shadow-md">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Scheduled Pipelines</h2>
              <span className="text-xs text-slate-400">
                Set a schedule in the Pipeline Builder&apos;s &quot;Pipeline settings&quot; panel
              </span>
            </div>
            {data.scheduled_pipelines.length === 0 ? (
              <p className="text-sm text-slate-500">No pipelines have a schedule yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-2">Pipeline</th>
                    <th className="py-2">Schedule</th>
                    <th className="py-2">Next run</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.scheduled_pipelines.map((p) => (
                    <tr
                      key={p.pipeline_id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-2 font-medium text-slate-900">{p.name}</td>
                      <td className="py-2">
                        <div className="text-slate-700">{describeCron(p.schedule)}</div>
                        <div className="font-mono text-xs text-slate-400">{p.schedule}</div>
                      </td>
                      <td className="py-2 text-xs">
                        <div>{formatIso(p.next_run_at)}</div>
                        <div className="text-slate-400">{formatFutureRelative(p.next_run_at)}</div>
                      </td>
                      <td className="py-2 text-right">
                        <button
                          disabled={!data.available || busyPipelineId === p.pipeline_id}
                          onClick={() => triggerMutation.mutate(p.pipeline_id)}
                          className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busyPipelineId === p.pipeline_id ? 'Launching…' : 'Run now'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {data.unscheduled_pipelines.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 transition-shadow hover:shadow-md">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">Other Pipelines</h2>
              <p className="mb-2 text-xs text-slate-500">No schedule set — trigger a one-off Dagster run manually.</p>
              <ul className="divide-y divide-slate-100">
                {data.unscheduled_pipelines.map((p) => (
                  <li key={p.pipeline_id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium text-slate-900">{p.name}</span>
                    <button
                      disabled={!data.available || busyPipelineId === p.pipeline_id}
                      onClick={() => triggerMutation.mutate(p.pipeline_id)}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyPipelineId === p.pipeline_id ? 'Launching…' : 'Run now'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 transition-shadow hover:shadow-md">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Recent Runs</h2>
            {data.recent_runs.length === 0 ? (
              <p className="text-sm text-slate-500">No runs yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-2">Run ID</th>
                    <th className="py-2">Pipeline</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Started</th>
                    <th className="py-2">Finished</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_runs.map((r) => {
                    const inProgress = IN_PROGRESS_STATUSES.has(r.status)
                    const expanded = expandedRuns.has(r.run_id)
                    return (
                      <Fragment key={r.run_id}>
                        <tr
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-2 font-mono text-xs" title={r.run_id}>
                            {r.run_id.slice(0, 8)}
                          </td>
                          <td className="py-2">{r.pipeline_name ?? r.job_name}</td>
                          <td className="py-2">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                r.status === 'SUCCESS'
                                  ? 'bg-green-100 text-green-800'
                                  : r.status === 'FAILURE'
                                    ? 'bg-red-100 text-red-800'
                                    : inProgress
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {inProgress && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />}
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2 text-xs">
                            <div>{formatTime(r.start_time)}</div>
                            {r.start_time !== null && (
                              <div className="text-slate-400">{formatRelative(r.start_time)}</div>
                            )}
                          </td>
                          <td className="py-2 text-xs">
                            {r.end_time !== null ? (
                              <>
                                <div>{formatTime(r.end_time)}</div>
                                <div className="text-slate-400">{formatRelative(r.end_time)}</div>
                              </>
                            ) : inProgress ? (
                              <span className="text-blue-600">Running…</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2 text-right">
                            <div className="flex justify-end gap-1.5">
                              {r.local_run_id && (
                                <button
                                  onClick={() => toggleExpanded(r.run_id)}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                                >
                                  {expanded ? 'Hide steps' : 'View progress'}
                                </button>
                              )}
                              {inProgress && (
                                <button
                                  disabled={busyRunId === r.run_id}
                                  onClick={() => terminateMutation.mutate(r.run_id)}
                                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {busyRunId === r.run_id ? 'Cancelling…' : 'Cancel'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expanded && r.local_run_id && (
                          <tr className="border-b border-slate-100 bg-slate-50/60 last:border-0">
                            <td colSpan={6}>
                              <RunProgress localRunId={r.local_run_id} inProgress={inProgress} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}


