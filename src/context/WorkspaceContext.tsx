'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  UploadResponse,
  BIAnalysisResponse,
  WorkspaceAction,
  CleaningSuggestionDecision,
} from '@/lib/types';
import {
  ingestStoredDataset,
  askAnalyzerOS,
  assertValidDatasetId,
  isWebhookMetadataProfile,
  LEGACY_PLACEHOLDER_DATASET_ID,
  DASHBOARD_ANALYSIS_QUESTION,
  DATASET_ROWS_UNAVAILABLE_MESSAGE,
} from '@/lib/api';
import {
  uploadDatasetToStorage,
  type StoredDatasetUpload,
} from '@/lib/supabase';
import { getOrCreateSessionId, clearSession } from '@/lib/session';
import {
  type ActiveDataset,
  clearPersistedActiveDataset,
  loadPersistedActiveDataset,
  persistActiveDataset,
  requireActiveDatasetId,
  toActiveDataset,
} from '@/lib/dataset-identity';

export type AppScreen = 'upload' | 'processing' | 'review' | 'workspace';

export interface SavedInvestigation {
  id: string;
  question: string;
  createdAt: string;
  timestamp: string;
  headline: string;
  executiveSummary: string;
  chatAnswer: string;
  kpis: BIAnalysisResponse['kpis'];
  keyDrivers: BIAnalysisResponse['key_drivers'];
  confirmedFindings: BIAnalysisResponse['confirmed_findings'];
  ruledOutOrWeakDrivers: BIAnalysisResponse['ruled_out_or_weak_drivers'];
  remainingUncertainties: BIAnalysisResponse['remaining_uncertainties'];
  recommendedActions: BIAnalysisResponse['recommended_actions'];
  confidence: BIAnalysisResponse['confidence'];
  confidenceReason?: string;
  visualizations: BIAnalysisResponse['visualizations'];
  evidence: BIAnalysisResponse['evidence'];
  analysis_type?: string;
  analysis: BIAnalysisResponse;
}

interface WorkspaceContextValue {
  screen: AppScreen;
  uploadResponse: UploadResponse | null;
  activeDataset: ActiveDataset | null;
  datasetId: string | null;
  baseAnalysis: BIAnalysisResponse | null;
  latestInvestigation: SavedInvestigation | null;
  sessionId: string;
  selectedView: string;
  highlightKeys: string[];
  confirmedMetrics: Record<string, boolean>;
  isAnalyzing: boolean;
  processingStep: number;
  processingFileName: string;
  processingFileSize: string;
  error: string | null;
  pendingStorageUpload: StoredDatasetUpload | null;
  canRetryProcessing: boolean;
  investigations: SavedInvestigation[];
  activeInvestigationId: string | null;
  cleaningDecisions: Record<string, CleaningSuggestionDecision>;

