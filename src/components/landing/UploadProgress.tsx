'use client';

import React from 'react';
import { Check, Loader2, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

interface UploadProgressProps {
  fileName: string;
  fileSize: string;
  step: number;
  error?: string | null;
  canRetryProcessing?: boolean;
  onRetry?: () => void;
  onCancel?: () => void;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  fileName,
  fileSize,
  step,
  error,
  canRetryProcessing = false,
  onRetry,
  onCancel,
}) => {
  const stagedMessages = [
    { label: 'Uploading file' },
    { label: 'File stored' },
    { label: 'Starting dataset processing' },
    { label: 'Profiling dataset' },
    { label: 'Preparing AnalyzerOS workspace' },
  ];

  const currentStep = Math.min(step, stagedMessages.length - 1);

  return (
    <div className="h-full overflow-y-auto bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8">
        {/* Header Icon */}
        <div className="text-center mb-6">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${
              error
                ? 'bg-rose-50 border border-rose-100 text-rose-600'
                : 'bg-indigo-50 border border-indigo-100 text-indigo-600'
            }`}
          >
            {error ? (
              <AlertCircle className="w-6 h-6" />
            ) : (
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#6366F1" />
                <path
                  d="M8 22L16 10L24 22"
                  stroke="white"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="16" cy="18" r="2" fill="white" />
              </svg>
            )}
          </div>

          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {error
              ? canRetryProcessing
                ? 'File uploaded successfully, but processing failed.'
                : 'Upload Failed'
              : 'Preparing your dataset…'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 truncate">
            {fileName} {fileSize ? `• ${fileSize}` : ''}
          </p>
        </div>

        {/* Error View or Staged Checklist */}
        {error ? (
          <div className="space-y-4 mb-6">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed">
              <div className="font-semibold mb-1 flex items-center gap-1.5 text-rose-900">
                <AlertCircle className="w-4 h-4" />
                <span>{canRetryProcessing ? 'Processing Error' : 'Storage Upload Error'}</span>
              </div>
              <p>{error}</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 py-2 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Choose Another File</span>
                </button>
              )}
              {onRetry && canRetryProcessing && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Processing</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Checklist of Staged Messages */}
            <div className="space-y-2.5 mb-7">
              {stagedMessages.map((s, idx) => {
                const isDone = idx < currentStep;
                const isCurrent = idx === currentStep;
                const isPending = idx > currentStep;

                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 text-xs transition-all duration-300 py-1.5 px-2.5 rounded-lg ${
                      isCurrent ? 'bg-indigo-50 text-indigo-700 font-semibold' : ''
                    } ${isDone ? 'text-slate-700 font-medium' : ''} ${isPending ? 'text-slate-400' : ''}`}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                      {isDone && (
                        <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      )}
                      {isCurrent && <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />}
                      {isPending && <div className="w-2 h-2 rounded-full bg-slate-200" />}
                    </div>
                    <span className="truncate">{s.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Stage indicator — Supabase's standard upload call does not expose byte progress. */}
            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span>Storage upload &amp; autonomous profiling</span>
              <span className="font-mono">Stage {currentStep + 1} of {stagedMessages.length}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
