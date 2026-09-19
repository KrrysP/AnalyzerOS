'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  memo,
} from 'react';
import {
  Sparkles,
  Send,
  X,
  Loader2,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { ChatMessage as ChatMessageType, BIAnalysisResponse, WorkspaceAction } from '@/lib/types';
import { SavedInvestigation } from '@/context/WorkspaceContext';
import { ChatMessage } from './ChatMessage';
import { SuggestedQuestion } from './SuggestedQuestion';
import {
  formatDimensionLabel,
  formatMetricLabel,
  isSystemMetadataField,
} from '@/lib/display-labels';

interface AIAnalystPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when user submits a question. Returns a new investigation or null on error. */
  onSendMessage: (query: string) => Promise<SavedInvestigation | null>;
  /** Called on mount / build dashboard to seed the initial welcome message */
  initialAnalysis?: BIAnalysisResponse | null;
  isAnalyzing: boolean;
  onExecuteAction: (action: WorkspaceAction) => void;
  onViewInvestigation?: (id: string) => void;
  rowCount: number;
  dimensions?: string[];
  metrics?: string[];
  timeFields?: string[];
  domain?: string;
}

// Stable memoized message row — prevents full list re-render on new messages
const MemoizedChatMessage = memo(ChatMessage);

// Stable memoized suggested question pill
const MemoizedSuggestedQuestion = memo(SuggestedQuestion);

