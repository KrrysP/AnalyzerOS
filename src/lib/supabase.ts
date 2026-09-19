import { createClient } from '@supabase/supabase-js';

export const DATASET_STORAGE_BUCKET = 'analyzeros-datasets';

export interface StoredDatasetUpload {
  bucket: string;
  storagePath: string;
  originalFilename: string;
  fileSize: number;
  /** Upload/session folder only. Never use this as dataset_id. */
  datasetSessionId: string;
}

function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase Storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  return createClient(url, anonKey);
}

function sanitizeFileName(fileName: string): string {
  const extension = '.csv';
  const baseName = fileName.slice(0, -extension.length);
  const sanitizedBase =
    baseName
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'dataset';

  return `${sanitizedBase}${extension}`;
}

export async function uploadDatasetToStorage(file: File): Promise<StoredDatasetUpload> {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    throw new Error('Invalid file type. Only .csv files are supported.');
  }
  if (file.size <= 0) {
    throw new Error('The selected CSV file is empty.');
  }
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new Error('This browser cannot create a secure dataset upload session.');
  }

  // Storage folder key only. The persisted dataset UUID comes from ingest.
  const datasetSessionId = crypto.randomUUID();
  const sanitizedFileName = sanitizeFileName(file.name);
  const storagePath = `datasets/${datasetSessionId}/${sanitizedFileName}`;
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase.storage
    .from(DATASET_STORAGE_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || 'text/csv',
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return {
    bucket: DATASET_STORAGE_BUCKET,
    storagePath,
    originalFilename: file.name,
    fileSize: file.size,
    datasetSessionId,
  };
}
