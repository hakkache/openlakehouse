import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  addEdge,
  Background,
  Connection,
  Controls,
  Edge,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  NodeChange,
  EdgeChange,
  NodeProps,
  NodeResizer,
  Panel,
  Position,
  ReactFlow,
  ReactFlowInstance,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  api,
  CompiledNode,
  NodeKind,
  NodeRunStatus,
  PipelineDefinition,
  PipelineNode,
  PipelineRunStatus,
} from '../services/api'
import { useAuth } from '../app/AuthContext'
import { buildCron, describeCron, detectSchedule, ScheduleMode, WEEKDAYS } from '../utils/cron'
import { DatabaseIcon, PlugIcon, QualityIcon, WorkflowIcon, TerminalIcon, GitBranchIcon, BeakerIcon, BoxStackIcon } from '../components/icons'

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
  variable: ['literal', 'from_query'],
  code: ['sql', 'python', 'pyspark'],
  control: ['if', 'for_each'],
  api_ingestion: ['rest_get', 'rest_post'],
  sub_pipeline: ['call'],
  dbt: ['run', 'test', 'build'],
}

const KIND_COLORS: Record<NodeKind, string> = {
  source: '#2563eb',
  transform: '#059669',
  quality: '#d97706',
  destination: '#7c3aed',
  variable: '#0891b2',
  code: '#ea580c',
  control: '#4338ca',
  api_ingestion: '#0d9488',
  sub_pipeline: '#be185d',
  dbt: '#e11d48',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#9ca3af',
  RUNNING: '#3b82f6',
  SUCCESS: '#16a34a',
  FAILED: '#dc2626',
  SKIPPED: '#6b7280',
}

const STATUS_ICON: Record<string, string> = {
  PENDING: '⏳',
  RUNNING: '⏳',
  SUCCESS: '✓',
  FAILED: '✗',
  SKIPPED: '⏭',
}

function formatRunLogTime(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleTimeString()
}

interface RunLogGroup {
  key: string
  parentNodeId: string | null
  iterationIndex: number | null
  rows: NodeRunStatus[]
}

// Groups CONSECUTIVE rows (after sorting by execution sequence) that share the same
// parent_node_id + iteration_index, so a for_each loop's body nodes for one iteration
// visually cluster together instead of being interleaved with the rest of the run.
function groupRunLogRows(nodes: NodeRunStatus[]): RunLogGroup[] {
  const sorted = [...nodes].sort(
    (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0) || a.node_id.localeCompare(b.node_id),
  )
  const groups: RunLogGroup[] = []
  for (const row of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.parentNodeId === row.parent_node_id && last.iterationIndex === row.iteration_index) {
      last.rows.push(row)
    } else {
      groups.push({
        key: `${row.parent_node_id ?? 'root'}-${row.iteration_index ?? 'x'}-${row.sequence ?? row.node_id}`,
        parentNodeId: row.parent_node_id,
        iterationIndex: row.iteration_index,
        rows: [row],
      })
    }
  }
  return groups
}

// Edges mean different things depending on which node kinds they connect:
// - `data`: both ends are basic nodes (source/transform/quality/destination) - a real
//   column-carrying CTE link, exactly like the single-SQL compiler's chain.
// - `gate`: either end is a `control` node (if/for_each) - execution-order-critical, but
//   branching/looping itself is decided by that node's own config (skip/body lists), not
//   by this edge.
// - `order`: everything else (any edge touching variable/code/api_ingestion/sub_pipeline) -
//   pure sequencing hint for the topo-sort; no data is carried through the edge itself,
//   nodes share data via the run's `variables` dict instead.
type EdgeRole = 'data' | 'gate' | 'order'

const BASIC_KINDS = new Set<NodeKind>(['source', 'transform', 'quality', 'destination'])

function classifyEdgeRole(sourceKind: NodeKind | undefined, targetKind: NodeKind | undefined): EdgeRole {
  if (!sourceKind || !targetKind) return 'order'
  if (sourceKind === 'control' || targetKind === 'control') return 'gate'
  if (BASIC_KINDS.has(sourceKind) && BASIC_KINDS.has(targetKind)) return 'data'
  return 'order'
}

const EDGE_ROLE_STYLE: Record<EdgeRole, { stroke: string; strokeWidth: number; dash?: string }> = {
  data: { stroke: '#2563eb', strokeWidth: 2 },
  gate: { stroke: '#4338ca', strokeWidth: 2, dash: '7 4' },
  order: { stroke: '#9ca3af', strokeWidth: 1.5, dash: '2 3' },
}

const EDGE_ROLE_LABEL: Record<EdgeRole, string> = {
  data: 'Data flow — columns/rows pass through this edge',
  gate: 'Control edge — ordering around an if/for_each node (branching/looping is set in that node\'s own config)',
  order: 'Order only — no data passes through this edge, it just fixes execution sequence',
}

// Mirrors backend/app/core/pipeline_executor.py's ADVANCED_KINDS - the moment any node of
// one of these kinds is present, the whole pipeline runs on the step-by-step engine.
const ADVANCED_KINDS = new Set<NodeKind>(['variable', 'code', 'control', 'api_ingestion', 'sub_pipeline', 'dbt'])
// Mirrors _render_template's call sites in _run_simple_node - only these kinds get
// `{{var}}` substitution; every other kind's config is sent completely literally.
const TEMPLATED_KINDS = new Set<NodeKind>(['variable', 'code', 'api_ingestion', 'dbt'])
const TEMPLATE_VAR_RE = /\{\{\s*(\w+)\s*\}\}/g

function collectTemplateVars(value: unknown): string[] {
  if (typeof value !== 'string') return []
  const names: string[] = []
  let m: RegExpExecArray | null
  const re = new RegExp(TEMPLATE_VAR_RE)
  while ((m = re.exec(value))) names.push(m[1])
  return names
}

// Faithful port of backend/app/core/pipeline_compiler.py's `_topo_sort`: zero-indegree
// nodes are queued in array (creation) order, and a node is only queued once ALL of its
// edge-predecessors have run - same FIFO/Kahn's-algorithm semantics, same tie-break.
function computeTopoOrder(nodeIds: string[], edges: { source: string; target: string }[]): string[] | null {
  const incoming: Record<string, Set<string>> = {}
  const outgoing: Record<string, Set<string>> = {}
  nodeIds.forEach((id) => {
    incoming[id] = new Set()
    outgoing[id] = new Set()
  })
  edges.forEach((e) => {
    if (!(e.source in incoming) || !(e.target in incoming)) return
    incoming[e.target].add(e.source)
    outgoing[e.source].add(e.target)
  })
  const ready = nodeIds.filter((id) => incoming[id].size === 0)
  const order: string[] = []
  while (ready.length > 0) {
    const id = ready.shift() as string
    order.push(id)
    Array.from(outgoing[id])
      .sort()
      .forEach((nxt) => {
        incoming[nxt].delete(id)
        if (incoming[nxt].size === 0) ready.push(nxt)
      })
  }
  return order.length === nodeIds.length ? order : null
}

const KIND_ICON: Record<NodeKind, typeof DatabaseIcon> = {
  source: DatabaseIcon,
  transform: WorkflowIcon,
  quality: QualityIcon,
  destination: PlugIcon,
  variable: BeakerIcon,
  code: TerminalIcon,
  control: GitBranchIcon,
  api_ingestion: PlugIcon,
  sub_pipeline: BoxStackIcon,
  dbt: BoxStackIcon,
}

const KIND_NODE_STYLES: Record<NodeKind, { border: string; bg: string; iconBg: string }> = {
  source: { border: 'border-blue-300', bg: 'bg-blue-50/80', iconBg: 'bg-blue-600' },
  transform: { border: 'border-emerald-300', bg: 'bg-emerald-50/80', iconBg: 'bg-emerald-600' },
  quality: { border: 'border-amber-300', bg: 'bg-amber-50/80', iconBg: 'bg-amber-500' },
  destination: { border: 'border-violet-300', bg: 'bg-violet-50/80', iconBg: 'bg-violet-600' },
  variable: { border: 'border-cyan-300', bg: 'bg-cyan-50/80', iconBg: 'bg-cyan-600' },
  code: { border: 'border-orange-300', bg: 'bg-orange-50/80', iconBg: 'bg-orange-600' },
  control: { border: 'border-indigo-300', bg: 'bg-indigo-50/80', iconBg: 'bg-indigo-600' },
  api_ingestion: { border: 'border-teal-300', bg: 'bg-teal-50/80', iconBg: 'bg-teal-600' },
  sub_pipeline: { border: 'border-pink-300', bg: 'bg-pink-50/80', iconBg: 'bg-pink-600' },
  dbt: { border: 'border-rose-300', bg: 'bg-rose-50/80', iconBg: 'bg-rose-600' },
}

interface PipelineNodeData extends Record<string, unknown> {
  kind: NodeKind
  nodeType: string
  label: string
  status?: string
  order?: number
  loopBody?: boolean
  warnings?: string[]
}

