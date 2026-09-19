'use client';

import React, { useMemo } from 'react';
import { useWorkspace, SavedInvestigation } from '@/context/WorkspaceContext';
import { asText, extractReadableText } from '@/lib/formatters';
import { formatFieldLabel, sanitizeUserFacingText } from '@/lib/display-labels';
import { MarkdownContent } from '../copilot/MarkdownContent';
import { KpiCard } from '../dashboard/KpiCard';
import { DynamicVisualization } from '../dashboard/DynamicVisualization';
import { EvidenceSection, FindingCard, RuledOutDriverCard } from './EvidenceSection';
import {
  Search,
  Clock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react';

function formatConfidence(confidence: SavedInvestigation['confidence']) {
  if (typeof confidence === 'number') {
    const pct = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
    return `${pct}%`;
  }
  const text = asText(confidence);
  const numeric = parseFloat(text);
  if (!Number.isNaN(numeric) && /\d/.test(text)) {
    const pct = numeric <= 1 ? Math.round(numeric * 100) : Math.round(numeric);
    return `${pct}%`;
  }
  return text || '—';
}

function ConfidenceBadge({ confidence }: { confidence: SavedInvestigation['confidence'] }) {
  const text = formatConfidence(confidence);
  const numeric = parseFloat(String(text));
  const isHigh =
    String(confidence).toLowerCase().includes('high') || (!Number.isNaN(numeric) && numeric >= 85);
  const isMedium =
    String(confidence).toLowerCase().includes('med') ||
    (!Number.isNaN(numeric) && numeric >= 65 && numeric < 85);

  if (isHigh) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        {text} confidence
      </span>
    );
  }
  if (isMedium) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        {text} confidence
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
      {text} confidence
    </span>
  );
}

