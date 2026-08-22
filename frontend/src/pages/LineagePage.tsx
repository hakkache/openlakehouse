import { useMemo, useState } from 'react'
import { Background, Controls, Edge, MarkerType, Node, ReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, LineageGraphEdge, LineageGraphNode } from '../services/api'

const LAYER_STYLE: Record<string, { border: string; background: string; text: string; dot: string }> = {
  bronze: { border: '#b45309', background: '#fffbeb', text: 'Bronze', dot: '#b45309' },
  silver: { border: '#475569', background: '#f8fafc', text: 'Silver', dot: '#475569' },
  gold: { border: '#a16207', background: '#fefce8', text: 'Gold', dot: '#a16207' },
  other: { border: '#7c3aed', background: '#faf5ff', text: 'Other', dot: '#7c3aed' },
}

const STATUS_DOT: Record<string, string> = {
  SUCCESS: '#16a34a',
  FAILED: '#dc2626',
  SKIPPED: '#9ca3af',
  RUNNING: '#3b82f6',
  PENDING: '#9ca3af',
}

/**
 * Simple left-to-right layered layout: nodes with no incoming edges go in
 * column 0, then each subsequent node is placed one column to the right of
 * its furthest-upstream predecessor. Good enough for the bronze/silver/gold
 * table lineage graphs this page renders (small, mostly linear DAGs).
 */
function layoutNodes(nodeIds: string[], edges: { source: string; target: string }[]): Map<string, number> {
  const incoming = new Map<string, string[]>()
  nodeIds.forEach((id) => incoming.set(id, []))
  edges.forEach((e) => incoming.get(e.target)?.push(e.source))

  const columnOf = new Map<string, number>()
  const resolve = (id: string, seen: Set<string>): number => {
    if (columnOf.has(id)) return columnOf.get(id) as number
    if (seen.has(id)) return 0 // cycle guard
    seen.add(id)
    const preds = incoming.get(id) ?? []
    const column = preds.length === 0 ? 0 : Math.max(...preds.map((p) => resolve(p, seen))) + 1
    columnOf.set(id, column)
    return column
  }
  nodeIds.forEach((id) => resolve(id, new Set()))
  return columnOf
}

function formatTime(iso: string | null): string {
  if (!iso) return 'Never run via a tracked pipeline'
  return new Date(iso).toLocaleString()
}

/** BFS both directions from the matched node ids to find their full connected subgraph. */
function connectedSubgraph(matched: Set<string>, edges: LineageGraphEdge[]): Set<string> {
  const forward = new Map<string, string[]>()
  const backward = new Map<string, string[]>()
  edges.forEach((e) => {
    forward.set(e.source, [...(forward.get(e.source) ?? []), e.target])
    backward.set(e.target, [...(backward.get(e.target) ?? []), e.source])
  })
  const result = new Set<string>(matched)
  const stack = [...matched]
  while (stack.length) {
    const cur = stack.pop() as string
    for (const next of [...(forward.get(cur) ?? []), ...(backward.get(cur) ?? [])]) {
      if (!result.has(next)) {
        result.add(next)
        stack.push(next)
      }
    }
  }
  return result
}