export const AIAnalystPanel: React.FC<AIAnalystPanelProps> = ({
  isOpen,
  onClose,
  onSendMessage,
  initialAnalysis,
  isAnalyzing,
  onExecuteAction,
  onViewInvestigation,
  rowCount,
  dimensions = [],
  metrics = [],
  timeFields = [],
  domain,
}) => {
  // Local chat state — typed input and message history are ONLY here
  // Typing does NOT propagate to parent; no global re-renders from chat input
  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasSeededRef = useRef(false);

  // Seed welcome message when initial analysis arrives (only once)
  useEffect(() => {
    if (initialAnalysis && !hasSeededRef.current) {
      hasSeededRef.current = true;
      const welcome: ChatMessageType = {
        id: 'msg_welcome',
        role: 'assistant',
        content:
          initialAnalysis.chat_answer ||
          initialAnalysis.executive_summary ||
          'AnalyzerOS has built your BI workspace. Ask any question to investigate metrics, segments, or anomalies.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        structuredResponse: initialAnalysis,
      };
      setMessages([welcome]);
    }
  }, [initialAnalysis]);

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAnalyzing, scrollToBottom]);

  // Dynamically generate suggested questions using the actual detected
  // metrics/dimensions/time fields for THIS dataset — never hardcoded
  // business or football terminology, so suggestions change per dataset.
  const dynamicSuggested = useMemo(() => {
    const list: string[] = ['Give me an overview'];
    const usableDimensions = dimensions.filter((item) => !isSystemMetadataField(item));
    const usableMetrics = metrics.filter((item) => !isSystemMetadataField(item));
    const topMetric = usableMetrics[0] ? formatMetricLabel(usableMetrics[0]) : '';
    const topDimension = usableDimensions[0] ? formatDimensionLabel(usableDimensions[0]) : '';

    if (timeFields.length > 0) {
      list.push(topMetric ? `Has ${topMetric} changed over time?` : 'What changed over time?');
    }
    if (topDimension && topMetric) {
      list.push(`Which ${topDimension} have the highest ${topMetric}?`);
    } else if (topDimension) {
      list.push(`How does performance vary by ${topDimension}?`);
    }
    if (usableDimensions[1] && topMetric) {
      list.push(`How does ${topMetric} vary by ${formatDimensionLabel(usableDimensions[1])}?`);
    }
    list.push('What looks unusual?', 'What should I investigate next?');
    if (usableMetrics.length > 1) {
      list.push('What are the biggest drivers?');
    }
    return Array.from(new Set(list)).slice(0, 6);
  }, [dimensions, metrics, timeFields]);

  const handleSend = useCallback(async () => {
    const q = inputQuery.trim();
    if (!q || isAnalyzing) return;

    setSendError(null);
    setInputQuery(''); // Clear input immediately — before await

    const userMessage: ChatMessageType = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);

    const investigation = await onSendMessage(q);

    if (investigation) {
      const analysis = investigation.analysis;
      const assistantMessage: ChatMessageType = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: analysis.chat_answer || investigation.chatAnswer || analysis.executive_summary || 'Analysis complete.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        structuredResponse: analysis,
        investigationId: investigation.id,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } else {
      const errorMessage: ChatMessageType = {
        id: `ast_err_${Date.now()}`,
        role: 'assistant',
        content:
          'AnalyzerOS could not complete that request. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setSendError('Analysis failed. Try again.');
    }
  }, [inputQuery, isAnalyzing, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSend();
      }
    },
    [handleSend]
  );

  const handleSuggestedClick = useCallback(
    async (prompt: string) => {
      if (isAnalyzing) return;
      setSendError(null);

      const userMessage: ChatMessageType = {
        id: `usr_${Date.now()}`,
        role: 'user',
        content: prompt,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, userMessage]);

      const investigation = await onSendMessage(prompt);
      if (investigation) {
        const analysis = investigation.analysis;
        const assistantMessage: ChatMessageType = {
          id: `ast_${Date.now()}`,
          role: 'assistant',
          content: analysis.chat_answer || investigation.chatAnswer || analysis.executive_summary || 'Analysis complete.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          structuredResponse: analysis,
          investigationId: investigation.id,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    },
    [isAnalyzing, onSendMessage]
  );

  const handleExecuteActionLocal = useCallback(
    (action: WorkspaceAction) => {
      onExecuteAction(action);
    },
    [onExecuteAction]
  );

  const handleSelectSuggestion = useCallback(
    (sug: string) => {
      handleSuggestedClick(sug);
    },
    [handleSuggestedClick]
  );

  if (!isOpen) return null;

  return (
    <aside className="w-full md:w-[380px] lg:w-[410px] bg-white border-l border-slate-200/90 flex flex-col flex-shrink-0 z-20 h-full select-none shadow-xs">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/90 flex items-center justify-between flex-shrink-0 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">AI Analyst</h3>
            <p className="text-[11px] text-slate-500 truncate max-w-[220px]" title={domain}>
              {domain ? `Ask anything about ${domain}` : 'Ask anything about this dataset'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Timeline */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Suggested Prompts if short history */}
        {messages.length <= 1 && (
          <div className="space-y-2 mb-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-indigo-500" />
              <span>Suggested Inquiries</span>
            </div>
            <div className="space-y-1.5">
              {dynamicSuggested.map((q, idx) => (
                <MemoizedSuggestedQuestion
                  key={idx}
                  question={q}
                  onClick={handleSuggestedClick}
                  disabled={isAnalyzing}
                />
              ))}
            </div>
          </div>
        )}

        {/* Message timeline */}
        {messages.map((msg) => (
          <MemoizedChatMessage
            key={msg.id}
            message={msg}
            onExecuteAction={handleExecuteActionLocal}
            onSelectSuggestion={handleSelectSuggestion}
            onViewInvestigation={onViewInvestigation}
          />
        ))}

        {/* Loading indicator */}
        {isAnalyzing && (
          <div className="flex items-center gap-2.5 text-xs text-indigo-900 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600 flex-shrink-0" />
            <span className="font-medium">Analyzing your data…</span>
          </div>
        )}

        {/* Send error */}
        {sendError && !isAnalyzing && (
          <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{sendError}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input fixed at bottom */}
      <div className="p-3.5 border-t border-slate-200/90 bg-white flex-shrink-0">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
          <input
            type="text"
            placeholder="Ask AnalyzerOS about your data…"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isAnalyzing}
            className="flex-1 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none py-1.5"
          />
          <button
            onClick={handleSend}
            disabled={!inputQuery.trim() || isAnalyzing}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 text-white transition-all shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
          <span className="font-mono">{rowCount.toLocaleString()} clean records in scope</span>
          <span className="text-indigo-600 font-medium">Your data is ready</span>
        </div>
      </div>
    </aside>
  );
};