function InvestigationDetail({ investigation }: { investigation: SavedInvestigation }) {
  return (
    <div className="space-y-5">
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {investigation.analysis_type && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
              {formatFieldLabel(investigation.analysis_type)}
            </span>
          )}
          <ConfidenceBadge confidence={investigation.confidence} />
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <Clock className="w-3 h-3" />
            {investigation.timestamp}
          </span>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Question</div>
          <p className="text-sm font-medium text-slate-700">{asText(investigation.question)}</p>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Headline</div>
          <h2 className="text-lg font-bold text-slate-900 leading-snug">
            {sanitizeUserFacingText(asText(investigation.headline))}
          </h2>
        </div>
        {investigation.executiveSummary && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Summary
            </div>
            <MarkdownContent content={sanitizeUserFacingText(asText(investigation.executiveSummary))} />
          </div>
        )}
        {investigation.confidenceReason && (
          <p className="text-[11px] text-slate-500 italic">
            {sanitizeUserFacingText(asText(investigation.confidenceReason))}
          </p>
        )}
      </div>

      {investigation.kpis && investigation.kpis.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Key Measures</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {investigation.kpis.map((kpi, idx) => (
              <KpiCard key={idx} kpi={kpi} />
            ))}
          </div>
        </div>
      )}

      {investigation.keyDrivers && investigation.keyDrivers.length > 0 && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Key Drivers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {investigation.keyDrivers.map((kd, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/60">
                <div className="font-semibold text-sm text-slate-900 mb-1">{extractReadableText(kd.driver || kd)}</div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {extractReadableText(kd.explanation || kd.detail) || 'Empirical driver evaluated against variance.'}
                </p>
                {(kd.impact || kd.status) && (
                  <div className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {kd.impact ? `Impact: ${extractReadableText(kd.impact)}` : ''}
                    {kd.impact && kd.status ? ' · ' : ''}
                    {kd.status ? extractReadableText(kd.status) : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <EvidenceSection evidence={investigation.evidence || []} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Confirmed Findings</span>
          </div>
          {investigation.confirmedFindings.length > 0 ? (
            investigation.confirmedFindings.map((item, idx) => <FindingCard key={idx} item={item} />)
          ) : (
            <div className="text-xs text-slate-400 italic">No confirmed findings returned.</div>
          )}
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <AlertTriangle className="w-4 h-4 text-slate-400" />
            <span>Weak / Ruled Out Drivers</span>
          </div>
          {investigation.ruledOutOrWeakDrivers.length > 0 ? (
            investigation.ruledOutOrWeakDrivers.map((driver, idx) => (
              <RuledOutDriverCard key={idx} item={driver} />
            ))
          ) : (
            <div className="text-xs text-slate-400 italic">No ruled-out factors noted.</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <HelpCircle className="w-4 h-4 text-slate-500" />
            <span>Remaining Uncertainties</span>
          </div>
          {investigation.remainingUncertainties.length > 0 ? (
            investigation.remainingUncertainties.map((unc, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2"
              >
                <span className="text-amber-500 font-mono">?</span>
                <span>{extractReadableText(unc)}</span>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400 italic">No active uncertainties flagged.</div>
          )}
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span>Recommended Actions</span>
          </div>
          {investigation.recommendedActions.length > 0 ? (
            investigation.recommendedActions.map((rec: any, idx) => {
              const actionText = extractReadableText(typeof rec === 'string' ? rec : rec.action || rec);
              const reasonText = typeof rec === 'object' ? extractReadableText(rec.reason || rec.detail) : '';
              return (
                <div key={idx} className="p-3 rounded-xl bg-amber-50/30 border border-amber-200/70 text-xs space-y-1">
                  <div className="font-semibold text-slate-900">{actionText}</div>
                  {reasonText && <p className="text-slate-600 leading-relaxed">{reasonText}</p>}
                </div>
              );
            })
          ) : (
            <div className="text-xs text-slate-400 italic">No recommended actions available.</div>
          )}
        </div>
      </div>

      {investigation.visualizations && investigation.visualizations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Visualizations</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {investigation.visualizations.map((viz, idx) => (
              <DynamicVisualization key={viz.id || idx} visualization={viz} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

export const InvestigationView: React.FC = () => {
  const { investigations, activeInvestigationId, handleOpenInvestigation } = useWorkspace();

  const active = useMemo(() => {
    if (!investigations.length) return null;
    return investigations.find((i) => i.id === activeInvestigationId) || investigations[0];
  }, [investigations, activeInvestigationId]);

  if (investigations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-6 bg-white rounded-2xl border border-slate-200/90 animate-fadeIn">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4">
          <Search className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">No investigations yet.</h3>
        <p className="text-xs text-slate-500 mt-1.5 max-w-sm">
          Every question you ask the AI Analyst is saved here with the full analysis, evidence, and
          recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 pb-12 animate-fadeIn">
      <div className="xl:col-span-4 space-y-3">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <Search className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Investigations</h2>
          </div>
          <p className="text-xs text-slate-500">
            {investigations.length} {investigations.length === 1 ? 'question' : 'questions'} asked about this
            dataset.
          </p>
        </div>

        <div className="space-y-2">
          {investigations.map((inv) => {
            const isActive = active?.id === inv.id;
            return (
              <button
                key={inv.id}
                onClick={() => handleOpenInvestigation(inv.id)}
                className={`w-full text-left p-4 rounded-xl border shadow-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50/70 border-indigo-300'
                    : 'bg-white border-slate-200/90 hover:border-indigo-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <span className="text-xs font-medium text-slate-600 line-clamp-2">{asText(inv.question)}</span>
                  <ArrowRight className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${isActive ? 'text-indigo-500' : 'text-slate-300'}`} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug mb-2 line-clamp-2">
                  {asText(inv.headline)}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {inv.timestamp}
                  </span>
                  <ConfidenceBadge confidence={inv.confidence} />
                  {inv.analysis_type && (
                    <span className="inline-flex items-center gap-1 truncate">
                      <Sparkles className="w-3 h-3" />
                      {asText(inv.analysis_type)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="xl:col-span-8 min-w-0">{active && <InvestigationDetail investigation={active} />}</div>
    </div>
  );
};
