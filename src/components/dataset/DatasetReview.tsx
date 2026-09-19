'use client';

import React, { useState } from 'react';
import {
  UploadResponse,
  DetectedMetric,
  DetectedColumn,
  QualityIssue,
} from '@/lib/types';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  Table as TableIcon,
  Sparkles,
  ArrowRight,
  Database,
  BarChart2,
  FileCheck,
  Check,
} from 'lucide-react';
import { asText } from '@/lib/formatters';
import {
  formatActionLabel,
  formatDimensionLabel,
  formatFieldLabel,
  formatMetricLabel,
  formatQualityIssueLabel,
  formatRoleLabel,
} from '@/lib/display-labels';

interface DatasetReviewProps {
  uploadResponse: UploadResponse;
  onBuildDashboard: () => Promise<any>;
  onConfirmMetric: (metricName: string) => void;
  confirmedMetrics: Record<string, boolean>;
  isBuilding?: boolean;
  errorMessage?: string | null;
}

export const DatasetReview: React.FC<DatasetReviewProps> = ({
  uploadResponse,
  onBuildDashboard,
  onConfirmMetric,
  confirmedMetrics,
  isBuilding = false,
  errorMessage = null,
}) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'columns' | 'cleaning' | 'sample'>('metrics');

  const { dataset, detected, cleaning, sample_rows } = uploadResponse;

  // Domain & Grain
  const grainText =
    typeof dataset.grain === 'object' ? dataset.grain.description : dataset.grain || 'One row per record';
  const grainConfidence =
    typeof dataset.grain === 'object' ? dataset.grain.confidence : 'high';

  // Severity color helper
  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3" />
            <span>High Severity</span>
          </span>
        );
      case 'medium':
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3" />
            <span>Medium Severity</span>
          </span>
        );
      case 'low':
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Info className="w-3 h-3" />
            <span>Low Severity</span>
          </span>
        );
    }
  };

  // Sample data columns
  const sampleColumns = sample_rows && sample_rows.length > 0 ? Object.keys(sample_rows[0]) : [];

  return (
    <div className="h-full overflow-y-auto bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Top Review Bar */}
      <header className="h-16 px-6 md:px-10 border-b border-slate-200/90 bg-white flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#6366F1" />
              <path
                d="M8 22L16 10L24 22"
                stroke="white"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="16" cy="18" r="2" fill="white" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 tracking-tight">
                {dataset.name || dataset.original_filename}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                Profiling Complete
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              {dataset.row_count_clean.toLocaleString()} clean rows • {dataset.column_count} columns • {dataset.domain}
            </div>
          </div>
        </div>

        {/* Primary CTA: Build Dashboard */}
        <button
          onClick={onBuildDashboard}
          disabled={isBuilding}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
        >
          {isBuilding ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Building Workspace…</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>Build Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </>
          )}
        </button>
      </header>

      {/* Main Review Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 space-y-6">
        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {errorMessage}
          </div>
        )}
        {/* Top Summary Banner Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Quality Score Card */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Data Quality Score</span>
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="my-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 font-mono">
                {dataset.quality_score}
              </span>
              <span className="text-sm font-semibold text-slate-400">/ 100</span>
              <span className="ml-auto text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                Excellent
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${dataset.quality_score}%` }}
              />
            </div>
          </div>

          {/* Records & Cleaning Delta */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Row Count Audit</span>
              <Database className="w-4 h-4 text-slate-400" />
            </div>
            <div className="my-3">
              <div className="text-2xl font-bold text-slate-900 font-mono">
                {dataset.row_count_clean.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {dataset.row_count_raw.toLocaleString()} raw rows inspected
              </div>
            </div>
            <div className="text-[11px] font-medium text-indigo-600 bg-indigo-50/70 px-2 py-1 rounded-md border border-indigo-100/60">
              {dataset.row_count_raw - dataset.row_count_clean === 0
                ? '100% rows validated'
                : `${dataset.row_count_raw - dataset.row_count_clean} anomalous rows cleaned`}
            </div>
          </div>

          {/* Business Domain & Grain */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Domain & Grain</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <div className="my-2">
              <div className="text-sm font-bold text-slate-900 line-clamp-1">
                {dataset.domain}
              </div>
              <div className="text-xs text-slate-500 mt-1 line-clamp-2 leading-tight">
                {grainText}
              </div>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Dataset structure confidence: {grainConfidence}
            </div>
          </div>

          {/* Discovered Architecture Stats */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Discovered Schema</span>
              <BarChart2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="grid grid-cols-3 gap-2 my-2 text-center">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-base font-bold text-slate-900 font-mono">
                  {detected.metrics?.length || 0}
                </div>
                <div className="text-[10px] text-slate-500">Suggested Measures</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-base font-bold text-slate-900 font-mono">
                  {detected.dimensions?.length || 0}
                </div>
                <div className="text-[10px] text-slate-500">Dims</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-base font-bold text-slate-900 font-mono">
                  {detected.time_fields?.length || 0}
                </div>
                <div className="text-[10px] text-slate-500">Time</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500">
              Total {dataset.column_count} fields indexed
            </div>
          </div>
        </div>

        {/* Detected Dimensions & Time Fields Chips Bar */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Suggested Groups</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {detected.dimensions && detected.dimensions.length > 0 ? (
                detected.dimensions.map((dim, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
                  >
                    {formatDimensionLabel(dim)}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">None detected</span>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Dates</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {detected.time_fields && detected.time_fields.length > 0 ? (
                detected.time_fields.map((tf, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100"
                  >
                    <Calendar className="w-3 h-3 text-indigo-500" />
                    <span>{formatFieldLabel(tf)}</span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">No date fields found</span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs for Deep Review */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-200/80 bg-slate-50/50">
            <button
              onClick={() => setActiveTab('metrics')}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'metrics'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Suggested Measures ({detected.metrics?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('columns')}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'columns'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Column Explorer ({detected.columns?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('cleaning')}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'cleaning'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Cleaning Report ({cleaning.quality_issues?.length || 0} issues)
            </button>
            <button
              onClick={() => setActiveTab('sample')}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'sample'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Sample Data ({sample_rows?.length || 0} rows)
            </button>
          </div>

          <div className="p-6">
            {/* Tab 1: Detected Metrics */}
            {activeTab === 'metrics' && (
              <div className="space-y-4">
                <div className="text-xs text-slate-500 mb-2">
                  Review and confirm the main measures identified in your dataset:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {detected.metrics?.map((m: any, idx) => {
                    const metricName = typeof m === 'string' ? m : m.metric_name;
                    const metricType = typeof m === 'string' ? 'numeric' : m.metric_type || 'metric';
                    const formula = typeof m === 'string' ? `Aggregate sum of ${m}` : m.formula_description;
                    const confidence = typeof m === 'string' ? 0.94 : m.confidence ?? 0.92;
                    const requiresConfirmation = typeof m === 'object' && m.requires_confirmation;
                    const isConfirmed = confirmedMetrics[metricName];

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border transition-all ${
                          isConfirmed
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">
                                {formatMetricLabel(metricName)}
                              </span>
                              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                                {metricType}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                              {formula}
                            </p>
                          </div>

                          {/* Confirmation Action */}
                          {requiresConfirmation && !isConfirmed ? (
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                Needs confirmation
                              </span>
                              <button
                                onClick={() => onConfirmMetric(metricName)}
                                className="mt-1 px-3 py-1 bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Confirm</span>
                              </button>
                            </div>
                          ) : isConfirmed ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 flex-shrink-0">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Confirmed</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 flex-shrink-0">
                              {Math.round(confidence * 100)}% Confidence
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: Column Explorer */}
            {activeTab === 'columns' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/70 uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3 font-semibold">Field</th>
                      <th className="py-2.5 px-3 font-semibold">Role</th>
                      <th className="py-2.5 px-3 font-semibold">Meaning</th>
                      <th className="py-2.5 px-3 font-semibold">Type</th>
                      <th className="py-2.5 px-3 font-semibold">Missing</th>
                      <th className="py-2.5 px-3 font-semibold">Unique Values</th>
                      <th className="py-2.5 px-3 font-semibold">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detected.columns?.map((col, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {formatFieldLabel(col.name)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              col.role === 'metric'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                : col.role === 'time'
                                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                : col.role === 'identifier'
                                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}
                          >
                            {formatRoleLabel(col.role || 'dimension')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                          {col.meaning || `Group: ${formatFieldLabel(col.name)}`}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {col.type || 'text'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {col.null_percentage !== undefined
                            ? `${col.null_percentage}%`
                            : col.missing_pct !== undefined
                            ? `${col.missing_pct}%`
                            : '0%'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {(col.unique_count || col.unique_values || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {col.confidence ? `${Math.round(col.confidence * 100)}%` : '95%'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 3: Cleaning Report */}
            {activeTab === 'cleaning' && (
              <div className="space-y-6">
                {/* Automatic Actions */}
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Automatic Cleaning Actions Applied</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {cleaning.automatic_actions?.map((act, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs text-slate-700 flex items-start gap-2"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span>{formatActionLabel(asText(act))}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Actions (Labeled Not Automatically Applied) */}
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider mb-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Suggestions Requiring Review</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {cleaning.suggested_actions?.map((act, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-amber-50/40 border border-amber-200/80 text-xs text-slate-700 flex items-start gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                        <div>
                          <span className="font-semibold text-amber-900 block mb-0.5">
                            {typeof act === 'string'
                              ? formatActionLabel(act)
                              : asText(
                                  act.suggestion ||
                                    act.description ||
                                    formatActionLabel(asText(act.action || act.column_name || act))
                                )}
                          </span>
                          <span className="text-[10px] text-amber-700 font-medium">
                            Waiting for your decision
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quality Issues Table */}
                <div>
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                    Flagged Quality Issues ({cleaning.quality_issues?.length || 0})
                  </div>
                  <div className="space-y-2">
                    {cleaning.quality_issues?.map((iss, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          {getSeverityBadge(iss.severity)}
                          <span className="font-semibold text-slate-900">
                            {formatFieldLabel(iss.field)}
                          </span>
                          <span className="text-slate-600">{formatQualityIssueLabel(iss.issue)}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 italic">
                          {formatActionLabel(iss.action)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Sample Data */}
            {activeTab === 'sample' && (
              <div>
                <div className="text-xs text-slate-500 mb-3">
                  Preview of the first {sample_rows?.length || 0} cleaned records from your dataset:
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px]">
                        {sampleColumns.map((col, idx) => (
                          <th key={idx} className="py-2.5 px-3 font-semibold whitespace-nowrap">
                            {formatFieldLabel(col)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sample_rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors">
                          {sampleColumns.map((col, cIdx) => (
                            <td
                              key={cIdx}
                              className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap max-w-[200px] truncate"
                            >
                              {row[col] !== undefined && row[col] !== null ? String(row[col]) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div>
            <h3 className="text-base font-bold tracking-tight">Ready to explore your dataset?</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              AnalyzerOS will prepare dashboards, trend charts, and an AI analyst for your data.
            </p>
          </div>
          <button
            onClick={onBuildDashboard}
            disabled={isBuilding}
            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer flex-shrink-0"
          >
            {isBuilding ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Preparing Workspace…</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Build Dashboard Now</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
};