// Custom React Flow node: a colored card per node "kind" (source/transform/quality/
// destination) with an icon, type/kind labels, and a run-status badge - replaces the
// plain single-colored-border box used previously.
function PipelineFlowNode({ data, selected }: NodeProps) {
  const d = data as PipelineNodeData
  const styles = KIND_NODE_STYLES[d.kind]
  const Icon = KIND_ICON[d.kind]
  const statusColor = d.status ? STATUS_COLORS[d.status] : undefined
  const warnings = d.warnings ?? []
  return (
    <div
      className={`relative min-w-[170px] rounded-xl border-2 ${styles.border} ${styles.bg} shadow-sm transition-shadow ${
        selected ? 'shadow-md ring-2 ring-slate-400 ring-offset-1' : ''
      }`}
      style={statusColor ? { boxShadow: `0 0 0 3px ${statusColor}` } : undefined}
    >
      {(d.order || d.loopBody) && (
        <span
          className="absolute -left-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-slate-700 px-1 text-[9px] font-semibold text-white"
          title={d.loopBody ? 'Runs inside a for_each loop body (position = body_node_ids list order)' : `Execution position ${d.order}`}
        >
          {d.loopBody ? '↻' : d.order}
        </span>
      )}
      {warnings.length > 0 && (
        <span
          className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white"
          title={warnings.join('\n')}
        >
          !
        </span>
      )}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !bg-white"
        style={{ borderColor: KIND_COLORS[d.kind] }}
      />
      <div className="flex items-center gap-2 px-3 py-2">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white ${styles.iconBg}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-800">{d.label}</p>
          <p className="truncate text-[10px] uppercase tracking-wide text-slate-400">{d.kind}</p>
        </div>
        {d.status && (
          <span className="ml-auto shrink-0 text-sm" style={{ color: STATUS_COLORS[d.status] }} title={d.status}>
            {STATUS_ICON[d.status]}
          </span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !bg-white"
        style={{ borderColor: KIND_COLORS[d.kind] }}
      />
    </div>
  )
}

// A for_each/if control node renders as a big resizable "frame" instead of a small card -
// other nodes are added to its loop body / true-false branches by dragging them onto its
// canvas area (see computeContainment below), instead of hand-typing node ids into a list.
const FRAME_HEADER_HEIGHT = 34
const DEFAULT_FRAME_SIZE = { width: 460, height: 260 }

interface FrameNodeData extends Record<string, unknown> {
  kind: NodeKind
  nodeType: string
  label: string
  width: number
  height: number
  memberCount?: number
  onResize?: (nodeId: string, width: number, height: number) => void
}

function LoopFrameNode({ id, data, selected }: NodeProps) {
  const d = data as FrameNodeData
  return (
    <div
      className="relative rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50/30"
      style={{ width: d.width, height: d.height }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={260}
        minHeight={140}
        handleClassName="!h-2.5 !w-2.5 !bg-indigo-600 !border-indigo-700"
        lineClassName="!border-indigo-400"
        onResizeEnd={(_e, params) => d.onResize?.(id, params.width, params.height)}
      />
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-2 !bg-white" style={{ borderColor: KIND_COLORS.control }} />
      <div
        className="flex items-center gap-1.5 rounded-t-lg border-b-2 border-dashed border-indigo-300 bg-indigo-100/80 px-2"
        style={{ height: FRAME_HEADER_HEIGHT }}
      >
        <GitBranchIcon className="h-3.5 w-3.5 shrink-0 text-indigo-700" />
        <span className="truncate text-xs font-semibold text-indigo-800">{d.label}</span>
        <span className="ml-auto shrink-0 text-[10px] text-indigo-500">
          for_each — {d.memberCount ?? 0} node{d.memberCount === 1 ? '' : 's'} in body
        </span>
      </div>
      {(d.memberCount ?? 0) === 0 && (
        <p className="pointer-events-none absolute inset-x-0 top-10 text-center text-[11px] text-indigo-400">
          Drag nodes in here to run them once per loop iteration
        </p>
      )}
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-2 !bg-white" style={{ borderColor: KIND_COLORS.control }} />
    </div>
  )
}

function BranchFrameNode({ id, data, selected }: NodeProps) {
  const d = data as FrameNodeData
  return (
    <div
      className="relative rounded-xl border-2 border-dashed border-indigo-400 bg-white/40"
      style={{ width: d.width, height: d.height }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={320}
        minHeight={160}
        handleClassName="!h-2.5 !w-2.5 !bg-indigo-600 !border-indigo-700"
        lineClassName="!border-indigo-400"
        onResizeEnd={(_e, params) => d.onResize?.(id, params.width, params.height)}
      />
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-2 !bg-white" style={{ borderColor: KIND_COLORS.control }} />
      <div
        className="flex items-center gap-1.5 rounded-t-lg border-b-2 border-dashed border-indigo-300 bg-indigo-100/80 px-2"
        style={{ height: FRAME_HEADER_HEIGHT }}
      >
        <GitBranchIcon className="h-3.5 w-3.5 shrink-0 text-indigo-700" />
        <span className="truncate text-xs font-semibold text-indigo-800">{d.label}</span>
      </div>
      <div
        className="absolute bottom-0 left-1/2 w-0 border-l-2 border-dashed border-indigo-300"
        style={{ top: FRAME_HEADER_HEIGHT }}
      />
      <p className="pointer-events-none absolute left-2 text-[10px] font-semibold text-emerald-600" style={{ top: FRAME_HEADER_HEIGHT + 4 }}>
        TRUE branch
      </p>
      <p className="pointer-events-none absolute right-2 text-right text-[10px] font-semibold text-rose-600" style={{ top: FRAME_HEADER_HEIGHT + 4 }}>
        FALSE branch
      </p>
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-2 !bg-white" style={{ borderColor: KIND_COLORS.control }} />
    </div>
  )
}

const FLOW_NODE_TYPES = { pipelineNode: PipelineFlowNode, loopFrameNode: LoopFrameNode, branchFrameNode: BranchFrameNode }

function isFrameNode(node: Node): boolean {
  return node.type === 'loopFrameNode' || node.type === 'branchFrameNode'
}

function frameKindOf(node: { kind: NodeKind; type: string }): 'loop' | 'branch' | null {
  if (node.kind === 'control' && node.type === 'for_each') return 'loop'
  if (node.kind === 'control' && node.type === 'if') return 'branch'
  return null
}

function frameInteriorRect(frame: Node): { x: number; y: number; width: number; height: number } {
  const d = frame.data as FrameNodeData
  const width = d.width ?? DEFAULT_FRAME_SIZE.width
  const height = d.height ?? DEFAULT_FRAME_SIZE.height
  return { x: frame.position.x, y: frame.position.y + FRAME_HEADER_HEIGHT, width, height: Math.max(0, height - FRAME_HEADER_HEIGHT) }
}

function isPointInRect(x: number, y: number, rect: { x: number; y: number; width: number; height: number }): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
}

// Which frame (if any) visually "contains" each non-frame node, based on its top-left
// canvas position falling inside the frame's interior rectangle - this is the sole source
// of truth for a for_each's body / an if's true-false branches, computed live from the
// canvas instead of a hand-typed id list.
function computeContainment(nodes: Node[]): Record<string, string> {
  const frames = nodes.filter(isFrameNode)
  const membership: Record<string, string> = {}
  nodes.forEach((n) => {
    if (isFrameNode(n)) return
    for (const frame of frames) {
      if (isPointInRect(n.position.x, n.position.y, frameInteriorRect(frame))) {
        membership[n.id] = frame.id
        break
      }
    }
  })
  return membership
}

function laneOf(node: Node, frame: Node): 'true' | 'false' {
  const rect = frameInteriorRect(frame)
  return node.position.x < rect.x + rect.width / 2 ? 'true' : 'false'
}

// On load, older/hand-edited pipelines may reference body/skip node ids that aren't
// geometrically inside their frame yet (e.g. edited via raw JSON) - snap those into place
// (stacked inside the frame, split left/right for if-branches) so the canvas always
// visually matches the saved logical config.
function layoutFrameMembers(nodes: Node[], meta: Record<string, PipelineNode>): Node[] {
  const membership = computeContainment(nodes)
  const nodesById: Record<string, Node> = {}
  nodes.forEach((n) => (nodesById[n.id] = n))
  const updated = [...nodes]
  const indexById: Record<string, number> = {}
  updated.forEach((n, i) => (indexById[n.id] = i))
  const stackCounters: Record<string, number> = {}

  function place(frameId: string, childId: string, lane?: 'true' | 'false') {
    const frame = nodesById[frameId]
    const child = nodesById[childId]
    if (!frame || !child || membership[childId] === frameId) return
    const rect = frameInteriorRect(frame)
    const slot = stackCounters[frameId] ?? 0
    stackCounters[frameId] = slot + 1
    const x = frame.position.x + (lane === 'false' ? rect.width / 2 + 10 : 10)
    const y = rect.y + 10 + slot * 56
    const idx = indexById[childId]
    updated[idx] = { ...child, position: { x, y } }
    nodesById[childId] = updated[idx]
  }

  Object.values(meta).forEach((n) => {
    if (n.kind === 'control' && n.type === 'for_each') {
      ;((n.config?.body_node_ids as string[] | undefined) ?? []).forEach((childId) => place(n.id, childId))
    } else if (n.kind === 'control' && n.type === 'if') {
      ;((n.config?.false_skip_nodes as string[] | undefined) ?? []).forEach((childId) => place(n.id, childId, 'true'))
      ;((n.config?.true_skip_nodes as string[] | undefined) ?? []).forEach((childId) => place(n.id, childId, 'false'))
    }
  })

  return updated
}

type FieldKind = 'text' | 'textarea' | 'number' | 'list' | 'dict' | 'node-ref' | 'select' | 'schema-select' | 'table-select'

interface FieldSpec {
  key: string
  label: string
  kind: FieldKind
  placeholder?: string
  options?: string[]
}

// Structured form fields for node types the compiler actually executes (see
// pipeline_compiler.py). Types with no entry here fall back to a raw-JSON editor.
const FIELD_SPECS: Record<string, FieldSpec[]> = {
  'source:iceberg_table': [
    { key: 'schema', label: 'Schema', kind: 'schema-select' },
    { key: 'table', label: 'Table', kind: 'table-select' },
  ],
  'transform:select': [
    { key: 'columns', label: 'Columns to keep', kind: 'list', placeholder: 'order_id, customer_id, amount' },
  ],
  'transform:rename': [
    { key: 'mapping', label: 'Rename (old column → new name)', kind: 'dict', placeholder: 'new name' },
    { key: 'keep', label: 'Other columns to keep as-is', kind: 'list' },
  ],
  'transform:filter': [{ key: 'condition', label: 'WHERE condition', kind: 'text', placeholder: 'amount > 100' }],
  'transform:join': [
    { key: 'right_node', label: 'Join with', kind: 'node-ref' },
    { key: 'join_type', label: 'Join type', kind: 'select', options: ['inner', 'left', 'right', 'full'] },
    { key: 'on', label: 'ON condition', kind: 'text', placeholder: 'a.customer_id = b.customer_id' },
  ],
  'transform:union': [{ key: 'union_node', label: 'Union with', kind: 'node-ref' }],
  'transform:aggregate': [
    { key: 'group_by', label: 'Group by columns', kind: 'list', placeholder: 'customer_id' },
    {
      key: 'aggregations',
      label: 'Aggregations (column → function)',
      kind: 'dict',
      placeholder: 'sum / count / avg / min / max',
    },
  ],
  'transform:sort': [{ key: 'columns', label: 'Sort by columns', kind: 'list', placeholder: 'created_at' }],
  'transform:deduplicate': [{ key: 'columns', label: 'Key columns (blank = full-row DISTINCT)', kind: 'list' }],
  'transform:cast': [
    { key: 'casts', label: 'Casts (column → type)', kind: 'dict', placeholder: 'VARCHAR / BIGINT / TIMESTAMP' },
    { key: 'keep', label: 'Other columns to keep as-is', kind: 'list' },
  ],
  'transform:fill_null': [
    { key: 'fills', label: 'Fill defaults (column → default expr)', kind: 'dict' },
    { key: 'keep', label: 'Other columns to keep as-is', kind: 'list' },
  ],
  'transform:replace': [
    { key: 'column', label: 'Column', kind: 'text' },
    { key: 'cases', label: 'Value replacements (old → new)', kind: 'dict' },
    { key: 'keep', label: 'Other columns to keep as-is', kind: 'list' },
  ],
  'transform:derived_column': [
    { key: 'name', label: 'New column name', kind: 'text' },
    { key: 'expression', label: 'SQL expression', kind: 'text', placeholder: 'amount * 1.1' },
  ],
  'transform:window': [
    { key: 'name', label: 'New column name', kind: 'text' },
    {
      key: 'expression',
      label: 'SQL window expression',
      kind: 'text',
      placeholder: 'ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at)',
    },
  ],
  'transform:pivot': [
    { key: 'group_by', label: 'Group by columns', kind: 'list' },
    { key: 'pivot_column', label: 'Pivot column', kind: 'text' },
    { key: 'value_column', label: 'Value column', kind: 'text' },
    { key: 'values', label: 'Pivot values', kind: 'list' },
    { key: 'agg', label: 'Aggregation', kind: 'select', options: ['sum', 'count', 'avg', 'min', 'max'] },
  ],
  'transform:unpivot': [
    { key: 'id_columns', label: 'ID columns', kind: 'list' },
    { key: 'value_columns', label: 'Value columns to unpivot', kind: 'list' },
    { key: 'key_name', label: 'Key column name', kind: 'text', placeholder: 'key' },
    { key: 'value_name', label: 'Value column name', kind: 'text', placeholder: 'value' },
  ],
  'quality:not_null': [{ key: 'columns', label: 'Columns that must not be null', kind: 'list' }],
  'quality:unique': [{ key: 'columns', label: 'Columns that must be unique together', kind: 'list' }],
  'quality:range': [
    { key: 'column', label: 'Column', kind: 'text' },
    { key: 'min', label: 'Min (optional)', kind: 'number' },
    { key: 'max', label: 'Max (optional)', kind: 'number' },
  ],
  'quality:regex': [
    { key: 'column', label: 'Column', kind: 'text' },
    { key: 'pattern', label: 'Regex pattern', kind: 'text', placeholder: '^[A-Za-z0-9]+$' },
  ],
  'quality:freshness': [
    { key: 'column', label: 'Timestamp column', kind: 'text' },
    { key: 'max_age_minutes', label: 'Max age (minutes)', kind: 'number' },
  ],
  'quality:row_count': [],
  'destination:iceberg_bronze': [{ key: 'table', label: 'Table name', kind: 'text', placeholder: 'orders' }],
  'destination:iceberg_silver': [{ key: 'table', label: 'Table name', kind: 'text', placeholder: 'orders_clean' }],
  'destination:iceberg_gold': [{ key: 'table', label: 'Table name', kind: 'text', placeholder: 'daily_sales' }],
  'variable:literal': [
    { key: 'name', label: 'Variable name', kind: 'text', placeholder: 'my_var' },
    { key: 'value', label: 'Value (supports {{other_var}})', kind: 'text' },
  ],
  'variable:from_query': [
    { key: 'name', label: 'Variable name', kind: 'text', placeholder: 'my_var' },
    { key: 'query', label: 'SQL query (first cell of first row is stored)', kind: 'textarea' },
  ],
  'code:sql': [
    { key: 'query', label: 'SQL query (supports {{var}})', kind: 'textarea' },
    { key: 'result_variable', label: 'Store first result cell into variable (optional)', kind: 'text' },
  ],
  'code:python': [{ key: 'code', label: 'Python code (variables dict available)', kind: 'textarea' }],
  'code:pyspark': [{ key: 'code', label: 'PySpark code (spark, sc, variables available)', kind: 'textarea' }],
  'control:if': [
    { key: 'condition', label: 'Condition (Python expr over variables)', kind: 'text', placeholder: 'row_count > 0' },
  ],
  'control:for_each': [
    { key: 'items_variable', label: 'List variable to iterate', kind: 'text' },
    { key: 'item_variable', label: 'Loop item variable name', kind: 'text', placeholder: 'item' },
  ],
  'api_ingestion:rest_get': [
    { key: 'url', label: 'URL (supports {{var}})', kind: 'text' },
    { key: 'headers', label: 'Headers', kind: 'dict' },
    { key: 'result_variable', label: 'Store JSON response into variable', kind: 'text' },
  ],
  'api_ingestion:rest_post': [
    { key: 'url', label: 'URL (supports {{var}})', kind: 'text' },
    { key: 'headers', label: 'Headers', kind: 'dict' },
    { key: 'result_variable', label: 'Store JSON response into variable', kind: 'text' },
  ],
  'sub_pipeline:call': [
    { key: 'pipeline_id', label: 'Pipeline to call (ID)', kind: 'text' },
    { key: 'pass_variables', label: 'Share variables with sub-pipeline (true/false)', kind: 'text' },
  ],
  'dbt:run': [
    { key: 'select', label: 'dbt --select (model/tag, supports {{var}})', kind: 'text', placeholder: 'stg_olist_orders or tag:marts' },
    { key: 'full_refresh', label: 'Full refresh (true/false)', kind: 'text', placeholder: 'false' },
  ],
  'dbt:test': [
    { key: 'select', label: 'dbt --select (model/tag, supports {{var}})', kind: 'text', placeholder: 'stg_olist_orders or tag:marts' },
  ],
  'dbt:build': [
    { key: 'select', label: 'dbt --select (model/tag, supports {{var}})', kind: 'text', placeholder: 'stg_olist_orders or tag:marts' },
    { key: 'full_refresh', label: 'Full refresh (true/false)', kind: 'text', placeholder: 'false' },
  ],
}

const NODE_DESCRIPTIONS: Record<string, string> = {
  iceberg_table: 'Read all rows from an existing Iceberg table.',
  select: 'Keep only the listed columns.',
  rename: 'Rename columns and/or pass others through unchanged.',
  filter: 'Keep only rows matching a SQL WHERE condition.',
  join: 'Join with another node in this pipeline.',
  union: 'Stack rows from another node on top of this one (UNION ALL).',
  aggregate: 'Group rows and compute aggregate functions.',
  sort: 'Order rows by one or more columns.',
  deduplicate: 'Remove duplicate rows, optionally by key columns.',
  cast: 'Change the SQL type of one or more columns.',
  fill_null: 'Replace NULLs in a column with a default value.',
  replace: 'Replace specific values in a column (like CASE WHEN).',
  derived_column: 'Add a new column computed from a SQL expression.',
  window: 'Add a new column computed from a SQL window function.',
  pivot: 'Turn row values into columns.',
  unpivot: 'Turn columns into rows.',
  not_null: 'Fail if any listed column contains NULL.',
  unique: 'Fail if the column combination has duplicate values.',
  range: 'Fail if a numeric column falls outside min/max.',
  regex: 'Fail if a column does not match a regex pattern.',
  schema: 'Not yet supported by the compiler.',
  freshness: 'Fail if the newest timestamp is older than a threshold.',
  row_count: 'Report the row count reaching this point (no failure condition).',
  minio: 'Not yet supported by the compiler.',
  iceberg_bronze: 'Write results into the bronze Iceberg schema.',
  iceberg_silver: 'Write results into the silver Iceberg schema.',
  iceberg_gold: 'Write results into the gold Iceberg schema.',
  postgresql: 'Not yet supported by the compiler.',
  kafka: 'Not yet supported by the compiler.',
  literal: 'Set a variable to a literal value (supports {{other_var}} substitution).',
  from_query: 'Set a variable from the first cell of a SQL query result.',
  sql: 'Run an arbitrary SQL statement (supports {{var}} substitution).',
  python: 'Run arbitrary Python code with a shared `variables` dict.',
  pyspark: 'Run arbitrary PySpark code (shared Spark session + `variables` dict).',
  if: 'Skip a configured list of node ids depending on a condition.',
  for_each: 'Loop over a list variable, re-running a set of body nodes per item.',
  rest_get: 'Call a REST API (GET) and store the JSON response into a variable.',
  rest_post: 'Call a REST API (POST) and store the JSON response into a variable.',
  call: 'Run another saved pipeline inline, as part of this run.',
  run: 'Run dbt models matching --select (build tables/views in Trino).',
  test: 'Run dbt tests matching --select (fails the pipeline if any test fails).',
  build: 'Run + test dbt models matching --select, in dependency order.',
}

const SQL_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'AS', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'ON', 'GROUP', 'BY',
  'ORDER', 'WITH', 'UNION', 'ALL', 'CREATE', 'TABLE', 'IF', 'NOT', 'EXISTS', 'INSERT', 'INTO', 'CAST',
  'COALESCE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  'ROW_NUMBER', 'OVER', 'PARTITION', 'LIMIT', 'IS', 'NULL', 'INTERVAL', 'CURRENT_TIMESTAMP',
])

function SqlPreview({ sql }: { sql: string }) {
  const tokens = sql.split(/(\s+|[(),])/)
  return (
    <>
      {tokens.map((tok, i) => (
        <span key={i} className={SQL_KEYWORDS.has(tok.toUpperCase()) ? 'text-sky-400 font-semibold' : undefined}>
          {tok}
        </span>
      ))}
    </>
  )
}

let nodeCounter = 0
function nextNodeId(kind: NodeKind) {
  nodeCounter += 1
  return `${kind}_${Date.now()}_${nodeCounter}`
}

function toFlowNode(node: PipelineNode): Node {
  const frame = frameKindOf(node)
  if (frame) {
    const width = (node.config?.__frame_width as number | undefined) ?? DEFAULT_FRAME_SIZE.width
    const height = (node.config?.__frame_height as number | undefined) ?? DEFAULT_FRAME_SIZE.height
    return {
      id: node.id,
      type: frame === 'loop' ? 'loopFrameNode' : 'branchFrameNode',
      position: node.position,
      style: { width, height },
      zIndex: -1,
      data: { kind: node.kind, nodeType: node.type, label: node.label || node.type, width, height },
    }
  }
  return {
    id: node.id,
    type: 'pipelineNode',
    position: node.position,
    data: { kind: node.kind, nodeType: node.type, label: node.label || node.type },
  }
}

interface DictRow {
  k: string
  v: string
}

function objectToRows(obj: Record<string, unknown> | undefined): DictRow[] {
  return Object.entries(obj ?? {}).map(([k, v]) => ({ k, v: String(v) }))
}

function rowsToObject(rows: DictRow[]): Record<string, string> {
  const obj: Record<string, string> = {}
  rows.forEach((r) => {
    if (r.k.trim()) obj[r.k.trim()] = r.v
  })
  return obj
}

function DictRowsEditor({
  rows,
  onRowsChange,
  valuePlaceholder,
}: {
  rows: DictRow[]
  onRowsChange: (rows: DictRow[]) => void
  valuePlaceholder?: string
}) {
  return (
    <div>
      {rows.map((row, i) => (
        <div key={i} className="flex gap-1 mb-1">
          <input
            className="border rounded px-2 py-1 w-1/2 text-xs"
            placeholder="key"
            value={row.k}
            onChange={(e) => {
              const next = [...rows]
              next[i] = { ...next[i], k: e.target.value }
              onRowsChange(next)
            }}
          />
          <input
            className="border rounded px-2 py-1 w-1/2 text-xs"
            placeholder={valuePlaceholder ?? 'value'}
            value={row.v}
            onChange={(e) => {
              const next = [...rows]
              next[i] = { ...next[i], v: e.target.value }
              onRowsChange(next)
            }}
          />
          <button
            type="button"
            className="text-red-600 text-xs px-1"
            onClick={() => onRowsChange(rows.filter((_, idx) => idx !== i))}
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="text-xs text-blue-600" onClick={() => onRowsChange([...rows, { k: '', v: '' }])}>
        + Add
      </button>
    </div>
  )
}

export default function PipelinesPage() {
  const queryClient = useQueryClient()
  const { authenticated, login } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const autoLoadedPipelineRef = useRef(false)

  const [pipelineId, setPipelineId] = useState<string | null>(null)
  const [pipelineName, setPipelineName] = useState('untitled_pipeline')
  const [nodeMeta, setNodeMeta] = useState<Record<string, PipelineNode>>({})
  const [flowNodes, setFlowNodes] = useState<Node[]>([])
  const [flowEdges, setFlowEdges] = useState<Edge[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [configText, setConfigText] = useState('{}')
  const [configError, setConfigError] = useState<string | null>(null)
  const [compiledSql, setCompiledSql] = useState<string | null>(null)
  const [previewNodes, setPreviewNodes] = useState<CompiledNode[] | null>(null)
  const [runStatus, setRunStatus] = useState<PipelineRunStatus | null>(null)
  const runStreamAbortRef = useRef<AbortController | null>(null)
  const [showRunLog, setShowRunLog] = useState(false)

  const { data: pipelines } = useQuery({
    queryKey: ['pipelines'],
    queryFn: api.listPipelines,
    enabled: authenticated,
  })

  const [actionError, setActionError] = useState<string | null>(null)
  const [nodeSearch, setNodeSearch] = useState('')
  const [pipelineSearch, setPipelineSearch] = useState('')
  const [schedule, setSchedule] = useState('')
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('off')
  const [scheduleMinute, setScheduleMinute] = useState(0)
  const [scheduleTime, setScheduleTime] = useState('03:00')
  const [scheduleDay, setScheduleDay] = useState(1)
  const [parameterRows, setParameterRows] = useState<DictRow[]>([])
  const [fieldDrafts, setFieldDrafts] = useState<Record<string, string>>({})
  const [dictRows, setDictRows] = useState<Record<string, DictRow[]>>({})

  const selectedNode = selectedNodeId ? nodeMeta[selectedNodeId] : null
  const selectedSpecKey = selectedNode ? `${selectedNode.kind}:${selectedNode.type}` : ''
  const selectedSpecs = FIELD_SPECS[selectedSpecKey]

  const { data: icebergSchemas } = useQuery({
    queryKey: ['catalog-schemas', 'iceberg'],
    queryFn: () => api.listSchemas('iceberg'),
    enabled: authenticated && selectedNode?.type === 'iceberg_table',
  })
  const selectedSchemaValue = (selectedNode?.config.schema as string | undefined) ?? ''
  const { data: icebergTables } = useQuery({
    queryKey: ['catalog-tables', 'iceberg', selectedSchemaValue],
    queryFn: () => api.listTables('iceberg', selectedSchemaValue),
    enabled: authenticated && selectedNode?.type === 'iceberg_table' && !!selectedSchemaValue,
  })

  function draftKey(nodeId: string, key: string) {
    return `${nodeId}:${key}`
  }

  function updateNodeConfig(nodeId: string, key: string, value: unknown) {
    setNodeMeta((prev) => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], config: { ...prev[nodeId].config, [key]: value } },
    }))
  }

  function getListDraft(nodeId: string, key: string, config: Record<string, unknown>) {
    const dk = draftKey(nodeId, key)
    if (fieldDrafts[dk] !== undefined) return fieldDrafts[dk]
    return ((config[key] as string[] | undefined) ?? []).join(', ')
  }

  function setListValue(nodeId: string, key: string, text: string) {
    setFieldDrafts((prev) => ({ ...prev, [draftKey(nodeId, key)]: text }))
    const values = text
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
    updateNodeConfig(nodeId, key, values)
  }

  function getDictRows(nodeId: string, key: string, config: Record<string, unknown>) {
    const dk = draftKey(nodeId, key)
    if (dictRows[dk]) return dictRows[dk]
    return objectToRows(config[key] as Record<string, unknown> | undefined)
  }

  function commitDictRows(nodeId: string, key: string, rows: DictRow[]) {
    setDictRows((prev) => ({ ...prev, [draftKey(nodeId, key)]: rows }))
    updateNodeConfig(nodeId, key, rowsToObject(rows))
  }

  function renderField(spec: FieldSpec) {
    if (!selectedNodeId || !selectedNode) return null
    const nodeId = selectedNodeId
    const config = selectedNode.config
    const value = config[spec.key]

    if (spec.kind === 'text') {
      return (
        <div key={spec.key} className="mb-2">
          <label className="block text-xs mb-1">{spec.label}</label>
          <input
            className="border rounded px-2 py-1 w-full text-xs"
            placeholder={spec.placeholder}
            value={(value as string | undefined) ?? ''}
            onChange={(e) => updateNodeConfig(nodeId, spec.key, e.target.value)}
          />
        </div>
      )
    }
    if (spec.kind === 'textarea') {
      return (
        <div key={spec.key} className="mb-2">
          <label className="block text-xs mb-1">{spec.label}</label>
          <textarea
            className="border rounded px-2 py-1 w-full h-28 font-mono text-xs"
            placeholder={spec.placeholder}
            spellCheck={false}
            value={(value as string | undefined) ?? ''}
            onChange={(e) => updateNodeConfig(nodeId, spec.key, e.target.value)}
          />
        </div>
      )
    }
    if (spec.kind === 'number') {
      return (
        <div key={spec.key} className="mb-2">
          <label className="block text-xs mb-1">{spec.label}</label>
          <input
            type="number"
            className="border rounded px-2 py-1 w-full text-xs"
            value={value === undefined || value === null ? '' : (value as number)}
            onChange={(e) =>
              updateNodeConfig(nodeId, spec.key, e.target.value === '' ? undefined : Number(e.target.value))
            }
          />
        </div>
      )
    }
    if (spec.kind === 'select') {
      return (
        <div key={spec.key} className="mb-2">
          <label className="block text-xs mb-1">{spec.label}</label>
          <select
            className="border rounded px-2 py-1 w-full text-xs"
            value={(value as string | undefined) ?? ''}
            onChange={(e) => updateNodeConfig(nodeId, spec.key, e.target.value)}
          >
            <option value="">-- select --</option>
            {spec.options?.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      )
    }
    if (spec.kind === 'list') {
      return (
        <div key={spec.key} className="mb-2">
          <label className="block text-xs mb-1">{spec.label}</label>
          <input
            className="border rounded px-2 py-1 w-full text-xs"
            placeholder={spec.placeholder ?? 'comma-separated'}
            value={getListDraft(nodeId, spec.key, config)}
            onChange={(e) => setListValue(nodeId, spec.key, e.target.value)}
          />
        </div>
      )
    }
    if (spec.kind === 'node-ref') {
      const options = flowNodes.filter((n) => n.id !== nodeId)
      return (
        <div key={spec.key} className="mb-2">
          <label className="block text-xs mb-1">{spec.label}</label>
          <select
            className="border rounded px-2 py-1 w-full text-xs"
            value={(value as string | undefined) ?? ''}
            onChange={(e) => updateNodeConfig(nodeId, spec.key, e.target.value)}
          >
            <option value="">-- select node --</option>
            {options.map((n) => (
              <option key={n.id} value={n.id}>
                {nodeMeta[n.id]?.label || nodeMeta[n.id]?.type} ({n.id})
              </option>
            ))}
          </select>
        </div>
      )
    }
    if (spec.kind === 'schema-select') {
      return (
        <div key={spec.key} className="mb-2">
          <label className="block text-xs mb-1">{spec.label}</label>
          <select
            className="border rounded px-2 py-1 w-full text-xs"
            value={(value as string | undefined) ?? ''}
            onChange={(e) => updateNodeConfig(nodeId, spec.key, e.target.value)}
          >
            <option value="">-- select schema --</option>
            {icebergSchemas?.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )
    }
    if (spec.kind === 'table-select') {
      const schemaChosen = !!(config.schema as string | undefined)
      return (
        <div key={spec.key} className="mb-2">
          <label className="block text-xs mb-1">{spec.label}</label>
          <select
            className="border rounded px-2 py-1 w-full text-xs"
            value={(value as string | undefined) ?? ''}
            onChange={(e) => updateNodeConfig(nodeId, spec.key, e.target.value)}
            disabled={!schemaChosen}
          >
            <option value="">{schemaChosen ? '-- select table --' : 'select a schema first'}</option>
            {icebergTables?.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      )
    }
    if (spec.kind === 'dict') {
      return (
        <div key={spec.key} className="mb-2">
          <label className="block text-xs mb-1">{spec.label}</label>
          <DictRowsEditor
            rows={getDictRows(nodeId, spec.key, config)}
            onRowsChange={(rows) => commitDictRows(nodeId, spec.key, rows)}
            valuePlaceholder={spec.placeholder}
          />
        </div>
      )
    }
    return null
  }

  function resetCanvas() {
    setPipelineId(null)
    setPipelineName('untitled_pipeline')
    setNodeMeta({})
    setFlowNodes([])
    setFlowEdges([])
    setSelectedNodeId(null)
    setConfigText('{}')
    setConfigError(null)
    setCompiledSql(null)
    setPreviewNodes(null)
    setRunStatus(null)
    setSchedule('')
    setScheduleMode('off')
    setScheduleMinute(0)
    setScheduleTime('03:00')
    setScheduleDay(1)
    setParameterRows([])
    setActionError(null)
  }

  function handleScheduleModeChange(mode: ScheduleMode) {
    setScheduleMode(mode)
    if (mode === 'off') setSchedule('')
    else if (mode !== 'custom') setSchedule(buildCron(mode, scheduleMinute, scheduleTime, scheduleDay))
  }

  function handleScheduleMinuteChange(minute: number) {
    setScheduleMinute(minute)
    if (scheduleMode === 'hourly') setSchedule(buildCron('hourly', minute, scheduleTime, scheduleDay))
  }

  function handleScheduleTimeChange(time: string) {
    setScheduleTime(time)
    if (scheduleMode === 'daily' || scheduleMode === 'weekly') {
      setSchedule(buildCron(scheduleMode, scheduleMinute, time, scheduleDay))
    }
  }

  function handleScheduleDayChange(day: number) {
    setScheduleDay(day)
    if (scheduleMode === 'weekly') setSchedule(buildCron('weekly', scheduleMinute, scheduleTime, day))
  }

  function handleNewPipeline() {
    if (flowNodes.length > 0 && !window.confirm('Start a new pipeline? Unsaved changes will be lost.')) return
    resetCanvas()
  }

  function handleDuplicatePipeline() {
    if (!pipelineId) return
    setPipelineId(null)
    setPipelineName(`${pipelineName}_copy`)
    setRunStatus(null)
    setActionError(null)
  }

  const deletePipelineMutation = useMutation({
    mutationFn: (id: string) => api.deletePipeline(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      resetCanvas()
    },
    onError: (err: unknown) => setActionError(`Delete failed: ${(err as Error).message}`),
  })

  function handleDeletePipeline() {
    if (!pipelineId) return
    if (!window.confirm(`Delete pipeline "${pipelineName}"? This cannot be undone.`)) return
    deletePipelineMutation.mutate(pipelineId)
  }

  function buildDefinition(): PipelineDefinition {
    const membership = computeContainment(flowNodes)
    return {
      id: pipelineId,
      name: pipelineName,
      version: 1,
      nodes: flowNodes.map((n) => {
        const meta = nodeMeta[n.id]
        let config = meta?.config ?? {}
        if (meta?.kind === 'control' && meta.type === 'for_each') {
          const bodyIds = flowNodes
            .filter((m) => membership[m.id] === n.id)
            .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
            .map((m) => m.id)
          config = { ...config, body_node_ids: bodyIds }
        } else if (meta?.kind === 'control' && meta.type === 'if') {
          const trueLane: string[] = []
          const falseLane: string[] = []
          flowNodes
            .filter((m) => membership[m.id] === n.id)
            .forEach((m) => (laneOf(m, n) === 'true' ? trueLane : falseLane).push(m.id))
          // A node placed on the TRUE side must be skipped when the condition is FALSE, and
          // vice versa - matches the backend's true_skip_nodes/false_skip_nodes semantics.
          config = { ...config, false_skip_nodes: trueLane, true_skip_nodes: falseLane }
        }
        return { ...meta, config, position: { x: n.position.x, y: n.position.y } }
      }),
      edges: flowEdges.map((e) => ({ id: e.id!, source: e.source, target: e.target })),
      parameters: rowsToObject(parameterRows),
      schedule: schedule.trim() ? schedule.trim() : null,
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
      setActionError(null)
    },
    onError: (err: unknown) => setActionError(`Save failed: ${(err as Error).message}`),
  })

  const compileMutation = useMutation({
    mutationFn: () => api.compilePipelineDefinition(buildDefinition()),
    onSuccess: (result) => {
      if (result.mode === 'advanced') {
        setCompiledSql(null)
        setPreviewNodes(result.nodes)
      } else {
        setCompiledSql(result.full_sql)
        setPreviewNodes(null)
      }
      setActionError(null)
    },
    onError: (err: unknown) => {
      setPreviewNodes(null)
      setCompiledSql(`-- Compile error: ${(err as Error).message}`)
    },
  })

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!pipelineId) throw new Error('Save the pipeline before running it')
      await saveMutation.mutateAsync()
      return api.runPipeline(pipelineId)
    },
    onSuccess: (status) => {
      setRunStatus(status)
      setActionError(null)
    },
    onError: (err: unknown) => setActionError(`Run failed: ${(err as Error).message}`),
  })

  function loadPipeline(id: string) {
    if (
      flowNodes.length > 0 &&
      !window.confirm('Load a different pipeline? Unsaved changes to the current canvas will be lost.')
    ) {
      return
    }
    api
      .getPipeline(id)
      .then((p) => {
        setPipelineId(p.id)
        setPipelineName(p.name)
        const meta: Record<string, PipelineNode> = {}
        p.definition.nodes.forEach((n) => (meta[n.id] = n))
        setNodeMeta(meta)
        setFlowNodes(layoutFrameMembers(p.definition.nodes.map(toFlowNode), meta))
        setFlowEdges(
          p.definition.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, animated: true })),
        )
        setCompiledSql(null)
        setPreviewNodes(null)
        setRunStatus(null)
        setSelectedNodeId(null)
        const cron = p.definition.schedule ?? ''
        setSchedule(cron)
        const detected = detectSchedule(cron)
        setScheduleMode(detected.mode)
        setScheduleMinute(detected.minute)
        setScheduleTime(detected.time)
        setScheduleDay(detected.day)
        setParameterRows(objectToRows(p.definition.parameters))
        setFieldDrafts({})
        setDictRows({})
        setActionError(null)
      })
      .catch((err: unknown) => setActionError(`Failed to load pipeline: ${(err as Error).message}`))
  }

  function addNode(kind: NodeKind, type: string, position?: { x: number; y: number }) {
    const id = nextNodeId(kind)
    const node: PipelineNode = {
      id,
      kind,
      type,
      label: type,
      config: {},
      position: position ?? { x: 60 + Math.random() * 400, y: 60 + Math.random() * 300 },
    }
    setNodeMeta((prev) => ({ ...prev, [id]: node }))
    setFlowNodes((prev) => [...prev, toFlowNode(node)])
  }

  // Deliberately ignore the resize handle's x/y (top-left drag) delta and only apply
  // width/height, anchored at the frame's existing position - this keeps member-node
  // containment (computed from position, independent of the frame's size) stable no
  // matter which resize handle the user drags.
  const handleFrameResize = useCallback((nodeId: string, width: number, height: number) => {
    setFlowNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, style: { ...n.style, width, height }, data: { ...n.data, width, height } } : n)),
    )
    setNodeMeta((prev) => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], config: { ...prev[nodeId].config, __frame_width: width, __frame_height: height } },
    }))
  }, [])

  const rfInstanceRef = useRef<ReactFlowInstance | null>(null)

  function onNodeTypeDragStart(e: React.DragEvent, kind: NodeKind, type: string) {
    e.dataTransfer.setData('application/x-openlakehouse-node', JSON.stringify({ kind, type }))
    e.dataTransfer.effectAllowed = 'move'
  }

  function onCanvasDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function onCanvasDrop(e: React.DragEvent) {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/x-openlakehouse-node')
    if (!raw) return
    const { kind, type } = JSON.parse(raw) as { kind: NodeKind; type: string }
    const position = rfInstanceRef.current?.screenToFlowPosition({ x: e.clientX, y: e.clientY }) ?? {
      x: 60 + Math.random() * 400,
      y: 60 + Math.random() * 300,
    }
    addNode(kind, type, position)
  }

  // Dragging a loop/branch frame must carry its currently-contained nodes along with it,
  // since membership is purely geometric (computeContainment), not a real parent-child link.
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setFlowNodes((nds) => {
      const membership = computeContainment(nds)
      const frameDeltas: Record<string, { dx: number; dy: number }> = {}
      changes.forEach((c) => {
        if (c.type === 'position' && c.position) {
          const node = nds.find((n) => n.id === c.id)
          if (node && isFrameNode(node)) {
            frameDeltas[c.id] = { dx: c.position.x - node.position.x, dy: c.position.y - node.position.y }
          }
        }
      })
      let next = applyNodeChanges(changes, nds)
      if (Object.keys(frameDeltas).length > 0) {
        next = next.map((n) => {
          const frameId = membership[n.id]
          const delta = frameId ? frameDeltas[frameId] : undefined
          return delta ? { ...n, position: { x: n.position.x + delta.dx, y: n.position.y + delta.dy } } : n
        })
      }
      return next
    })
  }, [])
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
    if (!window.confirm('Delete this node? This cannot be undone.')) return
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
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        const active = document.activeElement as HTMLElement | null
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return
        deleteSelectedNode()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId])

  // Live updates via SSE (replaces the old 1.5s polling loop) - the backend pushes a
  // fresh snapshot whenever it changes and closes the stream itself once the run reaches
  // a terminal status, so the client doesn't need to re-open/tear down the connection on
  // every status change - only when a genuinely new run id shows up (or on unmount).
  useEffect(() => {
    if (!runStatus || runStatus.status === 'SUCCESS' || runStatus.status === 'FAILED') return
    const controller = new AbortController()
    runStreamAbortRef.current = controller
    api
      .streamPipelineRun(runStatus.id, (updated) => setRunStatus(updated), controller.signal)
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        // fall back to a single manual refresh if the stream itself failed to open/broke
        api.getPipelineRun(runStatus.id).then(setRunStatus).catch(() => undefined)
        console.error('Run status stream error', err)
      })
      .finally(() => {
        if (runStreamAbortRef.current === controller) runStreamAbortRef.current = null
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runStatus?.id])

  // Deep-link support: `/pipelines?pipeline=<id>` (used by the Lineage page's
  // "Written by" / "Read by" links) auto-loads that pipeline once the saved list is ready.
  useEffect(() => {
    const targetId = searchParams.get('pipeline')
    if (targetId && pipelines && !autoLoadedPipelineRef.current) {
      autoLoadedPipelineRef.current = true
      loadPipeline(targetId)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('pipeline')
        return next
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelines, searchParams])

  const kindById = useMemo(() => {
    const map: Record<string, NodeKind> = {}
    flowNodes.forEach((n) => {
      map[n.id] = (n.data as PipelineNodeData).kind
    })
    return map
  }, [flowNodes])

  const frameMembership = useMemo(() => computeContainment(flowNodes), [flowNodes])

  const displayEdges: Edge[] = useMemo(
    () =>
      flowEdges.map((e) => {
        const role = classifyEdgeRole(kindById[e.source], kindById[e.target])
        const style = EDGE_ROLE_STYLE[role]
        return {
          ...e,
          style: { stroke: style.stroke, strokeWidth: style.strokeWidth, strokeDasharray: style.dash },
          markerEnd: { type: MarkerType.ArrowClosed, color: style.stroke },
        }
      }),
    [flowEdges, kindById],
  )

  // Live "what will actually happen" analysis - ported from the backend's own execution
  // rules, computed as-you-build so the two documented gotchas (edge-free advanced nodes
  // racing ahead in array order, and {{var}} used before its producer has run) show up on
  // the canvas instead of only surfacing as a confusing Run failure.
  const pipelineAnalysis = useMemo(() => {
    const nodeIds = flowNodes.map((n) => n.id)
    const edgeList = flowEdges.map((e) => ({ source: e.source, target: e.target }))
    const fullOrder = computeTopoOrder(nodeIds, edgeList)
    const fullOrderIndex: Record<string, number> = {}
    fullOrder?.forEach((id, i) => (fullOrderIndex[id] = i + 1))

    const nodesList = nodeIds.map((id) => nodeMeta[id]).filter(Boolean) as PipelineNode[]

    // Nodes visually dropped inside a for_each frame run per-iteration (in canvas top-to-
    // bottom order) - NOT part of the main topo-sorted sequence. Derived live from the
    // canvas (frameMembership) rather than the last-saved body_node_ids config.
    const loopBodyIds = new Set<string>()
    flowNodes.forEach((n) => {
      const frameId = frameMembership[n.id]
      if (frameId && kindById[frameId] === 'control' && nodeMeta[frameId]?.type === 'for_each') loopBodyIds.add(n.id)
    })

    const mainOrderIndex: Record<string, number> = {}
    let mainPos = 0
    fullOrder?.forEach((id) => {
      if (!loopBodyIds.has(id)) mainOrderIndex[id] = ++mainPos
    })

    const edgeDegree: Record<string, number> = {}
    nodeIds.forEach((id) => (edgeDegree[id] = 0))
    edgeList.forEach((e) => {
      edgeDegree[e.source] = (edgeDegree[e.source] ?? 0) + 1
      edgeDegree[e.target] = (edgeDegree[e.target] ?? 0) + 1
    })
    const hasAnyEdge = edgeList.length > 0

    // variable name -> node that produces it + its position in the FULL topo order.
    const producers: Record<string, { nodeId: string; index: number }> = {}
    nodesList.forEach((n) => {
      let varName: string | undefined
      if (n.kind === 'variable') varName = n.config?.name as string | undefined
      else if (n.kind === 'code' && n.type === 'sql') varName = n.config?.result_variable as string | undefined
      else if (n.kind === 'api_ingestion') varName = n.config?.result_variable as string | undefined
      if (n.kind === 'control' && n.type === 'for_each') varName = n.config?.item_variable as string | undefined
      if (varName && varName.trim() && fullOrderIndex[n.id]) {
        producers[varName] = { nodeId: n.id, index: fullOrderIndex[n.id] }
      }
    })

    const warnings: Record<string, string[]> = {}
    const addWarning = (nodeId: string, msg: string) => {
      ;(warnings[nodeId] ??= []).push(msg)
    }

    nodesList.forEach((n) => {
      const isLoopBody = loopBodyIds.has(n.id)
      const configStr = JSON.stringify(n.config ?? {})

      if (!TEMPLATED_KINDS.has(n.kind) && TEMPLATE_VAR_RE.test(configStr)) {
        addWarning(
          n.id,
          `"{{...}}" isn't substituted for ${n.kind} nodes — it will be sent literally, not replaced. Move dynamic values through a variable/code/api_ingestion node instead.`,
        )
      }

      if (isLoopBody && hasAnyEdge && (edgeDegree[n.id] ?? 0) > 0) {
        addWarning(
          n.id,
          'This node runs as a for_each loop body: its position is the body_node_ids list order, not this edge. Edges to/from it are ignored by the engine.',
        )
      }

      if (!isLoopBody && ADVANCED_KINDS.has(n.kind) && hasAnyEdge && (edgeDegree[n.id] ?? 0) === 0) {
        addWarning(
          n.id,
          `No edges connect this node — it runs in creation order (position ${mainOrderIndex[n.id] ?? '?'}), which may not match where it sits visually. Add an edge to make its order explicit.`,
        )
      }

      if (!isLoopBody && TEMPLATED_KINDS.has(n.kind) && fullOrder) {
        const referenced = new Set<string>()
        Object.values(n.config ?? {}).forEach((v) => collectTemplateVars(v).forEach((name) => referenced.add(name)))
        referenced.forEach((name) => {
          const producer = producers[name]
          const myIndex = fullOrderIndex[n.id]
          if (!producer) {
            addWarning(n.id, `References {{${name}}}, but no variable/code/api_ingestion/for_each node produces "${name}".`)
          } else if (myIndex && producer.index >= myIndex) {
            addWarning(
              n.id,
              `Uses {{${name}}}, set by "${producer.nodeId}" at position ${producer.index} — this node runs at position ${myIndex}, before it. Add an edge so it runs after "${producer.nodeId}".`,
            )
          }
        })
      }
    })

    return { fullOrder, mainOrderIndex, loopBodyIds, warnings, cycle: fullOrder === null && nodeIds.length > 0 }
  }, [flowNodes, flowEdges, nodeMeta, frameMembership, kindById])

  const displayNodes: Node[] = flowNodes.map((n) => {
    if (isFrameNode(n)) {
      const memberCount = Object.values(frameMembership).filter((frameId) => frameId === n.id).length
      return { ...n, data: { ...n.data, onResize: handleFrameResize, memberCount } }
    }
    const nodeRun = runStatus?.nodes.find((r) => r.node_id === n.id)
    return {
      ...n,
      data: {
        ...n.data,
        status: nodeRun?.status,
        order: pipelineAnalysis.mainOrderIndex[n.id],
        loopBody: pipelineAnalysis.loopBodyIds.has(n.id),
        warnings: pipelineAnalysis.warnings[n.id],
      },
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
        <input
          className="w-full border rounded p-1 mb-1 text-xs"
          placeholder="Search pipelines..."
          value={pipelineSearch}
          onChange={(e) => setPipelineSearch(e.target.value)}
        />
        <select
          className="w-full border rounded p-1 mb-1 text-xs"
          value={pipelineId ?? ''}
          onChange={(e) => (e.target.value ? loadPipeline(e.target.value) : undefined)}
        >
          <option value="">-- load saved --</option>
          {pipelines
            ?.filter((p) => p.name.toLowerCase().includes(pipelineSearch.toLowerCase()))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <div className="flex gap-1 mb-3">
          <button type="button" className="flex-1 text-xs border rounded px-2 py-1 hover:bg-gray-100" onClick={handleNewPipeline}>
            New
          </button>
          <button
            type="button"
            className="flex-1 text-xs border rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
            onClick={handleDuplicatePipeline}
            disabled={!pipelineId}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="flex-1 text-xs border rounded px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-40"
            onClick={handleDeletePipeline}
            disabled={!pipelineId}
          >
            Delete
          </button>
        </div>

        <input
          className="w-full border rounded p-1 mb-2 text-xs"
          placeholder="Search node types..."
          value={nodeSearch}
          onChange={(e) => setNodeSearch(e.target.value)}
        />
        {(Object.keys(NODE_TYPES) as NodeKind[]).map((kind) => {
          const types = NODE_TYPES[kind].filter((type) => type.toLowerCase().includes(nodeSearch.toLowerCase()))
          if (types.length === 0) return null
          return (
            <details key={kind} className="mb-2" open>
              <summary className="cursor-pointer select-none font-semibold capitalize" style={{ color: KIND_COLORS[kind] }}>
                {kind}
              </summary>
              <div className="flex flex-wrap gap-1 mt-1">
                {types.map((type) => (
                  <button
                    key={type}
                    type="button"
                    draggable
                    onDragStart={(e) => onNodeTypeDragStart(e, kind, type)}
                    className="cursor-grab border rounded px-2 py-0.5 text-xs hover:bg-gray-100 active:cursor-grabbing"
                    title={`${NODE_DESCRIPTIONS[type] ?? type} (click to add, or drag onto the canvas)`}
                    onClick={() => addNode(kind, type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </details>
          )
        })}

        <details className="mt-2 border-t pt-2">
          <summary className="text-xs font-semibold cursor-pointer">Pipeline settings</summary>
          <div className="mt-2">
            <label className="block text-xs mb-1">Schedule</label>
            <select
              className="border rounded px-2 py-1 w-full mb-1.5 text-xs"
              value={scheduleMode}
              onChange={(e) => handleScheduleModeChange(e.target.value as ScheduleMode)}
            >
              <option value="off">No schedule (manual only)</option>
              <option value="every15">Every 15 minutes</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom cron…</option>
            </select>

            {scheduleMode === 'hourly' && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-xs text-slate-500">at minute</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  className="border rounded px-2 py-1 w-16 text-xs"
                  value={scheduleMinute}
                  onChange={(e) => handleScheduleMinuteChange(Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                />
              </div>
            )}

            {(scheduleMode === 'daily' || scheduleMode === 'weekly') && (
              <div className="flex items-center gap-1.5 mb-1.5">
                {scheduleMode === 'weekly' && (
                  <select
                    className="border rounded px-1.5 py-1 text-xs"
                    value={scheduleDay}
                    onChange={(e) => handleScheduleDayChange(parseInt(e.target.value, 10))}
                  >
                    {WEEKDAYS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="time"
                  className="border rounded px-2 py-1 text-xs"
                  value={scheduleTime}
                  onChange={(e) => handleScheduleTimeChange(e.target.value)}
                />
                <span className="text-xs text-slate-400">UTC</span>
              </div>
            )}

            {scheduleMode === 'custom' && (
              <input
                className="border rounded px-2 py-1 w-full mb-1.5 text-xs font-mono"
                placeholder="e.g. 0 */6 * * *"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
              />
            )}

            <p className="text-xs text-slate-500 mb-2">{describeCron(schedule)}</p>

            <label className="block text-xs mb-1">Parameters</label>
            <DictRowsEditor rows={parameterRows} onRowsChange={setParameterRows} />
          </div>
        </details>
      </aside>

      <main className="flex-1 flex flex-col">
        {actionError && (
          <div className="flex items-center justify-between bg-red-50 border-b border-red-200 px-3 py-1.5 text-xs text-red-700">
            <span>{actionError}</span>
            <button type="button" className="ml-2 font-semibold" onClick={() => setActionError(null)}>
              ✕
            </button>
          </div>
        )}
        {pipelineAnalysis.cycle && (
          <div className="bg-red-50 border-b border-red-200 px-3 py-1.5 text-xs text-red-700">
            Cycle detected — these nodes/edges form a loop with no valid execution order. Remove or redirect an edge to fix
            it.
          </div>
        )}
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
            {compileMutation.isPending ? 'Validating...' : 'Compile / Validate'}
          </button>
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
          >
            Run
          </button>
          {runStatus && (
            <>
              <span className="text-sm font-semibold" style={{ color: STATUS_COLORS[runStatus.status] }}>
                {runStatus.status}
                {runStatus.error ? `: ${runStatus.error}` : ''}
              </span>
              <button
                className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setShowRunLog(true)}
              >
                Run Log
              </button>
            </>
          )}
        </div>

        <div className="flex-1 relative">
          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            nodeTypes={FLOW_NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onInit={(instance) => (rfInstanceRef.current = instance)}
            onDragOver={onCanvasDragOver}
            onDrop={onCanvasDrop}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
            <Panel
              position="top-right"
              className="bg-white/95 border rounded shadow-sm px-2.5 py-1.5 text-[10px] space-y-1 pointer-events-none"
            >
              <p className="font-semibold text-slate-600">Edge legend</p>
              {(Object.keys(EDGE_ROLE_STYLE) as EdgeRole[]).map((role) => (
                <p key={role} className="flex items-center gap-1.5" title={EDGE_ROLE_LABEL[role]}>
                  <svg width="18" height="8">
                    <line
                      x1="0"
                      y1="4"
                      x2="18"
                      y2="4"
                      stroke={EDGE_ROLE_STYLE[role].stroke}
                      strokeWidth={EDGE_ROLE_STYLE[role].strokeWidth}
                      strokeDasharray={EDGE_ROLE_STYLE[role].dash}
                    />
                  </svg>
                  <span className="capitalize text-slate-600">{role}</span>
                </p>
              ))}
            </Panel>
          </ReactFlow>
        </div>
      </main>

      <aside className="w-80 border-l p-3 text-sm overflow-y-auto">
        {selectedNodeId && selectedNode ? (
          <div>
            <h3 className="font-semibold mb-1">
              {selectedNode.type} <span className="text-gray-400 font-normal">({selectedNode.kind})</span>
            </h3>
            {NODE_DESCRIPTIONS[selectedNode.type] && (
              <p className="text-[11px] text-gray-500 mb-2">{NODE_DESCRIPTIONS[selectedNode.type]}</p>
            )}
            {selectedNode.kind === 'control' && (
              <p className="mb-2 rounded bg-indigo-50 border border-indigo-200 px-2 py-1.5 text-[11px] text-indigo-700">
                {selectedNode.type === 'for_each'
                  ? 'Drag nodes onto this frame on the canvas to add them to the loop body - order runs top-to-bottom. Drag a node back out to remove it.'
                  : 'Drag nodes onto the TRUE or FALSE side of this frame to control which branch they run on. Nodes left outside always run.'}
              </p>
            )}
            <div className="flex items-center gap-1 mb-2">
              <code className="text-[10px] bg-gray-100 px-1 py-0.5 rounded flex-1 truncate" title={selectedNodeId}>
                {selectedNodeId}
              </code>
              <button
                type="button"
                className="text-[10px] px-1.5 py-0.5 border rounded shrink-0"
                title="Copy node id (needed for join/union references)"
                onClick={() => navigator.clipboard?.writeText(selectedNodeId)}
              >
                Copy ID
              </button>
            </div>

            <label className="block text-xs mb-1">Label</label>
            <input
              className="border rounded px-2 py-1 w-full mb-2 text-xs"
              value={selectedNode.label}
              onChange={(e) => {
                const nextLabel = e.target.value
                setNodeMeta((prev) => ({
                  ...prev,
                  [selectedNodeId]: { ...prev[selectedNodeId], label: nextLabel },
                }))
                setFlowNodes((nds) =>
                  nds.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, label: nextLabel } } : n)),
                )
              }}
            />

            {selectedSpecs ? (
              selectedSpecs.length === 0 ? (
                <p className="text-[11px] text-gray-500 mb-2">No configuration needed for this node.</p>
              ) : (
                <div>{selectedSpecs.map((spec) => renderField(spec))}</div>
              )
            ) : (
              <>
                <div className="mb-2 rounded bg-amber-50 border border-amber-200 px-2 py-1.5 text-[11px] text-amber-800">
                  &quot;{selectedNode.type}&quot; isn&apos;t executed by the compiler yet - Compile/Run will fail for
                  this node. You can still store JSON config below for later.
                </div>
                <label className="block text-xs mb-1">Config (JSON)</label>
                <textarea
                  className="border rounded w-full h-40 font-mono text-xs p-2"
                  value={configText}
                  onChange={(e) => setConfigText(e.target.value)}
                />
                {configError && <p className="text-red-600 text-xs mt-1">{configError}</p>}
                <div className="flex gap-2 mt-2">
                  <button className="px-2 py-1 bg-gray-700 text-white rounded text-xs" onClick={applyConfig}>
                    Apply
                  </button>
                </div>
              </>
            )}

            {selectedSpecs && selectedSpecs.length > 0 && (
              <details className="mt-2 border-t pt-2">
                <summary className="text-xs cursor-pointer text-gray-600">Advanced: raw JSON</summary>
                <div className="mt-2">
                  <textarea
                    className="border rounded w-full h-32 font-mono text-xs p-2"
                    value={configText}
                    onChange={(e) => setConfigText(e.target.value)}
                  />
                  {configError && <p className="text-red-600 text-xs mt-1">{configError}</p>}
                  <div className="flex gap-2 mt-2">
                    <button className="px-2 py-1 bg-gray-700 text-white rounded text-xs" onClick={applyConfig}>
                      Apply JSON
                    </button>
                    <button
                      className="px-2 py-1 border rounded text-xs"
                      onClick={() => {
                        setConfigText(JSON.stringify(selectedNode.config ?? {}, null, 2))
                        setConfigError(null)
                      }}
                    >
                      Refresh from current config
                    </button>
                  </div>
                </div>
              </details>
            )}

            <div className="flex gap-2 mt-3">
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
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold">Compiled SQL</h4>
              <button
                type="button"
                className="text-[10px] px-1.5 py-0.5 border rounded"
                onClick={() => navigator.clipboard?.writeText(compiledSql)}
              >
                Copy
              </button>
            </div>
            <pre className="bg-slate-900 text-slate-100 p-2 text-xs whitespace-pre-wrap rounded overflow-x-auto">
              <SqlPreview sql={compiledSql} />
            </pre>
          </div>
        )}

        {previewNodes && (
          <div className="mt-4 border-t pt-2">
            <h4 className="font-semibold mb-1">Pipeline Preview</h4>
            <p className="text-[11px] text-gray-500 mb-2">
              This pipeline runs step-by-step (advanced node kinds) and has no single compiled SQL
              statement - each node's resolved SQL/expression is previewed below without executing
              anything.
            </p>
            <ul className="space-y-1.5">
              {previewNodes.map((n) => (
                <li
                  key={n.node_id}
                  className={`rounded border text-xs ${
                    n.status === 'error' ? 'border-rose-300 bg-rose-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 px-2 py-1 border-b border-inherit">
                    <span className={n.status === 'error' ? 'text-rose-600' : 'text-emerald-600'}>
                      {n.status === 'error' ? '✕' : '✓'}
                    </span>
                    <code className="truncate" title={n.node_id}>
                      {n.node_id}
                    </code>
                    <span className="ml-auto shrink-0 text-[10px] text-gray-400">
                      {n.kind}:{n.type}
                    </span>
                  </div>
                  <pre className="px-2 py-1 whitespace-pre-wrap break-words text-[11px] text-gray-700">
                    {n.status === 'error' ? n.error : n.sql}
                  </pre>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {showRunLog && runStatus && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowRunLog(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full max-w-md bg-white h-full shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <h3 className="font-semibold text-sm">Run Log</h3>
                <p className="text-[11px] text-gray-500">
                  Run {runStatus.id.slice(0, 8)} ·{' '}
                  <span style={{ color: STATUS_COLORS[runStatus.status] }}>{runStatus.status}</span>
                </p>
              </div>
              <button
                className="text-gray-500 hover:text-gray-800 text-sm"
                onClick={() => setShowRunLog(false)}
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {groupRunLogRows(runStatus.nodes).map((group) => (
                <div
                  key={group.key}
                  className={
                    group.iterationIndex != null
                      ? 'border rounded border-indigo-200 bg-indigo-50/40 p-1.5'
                      : undefined
                  }
                >
                  {group.iterationIndex != null && (
                    <p className="text-[10px] font-semibold text-indigo-700 mb-1 px-0.5">
                      ↻ {group.parentNodeId} · iteration {group.iterationIndex}
                    </p>
                  )}
                  <div className="space-y-1">
                    {group.rows.map((r) => (
                      <div
                        key={`${r.node_id}-${r.sequence ?? ''}`}
                        className="flex items-center gap-2 text-xs bg-white border rounded px-2 py-1"
                      >
                        <span className="w-5 text-right text-gray-400 shrink-0">{r.sequence ?? '-'}</span>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: STATUS_COLORS[r.status] ?? '#94a3b8' }}
                          title={r.status}
                        />
                        <code className="truncate flex-1" title={r.node_id}>
                          {r.node_id}
                        </code>
                        <span className="text-[10px] text-gray-400 shrink-0">{formatRunLogTime(r.started_at)}</span>
                        <span className="text-[10px] text-gray-400 shrink-0 w-12 text-right">
                          {r.duration_ms != null ? `${r.duration_ms}ms` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {runStatus.nodes.length === 0 && <p className="text-xs text-gray-400">No node runs yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
