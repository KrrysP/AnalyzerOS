'use client';

import React, { useState } from 'react';
import { InsightCardData } from '@/lib/types';
import { InsightCard } from '../InsightCard';
import { Sparkles, CheckCircle2, GitMerge, HelpCircle, Filter } from 'lucide-react';

interface InsightsViewProps {
  insights: InsightCardData[];
  onInvestigate: (view: string, focus?: string) => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({ insights, onInvestigate }) => {
  const [filterType, setFilterType] = useState<string>('all');

  const filtered = insights.filter((ins) => {
    if (filterType === 'all') return true;
    return ins.type?.toLowerCase() === filterType.toLowerCase();
  });

  const counts = {
    all: insights.length,
    verified: insights.filter((i) => i.type === 'Verified').length,
    association: insights.filter((i) => i.type === 'Association').length,
    hypothesis: insights.filter((i) => i.type === 'Hypothesis').length,
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Sparkles className="w-3 h-3" />
                <span>Autonomous Synthesis</span>
              </span>
              <span className="text-xs text-slate-500 font-mono">5 Findings Ranked</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              AnalyzerOS Insights & Causal Findings
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Statistically verified drivers, behavioral associations, and operational hypotheses.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold select-none">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setFilterType('verified')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'verified'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Verified ({counts.verified})
            </button>
            <button
              onClick={() => setFilterType('association')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'association'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-indigo-700'
              }`}
            >
              Association ({counts.association})
            </button>
            <button
              onClick={() => setFilterType('hypothesis')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'hypothesis'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              Hypothesis ({counts.hypothesis})
            </button>
          </div>
        </div>
      </div>

      {/* Insight Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onInvestigate={() => {
              if (insight.actionLink) {
                onInvestigate(insight.actionLink.view, insight.actionLink.focus);
              } else {
                onInvestigate('investigation');
              }
            }}
          />
        ))}
      </div>
    </div>
  );
};
