import { NextRequest, NextResponse } from 'next/server';
import { unwrapIngestPayload } from '@/lib/dataset-identity';

const INGEST_TIMEOUT_MS = 300_000;

export async function POST(req: NextRequest) {
  const n8nIngestUrl = process.env.N8N_INGEST_URL;
  if (!n8nIngestUrl) {
    return NextResponse.json(
      { success: false, error: 'N8N_INGEST_URL is not configured.' },
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

  const requiredFields = [
    'storage_bucket',
    'storage_path',
    'dataset_name',
    'original_filename',
    'file_size',
    'dataset_session_id',
  ] as const;
  const missing = requiredFields.filter(
    (field) => body?.[field] === undefined || body?.[field] === null || body?.[field] === ''
  );

  if (missing.length > 0) {
    return NextResponse.json(
      { success: false, error: `Missing required fields: ${missing.join(', ')}` },
      { status: 400 }
    );
  }

  const payload = {
    storage_bucket: body.storage_bucket,
    storage_path: body.storage_path,
    dataset_name: body.dataset_name,
    original_filename: body.original_filename,
    file_size: body.file_size,
    dataset_session_id: body.dataset_session_id,
    user_id: body.user_id ?? null,
    organization_id: body.organization_id ?? null,
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('[API /ingest] Forwarding storage metadata to n8n:', {
      ...payload,
      storage_path: payload.storage_path,
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), INGEST_TIMEOUT_MS);

  try {
    const response = await fetch(n8nIngestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const raw = await response.json().catch(() => ({
      success: false,
      error: `Ingestion backend returned a non-JSON response (status ${response.status}).`,
    }));
    const data = unwrapIngestPayload(raw) || raw;

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[API /ingest] n8n responded with status ${response.status}; dataset_id=${(data as any)?.dataset?.id || 'none'}`
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Dataset processing timed out. Retry processing to continue.' },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { success: false, error: error?.message || 'Dataset ingestion request failed.' },
      { status: 502 }
    );
  }
}
