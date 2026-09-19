'use client';

import React, { useState } from 'react';
import {
  RefreshCw,
  Download,
  Sparkles,
  PlusCircle,
  ShieldCheck,
} from 'lucide-react';

interface TopNavProps {
  datasetName: string;
  rowCount: number;
  colCount: number;
  qualityScore: number;
  domain?: string;
  isAiOpen: boolean;
  onToggleAi: () => void;
  onRefresh: () => void;
  onExport: () => void;
  onNewDataset?: () => void;
  currentView?: string;
}

export const TopNav: React.FC<TopNavProps> = ({
  datasetName,
  rowCount,
  colCount,
  qualityScore,
  domain,
  isAiOpen,
  onToggleAi,
  onRefresh,
  onExport,
  onNewDataset,
  currentView = 'overview',
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const viewTitles: Record<string, string> = {
    overview: 'Overview',
    metrics: 'Key Measures',
    trends: 'Trends Over Time',
    segments: 'Segment Explorer',
    data_quality: 'Data Quality',
    investigations: 'Investigations',
    columns: 'Fields',
    dataset: 'Dataset',
    revenue: 'Revenue Analysis',
    customers: 'Customer Cohorts',
    products: 'Product Categories',
    geography: 'Geographic Breakdown',
    operations: 'Operational SLA',
    insights: 'Saved Insights',
  };

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200/90 px-4 flex items-center justify-between flex-shrink-0 z-10 select-none">
      {/* Left: Brand + Dataset Name + Current View + Quality Score */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-slate-900 tracking-tight flex-shrink-0">
            AnalyzerOS
          </span>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-xs text-slate-800 truncate max-w-[160px] md:max-w-xs">
            {datasetName}
          </span>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 hidden sm:inline-block flex-shrink-0">
            {viewTitles[currentView] || currentView}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-200 hidden md:block" />

        {/* Row count & Quality Score badge */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <span className="font-mono text-slate-500 text-[11px]">
            {rowCount.toLocaleString()} rows • {colCount} cols
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3 h-3" />
            <span>{qualityScore}/100 Quality</span>
          </span>
          {domain && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 max-w-[220px] truncate"
              title={domain}
            >
              {domain}
            </span>
          )}
        </div>
      </div>

      {/* Right Controls: Refresh, Export, New Dataset, AI Toggle */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Refresh */}
        <button
          onClick={handleRefreshClick}
          title="Refresh Analysis"
          className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
        </button>

        {/* Export */}
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* New Dataset */}
        {onNewDataset && (
          <button
            onClick={onNewDataset}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">New Dataset</span>
          </button>
        )}

        {/* AI Analyst Sidebar Toggle */}
        <button
          onClick={onToggleAi}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            isAiOpen
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Analyst</span>
        </button>
      </div>
    </header>
  );
};
