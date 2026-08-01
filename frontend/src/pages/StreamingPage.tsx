import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export default function StreamingPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['streaming-status'],
    queryFn: () => api.getStreamingStatus(),
    refetchInterval: 5000,
  })

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Streaming</h1>
        <p className="text-sm text-slate-500">
          Real-time status of Kafka topics feeding the lakehouse (messages, offsets, lag, partitions).
        </p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading streaming status…</p>}
      {error && <p className="text-sm text-red-600">Failed to load streaming status.</p>}

      {data && !data.kafka_available && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Kafka is not reachable. Start it with the <code>streaming</code> compose profile
          (<code>docker compose --profile streaming up -d kafka</code>) to see live topic status here.
        </p>
      )}

      {data && data.kafka_available && data.topics.length === 0 && (
        <p className="text-sm text-slate-500">
          Kafka is running but no topics exist yet — publish some demo events (e.g. via
          <code className="mx-1">infra/kafka/produce_demo_orders.py</code>) to see status here.
        </p>
      )}

      {data && data.kafka_available && data.topics.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-2">Topic</th>
                <th className="px-4 py-2">Partitions</th>
                <th className="px-4 py-2">Messages</th>
                <th className="px-4 py-2">Consumer Lag</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.topics.map((t) => (
                <tr key={t.topic} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-2 font-mono text-xs">{t.topic}</td>
                  <td className="px-4 py-2">{t.partitions}</td>
                  <td className="px-4 py-2">{t.messages}</td>
                  <td className="px-4 py-2">{t.lag}</td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      {t.status}
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
