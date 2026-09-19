import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ANALYST_SYSTEM_RULES = `You are analyzing an actual persisted dataset.

Dataset metadata tells you what fields likely mean, but it is not evidence of business/data outcomes.

For any factual analytical claim about counts, totals, averages, trends, segments, rankings, anomalies, or comparisons, use the read-only SQL tool against public.dealos_dataset_rows.

Do not answer analytical questions using metadata alone.

If the tool returns zero rows unexpectedly, first validate:
1. the dataset_id
2. row count in dealos_dataset_rows
3. the JSON field names in clean_data

Only say no data exists after verifying the row store.

Use metadata to plan queries, not to replace them.

Every SELECT must filter by the current dataset UUID.
Only SELECT / WITH queries are allowed.
Never INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, or CREATE.
Do not show SQL in the user-facing answer.`;

export interface DatasetColumnContext {
  column_name: string;
  original_name?: string | null;
  detected_type?: string | null;
  semantic_role?: string | null;
  business_meaning?: string | null;
}

export interface DatasetRowEvidence {
  dataset_id: string;
  row_count: number | null;
  columns: DatasetColumnContext[];
  facts: Record<string, unknown>;
}

function getServerSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase is not configured for dataset row queries.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function assertAnalysisDatasetId(datasetId: string): string {
  if (!datasetId || !UUID_REGEX.test(datasetId)) {
    throw new Error('Active dataset ID is missing or invalid.');
  }
  return datasetId;
}

export function rowValidationSql(datasetId: string): string {
  const id = assertAnalysisDatasetId(datasetId);
  return `SELECT COUNT(*) AS row_count FROM public.dealos_dataset_rows WHERE dataset_id = '${id}'::uuid`;
}

export async function loadDatasetColumns(datasetId: string): Promise<DatasetColumnContext[]> {
  const id = assertAnalysisDatasetId(datasetId);
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('dealos_dataset_columns')
    .select('column_name, original_name, detected_type, semantic_role, business_meaning')
    .eq('dataset_id', id);
  if (error) {
    throw new Error(`Unable to load cleaned field names: ${error.message}`);
  }
  return (data || []) as DatasetColumnContext[];
}

export async function countPersistedRows(datasetId: string): Promise<number | null> {
  const id = assertAnalysisDatasetId(datasetId);
  const supabase = getServerSupabase();
  const { data, error } = await supabase.rpc('count_dataset_rows', { p_dataset_id: id });
  if (!error) {
    return Number(data ?? 0);
  }
  if (process.env.NODE_ENV === 'development') {
    console.warn('[dataset-rows] count_dataset_rows RPC unavailable:', error.message);
  }
  const fallback = await supabase
    .from('dealos_dataset_rows')
    .select('row_number', { count: 'exact', head: true })
    .eq('dataset_id', id);
  if (fallback.error) return null;
  // A zero count through the table API is untrustworthy until the
  // SECURITY DEFINER RPC exists, because RLS currently hides rows.
  if ((fallback.count ?? 0) === 0) return null;
  return fallback.count ?? 0;
}

async function fieldCounts(datasetId: string, field: string, limit = 10) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.rpc('dataset_field_counts', {
    p_dataset_id: datasetId,
    p_field: field,
    p_limit: limit,
  });
  if (error || !Array.isArray(data)) return [];
  return data;
}

async function numericStats(datasetId: string, field: string) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.rpc('dataset_numeric_stats', {
    p_dataset_id: datasetId,
    p_field: field,
  });
  if (error || !Array.isArray(data) || !data[0]) return null;
  return data[0];
}

async function scoreOutcomes(datasetId: string, homeField: string, awayField: string) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.rpc('dataset_score_outcomes', {
    p_dataset_id: datasetId,
    p_home_field: homeField,
    p_away_field: awayField,
  });
  if (error || !Array.isArray(data)) return [];
  return data;
}

function pickField(columns: DatasetColumnContext[], candidates: string[]): string | undefined {
  const names = new Set(columns.map((column) => column.column_name));
  return candidates.find((candidate) => names.has(candidate));
}

