'use client';

import React from 'react';
import { Sparkles, Compass, ShieldCheck, BrainCircuit } from 'lucide-react';

interface LandingHeroProps {
  onLoadDemo: () => void;
  onOpenHowItWorks: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onLoadDemo, onOpenHowItWorks }) => {
  return (
    <div className="text-center max-w-2xl mx-auto mb-8 animate-fadeIn">
      {/* Eyebrow Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Know what changed. Understand why.</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4 leading-tight">
        Turn your data into answers.
      </h1>

      {/* Subheadline */}
      <p className="text-base text-slate-600 max-w-xl mx-auto mb-6 leading-relaxed">
        Upload a CSV and AnalyzerOS will automatically clean, understand, and analyze your business data.
      </p>

      {/* Quick Action Badges */}
      <div className="flex items-center justify-center gap-4 text-xs">
        <button
          onClick={onLoadDemo}
          className="inline-flex items-center gap-1.5 font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/70 px-3.5 py-1.5 rounded-lg transition-colors border border-indigo-200/60 shadow-xs"
        >
          <span>⚡ Try sample dataset (Olist • 99,441 rows)</span>
        </button>
        <button
          onClick={onOpenHowItWorks}
          className="text-slate-500 hover:text-slate-700 underline underline-offset-4 transition-colors"
        >
          How it works
        </button>
      </div>
    </div>
  );
};

export const CapabilityCards: React.FC = () => {
  const capabilities = [
    {
      icon: Compass,
      title: 'Automatic Dataset Understanding',
      description: 'Automatically identifies your fields, key measures, dates, and useful ways to group results.',
    },
    {
      icon: ShieldCheck,
      title: 'Data Quality & Cleaning',
      description: 'Audit dataset health (0–100 quality score), inspect missing values, and review automatic vs suggested cleanup steps.',
    },
    {
      icon: BrainCircuit,
      title: 'AI Business Analysis',
      description: 'Ask business questions to investigate trends, decompose root-cause drivers, and update live BI dashboards dynamically.',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl w-full mx-auto mt-10">
      {capabilities.map((cap, idx) => {
        const Icon = cap.icon;
        return (
          <div
            key={idx}
            className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100/60 flex items-center justify-center text-indigo-600 mb-3.5">
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1.5">{cap.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{cap.description}</p>
          </div>
        );
      })}
    </div>
  );
};
