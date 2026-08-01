import { useMemo } from 'react'
import { Background, Controls, Edge, MarkerType, Node, ReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

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

export default function LineagePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['lineage'],
    queryFn: () => api.getLineage(),
  })

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
      return {
        id: n.id,
        position: { x: column * 260, y: row * 110 },
        data: { label: shortLabel },
        style: {
          border: '1px solid #7c3aed',
          borderRadius: 8,
          padding: 8,
          background: '#faf5ff',
          fontSize: 12,
          width: 220,
        },
      }
    })

    const edges: Edge[] = data.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.pipeline_name,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#7c3aed' },
      labelStyle: { fontSize: 10 },
    }))

    return { nodes, edges }
  }, [data])

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lineage</h1>
        <p className="text-sm text-slate-500">
          Table-level lineage derived from every saved pipeline's source and destination nodes.
        </p>
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
        <div className="h-[600px] rounded-lg border border-slate-200 bg-white">
          <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      )}
    </div>
  )
}
