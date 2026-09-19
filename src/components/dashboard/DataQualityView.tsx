'use client';

import React, { useMemo, useState } from 'react';
import { UploadResponse, CleaningSuggestionDecisionKind } from '@/lib/types';
import { useWorkspace } from '@/context/WorkspaceContext';
import { asText } from '@/lib/formatters';
import { submitCleaningDecision } from '@/lib/api';
import {
  formatActionLabel,
  formatFieldLabel,
  formatQualityIssueLabel,
  sanitizeUserFacingText,
} from '@/lib/display-labels';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Check,
  Pencil,
  Ban,
  ArrowRight,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

function readableSuggestionValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map(readableSuggestionValue).filter(Boolean).join('; ');
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of [
      'suggestion',
      'recommendation',
      'description',
      'action',
      'details',
      'detail',
      'message',
      'text',
      'title',
      'reason',
    ]) {
      const readable = readableSuggestionValue(record[key]);
      if (readable) return readable;
    }
  }
  return '';
}

function humanReadableSuggestion(entry: unknown): string {
  if (!entry || typeof entry !== 'object') return sanitizeUserFacingText(readableSuggestionValue(entry));
  const record = entry as Record<string, unknown>;
  return sanitizeUserFacingText(
    readableSuggestionValue(record.suggestion) ||
      readableSuggestionValue(record.description) ||
      readableSuggestionValue(record.action) ||
      readableSuggestionValue(record.details) ||
      readableSuggestionValue(record.recommendation) ||
      'Review this cleaning suggestion'
  );
}

function describeCleaningEntry(entry: any): { headline: string; detail: string; columnName: string } {
  if (typeof entry === 'string') return { headline: formatActionLabel(entry), detail: '', columnName: '' };
  if (!entry || typeof entry !== 'object') return { headline: formatActionLabel(asText(entry)), detail: '', columnName: '' };

  const columnName = asText(entry.column_name || entry.columnName || entry.field || entry.column || '');
  const headline =
    entry.suggestion || entry.description
      ? humanReadableSuggestion(entry)
      : formatActionLabel(readableSuggestionValue(entry.action || entry.details)) ||
        formatFieldLabel(columnName) ||
        'Cleaning suggestion';
  const detailParts: string[] = [];
  if (entry.reason) detailParts.push(asText(entry.reason));
  if (entry.details && typeof entry.details !== 'object') detailParts.push(asText(entry.details));
  if (entry.rows_affected !== undefined) detailParts.push(`${asText(entry.rows_affected)} rows affected`);
  return { headline, detail: detailParts.join(' — '), columnName };
}

function suggestionKey(entry: any, index: number) {
  const { headline, columnName } = describeCleaningEntry(entry);
  return `${index}:${columnName}:${headline}`.slice(0, 180);
}

interface CleaningRequestState {
  status: 'submitting' | 'error';
  decision: CleaningSuggestionDecisionKind;
  userOverride?: string;
  error?: string;
}

