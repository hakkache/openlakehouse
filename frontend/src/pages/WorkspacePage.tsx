import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { useAuth } from '../app/AuthContext'

export default function WorkspacePage() {
  const queryClient = useQueryClient()
  const { authenticated, login, roles } = useAuth()
  const canManage = roles.includes('ADMIN') || roles.includes('DATA_ENGINEER')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [gitRepoUrl, setGitRepoUrl] = useState('')
  const [editingGitRepo, setEditingGitRepo] = useState<Record<string, string>>({})

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: api.listWorkspaces,
    enabled: authenticated,
  })

  const createMutation = useMutation({
    mutationFn: () => api.createWorkspace(name, description, gitRepoUrl),
    onSuccess: () => {
      setName('')
      setDescription('')
      setGitRepoUrl('')
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })

  const gitRepoMutation = useMutation({
    mutationFn: ({ id, url }: { id: string; url: string }) => api.updateWorkspaceGitRepo(id, url),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspaces'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteWorkspace(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspaces'] }),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    createMutation.mutate()
  }

  if (!authenticated) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Workspaces</h1>
        <p className="mt-4 text-sm text-slate-500">
          Sign in with your OpenLakehouse account to view and manage workspaces.
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

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Workspaces</h1>
      <p className="mt-1 text-sm text-slate-500">
        Backed by the real FastAPI control plane and PostgreSQL.
      </p>

      {canManage ? (
        <form onSubmit={handleSubmit} className="mt-6 flex gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workspace name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <input
            value={gitRepoUrl}
            onChange={(e) => setGitRepoUrl(e.target.value)}
            placeholder="Git repo URL (optional, e.g. Gitea)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500 hover:shadow-md disabled:opacity-50"
          >
            Create
          </button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-slate-500">
          Your role does not permit creating workspaces (requires ADMIN or DATA_ENGINEER).
        </p>
      )}
      {createMutation.isError && (
        <p className="mt-2 text-sm text-red-600">
          {(createMutation.error as Error).message}
        </p>
      )}

      {isLoading && <p className="mt-4 text-sm text-slate-500">Loading…</p>}

      <div className="mt-6 space-y-2">
        {workspaces?.length === 0 && (
          <p className="text-sm text-slate-500">No workspaces yet. Create one above.</p>
        )}
        {workspaces?.map((ws) => (
          <div
            key={ws.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-card-hover"
          >
            <div>
              <p className="font-medium text-slate-900">{ws.name}</p>
              <p className="text-xs text-slate-500">
                /{ws.slug} · {ws.description || 'no description'}
              </p>
              {ws.git_repo_url ? (
                <p className="text-xs text-indigo-600">
                  <a href={ws.git_repo_url} target="_blank" rel="noreferrer">
                    {ws.git_repo_url}
                  </a>
                </p>
              ) : canManage ? (
                <div className="mt-1 flex gap-1">
                  <input
                    value={editingGitRepo[ws.id] ?? ''}
                    onChange={(e) => setEditingGitRepo({ ...editingGitRepo, [ws.id]: e.target.value })}
                    placeholder="Associate a Gitea repo URL"
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-900"
                  />
                  <button
                    onClick={() =>
                      gitRepoMutation.mutate({ id: ws.id, url: editingGitRepo[ws.id] ?? '' })
                    }
                    className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
                  >
                    Link
                  </button>
                </div>
              ) : null}
            </div>
            {canManage && (
              <button
                onClick={() => deleteMutation.mutate(ws.id)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
