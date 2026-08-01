import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type ConnectionRead, type ConnectionType } from '../services/api'

interface FieldSpec {
  key: string
  label: string
  type?: 'text' | 'number' | 'checkbox'
  placeholder?: string
}

const TYPE_FIELDS: Record<ConnectionType, FieldSpec[]> = {
  postgresql: [
    { key: 'host', label: 'Host', placeholder: 'postgres' },
    { key: 'port', label: 'Port', type: 'number', placeholder: '5432' },
    { key: 'database', label: 'Database', placeholder: 'openlakehouse' },
    { key: 'username', label: 'Username', placeholder: 'postgres' },
  ],
  mysql: [
    { key: 'host', label: 'Host' },
    { key: 'port', label: 'Port', type: 'number', placeholder: '3306' },
    { key: 'database', label: 'Database' },
    { key: 'username', label: 'Username' },
  ],
  sqlserver: [
    { key: 'host', label: 'Host' },
    { key: 'port', label: 'Port', type: 'number', placeholder: '1433' },
    { key: 'database', label: 'Database' },
    { key: 'username', label: 'Username' },
  ],
  rest: [
    { key: 'url', label: 'URL', placeholder: 'https://example.com/api' },
    { key: 'username', label: 'Username (optional, basic auth)' },
  ],
  kafka: [{ key: 'bootstrap_servers', label: 'Bootstrap Servers', placeholder: 'kafka:9092' }],
  minio: [
    { key: 'endpoint', label: 'Endpoint', placeholder: 'minio:9000' },
    { key: 'username', label: 'Access Key' },
    { key: 'secure', label: 'Use TLS', type: 'checkbox' },
  ],
  trino: [
    { key: 'host', label: 'Host', placeholder: 'trino' },
    { key: 'port', label: 'Port', type: 'number', placeholder: '8080' },
    { key: 'username', label: 'Username', placeholder: 'openlakehouse' },
    { key: 'catalog', label: 'Catalog', placeholder: 'iceberg' },
  ],
}

const CONNECTION_TYPES: ConnectionType[] = ['postgresql', 'mysql', 'sqlserver', 'rest', 'kafka', 'minio', 'trino']

interface FormState {
  name: string
  type: ConnectionType
  config: Record<string, unknown>
  password: string
}

function emptyForm(): FormState {
  return { name: '', type: 'postgresql', config: {}, password: '' }
}

function ConnectionForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: ConnectionRead
  onCancel: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? { name: initial.name, type: initial.type as ConnectionType, config: initial.config, password: '' }
      : emptyForm(),
  )
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const testMutation = useMutation({
    mutationFn: () => api.testConnectionAdhoc({ name: form.name, type: form.type, config: form.config, password: form.password || undefined }),
    onSuccess: (r) => setTestResult({ success: r.success, message: `${r.message} (${r.latency_ms}ms)` }),
    onError: (e) => setTestResult({ success: false, message: (e as Error).message }),
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      initial
        ? api.updateConnection(initial.id, {
            name: form.name,
            config: form.config,
            password: form.password || undefined,
          })
        : api.createConnection({ name: form.name, type: form.type, config: form.config, password: form.password || undefined }),
    onSuccess: onSaved,
  })

  const fields = TYPE_FIELDS[form.type]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 transition-shadow hover:shadow-md">
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-500">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Type</label>
          <select
            value={form.type}
            disabled={!!initial}
            onChange={(e) => setForm({ ...form, type: e.target.value as ConnectionType, config: {} })}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-1.5 text-sm disabled:bg-slate-50"
          >
            {CONNECTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        {fields.map((f) =>
          f.type === 'checkbox' ? (
            <label key={f.key} className="mt-6 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={!!form.config[f.key]}
                onChange={(e) => setForm({ ...form, config: { ...form.config, [f.key]: e.target.checked } })}
              />
              {f.label}
            </label>
          ) : (
            <div key={f.key}>
              <label className="text-xs font-medium text-slate-500">{f.label}</label>
              <input
                type={f.type ?? 'text'}
                placeholder={f.placeholder}
                value={(form.config[f.key] as string | number | undefined) ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    config: {
                      ...form.config,
                      [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                    },
                  })
                }
                className="mt-1 w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>
          ),
        )}
        <div>
          <label className="text-xs font-medium text-slate-500">Password / Secret</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={initial ? 'Leave blank to keep existing' : ''}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {testResult && (
        <p className={`mb-3 text-sm ${testResult.success ? 'text-green-700' : 'text-red-600'}`}>
          {testResult.message}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => testMutation.mutate()}
          disabled={testMutation.isPending}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
        >
          {testMutation.isPending ? 'Testing…' : 'Test Connection'}
        </button>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !form.name}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500 hover:shadow-md disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700">
          Cancel
        </button>
      </div>
      {saveMutation.isError && <p className="mt-2 text-sm text-red-600">{(saveMutation.error as Error).message}</p>}
    </div>
  )
}

export default function ConnectionsPage() {
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['connections'],
    queryFn: () => api.listConnections(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteConnection(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connections'] }),
  })

  const testMutation = useMutation({
    mutationFn: (id: string) => api.testConnection(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connections'] }),
  })

  const onSaved = () => {
    setCreating(false)
    setEditingId(null)
    queryClient.invalidateQueries({ queryKey: ['connections'] })
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Connections</h1>
          <p className="text-sm text-slate-500">
            Manage connections to PostgreSQL, MySQL, SQL Server, REST, Kafka, MinIO and Trino. Every test is a
            real, live connection attempt.
          </p>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500 hover:shadow-md"
          >
            + New Connection
          </button>
        )}
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading connections…</p>}
      {error && <p className="text-sm text-red-600">Failed to load connections.</p>}

      {creating && <ConnectionForm onCancel={() => setCreating(false)} onSaved={onSaved} />}

      {data && data.length === 0 && !creating && (
        <p className="text-sm text-slate-500">No connections yet — create one above.</p>
      )}

      <div className="flex flex-col gap-3">
        {data?.map((conn) =>
          editingId === conn.id ? (
            <ConnectionForm key={conn.id} initial={conn} onCancel={() => setEditingId(null)} onSaved={onSaved} />
          ) : (
            <div key={conn.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{conn.name}</h2>
                  <p className="text-xs text-slate-500">{conn.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  {conn.last_test_status && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        conn.last_test_status === 'SUCCESS'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {conn.last_test_status}
                      {conn.last_test_latency_ms !== null ? ` · ${conn.last_test_latency_ms}ms` : ''}
                    </span>
                  )}
                  <button
                    onClick={() => testMutation.mutate(conn.id)}
                    disabled={testMutation.isPending}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => setEditingId(conn.id)}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete connection "${conn.name}"?`)) deleteMutation.mutate(conn.id)
                    }}
                    className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {conn.last_test_message && <p className="mt-2 text-xs text-slate-500">{conn.last_test_message}</p>}
            </div>
          ),
        )}
      </div>
    </div>
  )
}
