import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addEdge,
  Background,
  Connection,
  Controls,
  Edge,
  MiniMap,
  Node,
  NodeChange,
  EdgeChange,
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  api,
  NodeKind,
  PipelineDefinition,
  PipelineNode,
  PipelineRunStatus,
} from '../services/api'
import { useAuth } from '../app/AuthContext'

const NODE_TYPES: Record<NodeKind, string[]> = {
  source: ['iceberg_table'],
  transform: [
    'select',
    'rename',
    'filter',
    'join',
    'union',
    'aggregate',
    'sort',
    'deduplicate',
    'cast',
    'fill_null',
    'replace',
    'derived_column',
    'window',
    'pivot',
    'unpivot',
  ],
  quality: ['not_null', 'unique', 'range', 'regex', 'schema', 'freshness', 'row_count'],
  destination: ['minio', 'iceberg_bronze', 'iceberg_silver', 'iceberg_gold', 'postgresql', 'kafka'],
}

const KIND_COLORS: Record<NodeKind, string> = {
  source: '#2563eb',
  transform: '#059669',
  quality: '#d97706',
  destination: '#7c3aed',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#9ca3af',
  RUNNING: '#3b82f6',
  SUCCESS: '#16a34a',
  FAILED: '#dc2626',
  SKIPPED: '#6b7280',
}

let nodeCounter = 0
function nextNodeId(kind: NodeKind) {
  nodeCounter += 1
  return `${kind}_${Date.now()}_${nodeCounter}`
}

function toFlowNode(node: PipelineNode): Node {
  return {
    id: node.id,
    position: node.position,
    data: { label: `${node.label || node.type}` },
    style: {
      border: `2px solid ${KIND_COLORS[node.kind]}`,
      borderRadius: 6,
      padding: 8,
      fontSize: 12,
      background: 'white',
    },
  }
}

