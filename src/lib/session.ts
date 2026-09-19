/**
 * Session management for AnalyzerOS
 * Creates and persists session_id per dataset in sessionStorage
 */

export function getOrCreateSessionId(datasetId?: string): string {
  if (typeof window === 'undefined') {
    return 'srv_session_' + Math.random().toString(36).substring(2, 10);
  }

  const key = datasetId ? `analyzer_session_${datasetId}` : 'analyzer_global_session';
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) {
      return existing;
    }

    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'ses_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

    window.sessionStorage.setItem(key, newId);
    return newId;
  } catch {
    return 'fallback_session_' + Date.now();
  }
}

export function clearSession(datasetId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (datasetId) {
      window.sessionStorage.removeItem(`analyzer_session_${datasetId}`);
    } else {
      window.sessionStorage.removeItem('analyzer_global_session');
    }
  } catch {}
}
