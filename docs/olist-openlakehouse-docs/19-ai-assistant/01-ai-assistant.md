# 01 — AI Assistant

**Content type: CURRENT PLATFORM CAPABILITY (verified from
`backend/app/api/v1/assistant.py`, `backend/app/core/config.py`).**

## Real architecture: a self-hosted Ollama model, no external API calls

**Verified**: the assistant is backed by a real local Ollama server
(`ollama_url = "http://ollama:11434"`, default model `llama3.2:1b`) — no
OpenAI/Anthropic API key or external network call involved. `GET
/v1/assistant/status` checks Ollama's real `/api/tags` endpoint and
confirms the configured model is actually pulled/available. `POST
/v1/assistant/chat` forwards real conversation messages to Ollama's
`/api/chat` endpoint with a system prompt establishing it as "the
OpenLakehouse AI Assistant, embedded in a self-hosted..." platform.

## Hands-On Walkthrough — confirm it's genuinely local and working

1. `GET /v1/assistant/status` (or check the app's own Assistant page,
   if present). **Expected result**: `available: true`,
   `model: "llama3.2:1b"` (or whatever you've configured) — confirms
   Ollama has this model pulled.
2. If `available: false`, pull the model first:
   ```powershell
   docker compose exec ollama ollama pull llama3.2:1b
   ```
   then re-check status.
3. Send a real chat message referencing something specific to this
   project (proves it's not a scripted/canned response):
   ```json
   POST /v1/assistant/chat
   {"messages": [{"role": "user", "content": "What is the is_late column in fact_orders?"}]}
   ```
   **Expected result**: a real, generated response — note that since
   this is a small local 1B-parameter model with **no actual access to
   your schema**, its answer is a plausible-sounding generic explanation
   at best, not a genuinely schema-aware answer — an honest, important
   limitation to note, not a hidden one.
4. Confirm it's genuinely local (no external network dependency): stop
   your internet connection (or block external DNS) and repeat step 3.
   **Expected result**: still works — real proof this is a fully
   self-hosted model with zero external API dependency.

## The honest gap: no real RAG/schema-awareness today

**Documented limitation**: the assistant has no tool-calling or
retrieval-augmented context injection linking it to this project's real
Iceberg schema, lineage graph, or pipeline definitions — it answers
purely from the base model's general training, with only a system
prompt establishing its persona. A genuinely schema-aware assistant would
require a real RAG pipeline (e.g. embedding this project's own
`information_schema` + lineage graph + docs into a vector store) — a
legitimate, undone extension.

> 🧪 **Checkpoint**: you confirmed the assistant is genuinely self-hosted
> (works with no internet access) and can explain precisely why its
> answers about this project's real schema are generic rather than
> schema-aware.

## Next module

[`20-testing/01-testing-strategy.md`](../20-testing/01-testing-strategy.md).
