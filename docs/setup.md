# Local setup

This guide assumes you already have Node.js, a Supabase project, and an n8n instance.

## 1. Frontend

```bash
git clone <your-fork-url>
cd AnalyzerOS
npm install
cp .env.example .env.local
```

Fill `.env.local` with placeholders replaced by **your** values. Do not commit that file.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional checks:

```bash
npm run typecheck
npm run build
```

## 2. Environment variables

| Variable | Where it is used | Public? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser Storage upload | Yes, project URL only |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser Storage upload | Anon key only |
| `N8N_INGEST_URL` | `/api/ingest` | No |
| `N8N_ANALYZE_URL` | `/api/analyze` | No |
| `N8N_CLEANING_URL` | `/api/cleaning` | No |

Never put a service-role key, database password, or OpenAI key in `NEXT_PUBLIC_*` variables or in git.

## 3. Supabase

1. Create a project.
2. Create a Storage bucket named `analyzeros-datasets`.
3. Add policies so the anon key can upload objects to that bucket if you use browser uploads.
4. Create the dataset tables used by your n8n workflows. Start from `database/README.md` and export the live schema from Supabase.
5. Apply `database/readonly-dataset-row-queries.sql` in the SQL editor so analysis can count and aggregate persisted rows by `dataset_id`.
6. Keep the service-role key on the server or in n8n credentials only.

## 4. n8n

1. Import workflow JSON from `/n8n` after you export it from your working instance.
2. Reconnect PostgreSQL, Supabase, and LLM credentials.
3. Activate production webhooks (not test URLs, unless you intend to keep the editor open).
4. Copy those webhook URLs into `.env.local`.
5. Restart `npm run dev` after changing env files.

See `/n8n/README.md`.

## 5. Test with a CSV

1. Use a small public CSV. Do not commit large files.
2. Upload it from the landing page.
3. Confirm the review screen shows a clean row count and a dataset id from ingestion.
4. Click **Build Dashboard**.
5. Ask the AI Analyst a factual question such as “How many rows are in this dataset?”

If the dashboard says rows could not be accessed, the `dataset_id` sent to analysis does not match the rows in `dealos_dataset_rows`, or the read-only SQL helpers have not been applied.
