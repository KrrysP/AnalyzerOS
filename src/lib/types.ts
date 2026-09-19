export type ColumnRole = 'metric' | 'dimension' | 'time' | 'identifier';
export type ColumnType = 'numeric' | 'categorical' | 'datetime' | 'text' | 'boolean';

export interface DatasetGrain {
  description: string;
  confidence?: 'high' | 'medium' | 'low' | string;
}

export interface DatasetInfo {
  id: string;
  name: string;
  original_filename?: string;
  row_count_raw: number;
  row_count_clean: number;
  column_count: number;
  quality_score: number;
  domain: string;
  grain: DatasetGrain | string;
  upload_date?: string;
  file_size?: string;
}

export interface DetectedColumn {
  name: string;
  role?: ColumnRole | string;
  meaning?: string;
  confidence?: number;
  type?: ColumnType | string;
  null_percentage?: number;
  missing_pct?: number;
  unique_count?: number;
  unique_values?: number;
  sample_values?: (string | number)[];
}

export interface DetectedMetric {
  metric_name: string;
  metric_type?: string;
  formula_description?: string;
  confidence?: number;
  requires_confirmation?: boolean;
}

export interface QualityIssue {
  field?: string;
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'warning' | 'info' | 'error';
  action?: string;
}

export interface CleaningReport {
  automatic_actions: string[];
  suggested_actions: (string | Record<string, any>)[];
  quality_issues: QualityIssue[];
}

export type CleaningSuggestionDecisionKind = 'approve' | 'ignore' | 'edit';
export type CleaningSuggestionStatus = 'pending' | 'approved' | 'ignored' | 'edited';

export interface CleaningSuggestionDecision {
  datasetId: string;
  columnName: string;
  suggestion: string;
  decision: CleaningSuggestionDecisionKind;
  userOverride?: string;
  backendConfirmed: true;
  transformationApplied?: boolean;
  route?: string;
  rowsAffected?: number;
}

export interface UploadResponse {
  success?: boolean;
  dataset: DatasetInfo;
  detected: {
    columns: DetectedColumn[];
    metrics: (DetectedMetric | string)[];
    dimensions: string[];
    time_fields: string[];
  };
  cleaning: CleaningReport;
  sample_rows: Record<string, any>[];
  next?: {
    analyze_endpoint?: string;
    suggested_question?: string;
  };
  // Compatibility helpers
  profile?: {
    name: string;
    rows_raw: number;
    rows_clean: number;
    columns: number;
    quality_score: number;
    domain: string;
    grain: string;
    file_size?: string;
    upload_date?: string;
  };
  dataset_id?: string;
  metrics?: string[];
  dimensions?: string[];
  time_fields?: string[];
  detected_columns?: DetectedColumn[];
  quality_issues?: QualityIssue[];
  cleaning_log?: string[];
}

export interface KPI {
  name?: string;
  label: string;
  current_value?: number | string;
  previous_value?: number | string;
  change_absolute?: number | string;
  change_pct?: number | string;
  direction?: 'up' | 'down' | 'neutral';
  format?: 'currency' | 'number' | 'percent' | 'decimal' | string;
  sparkline?: number[];
  period?: string;
  attribution?: string;
  positiveIsGood?: boolean;
  value?: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface KeyDriver {
  driver: string;
  driver_type?: 'Mathematical Driver' | 'Root Cause' | 'Association' | 'Hypothesis' | string;
  impact?: 'high' | 'medium' | 'low' | string;
  explanation?: string;
  status?: 'Verified' | 'Hypothesis' | 'Uncertain' | string;
  detail?: string;
  direction?: 'up' | 'down' | 'neutral';
}

export interface RecommendedAction {
  action: string;
  reason?: string;
  detail?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface Evidence {
  analysis?: string;
  period?: string;
  query_summary?: string;
  facts?: string[];
  claim?: string;
  source?: string;
  confidence?: number;
  metric?: string;
  comparison?: string;
}

export interface WorkspaceAction {
  view: string;
  focus?: string;
  highlight_keys?: string[];
  filter_applied?: string;
}

export interface Visualization {
  id?: string;
  type: 'kpi_card' | 'line' | 'bar' | 'stacked_bar' | 'table' | 'scatter' | 'histogram' | 'map' | 'area' | 'pie' | 'composed' | string;
  title: string;
  description?: string;
  xKey?: string;
  yKeys?: string[];
  data: any[];
  colors?: string[];
  highlight_keys?: string[];
}

export interface ConfirmedFindingItem {
  id?: string;
  finding: string;
  type?: 'Verified' | 'Association' | 'Hypothesis' | string;
  confidence?: number;
  detail?: string;
  metric?: string;
  actionLink?: WorkspaceAction;
}

export interface BIAnalysisResponse {
  original_question?: string;
  dataset_id?: string;
  headline: string;
  executive_summary: string;
  chat_answer?: string;
  analysis_type?: string;
  kpis: KPI[];
  key_drivers: KeyDriver[];
  confirmed_findings: (string | ConfirmedFindingItem)[];
  ruled_out_or_weak_drivers: string[];
  remaining_uncertainties: string[];
  recommended_actions: (RecommendedAction | string)[];
  confidence: 'High' | 'Medium' | 'Low' | number | string;
  confidence_reason?: string;
  workspace_action?: WorkspaceAction | null;
  visualizations: Visualization[];
  evidence: Evidence[];
  meta?: Record<string, any>;
  follow_up_suggestions?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  structuredResponse?: BIAnalysisResponse;
  investigationId?: string;
}

export interface InvestigationNode {
  id: string;
  title: string;
  change: string;
  direction: 'up' | 'down' | 'neutral';
  status: 'primary_driver' | 'secondary_driver' | 'ruled_out' | 'uncertain';
  impactPercentage?: number;
  description: string;
  children?: InvestigationNode[];
}

// Aliases for compatibility
export type UploadDatasetResult = UploadResponse;
export type AnalysisResponse = BIAnalysisResponse;
export type ColumnDefinition = DetectedColumn;
export type DatasetProfile = DatasetInfo;
export type KPICardData = KPI;
export type Recommendation = RecommendedAction;
export type EvidenceItem = Evidence;
export type VisualizationSpec = Visualization;
export type InsightCardData = ConfirmedFindingItem;
