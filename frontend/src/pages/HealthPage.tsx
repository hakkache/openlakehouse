import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

function Dot({ status }: { status: string }) {
  const color = status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
}

export default function HealthPage() {
  const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    refetchInterval: 10000,
  })

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Health</h1>
          <p className="mt-1 text-sm text-slate-500">Live status of PostgreSQL, Redis and MinIO.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500 hover:shadow-md"
        >
          Refresh
        </button>
      </div>

      {isLoading && <p className="mt-4 text-sm text-slate-500">Loading…</p>}
      {isError && (
        <p className="mt-4 text-sm text-red-600">
          Failed to reach backend: {(error as Error).message}
        </p>
      )}

      {data && (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {data.dependencies.map((dep) => (
                <tr key={dep.name} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-medium capitalize text-slate-900">{dep.name}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 text-slate-700">
                      <Dot status={dep.status} /> {dep.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{dep.detail ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
            Overall: {data.status} · last updated{' '}
            {new Date(dataUpdatedAt).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  )
}