export default function LineagePage() {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['lineage'],
    queryFn: () => api.getLineage(),
  })

  const highlighted = useMemo(() => {
    if (!data || !search.trim()) return null
    const q = search.trim().toLowerCase()
    const matched = new Set(data.nodes.filter((n) => n.label.toLowerCase().includes(q)).map((n) => n.id))
    if (matched.size === 0) return new Set<string>()
    return connectedSubgraph(matched, data.edges)
  }, [data, search])

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [] as Node[], edges: [] as Edge[] }

    const columnOf = layoutNodes(
      data.nodes.map((n) => n.id),
      data.edges,
    )
    const rowCounters = new Map<number, number>()

    const nodes: Node[] = data.nodes.map((n) => {
      const column = columnOf.get(n.id) ?? 0
      const row = rowCounters.get(column) ?? 0
      rowCounters.set(column, row + 1)
      const shortLabel = n.label.replace(/^iceberg\./, '')
      const layerStyle = LAYER_STYLE[n.layer] ?? LAYER_STYLE.other
      const dimmed = highlighted !== null && !highlighted.has(n.id)
      const statusColor = n.last_status ? STATUS_DOT[n.last_status] ?? '#9ca3af' : '#cbd5e1'
      return {
        id: n.id,
        position: { x: column * 260, y: row * 110 },
        data: {
          label: (
            <div className="relative">
              <span
                className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-white"
                style={{ background: statusColor }}
                title={n.last_status ? `Last run: ${n.last_status}` : 'No tracked pipeline run yet'}
              />
              {shortLabel}
            </div>
          ),
        },
        style: {
          border: `1px solid ${layerStyle.border}`,
          borderRadius: 8,
          padding: 8,
          background: layerStyle.background,
          fontSize: 12,
          width: 220,
          opacity: dimmed ? 0.25 : 1,
        },
      }
    })

    const edges: Edge[] = data.edges.map((e) => {
      const dimmed = highlighted !== null && (!highlighted.has(e.source) || !highlighted.has(e.target))
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.pipeline_name,
        animated: !dimmed,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#7c3aed', opacity: dimmed ? 0.15 : 1 },
        labelStyle: { fontSize: 10, opacity: dimmed ? 0.25 : 1 },
      }
    })

    return { nodes, edges }
  }, [data, highlighted])

  const selectedNode: LineageGraphNode | undefined = data?.nodes.find((n) => n.id === selectedId)
  const upstream = data?.edges.filter((e) => e.target === selectedId) ?? []
  const downstream = data?.edges.filter((e) => e.source === selectedId) ?? []

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lineage</h1>
          <p className="text-sm text-slate-500">
            Table-level lineage derived from every saved pipeline's source and destination nodes.
          </p>
        </div>
        <input
          className="w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          placeholder="Search a table to trace its lineage…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading lineage graph…</p>}
      {error && <p className="text-sm text-red-600">Failed to load lineage graph.</p>}

      {data && data.nodes.length === 0 && (
        <p className="text-sm text-slate-500">
          No lineage edges yet — create and run a pipeline with a source and destination node to see
          its table-level lineage here.
        </p>
      )}

      {data && data.nodes.length > 0 && (
        <div className="flex flex-1 gap-4">
          <div className="relative h-[600px] flex-1 rounded-lg border border-slate-200 bg-white">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              proOptions={{ hideAttribution: true }}
              onNodeClick={(_, node) => setSelectedId(node.id)}
              onPaneClick={() => setSelectedId(null)}
            >
              <Background />
              <Controls />
            </ReactFlow>
            <div className="absolute bottom-3 left-3 z-10 rounded-md border border-slate-200 bg-white/95 p-2 text-xs shadow-sm">
              <p className="mb-1 font-semibold text-slate-600">Layer</p>
              {Object.entries(LAYER_STYLE).map(([key, s]) => (
                <div key={key} className="flex items-center gap-1.5 text-slate-600">
                  <span className="inline-block h-2.5 w-2.5 rounded-full border" style={{ background: s.background, borderColor: s.border }} />
                  {s.text}
                </div>
              ))}
              <p className="mb-1 mt-2 font-semibold text-slate-600">Last run</p>
              {(['SUCCESS', 'FAILED', 'never'] as const).map((key) => (
                <div key={key} className="flex items-center gap-1.5 text-slate-600">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: key === 'never' ? '#cbd5e1' : STATUS_DOT[key] }}
                  />
                  {key === 'never' ? 'No tracked run' : key === 'SUCCESS' ? 'Success' : 'Failed'}
                </div>
              ))}
            </div>
          </div>

          {selectedNode && (
            <aside className="w-72 shrink-0 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 text-sm">
              <button className="mb-2 text-xs text-slate-400 hover:text-slate-600" onClick={() => setSelectedId(null)}>
                ✕ Close
              </button>
              <p className="font-mono text-xs text-slate-500">{selectedNode.label}</p>
              <p className="mt-1">
                <span
                  className="rounded px-1.5 py-0.5 text-xs font-medium"
                  style={{
                    background: (LAYER_STYLE[selectedNode.layer] ?? LAYER_STYLE.other).background,
                    color: (LAYER_STYLE[selectedNode.layer] ?? LAYER_STYLE.other).border,
                  }}
                >
                  {(LAYER_STYLE[selectedNode.layer] ?? LAYER_STYLE.other).text}
                </span>
              </p>

              <div className="mt-3 rounded border border-slate-100 bg-slate-50 p-2">
                <p className="text-xs font-semibold text-slate-600">Last write</p>
                {selectedNode.last_status ? (
                  <>
                    <p className="text-xs">
                      Status:{' '}
                      <span style={{ color: STATUS_DOT[selectedNode.last_status] ?? '#334155' }}>
                        {selectedNode.last_status}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">{formatTime(selectedNode.last_run_at)}</p>
                    {selectedNode.last_row_count !== null && (
                      <p className="text-xs text-slate-500">{selectedNode.last_row_count.toLocaleString()} rows</p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-slate-500">
                    No tracked pipeline run yet — likely written outside the Pipeline Builder (e.g. a Spark or
                    CDC job), or not run since being added.
                  </p>
                )}
              </div>

              {upstream.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-600">Written by</p>
                  {[...new Map(upstream.map((e) => [e.pipeline_id, e])).values()].map((e) => (
                    <Link
                      key={e.pipeline_id}
                      to={`/pipelines?pipeline=${e.pipeline_id}`}
                      className="mt-1 block truncate rounded border border-slate-200 px-2 py-1 text-xs text-purple-700 hover:bg-purple-50"
                    >
                      {e.pipeline_name}
                    </Link>
                  ))}
                </div>
              )}

              {downstream.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-600">Read by</p>
                  {[...new Map(downstream.map((e) => [e.pipeline_id, e])).values()].map((e) => (
                    <Link
                      key={e.pipeline_id}
                      to={`/pipelines?pipeline=${e.pipeline_id}`}
                      className="mt-1 block truncate rounded border border-slate-200 px-2 py-1 text-xs text-purple-700 hover:bg-purple-50"
                    >
                      {e.pipeline_name}
                    </Link>
                  ))}
                </div>
              )}
            </aside>
          )}
        </div>
      )}
    </div>
  )
}

