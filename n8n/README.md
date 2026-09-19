# n8n workflows

AnalyzerOS uses three n8n workflows. The Next.js app never talks to n8n from the browser. Server routes proxy these webhooks:

| Workflow | Environment variable | Responsibility |
| --- | --- | --- |
| Ingestion / profiling | `N8N_INGEST_URL` | Download the CSV from Supabase Storage, parse it, persist rows, infer schema |
| Analyzer | `N8N_ANALYZE_URL` | Answer natural-language questions using the active `dataset_id` |
| Cleaning | `N8N_CLEANING_URL` | Apply approve / edit / ignore decisions |

## Files in this folder

- `ingestion-fix-nodes.json` — partial node export used while debugging ingestion (placeholder credentials only)
- `ingestion-workflow.json.example`
- `analyzer-workflow.json.example`
- `cleaning-workflow.json.example`

Full production workflow JSON is not checked in. Export it from your n8n instance.

## Export and import

1. In n8n, open each workflow.
2. Use **Download** / **Export** to save JSON.
3. Place the files here as:
   - `ingestion-workflow.json`
   - `analyzer-workflow.json`
   - `cleaning-workflow.json`
4. Before committing, search the JSON for passwords, API keys, Bearer tokens, and connection strings. Remove them.
5. On a new machine, import the JSON and reconnect credentials:
   - PostgreSQL / Supabase
   - OpenAI or your LLM provider
   - HTTP header auth for private Storage downloads
6. Activate the workflows and copy the **production** webhook URLs into `.env.local`.

n8n exports do not include usable credentials. After import, every credential node must be reconnected.

## Contract reminders

- Ingestion returns `success` and `dataset.id`. That UUID is the only dataset identity the frontend keeps.
- Analysis requests send `{ dataset_id, question, session_id }`.
- `dataset_id` and `session_id` are not interchangeable.
- Analytical SQL must stay read-only (`SELECT` / `WITH`) and filter by `dataset_id`.
