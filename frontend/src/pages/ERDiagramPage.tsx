import { useEffect, useMemo, useState } from 'react'
import { Background, Controls, Edge, MarkerType, Node, ReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

const TABLES_PER_ROW = 4
const CARD_WIDTH = 260
const CARD_X_GAP = 60
const ROW_HEIGHT = 260

export default function ERDiagramPage() {
  const [catalog, setCatalog] = useState<string | null>(null)
  const [schema, setSchema] = useState<string | null>(null)

  const catalogsQuery = useQuery({ queryKey: ['catalogs'], queryFn: () => api.listCatalogs() })
  const schemasQuery = useQuery({
    queryKey: ['schemas', catalog],
    queryFn: () => api.listSchemas(catalog as string),
    enabled: !!catalog,
  })

  useEffect(() => {
    if (!catalog && catalogsQuery.data && catalogsQuery.data.length > 0) {
      setCatalog(catalogsQuery.data.includes('iceberg') ? 'iceberg' : catalogsQuery.data[0])
    }
  }, [catalog, catalogsQuery.data])

  useEffect(() => {
    setSchema(null)
  }, [catalog])

  useEffect(() => {
    if (!schema && schemasQuery.data && schemasQuery.data.length > 0) {
      setSchema(schemasQuery.data[0])
    }
  }, [schema, schemasQuery.data])

  const erQuery = useQuery({
    queryKey: ['er-diagram', catalog, schema],
    queryFn: () => api.getErDiagram(catalog as string, schema as string),
    enabled: !!catalog && !!schema,
  })

  const { nodes, edges } = useMemo(() => {
    if (!erQuery.data) return { nodes: [] as Node[], edges: [] as Edge[] }
    const nodes: Node[] = erQuery.data.tables.map((table, i) => {
      const col = i % TABLES_PER_ROW
      const row = Math.floor(i / TABLES_PER_ROW)
      return {
        id: table.name,
        position: { x: col * (CARD_WIDTH + CARD_X_GAP), y: row * ROW_HEIGHT },
        data: {
          label: (
            <div className="text-left">
              <div className="mb-1 border-b border-slate-300 pb-1 font-semibold text-slate-800">{table.name}</div>
              <div className="max-h-40 overflow-y-auto">
                {table.columns.map((c) => (
                  <div key={c.name} className="flex items-center justify-between gap-2 py-0.5 text-[11px]">
                    <span className={c.is_primary_key_guess ? 'font-semibold text-indigo-700' : 'text-slate-600'}>
                      {c.is_primary_key_guess ? '🔑 ' : ''}
                      {c.name}
                    </span>
                    <span className="text-slate-400">{c.type}</span>
                  </div>
                ))}
              </div>
            </div>
          ),
        },
        style: {
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          padding: 8,
          background: '#ffffff',
          width: CARD_WIDTH,
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        },
      }
    })

    const edges: Edge[] = erQuery.data.relationships.map((r, i) => ({
      id: `${r.from_table}.${r.from_column}->${r.to_table}.${r.to_column}-${i}`,
      source: r.from_table,
      target: r.to_table,
      label: `${r.from_column} → ${r.to_column}`,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#6366f1' },
      labelStyle: { fontSize: 10 },
    }))

    return { nodes, edges }
  }, [erQuery.data])

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">ER Diagram</h1>
          <p className="text-sm text-slate-500">
            Tables and columns for a catalog/schema, with relationships inferred heuristically from
            <code className="mx-1 rounded bg-slate-100 px-1">&lt;entity&gt;_id</code>
            naming conventions (no real foreign-key metadata exists in Iceberg/Trino, so treat edges as a
            best-effort guide, not ground truth).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={catalog ?? ''}
            onChange={(e) => setCatalog(e.target.value)}
          >
            {(catalogsQuery.data ?? []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={schema ?? ''}
            onChange={(e) => setSchema(e.target.value)}
            disabled={!catalog}
          >
            {(schemasQuery.data ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {erQuery.isLoading && <p className="text-sm text-slate-500">Loading tables…</p>}
      {erQuery.error && <p className="text-sm text-red-600">Failed to load the ER diagram for this schema.</p>}
      {erQuery.data && erQuery.data.tables.length === 0 && (
        <p className="text-sm text-slate-500">No tables found in this schema.</p>
      )}

      {erQuery.data && erQuery.data.tables.length > 0 && (
        <div className="h-[650px] flex-1 rounded-lg border border-slate-200 bg-slate-50">
          <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      )}
    </div>
  )
}
