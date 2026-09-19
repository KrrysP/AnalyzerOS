import { NextRequest, NextResponse } from 'next/server';

const CLEANING_TIMEOUT_MS = 120_000;
const ALLOWED_DECISIONS = new Set(['approve', 'ignore', 'edit']);

export async function POST(req: NextRequest) {
  const cleaningUrl = process.env.N8N_CLEANING_URL;
  if (!cleaningUrl) {
    return NextResponse.json(
      { success: false, error: 'N8N_CLEANING_URL is not configured.' },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON request body.' },
      { status: 400 }
    );
  }

  const datasetId = typeof body?.dataset_id === 'string' ? body.dataset_id.trim() : '';
  const suggestion = typeof body?.suggestion === 'string' ? body.suggestion.trim() : '';
  const decision = typeof body?.decision === 'string' ? body.decision.trim().toLowerCase() : '';
  const userOverride =
    typeof body?.user_override === 'string' ? body.user_override.trim() : body?.user_override ?? null;

  if (!datasetId || !suggestion || !decision) {
    return NextResponse.json(
      { success: false, error: 'dataset_id, suggestion, and decision are required.' },
      { status: 400 }
    );
  }
  if (!ALLOWED_DECISIONS.has(decision)) {
    return NextResponse.json(
      { success: false, error: 'decision must be approve, ignore, or edit.' },
      { status: 400 }
    );
  }
  if (decision === 'edit' && (typeof userOverride !== 'string' || !userOverride)) {
    return NextResponse.json(
      { success: false, error: 'user_override is required when decision is edit.' },
      { status: 400 }
    );
  }

  const payload = {
    dataset_id: datasetId,
    column_name: typeof body.column_name === 'string' ? body.column_name : '',
    suggestion,
    decision,
    user_override: decision === 'edit' ? userOverride : null,
    user_id: body.user_id ?? null,
    organization_id: body.organization_id ?? null,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLEANING_TIMEOUT_MS);

  try {
    const response = await fetch(cleaningUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const responseText = await response.text();
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: `Cleaning backend returned a non-JSON response (status ${response.status}).`,
          details: responseText,
        },
        { status: response.ok ? 502 : response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Cleaning decision request timed out.' },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { success: false, error: error?.message || 'Cleaning decision request failed.' },
      { status: 502 }
    );
  }
}
