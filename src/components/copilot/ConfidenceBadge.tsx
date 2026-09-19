'use client';

import React from 'react';
import { ShieldCheck, HelpCircle } from 'lucide-react';

interface ConfidenceBadgeProps {
  confidence: number | string;
  reason?: string;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ confidence, reason }) => {
  const numericVal = typeof confidence === 'number' ? Math.round(confidence * 100) : parseInt(String(confidence), 10) || 90;

  const isHigh = numericVal >= 85;

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] text-slate-600 font-mono">
      {isHigh ? (
        <ShieldCheck className="w-3 h-3 text-emerald-600" />
      ) : (
        <HelpCircle className="w-3 h-3 text-amber-600" />
      )}
      <span className="font-semibold text-slate-800">{numericVal}% confidence</span>
    </div>
  );
};
