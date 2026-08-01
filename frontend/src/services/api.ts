import { keycloak } from './keycloak'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (keycloak.authenticated) {
    try {
      await keycloak.updateToken(30)
    } catch {
      // token refresh failed; request will proceed unauthenticated and the API will 401
    }
    if (keycloak.token) {
      headers.Authorization = `Bearer ${keycloak.token}`
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...options,
  })

  if (!response.ok) {
    const body = await response.text()
    throw new ApiError(response.status, body || response.statusText)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export interface DependencyStatus {
  name: string
  status: string
  detail?: string | null
}

export interface HealthResponse {
  status: string
  dependencies: DependencyStatus[]
}

export interface Workspace {
  id: string
  name: string
  slug: string
  description: string
  git_repo_url: string | null
  created_at: string
  updated_at: string
}

export interface MeResponse {
  subject: string
  username: string
  email: string
  roles: string[]
}

export type QueryExecutionStatus = 'RUNNING' | 'FINISHED' | 'FAILED' | 'CANCELLED'

export interface QueryStatus {
  id: string
  status: QueryExecutionStatus
  columns: string[] | null
  rows: unknown[][] | null
  row_count: number | null
  duration_ms: number | null
  error: string | null
}

export interface QueryExecutionRead {
  id: string
  trino_query_id: string | null
  sql_text: string
  status: QueryExecutionStatus
  row_count: number | null
  duration_ms: number | null
  error: string | null
  executed_by: string
  created_at: string
}

export interface SavedQuery {
  id: string
  name: string
  sql_text: string
  created_by: string
  created_at: string
}

export type NodeKind = 'source' | 'transform' | 'quality' | 'destination'

export interface PipelineNode {
  id: string
  kind: NodeKind
  type: string
  label: string
  config: Record<string, unknown>
  position: { x: number; y: number }
}

export interface PipelineEdge {
  id: string
  source: string
  target: string
}

export interface PipelineDefinition {
  id?: string | null
  name: string
  version: number
  nodes: PipelineNode[]
  edges: PipelineEdge[]
  parameters: Record<string, unknown>
  schedule?: string | null
}

export interface PipelineRead {
  id: string
  name: string
  version: number
  definition: PipelineDefinition
  created_by: string
  created_at: string
  updated_at: string
}

export interface CompiledNode {
  node_id: string
  sql: string
}

export interface CompileResult {
  nodes: CompiledNode[]
  full_sql: string
}

export type PipelineNodeStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED'
export type PipelineRunStatusValue = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED'

export interface NodeRunStatus {
  node_id: string
  status: PipelineNodeStatus
  message: string | null
  row_count: number | null
  duration_ms: number | null
}

export interface PipelineRunStatus {
  id: string
  pipeline_id: string
  status: PipelineRunStatusValue
  error: string | null
  nodes: NodeRunStatus[]
}

export interface PipelineRunRead {
  id: string
  pipeline_id: string
  status: PipelineRunStatusValue
  error: string | null
  executed_by: string
  started_at: string
  finished_at: string | null
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  message: ChatMessage
  model: string
}

export interface AssistantStatus {
  available: boolean
  model: string
  detail: string | null
}

export const api = {
  getHealth: () => request<HealthResponse>('/v1/health'),
  getMe: () => request<MeResponse>('/v1/auth/me'),
  listWorkspaces: () => request<Workspace[]>('/v1/workspaces'),
  createWorkspace: (name: string, description: string, gitRepoUrl?: string) =>
    request<Workspace>('/v1/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name, description, git_repo_url: gitRepoUrl || null }),
    }),
  updateWorkspaceGitRepo: (id: string, gitRepoUrl: string) =>
    request<Workspace>(`/v1/workspaces/${id}/git-repo`, {
      method: 'PATCH',
      body: JSON.stringify({ git_repo_url: gitRepoUrl || null }),
    }),
  deleteWorkspace: (id: string) =>
    request<void>(`/v1/workspaces/${id}`, { method: 'DELETE' }),
  submitQuery: (sql: string) =>
    request<QueryStatus>('/v1/sql/queries', {
      method: 'POST',
      body: JSON.stringify({ sql }),
    }),
  getQueryStatus: (id: string) => request<QueryStatus>(`/v1/sql/queries/${id}`),
  cancelQuery: (id: string) =>
    request<void>(`/v1/sql/queries/${id}/cancel`, { method: 'POST' }),
  listQueryHistory: () => request<QueryExecutionRead[]>('/v1/sql/history'),
  listSavedQueries: () => request<SavedQuery[]>('/v1/sql/saved'),
  createSavedQuery: (name: string, sqlText: string) =>
    request<SavedQuery>('/v1/sql/saved', {
      method: 'POST',
      body: JSON.stringify({ name, sql_text: sqlText }),
    }),
  deleteSavedQuery: (id: string) =>
    request<void>(`/v1/sql/saved/${id}`, { method: 'DELETE' }),
  listPipelines: () => request<PipelineRead[]>('/v1/pipelines'),
  getPipeline: (id: string) => request<PipelineRead>(`/v1/pipelines/${id}`),
  createPipeline: (name: string, definition: PipelineDefinition) =>
    request<PipelineRead>('/v1/pipelines', {
      method: 'POST',
      body: JSON.stringify({ name, definition }),
    }),
  updatePipeline: (id: string, name: string, definition: PipelineDefinition) =>
    request<PipelineRead>(`/v1/pipelines/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, definition }),
    }),
  deletePipeline: (id: string) =>
    request<void>(`/v1/pipelines/${id}`, { method: 'DELETE' }),
  compilePipelineDefinition: (definition: PipelineDefinition) =>
    request<CompileResult>('/v1/pipelines/compile', {
      method: 'POST',
      body: JSON.stringify(definition),
    }),
  compilePipeline: (id: string) =>
    request<CompileResult>(`/v1/pipelines/${id}/compile`, { method: 'POST' }),
  runPipeline: (id: string) =>
    request<PipelineRunStatus>(`/v1/pipelines/${id}/run`, { method: 'POST' }),
  getPipelineRun: (runId: string) =>
    request<PipelineRunStatus>(`/v1/pipelines/runs/${runId}`),
  listPipelineRuns: (id: string) =>
    request<PipelineRunRead[]>(`/v1/pipelines/${id}/runs`),
  getLineage: () => request<LineageGraph>('/v1/pipelines/lineage'),
  getQualitySummary: () => request<QualitySummary>('/v1/pipelines/quality'),
  getStreamingStatus: () => request<StreamingStatus>('/v1/streaming/status'),
  getAssistantStatus: () => request<AssistantStatus>('/v1/assistant/status'),
  sendAssistantChat: (messages: ChatMessage[]) =>
    request<ChatResponse>('/v1/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    }),
  getComputeStatus: () => request<ComputeStatus>('/v1/compute/status'),
  listCatalogs: () => request<string[]>('/v1/catalog/catalogs'),
  listSchemas: (catalog: string) =>
    request<string[]>(`/v1/catalog/schemas?catalog=${encodeURIComponent(catalog)}`),
  listTables: (catalog: string, schema: string) =>
    request<string[]>(
      `/v1/catalog/tables?catalog=${encodeURIComponent(catalog)}&schema=${encodeURIComponent(schema)}`,
    ),
  listColumns: (catalog: string, schema: string, table: string) =>
    request<ColumnInfo[]>(
      `/v1/catalog/columns?catalog=${encodeURIComponent(catalog)}&schema=${encodeURIComponent(schema)}&table=${encodeURIComponent(table)}`,
    ),
  previewTable: (catalog: string, schema: string, table: string, limit = 50) =>
    request<TablePreview>(
      `/v1/catalog/preview?catalog=${encodeURIComponent(catalog)}&schema=${encodeURIComponent(schema)}&table=${encodeURIComponent(table)}&limit=${limit}`,
    ),
  getMlStatus: () => request<MLStatus>('/v1/ml/status'),
  getExperimentRuns: (experimentId: string) =>
    request<MLRun[]>(`/v1/ml/experiments/${experimentId}/runs`),
  getGitStatus: () => request<GitStatus>('/v1/git/status'),
  getGitBranches: (owner: string, repo: string) =>
    request<GitBranch[]>(`/v1/git/repos/${owner}/${repo}/branches`),
  getGitCommits: (owner: string, repo: string) =>
    request<GitCommit[]>(`/v1/git/repos/${owner}/${repo}/commits`),
  createGitRepo: (name: string, description = '') =>
    request<GitRepo>('/v1/git/repos', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),
  getDashboardsStatus: () => request<DashboardsStatus>('/v1/dashboards/status'),
  getMonitoringStatus: () => request<MonitoringStatus>('/v1/monitoring/status'),
  getJobsStatus: () => request<JobsStatus>('/v1/jobs/status'),
  getAdminOverview: () => request<AdminOverview>('/v1/admin/overview'),
  listConnections: () => request<ConnectionRead[]>('/v1/connections'),
  getConnection: (id: string) => request<ConnectionRead>(`/v1/connections/${id}`),
  createConnection: (payload: ConnectionCreatePayload) =>
    request<ConnectionRead>('/v1/connections', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateConnection: (id: string, payload: ConnectionUpdatePayload) =>
    request<ConnectionRead>(`/v1/connections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteConnection: (id: string) =>
    request<void>(`/v1/connections/${id}`, { method: 'DELETE' }),
  testConnection: (id: string) =>
    request<ConnectionTestResult>(`/v1/connections/${id}/test`, { method: 'POST' }),
  testConnectionAdhoc: (payload: ConnectionCreatePayload) =>
    request<ConnectionTestResult>('/v1/connections/test', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}

export interface LineageGraphNode {
  id: string
  label: string
}

export interface LineageGraphEdge {
  id: string
  source: string
  target: string
  pipeline_id: string
  pipeline_name: string
}

export interface LineageGraph {
  nodes: LineageGraphNode[]
  edges: LineageGraphEdge[]
}

export interface QualityCheckResult {
  run_id: string
  pipeline_id: string
  pipeline_name: string
  node_id: string
  check_type: string
  status: string
  message: string | null
  row_count: number | null
  started_at: string | null
}

export interface QualitySummary {
  total_checks: number
  passed: number
  failed: number
  warnings: number
  quality_score: number
  history: QualityCheckResult[]
}

export interface TopicStatus {
  topic: string
  partitions: number
  messages: number
  lag: number
  status: string
}

export interface StreamingStatus {
  kafka_available: boolean
  topics: TopicStatus[]
}

export interface SparkStatus {
  status: string
  workers_alive: number
  workers_total: number
  cores_total: number
  cores_used: number
  memory_total_mb: number
  memory_used_mb: number
  active_apps: number
  completed_apps: number
}

export interface TrinoComputeStatus {
  status: string
  version: string
  workers_total: number
  running_queries: number
  queued_queries: number
  total_queries_tracked: number
}

export interface JupyterStatus {
  status: string
  kernels_running: number
  connections: number
}

export interface ComputeStatus {
  spark: SparkStatus | null
  trino: TrinoComputeStatus | null
  jupyter: JupyterStatus | null
}

export interface ColumnInfo {
  name: string
  type: string
  extra: string | null
  comment: string | null
}

export interface TablePreview {
  columns: string[]
  rows: unknown[][]
  row_count: number
}

export interface MLExperiment {
  experiment_id: string
  name: string
  lifecycle_stage: string
  artifact_location: string
}

export interface MLRun {
  run_id: string
  experiment_id: string
  status: string
  start_time: number | null
  end_time: number | null
  params: Record<string, string>
  metrics: Record<string, number>
}

export interface MLModelVersion {
  version: string
  status: string
  current_stage: string
  run_id: string | null
}

export interface MLRegisteredModel {
  name: string
  latest_versions: MLModelVersion[]
}

export interface MLStatus {
  available: boolean
  experiments: MLExperiment[]
  registered_models: MLRegisteredModel[]
}

export interface GitRepo {
  id: number
  name: string
  full_name: string
  owner: string
  description: string
  clone_url: string
  html_url: string
  default_branch: string
  updated_at: string
}

export interface GitBranch {
  name: string
  commit_sha: string
}

export interface GitCommit {
  sha: string
  message: string
  author: string
  date: string
}

export interface GitStatus {
  available: boolean
  repos: GitRepo[]
}

export interface DashboardInfo {
  id: number
  title: string
  url: string
  published: boolean
  changed_on: string
}

export interface DashboardsStatus {
  available: boolean
  dashboards: DashboardInfo[]
}

export interface TargetHealth {
  job: string
  instance: string
  up: boolean
}

export interface MonitoringStatus {
  available: boolean
  targets: TargetHealth[]
  grafana_url: string
  prometheus_url: string
}

export interface ScheduleInfo {
  name: string
  cron_schedule: string
  status: string
}

export interface JobInfo {
  repository: string
  name: string
}

export interface RunInfo {
  run_id: string
  job_name: string
  status: string
  start_time: number | null
  end_time: number | null
}

export interface JobsStatus {
  available: boolean
  jobs: JobInfo[]
  schedules: ScheduleInfo[]
  recent_runs: RunInfo[]
  dagster_url: string
}

export interface AuditLogEntry {
  id: string
  user_id: string | null
  action: string
  resource: string
  resource_id: string | null
  status: string
  ip_address: string | null
  created_at: string
}

export interface RealmUser {
  id: string
  username: string
  email: string | null
  enabled: boolean
  roles: string[]
}

export interface AdminOverview {
  keycloak_available: boolean
  users: RealmUser[]
  audit_logs: AuditLogEntry[]
}

export type ConnectionType = 'postgresql' | 'mysql' | 'sqlserver' | 'rest' | 'kafka' | 'minio' | 'trino'

export interface ConnectionRead {
  id: string
  name: string
  type: string
  config: Record<string, unknown>
  last_test_status: string | null
  last_test_message: string | null
  last_test_latency_ms: number | null
  last_tested_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ConnectionCreatePayload {
  name: string
  type: ConnectionType
  config: Record<string, unknown>
  password?: string | null
}

export interface ConnectionUpdatePayload {
  name?: string
  config?: Record<string, unknown>
  password?: string | null
}

export interface ConnectionTestResult {
  success: boolean
  message: string
  latency_ms: number
}

export { ApiError }
