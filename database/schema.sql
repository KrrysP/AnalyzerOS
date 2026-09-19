-- AnalyzerOS known schema fragments
--
-- This is not a complete dump of the live Supabase project.
-- Export the full schema from Supabase before treating this as authoritative.
-- Only columns confirmed by application code or included migrations are listed.

-- One record per uploaded dataset. Additional columns may exist in production.
-- Confirmed application fields include:
--   id, name, original_filename, row_count_raw, row_count_clean,
--   column_count, quality_score, domain, grain
-- CREATE TABLE public.dealos_datasets ( ... export from Supabase ... );

-- Row-level persisted data. Confirmed by the AnalyzerOS row-store contract.
CREATE TABLE IF NOT EXISTS public.dealos_dataset_rows (
  dataset_id uuid NOT NULL,
  row_number bigint,
  raw_data jsonb,
  clean_data jsonb
);

-- Detected schema / semantic information. Confirmed selected columns:
--   dataset_id, column_name, original_name, detected_type,
--   semantic_role, business_meaning
-- CREATE TABLE public.dealos_dataset_columns ( ... export from Supabase ... );

-- Inferred analytical metrics.
-- CREATE TABLE public.dealos_dataset_metrics ( ... export from Supabase ... );

-- Ingestion profiling batches, if present in your project.
-- CREATE TABLE public.dealos_profile_batches ( ... export from Supabase ... );

-- Cleaning decisions may be stored by the n8n cleaning workflow.
-- The current frontend also keeps a local confirmed-decision history.
-- CREATE TABLE public.analyzeros_cleaning_decisions ( ... export from Supabase ... );

-- Read-only analysis helpers used by the Next.js analyze path.
-- See database/readonly-dataset-row-queries.sql
