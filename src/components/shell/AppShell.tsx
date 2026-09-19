'use client';

import React, { useState, useCallback, memo, useMemo } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { OverviewDashboard } from '../dashboard/OverviewDashboard';
import { SegmentExplorer } from '../dashboard/SegmentExplorer';
import { InvestigationView } from '../investigation/InvestigationView';
import { DatasetView } from '../dataset/DatasetView';
import { DataQualityView } from '../dashboard/DataQualityView';
import { AIAnalystPanel } from '../copilot/AIAnalystPanel';
import { DashboardErrorBoundary } from './DashboardErrorBoundary';
import { SettingsModal } from '../modals/SettingsModal';
import { ExportModal } from '../modals/ExportModal';
import { DynamicVisualization } from '../dashboard/DynamicVisualization';
import { KpiCard } from '../dashboard/KpiCard';
import {
  UploadResponse,
  BIAnalysisResponse,
  WorkspaceAction,
} from '@/lib/types';
import { InsightsView } from '../dashboard/views/InsightsView';
import { useWorkspace } from '@/context/WorkspaceContext';
import { asText } from '@/lib/formatters';
import type { InsightCardData } from '@/lib/types';
import {
  TrendingUp,
  Layers,
  BarChart3,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface AppShellProps {
  uploadData?: UploadResponse;
  initialAnalysis?: BIAnalysisResponse;
  onNewDataset?: () => void;
}

// ---------------------------------------------------------------------------
// Memoized view sub-components to prevent unnecessary re-renders when only
// the AI panel or input state changes.
// ---------------------------------------------------------------------------

const MetricsView = memo(function MetricsView({
  datasetName,
  kpis,
  visualizations,
  highlightKeys,
}: {
  datasetName: string;
  kpis: BIAnalysisResponse['kpis'];
  visualizations: BIAnalysisResponse['visualizations'];
  highlightKeys: string[];
}) {
  return (
    <div className="space-y-6 pb-12">
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">Key Measures</h2>
        </div>
        <p className="text-xs text-slate-500">
          Review the most important results found in {datasetName}.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis?.map((kpi, idx) => (
          <KpiCard key={idx} kpi={kpi} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {visualizations
          ?.filter((v) => v.type === 'bar' || v.type === 'histogram' || v.type === 'kpi_card')
          .map((viz, idx) => (
            <DynamicVisualization
              key={viz.id || idx}
              visualization={viz}
              highlightKeys={highlightKeys}
            />
          ))}
      </div>
    </div>
  );
});

const TrendsView = memo(function TrendsView({
  visualizations,
  highlightKeys,
  hasTimeFields,
}: {
  visualizations: BIAnalysisResponse['visualizations'];
  highlightKeys: string[];
  hasTimeFields: boolean;
}) {
  const trendViz = visualizations?.filter(
    (v) => v.type === 'line' || v.type === 'area' || v.type === 'stacked_bar'
  );
  const hasLineCharts = trendViz && trendViz.length > 0;
  return (
    <div className="space-y-6 pb-12">
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">Trends Over Time</h2>
        </div>
        <p className="text-xs text-slate-500">
          See how your results change over time and where unusual shifts appear.
        </p>
      </div>
      {!hasTimeFields ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200/90 text-sm text-slate-500">
          No suitable time field was detected for this dataset.
        </div>
      ) : hasLineCharts ? (
        <div className="grid grid-cols-1 gap-5">
          {trendViz!.map((viz, idx) => (
            <DynamicVisualization key={viz.id || idx} visualization={viz} highlightKeys={highlightKeys} />
          ))}
        </div>
      ) : (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200/90 text-sm text-slate-500">
          A date field was found, but no trend chart is available yet. Ask the AI Analyst about changes over
          time to build one.
        </div>
      )}
    </div>
  );
});

const SegmentsView = memo(function SegmentsView({
  dimensions,
  metrics,
  detectedColumns,
  visualizations,
  highlightKeys,
  onSelectElement,
}: {
  dimensions: unknown[];
  metrics: unknown[];
  detectedColumns: UploadResponse['detected']['columns'];
  visualizations: BIAnalysisResponse['visualizations'];
  highlightKeys: string[];
  onSelectElement: (el: string) => void;
}) {
  const segmentViz = visualizations?.filter(
    (v) => v.type === 'map' || v.type === 'bar' || v.type === 'stacked_bar' || v.type === 'table'
  );
  return (
    <div className="space-y-6 pb-12">
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">Segment Breakdown</h2>
        </div>
        <p className="text-xs text-slate-500">
          Compare a measure across the groups AnalyzerOS found in this dataset.
        </p>
      </div>
      {segmentViz && segmentViz.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {segmentViz.map((viz, idx) => (
            <DynamicVisualization
              key={viz.id || idx}
              visualization={viz}
              highlightKeys={highlightKeys}
              onSelectElement={onSelectElement}
            />
          ))}
        </div>
      )}
      <SegmentExplorer
        dimensions={dimensions}
        metrics={metrics}
        detectedColumns={detectedColumns}
        highlightKeys={highlightKeys}
        onSelectElement={onSelectElement}
      />
    </div>
  );
});

const DashboardSkeleton = memo(function DashboardSkeleton() {
  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      <div className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-64 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    </div>
  );
});

