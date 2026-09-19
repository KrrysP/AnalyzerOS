'use client';

import React from 'react';
import { BIAnalysisResponse, DatasetInfo, CleaningReport } from '@/lib/types';
import { SavedInvestigation } from '@/context/WorkspaceContext';
import { KpiCard } from './KpiCard';
import { DynamicVisualization } from './DynamicVisualization';
import { asText } from '@/lib/formatters';
import {
  formatFieldLabel,
  formatQualityIssueLabel,
  sanitizeUserFacingText,
} from '@/lib/display-labels';
import {
  ShieldCheck,
  ArrowRight,
  Search,
  Sparkles,
  Clock,
  Database,
} from 'lucide-react';

interface OverviewDashboardProps {
  data: BIAnalysisResponse;
  dataset: DatasetInfo;
  cleaning?: CleaningReport;
  investigations?: SavedInvestigation[];
  onInvestigate?: (view: string, focus?: string) => void;
  onRunInvestigation?: () => void;
  onOpenInvestigation?: (id: string) => void;
  highlightStates?: string[];
  onSelectElement?: (element: string) => void;
}

function formatConfidence(confidence: SavedInvestigation['confidence']) {
  if (typeof confidence === 'number') {
    const pct = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
    return `${pct}%`;
  }
  const text = asText(confidence);
  const numeric = parseFloat(text);
  if (!Number.isNaN(numeric) && /\d/.test(text)) {
    const pct = numeric <= 1 ? Math.round(numeric * 100) : Math.round(numeric);
    return `${pct}%`;
  }
  return text;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  data,
  dataset,
  cleaning,
  investigations = [],
  onInvestigate,
  onRunInvestigation,
  onOpenInvestigation,
  highlightStates = [],
  onSelectElement,
}) => {
  const grain =
    typeof dataset.grain === 'string' ? dataset.grain : asText(dataset.grain?.description);
  const qualityIssues = cleaning?.quality_issues || [];
  const quickInsights = (data.confirmed_findings || []).slice(0, 3);
  const recentInvestigations = investigations.slice(0, 3);

  const handleRunInvestigation = () => {
    if (onRunInvestigation) {
      onRunInvestigation();
      return;
    }
    onInvestigate?.('investigations');
  };

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
      {/* Dataset Header / Metadata */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                <Database className="w-3 h-3" />
                <span>Dataset Overview</span>
              </span>
              {dataset.domain && (
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 max-w-[280px] truncate"
                  title={asText(dataset.domain)}
                >
                  {asText(dataset.domain)}
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
              {asText(dataset.name)}
            </h1>
            <p className="text-xs text-slate-500">
              {dataset.row_count_clean.toLocaleString()} clean rows • {dataset.column_count} fields
              {grain ? ` • ${grain}` : ''}
            </p>
          </div>

          <div className="p-3 px-5 rounded-xl bg-emerald-50 border border-emerald-200 text-center flex-shrink-0">
            <div className="text-2xl font-bold text-emerald-700 font-mono">{dataset.quality_score}/100</div>
            <div className="text-[10px] uppercase font-semibold text-emerald-600">Quality Score</div>
          </div>
        </div>
      </div>

      {/* Core Metrics */}
      {data.kpis && data.kpis.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Key Measures</h2>
            <span className="text-[11px] text-slate-400">{data.kpis.length} tracked results</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.kpis.map((kpi, idx) => (
              <KpiCard
                key={idx}
                kpi={kpi}
                onClick={() => onInvestigate?.('metrics', kpi.label || kpi.name)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Top Visualizations */}
      {data.visualizations && data.visualizations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Highlights</h2>
            <span className="text-[11px] text-slate-400">From the initial review</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {data.visualizations.map((viz, idx) => (
              <div
                key={viz.id || idx}
                id={viz.id || `viz_${idx}`}
                className={idx === 0 && data.visualizations.length % 2 !== 0 ? 'lg:col-span-2' : ''}
              >
                <DynamicVisualization
                  visualization={viz}
                  highlightKeys={highlightStates}
                  onSelectElement={onSelectElement}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Quality Snapshot */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Data Quality Snapshot</h2>
          </div>
          <button
            onClick={() => onInvestigate?.('data_quality')}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            View audit →
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
            <div className="text-[10px] uppercase font-semibold text-emerald-700">Quality score</div>
            <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">{dataset.quality_score}/100</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] uppercase font-semibold text-slate-500">Issues flagged</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">{qualityIssues.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] uppercase font-semibold text-slate-500">Suggested remediations</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">{cleaning?.suggested_actions?.length || 0}</div>
          </div>
        </div>
        {qualityIssues.slice(0, 3).map((iss, idx) => (
          <div key={idx} className="mt-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">{formatFieldLabel(iss.field)}</span>
            {iss.field ? ' — ' : ''}
            {formatQualityIssueLabel(iss.issue)}
          </div>
        ))}
      </div>

      {/* Quick Insights */}
      {quickInsights.length > 0 && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Quick Insights</h2>
          <div className="space-y-2">
            {quickInsights.map((item, idx) => {
              const text = sanitizeUserFacingText(
                typeof item === 'string' ? item : asText(item.finding || item.detail || item)
              );
              return (
                <div key={idx} className="text-xs text-slate-700 leading-relaxed flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                  <span>{text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Run an Investigation CTA */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-50 via-white to-slate-50 border border-indigo-100 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-700">
              <Sparkles className="w-4 h-4" />
              <h2 className="text-base font-bold text-slate-900">Run an Investigation</h2>
            </div>
            <p className="text-xs text-slate-600 max-w-xl">
              Ask AnalyzerOS to investigate trends, drivers, anomalies, segments, or any question about this
              dataset.
            </p>
          </div>
          <button
            onClick={handleRunInvestigation}
            className="flex-shrink-0 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <span>Run an Investigation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Recent Investigations */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Recent Investigations</h2>
          </div>
          {investigations.length > 0 && (
            <button
              onClick={() => onInvestigate?.('investigations')}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              View all →
            </button>
          )}
        </div>

        {recentInvestigations.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            No investigations yet. Ask the AI Analyst a question to start one.
          </p>
        ) : (
          <div className="space-y-2">
            {recentInvestigations.map((inv) => (
              <button
                key={inv.id}
                onClick={() => onOpenInvestigation?.(inv.id)}
                className="w-full text-left p-3.5 rounded-xl border border-slate-200/90 hover:border-indigo-300 hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate">{asText(inv.question)}</div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <span className="font-medium text-indigo-600">
                        {formatConfidence(inv.confidence)} confidence
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {inv.timestamp}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1 flex-shrink-0">
                    View
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
