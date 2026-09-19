'use client';

import React from 'react';
import { MoreHorizontal, Maximize2 } from 'lucide-react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  badge,
  action,
  children,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">{title}</h3>
            {badge && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-indigo-50 text-indigo-600 rounded">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          {action}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 min-h-[220px] w-full relative">
        {children}
      </div>
      {subtitle && (
        <p className="mt-3 text-xs leading-relaxed text-slate-600">{subtitle}</p>
      )}
    </div>
  );
};
