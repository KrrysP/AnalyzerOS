'use client';

import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface SuggestedQuestionProps {
  question: string;
  onClick: (q: string) => void;
  disabled?: boolean;
}

export const SuggestedQuestion: React.FC<SuggestedQuestionProps> = ({
  question,
  onClick,
  disabled,
}) => {
  return (
    <button
      type="button"
      onClick={() => onClick(question)}
      disabled={disabled}
      className="w-full text-left p-2.5 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50/80 hover:border-indigo-300 transition-all text-xs text-slate-700 flex items-center justify-between group shadow-2xs disabled:opacity-50"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
        <span className="truncate font-medium">{question}</span>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </button>
  );
};
