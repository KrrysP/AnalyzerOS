'use client';

import React from 'react';
import { X, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGetStarted: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({
  isOpen,
  onClose,
  onGetStarted,
}) => {
  if (!isOpen) return null;

  const steps = [
    {
      step: '1',
      title: 'In-Memory CSV Profiling',
      desc: 'Upload any business CSV. AnalyzerOS checks the records and identifies useful measures, dates, and groups.',
    },
    {
      step: '2',
      title: 'Automatic KPI & Baseline Discovery',
      desc: 'The engine calculates variance, period-over-period delta, and detects baseline distributions (such as Revenue = Orders × AOV).',
    },
    {
      step: '3',
      title: 'Interactive BI Workspace & Causal Copilot',
      desc: 'Explore Tableau/Power BI style dashboards with Recharts. Ask questions in the persistent AI Analyst panel to trigger hierarchical investigation trees and focused subviews.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">How AnalyzerOS Works</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {steps.map((s) => (
            <div key={s.step} className="flex gap-3.5 items-start">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                {s.step}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-1">{s.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={() => {
              onClose();
              onGetStarted();
            }}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-600/30 transition-all"
          >
            <span>Explore Demo Dataset</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
