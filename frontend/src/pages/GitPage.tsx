import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export default function GitPage() {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [newRepoName, setNewRepoName] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['git-status'],
    queryFn: () => api.getGitStatus(),
  })

  const createRepo = useMutation({
    mutationFn: (name: string) => api.createGitRepo(name),
    onSuccess: () => {
      setNewRepoName('')
      queryClient.invalidateQueries({ queryKey: ['git-status'] })
    },
  })

  const [owner, repoName] = expanded ? expanded.split('/') : [null, null]

  const branchesQuery = useQuery({
    queryKey: ['git-branches', expanded],
    queryFn: () => api.getGitBranches(owner as string, repoName as string),
    enabled: !!expanded,
  })

  const commitsQuery = useQuery({
    queryKey: ['git-commits', expanded],
    queryFn: () => api.getGitCommits(owner as string, repoName as string),
    enabled: !!expanded,
  })

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Git</h1>
        <p className="text-sm text-slate-500">Real Gitea repositories, branches and commits.</p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading repositories…</p>}
      {error && <p className="text-sm text-red-600">Failed to load Git status.</p>}

      {data && !data.available && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Gitea is not reachable. Start it with the compose profile that includes Gitea.
        </p>
      )}

      {data?.available && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (newRepoName.trim()) createRepo.mutate(newRepoName.trim())
          }}
        >
          <input
            value={newRepoName}
            onChange={(e) => setNewRepoName(e.target.value)}
            placeholder="new-repo-name"
            className="rounded border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={createRepo.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500 hover:shadow-md disabled:opacity-50"
          >
            {createRepo.isPending ? 'Creating…' : 'Create Repo'}
          </button>
        </form>
      )}
      {createRepo.isError && <p className="text-sm text-red-600">{(createRepo.error as Error).message}</p>}

      {data && data.repos.length === 0 && data.available && (
        <p className="text-sm text-slate-500">No repositories yet — create one above.</p>
      )}

      <div className="flex flex-col gap-3">
        {data?.repos.map((repo) => {
          const key = repo.full_name
          const isOpen = expanded === key
          return (
            <div key={repo.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 transition-shadow hover:shadow-md">
              <button
                className="flex w-full items-center justify-between text-left"
                onClick={() => setExpanded(isOpen ? null : key)}
              >
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{repo.full_name}</h2>
                  <p className="text-xs text-slate-500">{repo.description || 'No description'}</p>
                </div>
                <span className="text-xs text-slate-400">{isOpen ? 'Hide' : 'Details'}</span>
              </button>
              <div className="mt-2 flex gap-4 text-xs text-slate-500">
                <a href={repo.html_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                  Open in Gitea
                </a>
                <span>Default branch: {repo.default_branch}</span>
                <span>Updated {repo.updated_at}</span>
              </div>

              {isOpen && (
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="mb-1 text-xs font-semibold uppercase text-slate-500">Branches</h3>
                    {branchesQuery.isLoading && <p className="text-xs text-slate-500">Loading…</p>}
                    <ul className="text-sm">
                      {branchesQuery.data?.map((b) => (
                        <li key={b.name} className="flex justify-between border-b border-slate-100 py-1">
                          <span>{b.name}</span>
                          <span className="font-mono text-xs text-slate-500">{b.commit_sha.slice(0, 8)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="mb-1 text-xs font-semibold uppercase text-slate-500">Recent Commits</h3>
                    {commitsQuery.isLoading && <p className="text-xs text-slate-500">Loading…</p>}
                    <ul className="text-sm">
                      {commitsQuery.data?.map((c) => (
                        <li key={c.sha} className="border-b border-slate-100 py-1">
                          <div className="flex justify-between">
                            <span className="font-mono text-xs">{c.sha}</span>
                            <span className="text-xs text-slate-500">{c.author}</span>
                          </div>
                          <p className="text-xs text-slate-700">{c.message}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
