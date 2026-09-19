import { UploadResponse, BIAnalysisResponse, DetectedColumn, DetectedMetric, Visualization } from './types';
import type { StoredDatasetUpload } from './supabase';
import {
  assertValidDatasetId,
  DATASET_NOT_READY_MESSAGE,
  extractIngestedDatasetId,
  unwrapIngestPayload,
} from './dataset-identity';

export {
  assertValidDatasetId,
  DATASET_NOT_READY_MESSAGE,
  LEGACY_PLACEHOLDER_DATASET_ID,
  UUID_REGEX,
} from './dataset-identity';

/** Converts a numeric confidence or a qualitative level ("high"/"medium"/"low") into a 0–1 number. */
function parseConfidenceLevel(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const level = value.toLowerCase();
    if (level === 'high') return 0.9;
    if (level === 'medium' || level === 'med') return 0.7;
    if (level === 'low') return 0.5;
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  return undefined;
}

/**
 * The n8n backend sends chart field names in snake_case (x_field, y_field,
 * series_field) while the frontend chart components expect camelCase
 * (xKey, yKeys). Without this mapping every bar/line/scatter chart renders
 * empty — Recharts finds no matching dataKey and draws nothing, silently,
 * with no console error.
 */
function normalizeVisualization(raw: any): Visualization {
  const xKey = raw.xKey || raw.x_field || raw.xField || raw.x_label || 'name';

  let yKeys: string[] = [];
  if (Array.isArray(raw.yKeys) && raw.yKeys.length > 0) {
    yKeys = raw.yKeys;
  } else if (Array.isArray(raw.y_fields) && raw.y_fields.length > 0) {
    yKeys = raw.y_fields;
  } else if (raw.y_field) {
    yKeys = [raw.y_field];
  } else if (raw.yField) {
    yKeys = [raw.yField];
  } else {
    yKeys = ['value'];
  }

  return {
    id: raw.id,
    type: raw.type,
    title: raw.title,
    description: raw.description,
    xKey,
    yKeys,
    data: Array.isArray(raw.data) ? raw.data : [],
    colors: raw.colors,
    highlight_keys: raw.highlight_keys,
  };
}

// Timeouts for proxy requests — client never calls n8n directly
const ANALYZE_TIMEOUT_MS = 120_000; // 2 minutes


export const DASHBOARD_ANALYSIS_QUESTION =
  'Build a general analytical dashboard for this dataset using actual persisted rows. Identify the most useful measures, trends, segments, distributions, and data-quality notes.';

export const DATASET_ROWS_UNAVAILABLE_MESSAGE =
  'The dataset is registered, but its stored rows could not be accessed.';

export interface AskAnalyzerOSParams {
  datasetId: string;
  question: string;
  sessionId: string;
  userId?: string;
  organizationId?: string;
  expectedRowCount?: number;
  source?: 'dashboard' | 'analyst';
}

export interface IngestDatasetParams extends StoredDatasetUpload {
  datasetName?: string;
  userId?: string | null;
  organizationId?: string | null;
}

export interface CleaningDecisionPayload {
  dataset_id: string;
  column_name: string;
  suggestion: string;
  decision: 'approve' | 'ignore' | 'edit';
  user_override: string | null;
  user_id?: string | null;
  organization_id?: string | null;
}

export async function submitCleaningDecision(payload: CleaningDecisionPayload): Promise<any> {
  assertValidDatasetId(payload.dataset_id);
  if (!payload.suggestion.trim()) {
    throw new Error('Cleaning suggestion is missing.');
  }
  if (payload.decision === 'edit' && !payload.user_override?.trim()) {
    throw new Error('An edited value is required.');
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[AnalyzerOS] submitting cleaning decision', payload);
  }

  const response = await fetch('/api/cleaning', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({
    success: false,
    error: 'Cleaning endpoint returned a non-JSON response.',
  }));

  if (process.env.NODE_ENV === 'development') {
    console.log('[AnalyzerOS] cleaning response', response.status, data);
  }

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || data?.error || 'Cleaning decision failed');
  }
  return data;
}

export const WEBHOOK_METADATA_PROFILE_ERROR =
  'AnalyzerOS detected upload metadata instead of dataset contents. Please reprocess the dataset.';

