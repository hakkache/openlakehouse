import { FormEvent, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, ChatMessage } from '../services/api'
import { useAuth } from '../app/AuthContext'

export default function AssistantPage() {
  const { authenticated, login } = useAuth()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hi! I\'m the OpenLakehouse AI Assistant, running locally via Ollama. Ask me about SQL, Spark, dbt, or pipelines.',
    },
  ])

  const { data: status } = useQuery({
    queryKey: ['assistant-status'],
    queryFn: () => api.getAssistantStatus(),
    enabled: authenticated,
    refetchInterval: 10000,
  })

  const chatMutation = useMutation({
    mutationFn: (nextMessages: ChatMessage[]) => api.sendAssistantChat(nextMessages),
    onSuccess: (response) => {
      setMessages((prev) => [...prev, response.message])
    },
    onError: (err: Error) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${err.message}` }])
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    const userMessage: ChatMessage = { role: 'user', content: input.trim() }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    chatMutation.mutate(nextMessages)
  }

  if (!authenticated) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-slate-500">Log in to use the AI Assistant.</p>
        <button
          onClick={login}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500 hover:shadow-md"
        >
          Login
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI Assistant</h1>
        <p className="text-sm text-slate-500">
          A local, self-hosted assistant (Ollama · {status?.model ?? '…'}) for data engineering questions.
        </p>
        {status && !status.available && (
          <p className="mt-1 text-sm text-amber-600">
            Model not ready yet{status.detail ? `: ${status.detail}` : ''}. It may still be pulling — try
            again shortly.
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
        <div className="slim-scroll flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-2xl rounded-lg px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'ml-auto bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-100'
              }`}
            >
              {m.content}
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="max-w-2xl rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-400">
              Thinking…
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2 border-t border-slate-800 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about SQL, Spark, dbt, pipelines…"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={chatMutation.isPending || !input.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500 hover:shadow-md disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