  // Actions
  handleFileUpload: (file: File) => Promise<void>;
  handleLoadDemo: () => Promise<void>;
  handleRetry: () => Promise<void>;
  handleConfirmMetric: (metricName: string) => void;
  handleBuildDashboard: () => Promise<BIAnalysisResponse | null>;
  handleSendMessage: (question: string) => Promise<SavedInvestigation | null>;
  handleSelectView: (view: string, focus?: string, highlights?: string[]) => void;
  handleNewDataset: () => void;
  handleOpenInvestigation: (id: string) => void;
  upsertCleaningDecision: (suggestionId: string, decision: CleaningSuggestionDecision) => void;
  applyWorkspaceAction: (action: WorkspaceAction | null | undefined) => void;
  clearError: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const STORAGE_KEY = 'analyzeros_workspace_state_v3';
const PENDING_INGEST_KEY = 'analyzeros_pending_ingest';

function investigationsKey(datasetId: string) {
  return `analyzeros_investigations_v1_${datasetId}`;
}

function cleaningDecisionsKey(datasetId: string) {
  return `analyzeros_cleaning_decisions_v2_${datasetId}`;
}

function legacyCleaningDecisionsKey(datasetId: string) {
  return `analyzeros_cleaning_decisions_v1_${datasetId}`;
}


function formatTimestamp(date: Date) {
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toInvestigation(question: string, analysis: BIAnalysisResponse): SavedInvestigation {
  const now = new Date();
  return {
    id: `inv_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    question,
    createdAt: now.toISOString(),
    timestamp: formatTimestamp(now),
    headline: analysis.headline || question,
    executiveSummary: analysis.executive_summary || '',
    chatAnswer: analysis.chat_answer || analysis.executive_summary || '',
    kpis: analysis.kpis || [],
    keyDrivers: analysis.key_drivers || [],
    confirmedFindings: analysis.confirmed_findings || [],
    ruledOutOrWeakDrivers: analysis.ruled_out_or_weak_drivers || [],
    remainingUncertainties: analysis.remaining_uncertainties || [],
    recommendedActions: analysis.recommended_actions || [],
    confidence: analysis.confidence,
    confidenceReason: analysis.confidence_reason,
    visualizations: analysis.visualizations || [],
    evidence: analysis.evidence || [],
    analysis_type: analysis.analysis_type,
    analysis,
  };
}

function normalizeView(view?: string) {
  if (!view) return undefined;
  if (view === 'investigation') return 'investigations';
  return view;
}

function hydrateInvestigation(raw: any): SavedInvestigation | null {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.analysis && raw.question) {
    const built = toInvestigation(raw.question, raw.analysis);
    return {
      ...built,
      id: raw.id || built.id,
      createdAt: raw.createdAt || built.createdAt,
      timestamp: raw.timestamp || built.timestamp,
    };
  }
  return null;
}

function loadInvestigations(datasetId: string): {
  investigations: SavedInvestigation[];
  activeInvestigationId: string | null;
} {
  try {
    const raw = localStorage.getItem(investigationsKey(datasetId));
    if (!raw) return { investigations: [], activeInvestigationId: null };
    const parsed = JSON.parse(raw);
    const investigations = Array.isArray(parsed.investigations)
      ? parsed.investigations.map(hydrateInvestigation).filter(Boolean) as SavedInvestigation[]
      : [];
    return {
      investigations,
      activeInvestigationId: parsed.activeInvestigationId || investigations[0]?.id || null,
    };
  } catch {
    return { investigations: [], activeInvestigationId: null };
  }
}

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [screen, setScreen] = useState<AppScreen>('upload');
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
  const [activeDataset, setActiveDataset] = useState<ActiveDataset | null>(null);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [baseAnalysis, setBaseAnalysis] = useState<BIAnalysisResponse | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [selectedView, setSelectedView] = useState<string>('overview');
  const [highlightKeys, setHighlightKeys] = useState<string[]>([]);
  const [confirmedMetrics, setConfirmedMetrics] = useState<Record<string, boolean>>({});
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [processingFileName, setProcessingFileName] = useState<string>('');
  const [processingFileSize, setProcessingFileSize] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [investigations, setInvestigations] = useState<SavedInvestigation[]>([]);
  const [activeInvestigationId, setActiveInvestigationId] = useState<string | null>(null);
  const [pendingStorageUpload, setPendingStorageUpload] = useState<StoredDatasetUpload | null>(null);
  const [cleaningDecisions, setCleaningDecisions] = useState<Record<string, CleaningSuggestionDecision>>({});

  const isUploadingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isAskingRef = useRef(false);
  const activeDatasetRef = useRef<ActiveDataset | null>(null);

  const setCanonicalDataset = useCallback((next: ActiveDataset | null) => {
    activeDatasetRef.current = next;
    setActiveDataset(next);
    setDatasetId(next?.id ?? null);
    if (next) {
      persistActiveDataset(next);
    } else {
      clearPersistedActiveDataset();
    }
  }, []);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      // Remove every AnalyzerOS cache entry that still references the old
      // placeholder. It must never be silently migrated into active state.
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('analyzeros')) continue;
        const value = localStorage.getItem(key);
        if (value?.includes(LEGACY_PLACEHOLDER_DATASET_ID)) {
          localStorage.removeItem(key);
        }
      }

      const persistedActive = loadPersistedActiveDataset();
      const saved = localStorage.getItem(STORAGE_KEY);
      if (
        persistedActive?.id === LEGACY_PLACEHOLDER_DATASET_ID ||
        (saved && JSON.parse(saved)?.uploadResponse?.dataset?.id === LEGACY_PLACEHOLDER_DATASET_ID)
      ) {
        clearPersistedActiveDataset();
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      const pendingIngest = localStorage.getItem(PENDING_INGEST_KEY);
      if (pendingIngest) {
        const pending = JSON.parse(pendingIngest) as StoredDatasetUpload;
        if (pending?.storagePath && pending?.bucket) {
          setPendingStorageUpload(pending);
          setProcessingFileName(pending.originalFilename);
          setProcessingFileSize(`${(pending.fileSize / (1024 * 1024)).toFixed(2)} MB`);
          setProcessingStep(2);
          setError('File uploaded successfully, but processing failed.');
          setScreen('processing');
          return;
        }
      }

      if (saved) {
        const parsed = JSON.parse(saved);
        const storedDatasetId = parsed.uploadResponse?.dataset?.id;
        if (parsed.uploadResponse && isWebhookMetadataProfile(parsed.uploadResponse)) {
          // A profile of webhook metadata (body/headers/params) was cached by
          // an earlier bad ingestion — drop it rather than rebuild a dashboard.
          localStorage.removeItem(STORAGE_KEY);
          clearPersistedActiveDataset();
          return;
        }
        if (parsed.uploadResponse && typeof storedDatasetId === 'string') {
          try {
            assertValidDatasetId(storedDatasetId);
          } catch {
            localStorage.removeItem(STORAGE_KEY);
            clearPersistedActiveDataset();
            return;
          }

          const restored = toActiveDataset(parsed.uploadResponse);

          setUploadResponse(parsed.uploadResponse);
          setCanonicalDataset(restored);
          setBaseAnalysis(parsed.baseAnalysis || parsed.activeAnalysis || null);
          setSelectedView(parsed.selectedView || 'overview');
          setConfirmedMetrics(parsed.confirmedMetrics || {});
          setSessionId(getOrCreateSessionId(restored.id));
          setScreen(parsed.screen || 'workspace');
          const stored = loadInvestigations(storedDatasetId);
          setInvestigations(stored.investigations);
          setActiveInvestigationId(stored.activeInvestigationId);
          try {
            // v1 decisions were optimistic, local-only states and cannot be
            // treated as backend approvals.
            localStorage.removeItem(legacyCleaningDecisionsKey(storedDatasetId));
            const rawDecisions = localStorage.getItem(cleaningDecisionsKey(storedDatasetId));
            const parsedDecisions = rawDecisions ? JSON.parse(rawDecisions) : {};
            setCleaningDecisions(
              Object.fromEntries(
                Object.entries(parsedDecisions).filter(
                  ([, decision]) =>
                    !!decision &&
                    typeof decision === 'object' &&
                    (decision as CleaningSuggestionDecision).backendConfirmed === true
                )
              ) as Record<string, CleaningSuggestionDecision>
            );
          } catch {
            setCleaningDecisions({});
          }
        }
      }
    } catch (e) {
      console.warn('Failed to restore workspace from localStorage:', e);
    }
  }, [setCanonicalDataset]);

  // Persist lightweight workspace state — never let investigations overwrite baseAnalysis
  useEffect(() => {
    if (uploadResponse && activeDataset && (screen === 'review' || screen === 'workspace')) {
      try {
        const activeDatasetId = requireActiveDatasetId(activeDataset, uploadResponse);
        persistActiveDataset(activeDataset);
        const stateToSave = {
          screen,
          uploadResponse,
          datasetId: activeDatasetId,
          activeDataset,
          baseAnalysis,
          selectedView,
          confirmedMetrics,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (e) {
        console.warn('Failed to cache workspace state:', e);
      }
    }
  }, [screen, uploadResponse, activeDataset, baseAnalysis, selectedView, confirmedMetrics]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && screen === 'review' && activeDataset?.id) {
      console.log('ACTIVE DATASET:', activeDataset.id);
    }
  }, [screen, activeDataset?.id]);

  // Persist investigations keyed by datasetId
  useEffect(() => {
    if (!datasetId) return;
    try {
      localStorage.setItem(
        investigationsKey(datasetId),
        JSON.stringify({ investigations, activeInvestigationId })
      );
    } catch (e) {
      console.warn('Failed to cache investigations:', e);
    }
  }, [datasetId, investigations, activeInvestigationId]);

  useEffect(() => {
    if (!datasetId) return;
    try {
      localStorage.setItem(cleaningDecisionsKey(datasetId), JSON.stringify(cleaningDecisions));
    } catch (e) {
      console.warn('Failed to cache cleaning decisions:', e);
    }
  }, [datasetId, cleaningDecisions]);

  const applyWorkspaceAction = useCallback((action: WorkspaceAction | null | undefined) => {
    if (!action) return;
    const view = normalizeView(action.view);
    if (view) {
      setSelectedView(view);
    }
    if (action.highlight_keys) {
      setHighlightKeys(action.highlight_keys);
    }
    if (action.focus) {
      setTimeout(() => {
        const el = document.getElementById(action.focus!);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
          }, 2500);
        }
      }, 100);
    }
  }, []);

  const processStoredDataset = useCallback(async (stored: StoredDatasetUpload) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsAnalyzing(true);
    setError(null);
    setProcessingStep(2);
    setScreen('processing');

    const profilingTimer = setTimeout(() => setProcessingStep(3), 800);
    const workspaceTimer = setTimeout(() => setProcessingStep(4), 3500);

    try {
      const response = await ingestStoredDataset({
        ...stored,
        datasetName: stored.originalFilename,
        userId: null,
        organizationId: null,
      });
      const nextActiveDataset = toActiveDataset(response);
      const nextSessionId = getOrCreateSessionId(nextActiveDataset.id);

      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PENDING_INGEST_KEY);
      setCanonicalDataset(nextActiveDataset);
      persistActiveDataset(nextActiveDataset);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          screen: 'review',
          uploadResponse: response,
          datasetId: nextActiveDataset.id,
          activeDataset: nextActiveDataset,
          baseAnalysis: null,
          selectedView: 'overview',
          confirmedMetrics: {},
        })
      );

      setUploadResponse(response);
      setSessionId(nextSessionId);
      setBaseAnalysis(null);
      setInvestigations([]);
      setActiveInvestigationId(null);
      setCleaningDecisions({});
      setPendingStorageUpload(null);
      setProcessingStep(4);
      setScreen('review');
    } catch (err: any) {
      console.error('[WorkspaceContext] Stored dataset ingestion failed:', err);
      setError(
        `File uploaded successfully, but processing failed. ${
          err?.message || 'Please retry processing.'
        }`
      );
    } finally {
      clearTimeout(profilingTimer);
      clearTimeout(workspaceTimer);
      setIsAnalyzing(false);
      isProcessingRef.current = false;
    }
  }, [setCanonicalDataset]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (isUploadingRef.current) return;
      isUploadingRef.current = true;
      setIsAnalyzing(true);

      setError(null);
      setPendingStorageUpload(null);
      localStorage.removeItem(PENDING_INGEST_KEY);
      setProcessingFileName(file.name);
      setProcessingFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      setProcessingStep(0);
      setScreen('processing');

      try {
        setCanonicalDataset(null);
        setUploadResponse(null);
        setBaseAnalysis(null);
        localStorage.removeItem(STORAGE_KEY);
        const stored = await uploadDatasetToStorage(file);
        setProcessingStep(1);
        setPendingStorageUpload(stored);
        localStorage.setItem(PENDING_INGEST_KEY, JSON.stringify(stored));
        await processStoredDataset(stored);
      } catch (err: any) {
        console.error('[WorkspaceContext] Storage upload failed:', err);
        setError(err?.message || 'Failed to upload the CSV to storage.');
      } finally {
        setIsAnalyzing(false);
        isUploadingRef.current = false;
      }
    },
    [processStoredDataset, setCanonicalDataset]
  );

  const handleLoadDemo = useCallback(async () => {
    // A display-only mock cannot represent a backend dataset. Requiring a
    // real upload prevents a fake UUID from reaching /api/analyze.
    setScreen('upload');
    setError('The demo dataset is not available as a backend dataset. Please upload the CSV.');
  }, []);

  const handleRetry = useCallback(async () => {
    if (pendingStorageUpload) {
      await processStoredDataset(pendingStorageUpload);
    } else {
      setScreen('upload');
    }
  }, [pendingStorageUpload, processStoredDataset]);

  const recordInvestigation = useCallback((question: string, analysis: BIAnalysisResponse) => {
    const investigation = toInvestigation(question, analysis);
    setInvestigations((prev) => [investigation, ...prev].slice(0, 50));
    setActiveInvestigationId(investigation.id);
    return investigation;
  }, []);

  const handleConfirmMetric = useCallback((metricName: string) => {
    setConfirmedMetrics((prev) => ({ ...prev, [metricName]: true }));
  }, []);

  const handleBuildDashboard = useCallback(async (): Promise<BIAnalysisResponse | null> => {
    const current = activeDatasetRef.current || activeDataset;
    const datasetId = current?.id;
    if (!datasetId) {
      setError('This dataset is not ready for analysis.');
      return null;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('ACTIVE DATASET:', datasetId);
      console.log('BUILD DASHBOARD DATASET ID:', datasetId);
    }

    const dashboardSessionId = sessionId || getOrCreateSessionId(datasetId);
    setError(null);
    setIsAnalyzing(true);

    try {
      const analysis = await askAnalyzerOS({
        datasetId,
        question: DASHBOARD_ANALYSIS_QUESTION,
        sessionId: dashboardSessionId,
        source: 'dashboard',
        expectedRowCount: current?.rowCount ?? uploadResponse?.dataset?.row_count_clean,
      });

      setBaseAnalysis(analysis);
      setScreen('workspace');

      if (analysis.workspace_action?.highlight_keys) {
        setHighlightKeys(analysis.workspace_action.highlight_keys);
      }

      return analysis;
    } catch (err: any) {
      console.error('[WorkspaceContext] Initial analysis query failed:', err);
      const message = String(err?.message || '');
      if (
        message.includes('DATASET_ROWS_NOT_FOUND') ||
        message.includes('stored rows could not be accessed') ||
        message.includes('no persisted rows')
      ) {
        setError(DATASET_ROWS_UNAVAILABLE_MESSAGE);
      } else {
        setError(message || 'AnalyzerOS could not process this dataset. Please try again.');
      }
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [uploadResponse, activeDataset, sessionId]);

  const handleSendMessage = useCallback(
    async (question: string): Promise<SavedInvestigation | null> => {
      const trimmed = question.trim();
      if (!trimmed) return null;
      const current = activeDatasetRef.current || activeDataset;
      const analysisDatasetId = current?.id;
      if (!analysisDatasetId) {
        setError('This dataset is not ready for analysis.');
        return null;
      }
      if (isAskingRef.current) return null;
      isAskingRef.current = true;

      setIsAnalyzing(true);

      try {
        const response = await askAnalyzerOS({
          datasetId: analysisDatasetId,
          question: trimmed,
          sessionId: sessionId || getOrCreateSessionId(analysisDatasetId),
          source: 'analyst',
          expectedRowCount: current?.rowCount ?? uploadResponse?.dataset?.row_count_clean,
        });

        // Never overwrite base dashboard data with follow-up questions.
        const investigation = recordInvestigation(trimmed, response);

        // workspace_action may highlight or jump to Investigations,
        // but must never replace base Overview / Metrics data.
        if (response.workspace_action) {
          const view = normalizeView(response.workspace_action.view);
          if (view === 'investigations') {
            applyWorkspaceAction(response.workspace_action);
          } else if (response.workspace_action.highlight_keys) {
            setHighlightKeys(response.workspace_action.highlight_keys);
          }
        }

        return investigation;
      } catch (err: any) {
        console.error('[WorkspaceContext] Chat message query failed:', err);
        return null;
      } finally {
        setIsAnalyzing(false);
        isAskingRef.current = false;
      }
    },
    [uploadResponse, activeDataset, sessionId, recordInvestigation, applyWorkspaceAction]
  );

  const handleSelectView = useCallback((view: string, focus?: string, highlights?: string[]) => {
    setSelectedView(normalizeView(view) || view);
    if (highlights) {
      setHighlightKeys(highlights);
    }
    if (focus) {
      setTimeout(() => {
        const el = document.getElementById(focus);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
          }, 2500);
        }
      }, 100);
    }
  }, []);

  const handleNewDataset = useCallback(() => {
    if (datasetId) {
      clearSession(datasetId);
      try {
        localStorage.removeItem(investigationsKey(datasetId));
        localStorage.removeItem(cleaningDecisionsKey(datasetId));
        localStorage.removeItem(legacyCleaningDecisionsKey(datasetId));
      } catch {}
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PENDING_INGEST_KEY);
      clearPersistedActiveDataset();
    } catch {}

    setScreen('upload');
    setUploadResponse(null);
    setCanonicalDataset(null);
    setBaseAnalysis(null);
    setSelectedView('overview');
    setHighlightKeys([]);
    setConfirmedMetrics({});
    setIsAnalyzing(false);
    setError(null);
    setPendingStorageUpload(null);
    setInvestigations([]);
    setActiveInvestigationId(null);
    setCleaningDecisions({});
  }, [datasetId, setCanonicalDataset]);

  const handleOpenInvestigation = useCallback((id: string) => {
    setActiveInvestigationId(id);
    setSelectedView('investigations');
  }, []);

  const upsertCleaningDecision = useCallback(
    (suggestionId: string, decision: CleaningSuggestionDecision) => {
      setCleaningDecisions((prev) => ({ ...prev, [suggestionId]: decision }));
    },
    []
  );

  const clearError = useCallback(() => setError(null), []);

  const latestInvestigation = investigations[0] || null;

  return (
    <WorkspaceContext.Provider
      value={{
        screen,
        uploadResponse,
        activeDataset,
        datasetId: activeDataset?.id ?? null,
        baseAnalysis,
        latestInvestigation,
        sessionId,
        selectedView,
        highlightKeys,
        confirmedMetrics,
        isAnalyzing,
        processingStep,
        processingFileName,
        processingFileSize,
        error,
        pendingStorageUpload,
        canRetryProcessing: Boolean(pendingStorageUpload),
        investigations,
        activeInvestigationId,
        cleaningDecisions,
        handleFileUpload,
        handleLoadDemo,
        handleRetry,
        handleConfirmMetric,
        handleBuildDashboard,
        handleOpenInvestigation,
        upsertCleaningDecision,
        handleSendMessage,
        handleSelectView,
        handleNewDataset,
        applyWorkspaceAction,
        clearError,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
