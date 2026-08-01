import { useAuth } from '../app/AuthContext'

const JUPYTER_URL = import.meta.env.VITE_JUPYTER_URL ?? '/jupyter'
const JUPYTER_TOKEN = import.meta.env.VITE_JUPYTER_TOKEN ?? 'openlakehouse'

export default function NotebooksPage() {
  const { authenticated, login } = useAuth()

  if (!authenticated) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notebooks</h1>
        <p className="mt-4 text-sm text-slate-500">
          Sign in with your OpenLakehouse account to open the notebook environment.
        </p>
        <button
          onClick={login}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500 hover:shadow-md"
        >
          Login
        </button>
      </div>
    )
  }

  const src = `${JUPYTER_URL}/lab/tree/examples/phase4_smoke_test.ipynb?token=${JUPYTER_TOKEN}`

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notebooks</h1>
          <p className="mt-1 text-sm text-slate-500">
            Real JupyterLab, backed by the live Spark cluster and Iceberg/Polaris catalog.
          </p>
        </div>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500 hover:shadow-md"
        >
          Open in new tab
        </a>
      </div>
      <iframe
        title="JupyterLab"
        src={src}
        className="h-[calc(100vh-260px)] w-full rounded-xl border border-slate-200 bg-white shadow-sm"
      />
    </div>
  )
}

