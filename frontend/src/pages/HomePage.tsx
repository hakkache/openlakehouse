import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-8 text-white shadow-card">
        <h1 className="text-3xl font-bold tracking-tight">OpenLakehouse</h1>
        <p className="mt-2 max-w-2xl text-indigo-100">
          An open-source, self-hosted, Dockerized data and AI platform — a real, working
          Databricks-style lakehouse: ingestion, SQL, pipelines, ML, governance and observability,
          all running on your own infrastructure.
        </p>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          to="/workspace"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-card-hover"
        >
          <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600">Workspace</h3>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage workspaces (real API, backed by PostgreSQL).
          </p>
        </Link>
        <Link
          to="/health"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-card-hover"
        >
          <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600">Platform Health</h3>
          <p className="mt-1 text-sm text-slate-500">
            Live status of PostgreSQL, Redis and MinIO from the control plane.
          </p>
        </Link>
        <Link
          to="/catalog"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-card-hover"
        >
          <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600">Catalog</h3>
          <p className="mt-1 text-sm text-slate-500">
            Browse real Trino/Iceberg catalogs, schemas, tables and columns.
          </p>
        </Link>
        <Link
          to="/connections"
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-card-hover"
        >
          <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600">Connections</h3>
          <p className="mt-1 text-sm text-slate-500">
            Manage and test real connections to external databases and services.
          </p>
        </Link>
      </div>
    </div>
  )
}