// Field names of an n8n Webhook node's request item. A real dataset can
// legitimately have one of these (e.g. a "query" column), but not several.
const WEBHOOK_METADATA_FIELDS = new Set([
  'headers',
  'body',
  'params',
  'query',
  'webhookurl',
  'executionmode',
]);

/**
 * True when an ingestion response describes the webhook request object
 * rather than the CSV rows (the profile's fields are body/headers/params...).
 */
export function isWebhookMetadataProfile(raw: any): boolean {
  if (!raw || typeof raw !== 'object') return false;

  const names: unknown[] = [];
  const cols = raw.detected?.columns || raw.detected_columns || [];
  if (Array.isArray(cols)) {
    for (const c of cols) names.push(typeof c === 'string' ? c : c?.column_name ?? c?.name);
  }
  for (const list of [raw.detected?.dimensions, raw.detected?.time_fields, raw.dimensions, raw.time_fields]) {
    if (Array.isArray(list)) names.push(...list.map((v) => (typeof v === 'string' ? v : v?.name)));
  }
  if (Array.isArray(raw.sample_rows) && raw.sample_rows[0] && typeof raw.sample_rows[0] === 'object') {
    names.push(...Object.keys(raw.sample_rows[0]));
  }

  const hits = new Set(
    names
      .filter((n): n is string => typeof n === 'string')
      .map((n) => n.toLowerCase().replace(/[^a-z0-9]/g, ''))
      .filter((n) => WEBHOOK_METADATA_FIELDS.has(n))
  );
  if (hits.size >= 2) return true;

  const description = `${raw.dataset?.domain ?? ''} ${
    typeof raw.dataset?.grain === 'object' ? raw.dataset.grain?.description ?? '' : raw.dataset?.grain ?? ''
  }`;
  return hits.size >= 1 && /webhook/i.test(description);
}

/**
 * Normalizes an upload response from n8n or fallback into a consistent UploadResponse
 */
export function normalizeUploadResponse(raw: any, file?: File): UploadResponse {
  if (!raw) {
    throw new Error('Empty response received from upload endpoint.');
  }
  if (isWebhookMetadataProfile(raw)) {
    throw new Error(WEBHOOK_METADATA_PROFILE_ERROR);
  }

  const payload = unwrapIngestPayload(raw) || raw;
  const backendDatasetId = extractIngestedDatasetId(payload);
  raw = payload;

  // Handle case where raw has dataset property (standard n8n contract)
  const datasetInfo = {
    ...raw.dataset,
    id: backendDatasetId,
  };

  // Handle detected columns. The live n8n contract names these fields
  // column_name / semantic_role / business_meaning, and sends confidence as
  // a qualitative level ("high"/"medium"/"low") rather than a number — this
  // mapping accepts either that shape or the older name/role/meaning shape.
  const rawCols = raw.detected?.columns || raw.detected_columns || [];
  const columns: DetectedColumn[] = rawCols.map((col: any) => {
    const name = typeof col === 'string' ? col : col.name || col.column_name || 'column';
    return {
      name,
      role: col.role || col.semantic_role || (col.type === 'numeric' ? 'metric' : 'dimension'),
      meaning: col.meaning || col.business_meaning || col.description || `Field representing ${name}`,
      confidence: parseConfidenceLevel(col.confidence),
      type: col.type || col.detected_type,
      null_percentage: col.null_percentage ?? col.missing_pct,
      missing_pct: col.null_percentage ?? col.missing_pct,
      unique_count: col.unique_count ?? col.unique_values,
      unique_values: col.unique_count ?? col.unique_values,
    };
  });

  // Handle detected metrics
  const rawMetrics = raw.detected?.metrics || raw.metrics || [];
  const metrics = rawMetrics.map((m: any) => {
    if (typeof m === 'string') {
      return {
        metric_name: m,
        metric_type: 'additive',
        formula_description: `Sum/Average of ${m}`,
        confidence: 0.92,
        requires_confirmation: false,
      };
    }
    return {
      metric_name: m.metric_name || m.name || 'Metric',
      metric_type: m.metric_type || 'metric',
      formula_description: m.formula_description || `Calculated aggregate of ${m.metric_name || 'value'}`,
      confidence: typeof m.confidence === 'number' ? m.confidence : 0.92,
      requires_confirmation: Boolean(m.requires_confirmation),
    };
  });

  // Handle dimensions and time_fields
  const dimensions: string[] = raw.detected?.dimensions || raw.dimensions || [];
  const time_fields: string[] = raw.detected?.time_fields || raw.time_fields || [];

  // Handle cleaning
  const cleaning = {
    automatic_actions: raw.cleaning?.automatic_actions || raw.cleaning_log || [
      'Column names normalized to lowercase snake_case',
      'Whitespace and trailing delimiters removed',
      'Missing values categorized and flagged',
      'ISO 8601 date-time formats parsed',
    ],
    suggested_actions: raw.cleaning?.suggested_actions || [
      'Imputation of non-critical missing categorical values (Not automatically applied)',
      'Outlier boundary capping on extreme transaction amounts (Not automatically applied)',
    ],
    quality_issues: (raw.cleaning?.quality_issues || raw.quality_issues || []).map((q: any) => ({
      field: q.field || 'General',
      issue: q.issue || 'Data quality observation',
      severity: (q.severity || 'low').toLowerCase(),
      action: q.action || 'Retained raw records',
    })),
  };

  // Handle sample rows
  const sample_rows: Record<string, any>[] = raw.sample_rows || [];

  // Next steps
  const next = raw.next || {
    analyze_endpoint: '/webhook/dealos-analyze',
    suggested_question:
      raw.next?.suggested_question ||
      'Give me a general business overview of this dataset, including the most important metrics, trends, segments, anomalies, and data limitations.',
  };

  return {
    success: true,
    dataset: datasetInfo,
    detected: {
      columns,
      metrics,
      dimensions,
      time_fields,
    },
    cleaning,
    sample_rows,
    next,
    // Provide backwards-compatibility profile & properties
    profile: {
      name: datasetInfo.name,
      rows_raw: datasetInfo.row_count_raw,
      rows_clean: datasetInfo.row_count_clean,
      columns: datasetInfo.column_count,
      quality_score: datasetInfo.quality_score,
      domain: datasetInfo.domain,
      grain: typeof datasetInfo.grain === 'object' ? datasetInfo.grain.description : datasetInfo.grain,
      file_size: datasetInfo.file_size,
    },
    dataset_id: datasetInfo.id,
    metrics: metrics.map((m: DetectedMetric) => m.metric_name),
    dimensions,
    time_fields,
  };
}