const DashboardError = memo(function DashboardError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6 bg-white rounded-2xl border border-slate-200/90 animate-fadeIn">
      <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-900">AnalyzerOS could not process this dataset.</h3>
      <p className="text-xs text-slate-500 mt-1.5 max-w-sm">{message}</p>
      <button
        onClick={onRetry}
        className="mt-5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Retry</span>
      </button>
    </div>
  );
});

/**
 * Builds Insight cards from the real analysis result — confirmed findings
 * and key drivers actually returned for THIS dataset — rather than a fixed
 * set of example insights that would misrepresent whatever was uploaded.
 */
function deriveInsightCards(data: BIAnalysisResponse): InsightCardData[] {
  const cards: InsightCardData[] = [];

  (data.key_drivers || []).forEach((kd, idx) => {
    const status = (kd.status || '').toLowerCase();
    const type = status === 'verified' ? 'Verified' : status === 'uncertain' ? 'Hypothesis' : 'Association';
    cards.push({
      id: `driver_${idx}`,
      finding: asText(kd.driver),
      type,
      confidence: kd.impact === 'high' ? 0.9 : kd.impact === 'low' ? 0.6 : 0.75,
      detail: asText(kd.explanation || kd.detail),
    });
  });

  (data.confirmed_findings || []).forEach((item, idx) => {
    const text = typeof item === 'string' ? item : asText(item.finding || item.detail);
    cards.push({
      id: `finding_${idx}`,
      finding: text,
      type: 'Verified',
      confidence: 0.9,
      detail: typeof item === 'object' ? asText(item.detail) : '',
    });
  });

  return cards;
}

// ---------------------------------------------------------------------------
// Main AppShell
// ---------------------------------------------------------------------------

