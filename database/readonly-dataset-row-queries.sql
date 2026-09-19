-- AnalyzerOS Workflow 2: allow read-only analysis of persisted dataset rows.
-- Metadata tables are already readable; dealos_dataset_rows is currently hidden
-- by RLS, which makes the analyst SQL tool return zero rows.
--
-- Apply this in the Supabase SQL editor. It does not expose credentials.

CREATE OR REPLACE FUNCTION public.count_dataset_rows(p_dataset_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM public.dealos_dataset_rows
  WHERE dataset_id = p_dataset_id;
$$;

CREATE OR REPLACE FUNCTION public.dataset_field_counts(
  p_dataset_id uuid,
  p_field text,
  p_limit integer DEFAULT 10
)
RETURNS TABLE(value text, matches bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_field IS NULL OR p_field !~ '^[a-zA-Z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid field name';
  END IF;

  RETURN QUERY EXECUTE format(
    'SELECT clean_data->>%L AS value, COUNT(*)::bigint AS matches
     FROM public.dealos_dataset_rows
     WHERE dataset_id = $1
     GROUP BY 1
     ORDER BY matches DESC
     LIMIT $2',
    p_field
  )
  USING p_dataset_id, GREATEST(COALESCE(p_limit, 10), 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.dataset_numeric_stats(
  p_dataset_id uuid,
  p_field text
)
RETURNS TABLE(row_count bigint, total numeric, average numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_field IS NULL OR p_field !~ '^[a-zA-Z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid field name';
  END IF;

  RETURN QUERY EXECUTE format(
    'SELECT
       COUNT(*)::bigint AS row_count,
       SUM(CASE WHEN (clean_data->>%L) ~ ''^-?[0-9]+(\\.[0-9]+)?$'' THEN (clean_data->>%L)::numeric ELSE 0 END) AS total,
       AVG(CASE WHEN (clean_data->>%L) ~ ''^-?[0-9]+(\\.[0-9]+)?$'' THEN (clean_data->>%L)::numeric END) AS average
     FROM public.dealos_dataset_rows
     WHERE dataset_id = $1',
    p_field, p_field, p_field, p_field
  )
  USING p_dataset_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.dataset_score_outcomes(
  p_dataset_id uuid,
  p_home_field text,
  p_away_field text
)
RETURNS TABLE(outcome text, matches bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_home_field IS NULL OR p_home_field !~ '^[a-zA-Z0-9_]+$'
     OR p_away_field IS NULL OR p_away_field !~ '^[a-zA-Z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid field name';
  END IF;

  RETURN QUERY EXECUTE format(
    'SELECT scored.outcome, COUNT(*)::bigint AS matches
     FROM (
       SELECT CASE
         WHEN (clean_data->>%L) ~ ''^-?[0-9]+(\\.[0-9]+)?$''
          AND (clean_data->>%L) ~ ''^-?[0-9]+(\\.[0-9]+)?$''
          AND (clean_data->>%L)::numeric > (clean_data->>%L)::numeric THEN ''home''
         WHEN (clean_data->>%L) ~ ''^-?[0-9]+(\\.[0-9]+)?$''
          AND (clean_data->>%L) ~ ''^-?[0-9]+(\\.[0-9]+)?$''
          AND (clean_data->>%L)::numeric < (clean_data->>%L)::numeric THEN ''away''
         WHEN (clean_data->>%L) ~ ''^-?[0-9]+(\\.[0-9]+)?$''
          AND (clean_data->>%L) ~ ''^-?[0-9]+(\\.[0-9]+)?$'' THEN ''draw''
         ELSE NULL
       END AS outcome
       FROM public.dealos_dataset_rows
       WHERE dataset_id = $1
     ) scored
     WHERE scored.outcome IS NOT NULL
     GROUP BY scored.outcome
     ORDER BY matches DESC',
    p_home_field, p_away_field, p_home_field, p_away_field,
    p_home_field, p_away_field, p_home_field, p_away_field,
    p_home_field, p_away_field
  )
  USING p_dataset_id;
END;
$$;

REVOKE ALL ON FUNCTION public.count_dataset_rows(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dataset_field_counts(uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dataset_numeric_stats(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dataset_score_outcomes(uuid, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.count_dataset_rows(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dataset_field_counts(uuid, text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dataset_numeric_stats(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dataset_score_outcomes(uuid, text, text) TO anon, authenticated, service_role;
