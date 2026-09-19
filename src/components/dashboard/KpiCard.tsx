'use client';

import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, Info } from 'lucide-react';
import { KPI } from '@/lib/types';
import { formatMetricValue, formatChange, resolveKpiFormat, formatExactValue } from '@/lib/formatters';
import { formatMetricLabel, sanitizeUserFacingText } from '@/lib/display-labels';

interface KpiCardProps {
  kpi: KPI;
  onClick?: () => void;
  isFocused?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({ kpi, onClick, isFocused }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Formatted display value — override backend format when the metric name
  // clearly describes a count (never show a currency symbol on "Matches").
  const resolvedFormat = resolveKpiFormat(kpi.label || kpi.name, kpi.format);
  const displayValue = kpi.value || formatMetricValue(kpi.current_value, resolvedFormat);
  const exactValue = kpi.value ? undefined : formatExactValue(kpi.current_value);
  const isAbbreviated = !kpi.value && exactValue !== undefined && exactValue !== displayValue;

  // Change information
  const changeInfo = formatChange(kpi.change_absolute, kpi.change_pct);
  const changeText = kpi.change || changeInfo.text;

  // Trend direction
  const isUp = kpi.direction === 'up' || kpi.trend === 'up' || changeInfo.isPositive;
  const isDown = kpi.direction === 'down' || kpi.trend === 'down' || changeInfo.isNegative;

  // Good/bad sentiment: default positive is good unless specified
  const positiveIsGood = kpi.positiveIsGood !== false;
  const isGood = isUp ? positiveIsGood : !positiveIsGood;

  // Only render a sparkline when the backend actually provided verified
  // time-series data for this metric — never fabricate a trend.
  const sparklineData = Array.isArray(kpi.sparkline) && kpi.sparkline.length > 1 ? kpi.sparkline : null;
  let points = '';
  const width = 80;
  const height = 28;
  if (sparklineData) {
    const minVal = Math.min(...sparklineData);
    const maxVal = Math.max(...sparklineData);
    const range = maxVal - minVal || 1;
    points = sparklineData
      .map((val, idx) => {
        const x = (idx / (sparklineData.length - 1)) * width;
        const y = height - ((val - minVal) / range) * (height - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-2xl border p-5 shadow-xs transition-all duration-200 ${
        isFocused
          ? 'border-indigo-500 ring-2 ring-indigo-400/40 shadow-sm'
          : 'border-slate-200/90 hover:border-slate-300 hover:shadow-sm'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Top row: Label & Info Icon */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {formatMetricLabel(kpi.label || kpi.name)}
        </span>
        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="text-slate-400 hover:text-slate-600 p-0.5"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          {showTooltip && (kpi.attribution || exactValue) && (
            <div className="absolute right-0 bottom-full mb-1 w-48 bg-slate-900 text-white text-[11px] rounded-lg p-2 shadow-lg z-20 pointer-events-none">
              {kpi.attribution ? sanitizeUserFacingText(kpi.attribution) : `Exact value: ${exactValue}`}
            </div>
          )}
        </div>
      </div>

      {/* Main value & Change badge */}
      <div className="flex items-baseline justify-between gap-2">
        <div
          className="text-2xl font-bold text-slate-900 tracking-tight font-mono"
          title={isAbbreviated ? exactValue : undefined}
        >
          {displayValue}
        </div>

        {changeText && (
          <div
            className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
              isDown
                ? isGood
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-rose-50 text-rose-700 border border-rose-100'
                : isUp
                ? isGood
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-rose-50 text-rose-700 border border-rose-100'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {isDown ? (
              <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : isUp ? (
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <Minus className="w-3.5 h-3.5" />
            )}
            <span>{changeText}</span>
          </div>
        )}
      </div>

      {/* Bottom row: Sparkline & Comparison Period */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
        <span className="text-[11px] text-slate-400 truncate max-w-[130px]">
          {kpi.period || 'vs previous baseline'}
        </span>

        {/* SVG Sparkline — only rendered when the backend gave us real trend data */}
        {sparklineData && (
          <div className="w-20 h-7">
            <svg width={width} height={height} className="overflow-visible">
              <polyline
                fill="none"
                stroke={isDown ? (isGood ? '#10B981' : '#F43F5E') : '#10B981'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
