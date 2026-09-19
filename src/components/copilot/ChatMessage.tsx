'use client';

import React from 'react';
import { ChatMessage as ChatMessageType, WorkspaceAction } from '@/lib/types';
import { ConfidenceBadge } from './ConfidenceBadge';
import { asText } from '@/lib/formatters';
import { formatFieldLabel, sanitizeUserFacingText } from '@/lib/display-labels';
import { MarkdownContent } from './MarkdownContent';
import {
  ArrowRight,
  Layers,
} from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
  onExecuteAction?: (action: WorkspaceAction) => void;
  onSelectSuggestion?: (question: string) => void;
  onViewInvestigation?: (id: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onExecuteAction: _onExecuteAction,
  onSelectSuggestion,
  onViewInvestigation,
}) => {
  const isUser = message.role === 'user';
  const structured = message.structuredResponse;
  const technicalRequested = /show (me )?(the )?sql|how did you calculate|show technical details/i.test(
    asText(structured?.original_question)
  );
  const userFacingText = technicalRequested
    ? asText(message.content)
    : sanitizeUserFacingText(asText(message.content));

  if (isUser) {
    return (
      <div className="flex justify-end animate-fadeIn">
        <div className="max-w-[85%] bg-indigo-600 text-white px-3.5 py-2.5 rounded-2xl rounded-tr-xs text-xs shadow-sm font-medium leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Bot Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 32 32" fill="none">
              <path d="M8 22L16 10L24 22" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <circle cx="16" cy="18" r="2" fill="white" />
            </svg>
          </div>
          <span className="text-xs font-bold text-slate-900 tracking-tight">AnalyzerOS Analyst</span>
        </div>

        {structured?.confidence && (
          <ConfidenceBadge confidence={structured.confidence} />
        )}
      </div>

      {/* Main Content Box */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed space-y-3">
        {structured?.headline && (
          <h4 className="font-bold text-slate-900 text-[13px] border-b border-slate-200 pb-2">
            {technicalRequested
              ? asText(structured.headline)
              : sanitizeUserFacingText(asText(structured.headline))}
          </h4>
        )}

        <MarkdownContent content={userFacingText} />

        {/* Evidence Chips */}
        {structured?.evidence && structured.evidence.length > 0 && (
          <div className="pt-2 border-t border-slate-200">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" />
              <span>Evidence Basis</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {structured.evidence.map((ev, idx) => {
                const label =
                  formatFieldLabel((ev as any).metric) ||
                  sanitizeUserFacingText(asText(ev.analysis)) ||
                  `Evidence ${idx + 1}`;
                const detail =
                  sanitizeUserFacingText(asText((ev as any).claim)) ||
                  (technicalRequested ? asText(ev.query_summary) : '') ||
                  asText(ev.period);
                return (
                  <div
                    key={idx}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] flex items-center gap-1.5 text-slate-700 shadow-2xs"
                    title={asText(ev.source)}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                    <span className="font-medium">{label}</span>
                    {detail && <span className="text-slate-500">{detail}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {message.investigationId && onViewInvestigation && (
          <div className="pt-2 border-t border-slate-200">
            <button
              onClick={() => onViewInvestigation(message.investigationId!)}
              className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>View full investigation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Follow-up suggestions */}
      {structured?.follow_up_suggestions && structured.follow_up_suggestions.length > 0 && onSelectSuggestion && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Suggested Follow-ups
          </div>
          <div className="flex flex-wrap gap-1.5">
            {structured.follow_up_suggestions.slice(0, 3).map((sug, idx) => (
              <button
                key={idx}
                onClick={() => onSelectSuggestion(sug)}
                className="text-[11px] font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full text-left transition-colors"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
