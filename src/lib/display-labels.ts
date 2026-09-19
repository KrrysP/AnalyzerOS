const ACRONYMS = new Set(['url', 'api', 'id', 'kpi', 'roi', 'sql', 'csv', 'aov', 'sku']);

const WORD_MAP: Record<string, string> = {
  avg: 'Average',
  pct: 'Percentage',
  num: 'Number',
  qty: 'Quantity',
  amt: 'Amount',
  timestamp: 'Date',
};

const FIELD_LABELS: Record<string, string> = {
  order_purchase_timestamp: 'Order Purchase Date',
  row_count_raw: 'Original Rows',
  row_count_clean: 'Clean Rows',
  column_count: 'Columns',
  quality_score: 'Data Quality',
  domain: 'Dataset Type',
  grain: 'Dataset Level',
  grain_description: 'Dataset Level',
  semantic_role: 'Field Role',
  null_pct: 'Missing Values',
  missing_pct: 'Missing Values',
  unique_count: 'Unique Values',
  unique_values: 'Unique Values',
  candidate_metrics: 'Suggested Metrics',
  storage_path: 'File Location',
  clean_data: 'Cleaned Data',
  raw_data: 'Original Data',
  dataset_id: 'Dataset',
};

const ACTION_LABELS: Record<string, string> = {
  normalize_column_names: 'Standardized Column Names',
  normalize_null_values: 'Standardized Missing Values',
  safe_type_conversion: 'Converted Data Types',
  remove_exact_duplicates_within_batch: 'Removed Exact Duplicates',
  text_to_numeric: 'Converted Text to Numbers',
  text_to_boolean: 'Converted Text to Yes/No Values',
  map_categories: 'Standardized Category Labels',
  semantic_interpretation: 'Saved Field Interpretation',
};

const QUALITY_LABELS: Record<string, string> = {
  high_missingness: 'High Missing Data',
  exact_duplicates: 'Duplicate Rows',
  type_mismatch: 'Inconsistent Data Type',
  unknown_semantic_role: 'Unclear Field Meaning',
};

function friendlyLabel(value?: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

export function formatFieldLabel(fieldName: unknown, backendLabel?: unknown): string {
  const provided = friendlyLabel(backendLabel);
  if (provided) return provided;

  const raw = friendlyLabel(fieldName);
  if (!raw) return '';
  const normalized = raw.trim().replace(/[\s-]+/g, '_').toLowerCase();
  if (FIELD_LABELS[normalized]) return FIELD_LABELS[normalized];

  return normalized
    .split('_')
    .filter(Boolean)
    .map((word) => {
      if (ACRONYMS.has(word)) return word.toUpperCase();
      if (WORD_MAP[word]) return WORD_MAP[word];
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function formatMetricLabel(metricName: unknown, backendLabel?: unknown): string {
  return formatFieldLabel(metricName, backendLabel);
}

export function formatDimensionLabel(dimensionName: unknown, backendLabel?: unknown): string {
  return formatFieldLabel(dimensionName, backendLabel);
}

export function formatActionLabel(action: unknown): string {
  const raw = friendlyLabel(action);
  if (!raw) return 'Cleaning action';
  return ACTION_LABELS[raw.toLowerCase()] || formatFieldLabel(raw);
}

export function formatQualityIssueLabel(issue: unknown): string {
  const raw = friendlyLabel(issue);
  if (!raw) return 'Data quality issue';
  return QUALITY_LABELS[raw.toLowerCase()] || formatFieldLabel(raw);
}

export function formatRoleLabel(role: unknown): string {
  const raw = friendlyLabel(role).toLowerCase();
  const labels: Record<string, string> = {
    all: 'All',
    metric: 'Measure',
    dimension: 'Group',
    time: 'Date',
    identifier: 'ID',
    flag: 'Yes/No',
    text: 'Text',
    unknown: 'Not set',
  };
  return labels[raw] || formatFieldLabel(raw);
}

export function sanitizeUserFacingText(value: unknown): string {
  if (typeof value !== 'string') return '';
  const withoutSqlBlocks = value.replace(/```sql[\s\S]*?```/gi, '').replace(/```[\s\S]*?```/g, '');
  return withoutSqlBlocks
    .split('\n')
    .filter((line) => !/^\s*(select|from|where|group\s+by|order\s+by|having|join)\b/i.test(line))
    .join('\n')
    .replace(/\b[a-z][a-z0-9]*_[a-z0-9_]+\b/g, (token) => formatFieldLabel(token))
    .trim();
}

export function isSystemMetadataField(fieldName: unknown): boolean {
  const key = friendlyLabel(fieldName).toLowerCase();
  return (
    /^(body|headers?|params|query|webhook_url|execution_mode|mime_type|file_path|storage_path)$/.test(
      key
    ) ||
    /(^|_)(webhook|request|storage|upload_event|execution|binary|mime_type|headers?|file_path|storage_path|session_id)($|_)/.test(
      key
    )
  );
}
