import type { UploadResponse } from '@/lib/types';

export const DATASET_NOT_READY_MESSAGE =
  'This dataset is not ready for analysis. Please reprocess it.';

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const LEGACY_PLACEHOLDER_DATASET_ID = '00000000-0000-4000-8000-000000000001';

export function assertValidDatasetId(datasetId: string): void {
  if (!datasetId) {
    throw new Error(DATASET_NOT_READY_MESSAGE);
  }
  if (datasetId === LEGACY_PLACEHOLDER_DATASET_ID || !UUID_REGEX.test(datasetId)) {
    throw new Error(`Invalid datasetId in frontend state: ${datasetId}`);
  }
}

export const ACTIVE_DATASET_STORAGE_KEY = 'analyzeros_active_dataset_v1';

export interface ActiveDataset {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  qualityScore: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** n8n webhooks sometimes wrap the real payload in an array or `{ json: ... }`. */
export function unwrapIngestPayload(raw: unknown): Record<string, unknown> | null {
  if (Array.isArray(raw)) {
    for (let index = raw.length - 1; index >= 0; index -= 1) {
      const unwrapped = unwrapIngestPayload(raw[index]);
      if (unwrapped?.dataset && asRecord(unwrapped.dataset)?.id) {
        return unwrapped;
      }
    }
    return raw.length ? unwrapIngestPayload(raw[raw.length - 1]) : null;
  }

  const record = asRecord(raw);
  if (!record) return null;
  if (record.json && record.json !== raw) {
    const nested = unwrapIngestPayload(record.json);
    if (nested) return nested;
  }
  return record;
}

export function extractIngestedDatasetId(raw: unknown): string {
  const payload = unwrapIngestPayload(raw);
  if (!payload || payload.success === false) {
    throw new Error(DATASET_NOT_READY_MESSAGE);
  }

  const dataset = asRecord(payload.dataset);
  const ingestedId = typeof dataset?.id === 'string' ? dataset.id.trim() : '';
  if (!ingestedId) {
    throw new Error(DATASET_NOT_READY_MESSAGE);
  }

  assertValidDatasetId(ingestedId);
  return ingestedId;
}

export function toActiveDataset(uploadResponse: UploadResponse): ActiveDataset {
  const id = extractIngestedDatasetId(uploadResponse);
  return {
    id,
    name: uploadResponse.dataset.name,
    rowCount: uploadResponse.dataset.row_count_clean,
    columnCount: uploadResponse.dataset.column_count,
    qualityScore: uploadResponse.dataset.quality_score,
  };
}

export function requireActiveDatasetId(
  activeDataset: ActiveDataset | null | undefined,
  uploadResponse?: UploadResponse | null
): string {
  const id = activeDataset?.id || uploadResponse?.dataset?.id;
  if (!id) {
    throw new Error(DATASET_NOT_READY_MESSAGE);
  }
  assertValidDatasetId(id);
  return id;
}

export function persistActiveDataset(activeDataset: ActiveDataset): void {
  if (typeof window === 'undefined') return;
  const serialized = JSON.stringify(activeDataset);
  localStorage.setItem(ACTIVE_DATASET_STORAGE_KEY, serialized);
  sessionStorage.setItem(ACTIVE_DATASET_STORAGE_KEY, serialized);
}

export function loadPersistedActiveDataset(): ActiveDataset | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      sessionStorage.getItem(ACTIVE_DATASET_STORAGE_KEY) ||
      localStorage.getItem(ACTIVE_DATASET_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveDataset;
    if (!parsed?.id) return null;
    assertValidDatasetId(parsed.id);
    return parsed;
  } catch {
    return null;
  }
}

export function clearPersistedActiveDataset(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVE_DATASET_STORAGE_KEY);
  sessionStorage.removeItem(ACTIVE_DATASET_STORAGE_KEY);
  localStorage.removeItem('analyzeros_active_dataset_id');
  sessionStorage.removeItem('analyzeros_active_dataset_id');
}
