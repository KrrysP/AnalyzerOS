'use client';

import React from 'react';

interface TechnicalDetailsProps {
  children: React.ReactNode;
  label?: string;
}

export function TechnicalDetails({
  children,
  label = 'Show technical details',
}: TechnicalDetailsProps) {
  return (
    <details className="group text-xs">
      <summary className="cursor-pointer list-none font-medium text-slate-500 hover:text-slate-700">
        <span className="group-open:hidden">{label}</span>
        <span className="hidden group-open:inline">Hide technical details</span>
      </summary>
      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600">
        {children}
      </div>
    </details>
  );
}