/**
 * Starts n8n ingestion using storage metadata only. The CSV never passes
 * through this request or through the Next.js server.
 */
export async function ingestStoredDataset(params: IngestDatasetParams): Promise<UploadResponse> {
  const response = await fetch('/api/ingest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      storage_bucket: params.bucket,
      storage_path: params.storagePath,
      dataset_name: params.datasetName || params.originalFilename,
      original_filename: params.originalFilename,
      file_size: params.fileSize,
      dataset_session_id: params.datasetSessionId,
      user_id: params.userId ?? null,
      organization_id: params.organizationId ?? null,
    }),
  });

  const data = unwrapIngestPayload(await response.json().catch(() => null));
  if (!response.ok) {
    throw new Error(
      (data as any)?.error || (data as any)?.message || `Dataset processing failed with status ${response.status}.`
    );
  }
  if ((data as any)?.success === false || !(data as any)?.dataset?.id) {
    throw new Error(DATASET_NOT_READY_MESSAGE);
  }

  const normalized = normalizeUploadResponse(data);
  if (process.env.NODE_ENV === 'development') {
    console.log('INGESTED DATASET ID:', normalized.dataset.id);
  }
  return normalized;
}

/**
 * Normalizes an analysis response from n8n or fallback into a consistent BIAnalysisResponse
 */