export default function PipelinesPage() {
  const queryClient = useQueryClient()
  const { authenticated, login } = useAuth()

  const [pipelineId, setPipelineId] = useState<string | null>(null)
  const [pipelineName, setPipelineName] = useState('untitled_pipeline')
  const [nodeMeta, setNodeMeta] = useState<Record<string, PipelineNode>>({})
  const [flowNodes, setFlowNodes] = useState<Node[]>([])
  const [flowEdges, setFlowEdges] = useState<Edge[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [configText, setConfigText] = useState('{}')
  const [configError, setConfigError] = useState<string | null>(null)
  const [compiledSql, setCompiledSql] = useState<string | null>(null)
  const [runStatus, setRunStatus] = useState<PipelineRunStatus | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: pipelines } = useQuery({
    queryKey: ['pipelines'],
    queryFn: api.listPipelines,
    enabled: authenticated,
  })

  function buildDefinition(): PipelineDefinition {
    return {
      id: pipelineId,
      name: pipelineName,
      version: 1,
      nodes: flowNodes.map((n) => ({
        ...nodeMeta[n.id],
        position: { x: n.position.x, y: n.position.y },
      })),
      edges: flowEdges.map((e) => ({ id: e.id!, source: e.source, target: e.target })),
      parameters: {},
      schedule: null,
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const def = buildDefinition()
      if (pipelineId) {
        return api.updatePipeline(pipelineId, pipelineName, def)
      }
      return api.createPipeline(pipelineName, def)
    },
    onSuccess: (result) => {
      setPipelineId(result.id)
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
    },
  })

  const compileMutation = useMutation({
    mutationFn: () => api.compilePipelineDefinition(buildDefinition()),
    onSuccess: (result) => setCompiledSql(result.full_sql),
    onError: (err: unknown) => setCompiledSql(`-- Compile error: ${(err as Error).message}`),
  })

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!pipelineId) throw new Error('Save the pipeline before running it')
      await saveMutation.mutateAsync()
      return api.runPipeline(pipelineId)
    },
    onSuccess: (status) => setRunStatus(status),
  })

  function loadPipeline(id: string) {
    api.getPipeline(id).then((p) => {
      setPipelineId(p.id)
      setPipelineName(p.name)
      const meta: Record<string, PipelineNode> = {}
      p.definition.nodes.forEach((n) => (meta[n.id] = n))
      setNodeMeta(meta)
      setFlowNodes(p.definition.nodes.map(toFlowNode))
      setFlowEdges(
        p.definition.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, animated: true })),
      )
      setCompiledSql(null)
      setRunStatus(null)
      setSelectedNodeId(null)
    })
  }

  function addNode(kind: NodeKind, type: string) {
    const id = nextNodeId(kind)
    const node: PipelineNode = {
      id,
      kind,
      type,
      label: type,
      config: {},
      position: { x: 60 + Math.random() * 400, y: 60 + Math.random() * 300 },
    }
    setNodeMeta((prev) => ({ ...prev, [id]: node }))
    setFlowNodes((prev) => [...prev, toFlowNode(node)])
  }

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setFlowNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  )
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setFlowEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  )
  const onConnect = useCallback(
    (connection: Connection) =>
      setFlowEdges((eds) => addEdge({ ...connection, id: `e_${connection.source}_${connection.target}`, animated: true }, eds)),
    [],
  )

  function onNodeClick(_: unknown, node: Node) {
    setSelectedNodeId(node.id)
    const meta = nodeMeta[node.id]
    setConfigText(JSON.stringify(meta?.config ?? {}, null, 2))
    setConfigError(null)
  }

  function applyConfig() {
    if (!selectedNodeId) return
    try {
      const parsed = JSON.parse(configText)
      setNodeMeta((prev) => ({
        ...prev,
        [selectedNodeId]: { ...prev[selectedNodeId], config: parsed },
      }))
      setConfigError(null)
    } catch (e) {
      setConfigError((e as Error).message)
    }
  }

  function deleteSelectedNode() {
    if (!selectedNodeId) return
    setFlowNodes((nds) => nds.filter((n) => n.id !== selectedNodeId))
    setFlowEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId))
    setNodeMeta((prev) => {
      const next = { ...prev }
      delete next[selectedNodeId]
      return next
    })
    setSelectedNodeId(null)
  }

  useEffect(() => {
    if (!runStatus || runStatus.status === 'SUCCESS' || runStatus.status === 'FAILED') {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      return
    }
    pollRef.current = setInterval(async () => {
      const updated = await api.getPipelineRun(runStatus.id)
      setRunStatus(updated)
    }, 1500)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runStatus?.status, runStatus?.id])

  const displayNodes = flowNodes.map((n) => {
    const nodeRun = runStatus?.nodes.find((r) => r.node_id === n.id)
    if (!nodeRun) return n
    return {
      ...n,
      style: { ...n.style, boxShadow: `0 0 0 3px ${STATUS_COLORS[nodeRun.status]}` },
      data: { label: `${n.data.label as string}\n[${nodeRun.status}]` },
    }
  })

  if (!authenticated) {
    return (
      <div className="p-6">
        <p className="mb-4">Log in to build pipelines.</p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={() => login()}>
          Log in
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-7rem)]">
      <aside className="w-56 border-r overflow-y-auto p-3 text-sm">
        <h3 className="font-semibold mb-2">Pipelines</h3>
        <select
          className="w-full border rounded p-1 mb-3 text-xs"
          value={pipelineId ?? ''}
          onChange={(e) => (e.target.value ? loadPipeline(e.target.value) : undefined)}
        >
          <option value="">-- load saved --</option>
          {pipelines?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {(Object.keys(NODE_TYPES) as NodeKind[]).map((kind) => (
          <div key={kind} className="mb-3">
            <h4 className="font-semibold capitalize" style={{ color: KIND_COLORS[kind] }}>
              {kind}
            </h4>
            <div className="flex flex-wrap gap-1 mt-1">
              {NODE_TYPES[kind].map((type) => (
                <button
                  key={type}
                  className="border rounded px-2 py-0.5 text-xs hover:bg-gray-100"
                  onClick={() => addNode(kind, type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 p-2 border-b">
          <input
            className="border rounded px-2 py-1 text-sm"
            value={pipelineName}
            onChange={(e) => setPipelineName(e.target.value)}
          />
          <button
            className="px-3 py-1 bg-gray-700 text-white rounded text-sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            className="px-3 py-1 bg-emerald-600 text-white rounded text-sm"
            onClick={() => compileMutation.mutate()}
            disabled={compileMutation.isPending}
          >
            View Compiled SQL
          </button>
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
          >
            Run
          </button>
          {runStatus && (
            <span className="text-sm font-semibold" style={{ color: STATUS_COLORS[runStatus.status] }}>
              {runStatus.status}
              {runStatus.error ? `: ${runStatus.error}` : ''}
            </span>
          )}
        </div>

        <div className="flex-1">
          <ReactFlow
            nodes={displayNodes}
            edges={flowEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </main>

      <aside className="w-80 border-l p-3 text-sm overflow-y-auto">
        {selectedNodeId && nodeMeta[selectedNodeId] ? (
          <div>
            <h3 className="font-semibold mb-2">
              Node: {nodeMeta[selectedNodeId].type} ({nodeMeta[selectedNodeId].kind})
            </h3>
            <label className="block text-xs mb-1">Label</label>
            <input
              className="border rounded px-2 py-1 w-full mb-2 text-xs"
              value={nodeMeta[selectedNodeId].label}
              onChange={(e) =>
                setNodeMeta((prev) => ({
                  ...prev,
                  [selectedNodeId]: { ...prev[selectedNodeId], label: e.target.value },
                }))
              }
            />
            <label className="block text-xs mb-1">Config (JSON)</label>
            <textarea
              className="border rounded w-full h-48 font-mono text-xs p-2"
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
            />
            {configError && <p className="text-red-600 text-xs mt-1">{configError}</p>}
            <div className="flex gap-2 mt-2">
              <button className="px-2 py-1 bg-gray-700 text-white rounded text-xs" onClick={applyConfig}>
                Apply
              </button>
              <button className="px-2 py-1 bg-red-600 text-white rounded text-xs" onClick={deleteSelectedNode}>
                Delete Node
              </button>
            </div>
            {runStatus?.nodes.find((r) => r.node_id === selectedNodeId) && (
              <div className="mt-3 text-xs border-t pt-2">
                <p>
                  <strong>Status:</strong> {runStatus.nodes.find((r) => r.node_id === selectedNodeId)?.status}
                </p>
                <p>
                  <strong>Row count:</strong>{' '}
                  {runStatus.nodes.find((r) => r.node_id === selectedNodeId)?.row_count ?? '-'}
                </p>
                <p>
                  <strong>Message:</strong>{' '}
                  {runStatus.nodes.find((r) => r.node_id === selectedNodeId)?.message ?? '-'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Select a node to edit its config, or a node type in the left palette to add one.</p>
        )}

        {compiledSql && (
          <div className="mt-4 border-t pt-2">
            <h4 className="font-semibold mb-1">Compiled SQL</h4>
            <pre className="bg-gray-100 p-2 text-xs whitespace-pre-wrap rounded">{compiledSql}</pre>
          </div>
        )}
      </aside>
    </div>
  )
}