export const DataQualityView: React.FC<{ uploadData: UploadResponse }> = ({ uploadData }) => {
  const { cleaningDecisions, upsertCleaningDecision, handleSelectView } = useWorkspace();
  const automaticActions = uploadData.cleaning?.automatic_actions || [];
  const suggestedActions = uploadData.cleaning?.suggested_actions || [];
  const qualityIssues = uploadData.cleaning?.quality_issues || [];
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [requestStates, setRequestStates] = useState<Record<string, CleaningRequestState>>({});

  const pendingCount = useMemo(() => {
    return suggestedActions.filter((act, idx) => !cleaningDecisions[suggestionKey(act, idx)]).length;
  }, [suggestedActions, cleaningDecisions]);

  const cleaningHistory = useMemo(() => {
    const automatic = automaticActions.map((action: any, index) => {
      const rawAction = typeof action === 'string' ? action : action?.action || action?.suggestion || action?.description;
      const rowsAffected = Number(action?.rows_affected ?? action?.values_affected);
      return {
        id: `automatic-${index}`,
        label: formatActionLabel(readableSuggestionValue(rawAction)),
        outcome: 'Automatic',
        detail: Number.isFinite(rowsAffected) ? `${rowsAffected.toLocaleString()} values affected` : '',
      };
    });
    const confirmed = Object.entries(cleaningDecisions).map(([id, decision]) => {
      const outcome =
        decision.route === 'semantic'
          ? 'Interpretation saved'
          : decision.route === 'ignore' || decision.decision === 'ignore'
          ? 'Ignored'
          : decision.transformationApplied
          ? 'Applied'
          : decision.decision === 'edit'
          ? 'Edited'
          : 'Approved';
      return {
        id,
        label:
          decision.route === 'semantic'
            ? formatFieldLabel(decision.columnName) || 'Field interpretation'
            : formatActionLabel(decision.suggestion),
        outcome,
        detail:
          decision.rowsAffected !== undefined
            ? `${decision.rowsAffected.toLocaleString()} values updated`
            : decision.route === 'semantic' && decision.userOverride
            ? `"${decision.userOverride}"`
            : '',
      };
    });
    return [...automatic, ...confirmed];
  }, [automaticActions, cleaningDecisions]);

  const applyDecision = async (
    entry: any,
    index: number,
    decision: CleaningSuggestionDecisionKind,
    userOverride?: string
  ): Promise<boolean> => {
    const key = suggestionKey(entry, index);
    const { headline, columnName } = describeCleaningEntry(entry);
    const suggestion = humanReadableSuggestion(entry);
    setRequestStates((current) => ({
      ...current,
      [key]: { status: 'submitting', decision, userOverride },
    }));

    try {
      const datasetId = uploadData.dataset?.id;
      if (!datasetId) {
        throw new Error('This dataset is not ready for analysis. Please reprocess it.');
      }
      const response = await submitCleaningDecision({
        dataset_id: datasetId,
        column_name: columnName,
        suggestion,
        decision,
        user_override: decision === 'edit' ? userOverride?.trim() || null : null,
        user_id: null,
        organization_id: null,
      });
      upsertCleaningDecision(key, {
        datasetId,
        columnName,
        suggestion: headline,
        decision,
        userOverride: userOverride?.trim() || '',
        backendConfirmed: true,
        transformationApplied: response.transformation_applied === true,
        route: typeof response.route === 'string' ? response.route : undefined,
        rowsAffected: Number.isFinite(Number(response.rows_affected))
          ? Number(response.rows_affected)
          : undefined,
      });
      setRequestStates((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      return true;
    } catch (error: any) {
      setRequestStates((current) => ({
        ...current,
        [key]: {
          status: 'error',
          decision,
          userOverride,
          error: error?.message || 'Cleaning decision failed',
        },
      }));
      return false;
    }
  };

  const editingEntry = useMemo(() => {
    if (editingKey == null) return null;
    const idx = suggestedActions.findIndex((act, i) => suggestionKey(act, i) === editingKey);
    if (idx < 0) return null;
    return { entry: suggestedActions[idx], index: idx };
  }, [editingKey, suggestedActions]);
  const editingRequestState = editingKey ? requestStates[editingKey] : undefined;

  return (
    <div className="space-y-6 pb-12">
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">Data Quality &amp; Completeness Audit</h2>
          </div>
          <p className="text-xs text-slate-500">
            Comprehensive audit score and cleaning action log for {asText(uploadData.dataset.name)}.
            {suggestedActions.length > 0 && (
              <span className="ml-1 text-slate-400">
                {pendingCount} suggestion{pendingCount === 1 ? '' : 's'} still pending — you can continue anytime.
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => handleSelectView('overview')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Continue Without Changes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <div className="p-3 px-5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <div className="text-2xl font-bold text-emerald-700 font-mono">{uploadData.dataset.quality_score}/100</div>
            <div className="text-[10px] uppercase font-semibold text-emerald-600">Quality Score</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Automatically Cleaned ({automaticActions.length})</span>
          </div>
          <div className="space-y-2">
            {automaticActions.length === 0 ? (
              <div className="text-xs text-slate-400 italic">No automatic cleaning actions reported.</div>
            ) : (
              automaticActions.map((act, idx) => {
                const { headline, detail } = describeCleaningEntry(act);
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs text-slate-700 capitalize"
                  >
                    <div className="font-medium text-slate-800">{headline}</div>
                    {detail && <div className="text-slate-500 normal-case mt-0.5">{detail}</div>}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
          <div className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Needs Review ({suggestedActions.length})</span>
          </div>
          <div className="space-y-2">
            {suggestedActions.length === 0 ? (
              <div className="text-xs text-slate-400 italic">No suggested remediations.</div>
            ) : (
              suggestedActions.map((act, idx) => {
                const key = suggestionKey(act, idx);
                const { headline, detail, columnName } = describeCleaningEntry(act);
                const stored = cleaningDecisions[key];
                const requestState = requestStates[key];
                const isSubmitting = requestState?.status === 'submitting';
                const status = stored
                  ? stored.decision === 'approve'
                    ? 'approved'
                    : stored.decision === 'ignore'
                    ? 'ignored'
                    : 'edited'
                  : 'pending';
                const outcomeLabel =
                  stored?.route === 'semantic'
                    ? 'Interpretation Saved'
                    : stored?.route === 'ignore' || stored?.decision === 'ignore'
                    ? 'Ignored'
                    : stored?.transformationApplied
                    ? 'Applied'
                    : stored?.decision === 'edit'
                    ? 'Edited'
                    : stored
                    ? 'Approved'
                    : '';

                return (
                  <div
                    key={key}
                    className={`p-3 rounded-lg text-xs border ${
                      status === 'approved'
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : status === 'ignored'
                        ? 'bg-slate-50 border-slate-200'
                        : status === 'edited'
                        ? 'bg-indigo-50/40 border-indigo-200'
                        : 'bg-amber-50/40 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {columnName && (
                          <div className="text-[10px] font-semibold text-slate-500 mb-0.5">
                            {formatFieldLabel(columnName)}
                          </div>
                        )}
                        <div className="font-medium text-slate-800">{headline}</div>
                        {detail && <div className="text-slate-500 mt-0.5">{detail}</div>}
                        {status === 'edited' && stored?.userOverride && (
                          <div className="mt-1.5 text-[11px] text-indigo-700 bg-white/70 border border-indigo-100 rounded-md px-2 py-1">
                            Override: {stored.userOverride}
                          </div>
                        )}
                        {stored?.rowsAffected !== undefined && (
                          <div className="mt-1 text-[11px] text-slate-500">
                            {stored.rowsAffected.toLocaleString()} values updated
                          </div>
                        )}
                      </div>
                      {status === 'approved' && (
                        <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          {outcomeLabel}
                        </span>
                      )}
                      {status === 'ignored' && (
                        <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-500 border border-slate-300">
                          {outcomeLabel}
                        </span>
                      )}
                      {status === 'edited' && (
                        <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                          {outcomeLabel}
                        </span>
                      )}
                    </div>

                    {isSubmitting && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-indigo-600">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Submitting decision…
                      </div>
                    )}
                    {requestState?.status === 'error' && (
                      <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">
                        <div className="flex items-start gap-1.5">
                          <AlertCircle className="mt-0.5 w-3.5 h-3.5 flex-shrink-0" />
                          <span>{requestState.error}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            void applyDecision(
                              act,
                              idx,
                              requestState.decision,
                              requestState.userOverride
                            )
                          }
                          className="mt-1.5 inline-flex items-center gap-1 font-semibold text-rose-800 hover:text-rose-900"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Retry
                        </button>
                      </div>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void applyDecision(act, idx, 'approve')}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingKey(key);
                          setEditDraft(stored?.userOverride || '');
                        }}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void applyDecision(act, idx, 'ignore')}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Ban className="w-3 h-3" />
                        Ignore
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Cleaning History
        </div>
        {cleaningHistory.length === 0 ? (
          <div className="text-xs text-slate-400 italic">No cleaning actions have been recorded yet.</div>
        ) : (
          <div className="space-y-2">
            {cleaningHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
              >
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">{item.label}</div>
                    {item.detail && <div className="mt-0.5 text-[11px] text-slate-500">{item.detail}</div>}
                  </div>
                </div>
                <span className="flex-shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {item.outcome}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Potential Issues ({qualityIssues.length})
        </div>
        <div className="space-y-2">
          {qualityIssues.length === 0 ? (
            <div className="text-xs text-slate-400 italic">No field-level quality issues flagged.</div>
          ) : (
            qualityIssues.map((iss, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-slate-900">{formatFieldLabel(iss.field)}</span>
                  <span className="text-slate-600">{formatQualityIssueLabel(iss.issue)}</span>
                </div>
                <div className="text-[11px] text-slate-500">{formatActionLabel(iss.action)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {editingEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setEditingKey(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-lg p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Edit suggestion</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Add a custom interpretation or transformation note.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingKey(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              {describeCleaningEntry(editingEntry.entry).headline}
            </div>
            <textarea
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              rows={4}
              placeholder="Describe how this field should be treated…"
              className="w-full text-xs text-slate-800 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {editingRequestState?.status === 'error' && (
              <div className="flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">
                <AlertCircle className="mt-0.5 w-3.5 h-3.5 flex-shrink-0" />
                <span>{editingRequestState.error}</span>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingKey(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const succeeded = await applyDecision(
                    editingEntry.entry,
                    editingEntry.index,
                    'edit',
                    editDraft.trim()
                  );
                  if (succeeded) setEditingKey(null);
                }}
                disabled={!editDraft.trim() || editingRequestState?.status === 'submitting'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {editingRequestState?.status === 'submitting' && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Save note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