export function normalizeAnalysisResponse(
  raw: any,
  fallbackQuestion: string,
  datasetId: string
): BIAnalysisResponse {
  if (!raw) {
    throw new Error('AnalyzerOS could not process this dataset. The analysis backend returned no data.');
  }

  return {
    original_question: raw.original_question || fallbackQuestion,
    dataset_id: datasetId,
    headline: raw.headline || raw.summary || `Analysis for: "${fallbackQuestion}"`,
    executive_summary: raw.executive_summary || raw.summary || raw.chat_answer || '',
    chat_answer: raw.chat_answer || raw.summary || raw.executive_summary,
    analysis_type: raw.analysis_type || 'General Overview',
    kpis: Array.isArray(raw.kpis) ? raw.kpis : [],
    key_drivers: Array.isArray(raw.key_drivers) ? raw.key_drivers : [],
    confirmed_findings: Array.isArray(raw.confirmed_findings)
      ? raw.confirmed_findings
      : Array.isArray(raw.insights)
        ? raw.insights
        : [],
    ruled_out_or_weak_drivers: Array.isArray(raw.ruled_out_or_weak_drivers) ? raw.ruled_out_or_weak_drivers : [],
    remaining_uncertainties: Array.isArray(raw.remaining_uncertainties) ? raw.remaining_uncertainties : [],
    recommended_actions: Array.isArray(raw.recommended_actions) ? raw.recommended_actions : [],
    confidence: raw.confidence ?? 'Medium',
    confidence_reason: raw.confidence_reason || '',
    workspace_action: raw.workspace_action || null,
    visualizations: (
      Array.isArray(raw.visualizations) && raw.visualizations.length
        ? raw.visualizations
        : Array.isArray(raw.charts)
          ? raw.charts
          : []
    ).map(normalizeVisualization),
    evidence: Array.isArray(raw.evidence) ? raw.evidence : [],
    meta: raw.meta || {},
    follow_up_suggestions: Array.isArray(raw.follow_up_suggestions) ? raw.follow_up_suggestions : [],
  };
}

/**
 * Queries the persistent AI Analyst / analysis engine for deep insights.
 * Calls /api/analyze proxy route only — client never calls n8n directly.
 *
 * AnalyzerOS is dataset-agnostic: on failure we throw a clear error rather
 * than substituting a hardcoded e-commerce/geography answer, which would be
 * actively wrong for any other kind of dataset (e.g. sports, marketing).
 */
export async function askAnalyzerOS({
  datasetId,
  question,
  sessionId,
  userId,
  organizationId,
  expectedRowCount,
  source = 'analyst',
}: AskAnalyzerOSParams): Promise<BIAnalysisResponse> {
  const trimmed = question.trim();
  if (!datasetId) {
    throw new Error(DATASET_NOT_READY_MESSAGE);
  }
  assertValidDatasetId(datasetId);

  if (process.env.NODE_ENV === 'development') {
    if (source === 'dashboard') {
      console.log('DASHBOARD DATASET ID:', datasetId);
    } else {
      console.log('AI DATASET ID:', datasetId);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);

  try {
    const proxyRes = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        dataset_id: datasetId,
        question: trimmed,
        session_id: sessionId,
        purpose: source,
        ...(typeof expectedRowCount === 'number' ? { expected_row_count: expectedRowCount } : {}),
        ...(userId ? { user_id: userId } : {}),
        ...(organizationId ? { organization_id: organizationId } : {}),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[askAnalyzerOS] /api/analyze responded: status=${proxyRes.status}`);
    }

    let data: any;
    try {
      data = await proxyRes.json();
    } catch {
      throw new Error('The backend is unavailable. Please try again.');
    }

    if (!proxyRes.ok) {
      if (data?.error === 'DATASET_ROWS_NOT_FOUND') {
        throw new Error(DATASET_ROWS_UNAVAILABLE_MESSAGE);
      }
      const errMsg = data?.error || data?.message || `The backend is unavailable (status ${proxyRes.status}).`;
      throw new Error(errMsg);
    }

    if (data && (data.headline || data.chat_answer || data.executive_summary || data.summary || data.kpis || data.charts)) {
      return normalizeAnalysisResponse(data, trimmed, datasetId);
    }

    console.warn('[askAnalyzerOS] Unexpected response shape from backend.', data);
    throw new Error('AnalyzerOS could not process this dataset. The backend response was not understood.');
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err?.name === 'AbortError') {
      throw new Error('The request timed out. Please try again.');
    }

    throw err;
  }
}

// Backward compatibility alias for existing code
export const askDealOS = ({
  question,
  sessionId,
  datasetId,
}: {
  question: string;
  sessionId: string;
  datasetId: string;
  filters?: Record<string, any>;
}) => askAnalyzerOS({ datasetId, question, sessionId });

export const analyzeDataset = (datasetId: string, prompt?: string) =>
  askAnalyzerOS({
    datasetId,
    question: prompt || DASHBOARD_ANALYSIS_QUESTION,
    sessionId: getDashboardSessionId(datasetId),
    source: 'dashboard',
  });

function getDashboardSessionId(datasetId: string) {
  return `dashboard_${datasetId}`;
}
