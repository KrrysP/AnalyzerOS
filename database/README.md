# Database

AnalyzerOS uses PostgreSQL (via Supabase) as the source of truth for uploaded datasets.

`dataset_id` is the canonical key. Every metadata table, persisted row, analysis query, and cleaning decision must reference the UUID returned by a successful ingestion response (`dataset.id`).

## Core tables

These names are used by the current architecture. Export the live schema from Supabase for exact column lists.

### `public.dealos_datasets`

One record per uploaded dataset. The frontend treats `id` from this record as `activeDataset.id`.

Typical application fields include name, original filename, raw/clean row counts, column count, quality score, domain, and grain.

### `public.dealos_dataset_rows`

Row-level persisted data.

Confirmed columns:

| Column | Type | Purpose |
| --- | --- | --- |
| `dataset_id` | uuid | Canonical dataset identity |
| `row_number` | bigint | Stable row order |
| `raw_data` | jsonb | Original parsed values |
| `clean_data` | jsonb | Values used for analysis |

Analysis should read `clean_data` unless the user asks about original values. Every row query must filter by `dataset_id`.

### `public.dealos_dataset_columns`

Detected schema and semantic information: cleaned field names, original names, types, roles, and business meaning.

Metadata helps the analyst plan queries. It is not evidence of totals, trends, or rankings.

### `public.dealos_dataset_metrics`

Inferred candidate measures. Useful for dashboard planning, not a substitute for querying persisted rows.

### `public.dealos_profile_batches`

Ingestion profiling information, when present in your Supabase project. Export the live table before relying on specific columns.

### `public.analyzeros_cleaning_decisions`

Cleaning decisions may be persisted by the n8n cleaning workflow. The current frontend also stores backend-confirmed approve / edit / ignore outcomes locally.

## Read-only analysis functions

`readonly-dataset-row-queries.sql` defines dataset-scoped helpers:

- `count_dataset_rows(p_dataset_id)`
- `dataset_field_counts(p_dataset_id, p_field, p_limit)`
- `dataset_numeric_stats(p_dataset_id, p_field)`
- `dataset_score_outcomes(p_dataset_id, p_home_field, p_away_field)`

These functions are `SECURITY DEFINER` and only accept a dataset UUID plus validated field names. They do not expose credentials.

## Exporting the live schema

In the Supabase SQL editor or CLI, export the public tables and policies for your project. Replace the placeholders in `schema.sql` with that export before treating this folder as complete.

Do not commit database passwords or service-role keys.