function rowNoun(columns: DatasetColumnContext[]): string {
  if (pickField(columns, ['ht', 'at', 'home_team', 'away_team', 'fthg', 'ftag'])) return 'matches';
  if (pickField(columns, ['order_id', 'payment_value', 'customer_id'])) return 'orders';
  return 'records';
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

function formatDecimal(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

export async function buildRowEvidence(
  datasetId: string,
  expectedRowCount?: number
): Promise<DatasetRowEvidence> {
  const id = assertAnalysisDatasetId(datasetId);
  const columns = await loadDatasetColumns(id);
  const rowCount = await countPersistedRows(id);

  if (rowCount === 0) {
    const error = new Error(
      'The dataset metadata exists, but no persisted rows were found for this dataset ID.'
    );
    (error as any).code = 'DATASET_ROWS_NOT_FOUND';
    throw error;
  }

  const facts: Record<string, unknown> = {
    persisted_row_count: rowCount,
    expected_row_count: expectedRowCount ?? null,
    value_column: 'clean_data',
    table: 'public.dealos_dataset_rows',
    row_noun: rowNoun(columns),
  };

  if (typeof rowCount === 'number' && rowCount > 0) {
    const groupFields = [
      pickField(columns, ['home_team', 'ht']),
      pickField(columns, ['league']),
      pickField(columns, ['country']),
      pickField(columns, ['season']),
      pickField(columns, ['customer_state', 'region', 'category']),
    ].filter((field, index, list): field is string => Boolean(field) && list.indexOf(field) === index);

    const homeGoals = pickField(columns, ['fthg', 'home_goals']);
    const awayGoals = pickField(columns, ['ftag', 'away_goals']);
    const numericField =
      homeGoals ||
      pickField(columns, ['payment_value', 'revenue', 'amount', 'goals']);

    const [groupResults, homeStats, awayStats, numeric, outcomes] = await Promise.all([
      Promise.all(groupFields.map(async (field) => [field, await fieldCounts(id, field, 10)] as const)),
      homeGoals ? numericStats(id, homeGoals) : Promise.resolve(null),
      awayGoals ? numericStats(id, awayGoals) : Promise.resolve(null),
      numericField ? numericStats(id, numericField) : Promise.resolve(null),
      homeGoals && awayGoals ? scoreOutcomes(id, homeGoals, awayGoals) : Promise.resolve([]),
    ]);

    for (const [field, values] of groupResults) {
      facts[`top_${field}`] = values;
    }
    if (numeric) facts[`${numericField}_stats`] = numeric;
    if (homeStats) facts.home_goals_stats = homeStats;
    if (awayStats) facts.away_goals_stats = awayStats;
    if (outcomes.length) facts.score_outcomes = outcomes;
    if (homeStats?.average != null && awayStats?.average != null) {
      facts.average_goals_per_match =
        Number(homeStats.average) + Number(awayStats.average);
    }
  }

  return {
    dataset_id: id,
    row_count: rowCount,
    columns,
    facts,
  };
}

function topRows(facts: Record<string, unknown>, field: string): Array<{ value: string; matches: number }> {
  const raw = facts[`top_${field}`];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => ({
      value: String((row as any)?.value ?? ''),
      matches: Number((row as any)?.matches ?? 0),
    }))
    .filter((row) => row.value && Number.isFinite(row.matches));
}

export function synthesizeRowAnalysis(
  question: string,
  evidence: DatasetRowEvidence
): Record<string, unknown> | null {
  if (!evidence.row_count || evidence.row_count <= 0) return null;

  const noun = String(evidence.facts.row_noun || 'records');
  const count = evidence.row_count;
  const asked = question.toLowerCase();
  const homeField = pickField(evidence.columns, ['home_team', 'ht']);
  const homeTeams = homeField ? topRows(evidence.facts, homeField) : [];
  const leagues = topRows(evidence.facts, 'league');
  const countries = topRows(evidence.facts, 'country');
  const seasons = topRows(evidence.facts, 'season');
  const avgGoals = Number(evidence.facts.average_goals_per_match);
  const homeAvg = Number((evidence.facts.home_goals_stats as any)?.average);
  const awayAvg = Number((evidence.facts.away_goals_stats as any)?.average);
  const homeTotal = Number((evidence.facts.home_goals_stats as any)?.total);
  const awayTotal = Number((evidence.facts.away_goals_stats as any)?.total);
  const outcomes = Array.isArray(evidence.facts.score_outcomes)
    ? (evidence.facts.score_outcomes as Array<{ outcome: string; matches: number }>)
    : [];

  let headline = `${formatCount(count)} ${noun} were analyzed.`;
  let chat = `${formatCount(count)} ${noun} were analyzed from the persisted row store.`;

  if (/(how many|number of|count).*(match|row|record)/.test(asked) || asked.includes('how many matches')) {
    headline = `${formatCount(count)} ${noun} are in this dataset.`;
    chat = `${formatCount(count)} ${noun} were analyzed.`;
  } else if (/(home team|ht).*(most|often|frequent|top)/.test(asked) || asked.includes('which home teams')) {
    const top = homeTeams[0];
    headline = top
      ? `${top.value} appears most often among home sides.`
      : `${formatCount(count)} ${noun} were analyzed.`;
    chat = homeTeams.length
      ? `These home sides appear most often:\n${homeTeams
          .slice(0, 5)
          .map((row) => `• ${row.value}: ${formatCount(row.matches)} ${noun}`)
          .join('\n')}`
      : chat;
  } else if (/(average|avg).*(goal)/.test(asked) && Number.isFinite(avgGoals) && avgGoals > 0) {
    headline = `Matches averaged ${formatDecimal(avgGoals)} goals.`;
    chat = `Across ${formatCount(count)} matches, the average was ${formatDecimal(avgGoals)} goals per match (${formatDecimal(homeAvg)} at home and ${formatDecimal(awayAvg)} away).`;
  } else {
    const parts = [`${formatCount(count)} ${noun} were analyzed.`];
    if (Number.isFinite(avgGoals) && avgGoals > 0) {
      parts.push(
        `They produced ${formatCount((homeTotal || 0) + (awayTotal || 0))} total goals, averaging ${formatDecimal(avgGoals)} goals per match.`
      );
    }
    if (Number.isFinite(homeAvg) && Number.isFinite(awayAvg)) {
      parts.push(`Home sides scored ${formatDecimal(homeAvg)} per match versus ${formatDecimal(awayAvg)} for away sides.`);
    }
    if (outcomes.length) {
      const labeled = outcomes
        .map((row) => `${row.outcome} ${formatCount(Number(row.matches))}`)
        .join(', ');
      parts.push(`Full-time results: ${labeled}.`);
    }
    if (leagues[0]) parts.push(`The largest league slice is ${leagues[0].value} (${formatCount(leagues[0].matches)} ${noun}).`);
    if (countries[0]) parts.push(`${countries[0].value} is the most common country.`);
    if (seasons.length > 1) {
      parts.push(`Seasons in the file range across ${seasons.length} values, led by ${seasons[0].value}.`);
    }
    if (homeTeams[0]) parts.push(`${homeTeams[0].value} is the most frequent home side.`);
    chat = parts.join(' ');
    headline = `${formatCount(count)} ${noun} were analyzed.`;
  }

  const kpis = [
    {
      id: 'row-count',
      label: noun === 'matches' ? 'Matches' : noun === 'orders' ? 'Orders' : 'Records',
      current_value: count,
      value: formatCount(count),
      format: 'number',
      direction: 'neutral',
    },
  ];
  const totalGoals = (Number.isFinite(homeTotal) ? homeTotal : 0) + (Number.isFinite(awayTotal) ? awayTotal : 0);
  if (totalGoals > 0) {
    kpis.push({
      id: 'total-goals',
      label: 'Total Goals',
      current_value: totalGoals,
      value: formatCount(totalGoals),
      format: 'number',
      direction: 'neutral',
    });
  }
  if (Number.isFinite(avgGoals) && avgGoals > 0) {
    kpis.push({
      id: 'avg-goals',
      label: 'Average Goals Per Match',
      current_value: Number(avgGoals.toFixed(2)),
      value: formatDecimal(avgGoals),
      format: 'decimal',
      direction: 'neutral',
    });
  }
  if (Number.isFinite(homeAvg) && homeAvg > 0) {
    kpis.push({
      id: 'home-goals',
      label: 'Home Goals',
      current_value: Number(homeAvg.toFixed(2)),
      value: formatDecimal(homeAvg),
      format: 'decimal',
      direction: 'up',
    });
  }
  if (Number.isFinite(awayAvg) && awayAvg > 0) {
    kpis.push({
      id: 'away-goals',
      label: 'Away Goals',
      current_value: Number(awayAvg.toFixed(2)),
      value: formatDecimal(awayAvg),
      format: 'decimal',
      direction: 'neutral',
    });
  }
  const moneyStats =
    (evidence.facts.payment_value_stats as { total?: number; average?: number; row_count?: number } | null) ||
    (evidence.facts.revenue_stats as { total?: number; average?: number; row_count?: number } | null) ||
    (evidence.facts.amount_stats as { total?: number; average?: number; row_count?: number } | null);
  if (moneyStats && Number(moneyStats.total) > 0) {
    kpis.push({
      id: 'revenue',
      label: 'Revenue',
      current_value: Number(moneyStats.total),
      value: formatDecimal(Number(moneyStats.total)),
      format: 'currency',
      direction: 'neutral',
    });
    if (Number(moneyStats.average) > 0) {
      kpis.push({
        id: 'aov',
        label: 'Average Order Value',
        current_value: Number(Number(moneyStats.average).toFixed(2)),
        value: formatDecimal(Number(moneyStats.average)),
        format: 'currency',
        direction: 'neutral',
      });
    }
  }

  const toChart = (
    id: string,
    title: string,
    type: 'bar' | 'line' | 'pie',
    rows: Array<{ value: string; matches: number }>,
    xLabel: string
  ) => ({
    id,
    title,
    type,
    x_label: xLabel,
    y_label: noun,
    xKey: 'label',
    yKeys: ['value'],
    data: rows.slice(0, 10).map((row) => ({
      label: row.value,
      value: row.matches,
      count: row.matches,
    })),
  });

  const charts = [
    outcomes.length
      ? toChart(
          'result-distribution',
          'Match Result Distribution',
          'pie',
          outcomes.map((row) => ({ value: row.outcome, matches: Number(row.matches) })),
          'Result'
        )
      : null,
    seasons.length ? toChart('matches-by-season', 'Matches by Season', 'line', seasons, 'Season') : null,
    leagues.length ? toChart('matches-by-league', 'Matches by League', 'bar', leagues, 'League') : null,
    homeTeams.length
      ? toChart('top-home-sides', 'Most frequent home sides', 'bar', homeTeams, 'Home side')
      : null,
    countries.length ? toChart('top-countries', 'Largest country groups', 'bar', countries, 'Country') : null,
  ].filter(Boolean);

  const insights = [
    `${formatCount(count)} persisted rows were queried from public.dealos_dataset_rows.`,
    Number.isFinite(avgGoals) && avgGoals > 0
      ? `Average scoring was ${formatDecimal(avgGoals)} goals per match.`
      : null,
    leagues[0] ? `${leagues[0].value} is the largest league group.` : null,
    seasons[0] ? `${seasons[0].value} has the most ${noun}.` : null,
  ].filter(Boolean);

  return {
    success: true,
    original_question: question,
    dataset_id: evidence.dataset_id,
    headline,
    summary: chat,
    executive_summary: chat,
    chat_answer: chat,
    analysis_type: 'Persisted row analysis',
    kpis,
    charts,
    insights,
    key_drivers: [],
    confirmed_findings: insights,
    ruled_out_or_weak_drivers: [],
    remaining_uncertainties: [],
    recommended_actions: [],
    confidence: 'High',
    confidence_reason: 'Computed from persisted clean_data rows filtered by the active dataset ID.',
    visualizations: charts,
    evidence: [
      {
        claim: headline,
        source: 'public.dealos_dataset_rows.clean_data',
        query_summary: rowValidationSql(evidence.dataset_id),
        facts: [
          `dataset_id=${evidence.dataset_id}`,
          `row_count=${count}`,
        ],
      },
    ],
    follow_up_suggestions: [
      'Which home teams appear most often?',
      'What is the average goals per match?',
      'How many matches are there?',
    ],
    meta: {
      persisted_row_count: count,
      row_store: 'public.dealos_dataset_rows',
      source: 'row_store',
    },
  };
}

export function claimsZeroRows(text: unknown): boolean {
  const value = String(text || '').toLowerCase();
  return (
    value.includes('zero rows') ||
    value.includes('0 rows') ||
    value.includes('no persisted rows') ||
    value.includes('returned no rows') ||
    /sql validation returned zero/.test(value)
  );
}