export const AppShell: React.FC<AppShellProps> = ({
  uploadData: propUploadData,
  initialAnalysis: propInitialAnalysis,
  onNewDataset: propOnNewDataset,
}) => {
  const workspace = useWorkspace();

  const uploadData = workspace.uploadResponse || propUploadData!;
  const analysisData = workspace.baseAnalysis || propInitialAnalysis!;
  const currentView = workspace.selectedView || 'overview';
  const isAnalyzing = workspace.isAnalyzing;
  const highlightStates = workspace.highlightKeys;

  const [isAiOpen, setIsAiOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');

  // Derive these once — stable reference unless uploadResponse changes
  const dimensions = useMemo(
    () => uploadData.detected?.dimensions || uploadData.dimensions || [],
    [uploadData]
  );
  const detectedDimensions = useMemo(
    () => uploadData.detected?.dimensions || uploadData.dimensions || [],
    [uploadData]
  );
  const detectedMetrics = useMemo(
    () => uploadData.detected?.metrics || uploadData.metrics || [],
    [uploadData]
  );
  const metrics = useMemo(
    () =>
      uploadData.detected?.metrics?.map((m) => (typeof m === 'string' ? m : m.metric_name)) ||
      uploadData.metrics ||
      [],
    [uploadData]
  );
  const timeFields = useMemo(
    () => uploadData.detected?.time_fields || uploadData.time_fields || [],
    [uploadData]
  );

  const handleExecuteAction = useCallback(
    (action: WorkspaceAction) => {
      workspace.applyWorkspaceAction(action);
    },
    [workspace.applyWorkspaceAction]
  );

  const handleNewDataset = useCallback(() => {
    propOnNewDataset?.();
    workspace.handleNewDataset();
  }, [propOnNewDataset, workspace.handleNewDataset]);

  const handleSelectElement = useCallback(
    (el: string) => workspace.handleSelectView('segments', undefined, [el]),
    [workspace.handleSelectView]
  );

  const handleToggleAi = useCallback(() => setIsAiOpen((v) => !v), []);
  const handleOpenExport = useCallback(() => setIsExportOpen(true), []);
  const handleOpenSettings = useCallback(() => setIsSettingsOpen(true), []);
  const handleRefresh = useCallback(() => workspace.handleBuildDashboard(), [workspace.handleBuildDashboard]);
  const handleSelectView = useCallback(
    (view: string) => workspace.handleSelectView(view),
    [workspace.handleSelectView]
  );
  const handleRunInvestigation = useCallback(() => {
    setIsAiOpen(true);
  }, []);
  const handleViewInvestigation = useCallback(
    (id: string) => {
      workspace.handleOpenInvestigation(id);
    },
    [workspace.handleOpenInvestigation]
  );

  // Render view content — memoize based on currentView + analysisData + highlightStates + uploadData
  const viewContent = useMemo(() => {
    // Analysis hasn't resolved yet (screen switches to 'workspace' before the
    // async /api/analyze call completes) — show a skeleton instead of crashing.
    // If it failed, show a real error with Retry rather than fake data.
    if (!analysisData) {
      if (workspace.error) {
        return <DashboardError message={workspace.error} onRetry={() => workspace.handleBuildDashboard()} />;
      }
      return <DashboardSkeleton />;
    }

    switch (currentView) {
      case 'overview':
        return (
          <OverviewDashboard
            data={analysisData}
            dataset={uploadData.dataset}
            cleaning={uploadData.cleaning}
            investigations={workspace.investigations}
            onInvestigate={(view, focus) => workspace.handleSelectView(view, focus)}
            onRunInvestigation={handleRunInvestigation}
            onOpenInvestigation={handleViewInvestigation}
            highlightStates={highlightStates}
            onSelectElement={handleSelectElement}
          />
        );

      case 'metrics':
        return (
          <MetricsView
            datasetName={uploadData.dataset.name}
            kpis={analysisData.kpis}
            visualizations={analysisData.visualizations}
            highlightKeys={highlightStates}
          />
        );

      case 'trends':
        return (
          <TrendsView
            visualizations={analysisData.visualizations}
            highlightKeys={highlightStates}
            hasTimeFields={timeFields.length > 0}
          />
        );

      case 'segments':
        return (
          <SegmentsView
            dimensions={detectedDimensions}
            metrics={detectedMetrics}
            detectedColumns={uploadData.detected?.columns || []}
            visualizations={analysisData.visualizations}
            highlightKeys={highlightStates}
            onSelectElement={handleSelectElement}
          />
        );

      case 'data_quality':
        return <DataQualityView uploadData={uploadData} />;

      case 'investigations':
      case 'investigation':
        return <InvestigationView />;

      case 'dataset':
        return <DatasetView uploadData={uploadData} defaultTab="table" />;

      case 'columns':
        return <DatasetView uploadData={uploadData} defaultTab="columns" />;

      case 'insights':
        return (
          <InsightsView
            insights={deriveInsightCards(analysisData)}
            onInvestigate={(targetView) => workspace.handleSelectView(targetView)}
          />
        );

      default:
        return (
          <OverviewDashboard
            data={analysisData}
            dataset={uploadData.dataset}
            cleaning={uploadData.cleaning}
            investigations={workspace.investigations}
            onInvestigate={(view, focus) => workspace.handleSelectView(view, focus)}
            onRunInvestigation={handleRunInvestigation}
            onOpenInvestigation={handleViewInvestigation}
            highlightStates={highlightStates}
          />
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentView,
    analysisData,
    highlightStates,
    uploadData,
    dimensions,
    metrics,
    detectedDimensions,
    detectedMetrics,
    timeFields,
    handleSelectElement,
    workspace.investigations,
    workspace.error,
    workspace.handleBuildDashboard,
    handleRunInvestigation,
    handleViewInvestigation,
  ]);

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#F8FAFC] text-slate-900 select-none">
      {/* Left Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={handleSelectView}
        datasetName={uploadData.dataset.name}
        rowCount={uploadData.dataset.row_count_clean}
        colCount={uploadData.dataset.column_count}
        onNewDataset={handleNewDataset}
        onOpenSettings={handleOpenSettings}
        dimensions={dimensions}
        metrics={metrics}
        investigationCount={workspace.investigations.length}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Bar */}
        <TopNav
          datasetName={uploadData.dataset.name}
          rowCount={uploadData.dataset.row_count_clean}
          colCount={uploadData.dataset.column_count}
          qualityScore={uploadData.dataset.quality_score}
          domain={uploadData.dataset.domain}
          isAiOpen={isAiOpen}
          onToggleAi={handleToggleAi}
          onRefresh={handleRefresh}
          onExport={handleOpenExport}
          onNewDataset={handleNewDataset}
          currentView={currentView}
        />

        {/* Dynamic Center Canvas + AI Right Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Dashboard Canvas — only re-renders when view/analysis/highlights change */}
          <main className="flex-1 overflow-y-auto p-5 md:p-8 min-w-0">
            <DashboardErrorBoundary key={currentView} resetKey={analysisData} onRetry={handleRefresh}>
              {viewContent}
            </DashboardErrorBoundary>
          </main>

          {/* AI Analyst Copilot Sidebar — manages its own chat state */}
          <AIAnalystPanel
            isOpen={isAiOpen}
            onClose={() => setIsAiOpen(false)}
            onSendMessage={workspace.handleSendMessage}
            initialAnalysis={analysisData}
            isAnalyzing={isAnalyzing}
            onExecuteAction={handleExecuteAction}
            onViewInvestigation={handleViewInvestigation}
            rowCount={uploadData.dataset.row_count_clean}
            dimensions={dimensions}
            metrics={metrics}
            timeFields={timeFields}
            domain={uploadData.dataset.domain}
          />
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        n8nWebhookUrl={n8nWebhookUrl}
        onSaveWebhookUrl={setN8nWebhookUrl}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        analysisData={analysisData}
        uploadData={uploadData}
      />
    </div>
  );
};
