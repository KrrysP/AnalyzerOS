import { NextRequest, NextResponse } from 'next/server';
import {
  ANALYST_SYSTEM_RULES,
  assertAnalysisDatasetId,
  buildRowEvidence,
  claimsZeroRows,
  rowValidationSql,
  synthesizeRowAnalysis,
} from '@/lib/dataset-rows';

// Server-side only — never exposed to the client bundle
const N8N_ANALYZE_URL = process.env.N8N_ANALYZE_URL;

const ANALYZE_TIMEOUT_MS = 120_000; // 2 minutes
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEGACY_PLACEHOLDER_DATASET_ID = '00000000-0000-4000-8000-000000000001';

export async function POST(req: NextRequest) {
  if (!N8N_ANALYZE_URL) {
    return NextResponse.json(
      { success: false, error: 'N8N_ANALYZE_URL is not configured.' },
      { status: 500 }
    );
  }

  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON in request body.' },
      { status: 400 }
    );
  }

  if (!body?.dataset_id) {
    return NextResponse.json(
      { success: false, error: 'Missing required field: dataset_id.' },
      { status: 400 }
    );
  }

  if (
    typeof body.dataset_id !== 'string' ||
    body.dataset_id === LEGACY_PLACEHOLDER_DATASET_ID ||
    !UUID_REGEX.test(body.dataset_id)
  ) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid datasetId in frontend state: ${String(body.dataset_id)}`,
      },
      { status: 400 }
    );
  }

  if (!body?.question?.trim()) {
    return NextResponse.json(
      { success: false, error: 'Missing required field: question.' },
      { status: 400 }
    );
  }

  const datasetId = assertAnalysisDatasetId(body.dataset_id);
  const expectedRowCount =
    typeof body.expected_row_count === 'number' ? body.expected_row_count : undefined;

  let rowEvidence;
  try {
    rowEvidence = await buildRowEvidence(datasetId, expectedRowCount);
  } catch (error: any) {
    if (error?.code === 'DATASET_ROWS_NOT_FOUND') {
      return NextResponse.json(
        {
          success: false,
          error: 'DATASET_ROWS_NOT_FOUND',
          message: error.message,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: error?.message || 'Unable to load persisted dataset rows.' },
      { status: 502 }
    );
  }

  const synthesized = synthesizeRowAnalysis(body.question.trim(), rowEvidence);
  if (synthesized) {
    return NextResponse.json(synthesized);
  }

  const payload = {
    dataset_id: datasetId,
    question: body.question.trim(),
    session_id: body.session_id ?? null,
    ...(body.user_id ? { user_id: body.user_id } : {}),
    ...(body.organization_id ? { organization_id: body.organization_id } : {}),
    timestamp: new Date().toISOString(),
    analyst_system_rules: ANALYST_SYSTEM_RULES,
    row_store: {
      table: 'public.dealos_dataset_rows',
      value_column: 'clean_data',
      dataset_id: datasetId,
      persisted_row_count: rowEvidence.row_count,
      validation_sql: rowValidationSql(datasetId),
      columns: rowEvidence.columns.map((column) => column.column_name),
      facts: rowEvidence.facts,
    },
  };

  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[API /analyze] Forwarding question to n8n: dataset_id="${payload.dataset_id}" question="${payload.question.substring(0, 80)}..." → ${N8N_ANALYZE_URL}`
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);

  try {
    const res = await fetch(N8N_ANALYZE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API /analyze] n8n responded with status ${res.status}`);
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'n8n returned an error response');
      console.error(`[API /analyze] n8n error ${res.status}:`, errorText);
      return NextResponse.json(
        {
          success: false,
          error: `Analysis backend returned status ${res.status}. Please try again.`,
          details: errorText,
        },
        { status: res.status }
      );
    }

    const data = await res.json();

    if (process.env.NODE_ENV === 'development') {
      console.log('[API /analyze] n8n analysis response received. headline:', data?.headline);
    }

    const n8nText = `${data?.headline || ''} ${data?.executive_summary || ''} ${data?.chat_answer || ''} ${data?.summary || ''}`;
    if (rowEvidence.row_count === 0 || (claimsZeroRows(n8nText) && (expectedRowCount || 0) > 0 && rowEvidence.row_count == null)) {
      return NextResponse.json(
        {
          success: false,
          error: 'DATASET_ROWS_NOT_FOUND',
          message: 'The dataset is registered, but its stored rows could not be accessed.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ...data,
      dataset_id: datasetId,
      meta: {
        ...(data?.meta || {}),
        persisted_row_count: rowEvidence.row_count,
        row_store: 'public.dealos_dataset_rows',
      },
    });
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error?.name === 'AbortError') {
      console.error('[API /analyze] Analysis request timed out after 120s');
      return NextResponse.json(
        { success: false, error: 'Analysis timed out. The backend is taking too long. Please try again.' },
        { status: 504 }
      );
    }

    console.error('[API /analyze] Network or proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal analysis proxy error. Please check your network connection.',
      },
      { status: 500 }
    );
  }
}
