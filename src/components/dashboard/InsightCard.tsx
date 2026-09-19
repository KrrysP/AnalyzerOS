'use client';

import React from 'react';
import { ArrowRight, CheckCircle2, GitMerge, HelpCircle, ShieldAlert } from 'lucide-react';
import { InsightCardData } from '@/lib/types';

interface InsightCardProps {
  insight: InsightCardData;
  onInvestigate?: () => void;
}

export const InsightCard: React.FC<InsightCardProps> = ({ insight, onInvestigate }) => {
  const getBadgeStyle = (type?: string) => {
    switch (type) {
      case 'Verified':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          icon: CheckCircle2,
        };
      case 'Association':
        return {
          bg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
          icon: GitMerge,
        };
      case 'Hypothesis':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-700',
          icon: HelpCircle,
        };
      default:
        return {
          bg: 'bg-slate-50 border-slate-200 text-slate-700',
          icon: CheckCircle2,
        };
    }
  };

  const badge = getBadgeStyle(insight.type);
  const Icon = badge.icon;
  const confPct = Math.round((insight.confidence ?? 0.9) * 100);

  return (
    <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        {/* Top: Status Badge + Confidence */}
        <div className="flex items-center justify-between mb-2.5">
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${badge.bg}`}
          >
            <Icon className="w-3 h-3" />
            <span>{insight.type}</span>
          </span>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <span>Confidence</span>
            <span className="font-semibold text-slate-700">{confPct}%</span>
          </div>
        </div>

        {/* Finding headline */}
        <h4 className="text-sm font-semibold text-slate-900 mb-1.5 leading-snug group-hover:text-indigo-600 transition-colors">
          {insight.finding}
        </h4>

        {/* Supporting detail */}
        <p className="text-xs text-slate-500 leading-relaxed mb-3">
          {insight.detail}
        </p>
      </div>

      {/* Investigate CTA */}
      <button
        onClick={onInvestigate}
        className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
      >
        <span>Investigate Driver</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
};
