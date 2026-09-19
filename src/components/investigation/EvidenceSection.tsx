'use client';

import React, { useMemo, useState } from 'react';
import {
  formatDisplayValue,
  isPlainObject,
  extractReadableText,
} from '@/lib/formatters';
import { formatFieldLabel, sanitizeUserFacingText } from '@/lib/display-labels';
import { TechnicalDetails } from '@/components/common/TechnicalDetails';
import {
  BarChart3,
  Calendar,
  FileText,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const INSIGHT_KEYS = new Set([
  'insights',
  'key_insights',
  'keyInsights',
  'takeaways',
  'highlights',
]);

const TITLE_KEYS = ['analysis', 'title', 'claim', 'name', 'metric', 'label', 'heading'];
const DESCRIPTION_KEYS = ['query_summary', 'description', 'subtitle', 'source', 'comparison', 'period'];
const SKIP_SCALAR_KEYS = new Set([
  ...TITLE_KEYS,
  ...DESCRIPTION_KEYS,
  ...Array.from(INSIGHT_KEYS),
  'id',
  'type',
  'confidence',
  'facts',
  'data',
  'rows',
  'table',
  'raw',
]);

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

function isRowArray(value: unknown): value is Record<string, any>[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  const objects = value.filter(isPlainObject);
  return objects.length >= Math.max(1, Math.ceil(value.length * 0.5));
}

function asInsightList(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => extractReadableText(item))
    .map((text) => text.trim())
    .filter(Boolean)
    .filter((text) => !text.startsWith('{') && !text.startsWith('['));
}

function collectInsights(item: Record<string, any>): string[] {
  const facts = isPlainObject(item.facts) ? item.facts : {};
  const lists = [
    asInsightList(item.insights),
    asInsightList(item.key_insights),
    asInsightList(item.keyInsights),
    asInsightList(facts.insights),
    asInsightList(facts.key_insights),
    asInsightList(facts.takeaways),
  ];
  const notes = facts.notes ?? item.notes;
  if (Array.isArray(notes) && notes.every((n) => typeof n === 'string')) {
    lists.push(asInsightList(notes));
  }
  return Array.from(new Set(lists.flat()));
}

function seriesRecordToRows(value: Record<string, any>): Record<string, any>[] | null {
  const entries = Object.entries(value).filter(
    ([key, val]) => !INSIGHT_KEYS.has(key) && key !== 'notes' && !isPlainObject(val) && !Array.isArray(val)
  );
  if (entries.length < 3) return null;
  const yearish = entries.filter(([key]) => /^\d{4}(-\d{2}(-\d{2})?)?$/.test(String(key)));
  if (yearish.length < entries.length * 0.7) return null;
  const keyName = yearish.some(([key]) => String(key).includes('-')) ? 'month' : 'season';
  return entries.map(([key, val]) => ({ [keyName]: key, value: val }));
}

function collectTables(item: Record<string, any>): { title: string; rows: Record<string, any>[] }[] {
  const tables: { title: string; rows: Record<string, any>[] }[] = [];
  const candidates: Array<[string, unknown]> = [
    ['', parseMaybeJson(item.facts)],
    ['', parseMaybeJson(item.data)],
    ['', parseMaybeJson(item.rows)],
    ['', parseMaybeJson(item.table)],
    ['', parseMaybeJson(item.values)],
  ];

  const facts = parseMaybeJson(item.facts);
  if (isPlainObject(facts)) {
    for (const [key, value] of Object.entries(facts)) {
      if (INSIGHT_KEYS.has(key) || key === 'notes') continue;
      candidates.push([key, parseMaybeJson(value)]);
    }
  }

  for (const [key, value] of Object.entries(item)) {
    if (SKIP_SCALAR_KEYS.has(key)) continue;
    const parsed = parseMaybeJson(value);
    if (isRowArray(parsed) || isPlainObject(parsed)) candidates.push([key, parsed]);
  }

  const seen = new Set<string>();
  for (const [key, value] of candidates) {
    let rows: Record<string, any>[] | null = null;
    if (isRowArray(value)) rows = value.filter(isPlainObject);
    else if (isPlainObject(value)) rows = seriesRecordToRows(value);
    if (!rows || !rows.length) continue;
    const signature = JSON.stringify(rows.slice(0, 2));
    if (seen.has(signature)) continue;
    seen.add(signature);
    tables.push({ title: key ? formatFieldLabel(key) : '', rows });
  }
  return tables;
}

function collectScalars(item: Record<string, any>): { label: string; value: unknown; key: string }[] {
  const source = isPlainObject(item.facts) ? { ...item, ...item.facts } : item;
  const scalars: { label: string; value: unknown; key: string }[] = [];
  for (const [key, value] of Object.entries(source)) {
    if (SKIP_SCALAR_KEYS.has(key) || INSIGHT_KEYS.has(key)) continue;
    if (value === null || value === undefined || value === '') continue;
    if (isPlainObject(value) || isRowArray(value) || (Array.isArray(value) && value.some(isPlainObject))) continue;
    scalars.push({ label: formatFieldLabel(key), value, key });
  }
  return scalars;
}

function evidenceTitle(item: Record<string, any>, index: number): string {
  for (const key of TITLE_KEYS) {
    const text = extractReadableText(item[key]);
    if (text) return sanitizeUserFacingText(text);
  }
  return `Evidence ${index + 1}`;
}

function evidenceDescription(item: Record<string, any>): string {
  for (const key of DESCRIPTION_KEYS) {
    const text = typeof item[key] === 'string' ? item[key] : '';
    if (text.trim()) return sanitizeUserFacingText(text);
  }
  return '';
}

function pickIcon(title: string, tables: { title: string }[]) {
  const hay = `${title} ${tables.map((t) => t.title).join(' ')}`.toLowerCase();
  if (/month|calendar|seasonal/.test(hay) && !/season-level|season level|season count/.test(hay)) return Calendar;
  if (/season|trend|count|bar|series/.test(hay)) return BarChart3;
  if (/coverage|valid|endpoint|range|date/.test(hay)) return ShieldCheck;
  if (/month/.test(hay)) return Calendar;
  return FileText;
}

function cellTone(key: string, value: unknown): string {
  if (!/change|delta|diff|pct|variance/.test(key.toLowerCase())) return 'text-slate-700';
  const num =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
      ? parseFloat(value.replace(/[%+,]/g, ''))
      : NaN;
  if (!Number.isFinite(num) || num === 0) return 'text-slate-500';
  return num < 0 ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold';
}

function tableColumns(rows: Record<string, any>[]): string[] {
  const keys: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (INSIGHT_KEYS.has(key)) continue;
      if (isPlainObject(row[key]) || isRowArray(row[key])) continue;
      if (!keys.includes(key)) keys.push(key);
    }
  }
  return keys;
}

function EvidenceTable({ rows }: { rows: Record<string, any>[] }) {
  const columns = tableColumns(rows);
  if (!columns.length) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-left text-[11px] border-collapse min-w-[280px]">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="py-1.5 px-2.5 font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap"
              >
                {formatFieldLabel(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="odd:bg-white even:bg-slate-50/60">
              {columns.map((col) => (
                <td
                  key={col}
                  className={`py-1.5 px-2.5 border-b border-slate-100 whitespace-nowrap ${cellTone(col, row[col])}`}
                >
                  {formatDisplayValue(row[col], col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RawJsonToggle({ value }: { value: unknown }) {
  return (
    <div className="pt-1">
      <TechnicalDetails>
        <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-slate-900 text-[10px] text-slate-100 p-3 leading-relaxed">
          {JSON.stringify(value, null, 2)}
        </pre>
      </TechnicalDetails>
    </div>
  );
}

function EvidenceCard({ item, index }: { item: any; index: number }) {
  const parsed = parseMaybeJson(item);
  const record = isPlainObject(parsed)
    ? { ...parsed, facts: parseMaybeJson(parsed.facts) }
    : { claim: String(item ?? '') };
  const title = evidenceTitle(record, index);
  const description = evidenceDescription(record);
  const insights = collectInsights(record);
  const tables = collectTables(record);
  const scalars = collectScalars(record).filter((scalar) => {
    // Avoid duplicating title/description already shown.
    const text = formatDisplayValue(scalar.value, scalar.key);
    return text && text !== title && text !== description;
  });
  const Icon = pickIcon(title, tables);
  const showStatGrid = tables.length === 0 && scalars.length > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="p-4 md:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 min-w-0 space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-900 leading-snug">{title}</h4>
              {description && <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{description}</p>}
            </div>
          </div>

          {tables.map((table, idx) => (
            <div key={idx} className="space-y-1.5">
              {table.title && tables.length > 1 && (
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {table.title}
                </div>
              )}
              <EvidenceTable rows={table.rows} />
            </div>
          ))}

          {showStatGrid && (
            <div className="grid grid-cols-2 gap-3">
              {scalars.map((scalar) => (
                <div key={scalar.key} className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {scalar.label}
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {formatDisplayValue(scalar.value, scalar.key)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-2">
          {insights.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Key insights</div>
              <ul className="space-y-1.5">
                {insights.map((insight, idx) => (
                  <li key={idx} className="text-xs text-slate-700 leading-relaxed flex gap-2">
                    <span className="text-slate-300 mt-0.5">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <RawJsonToggle value={item} />
        </div>
      </div>
    </div>
  );
}

export function EvidenceSection({ evidence }: { evidence: any[] }) {
  const items = useMemo(() => (Array.isArray(evidence) ? evidence : []), [evidence]);
  const [open, setOpen] = useState(true);

  if (!items.length) return null;

  return (
    <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full p-4 px-6 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" />
          <span>Evidence ({items.length})</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="p-4 pt-0 space-y-3">
          {items.map((item, idx) => (
            <EvidenceCard key={idx} item={item} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

function impactBadge(impact?: string) {
  const value = (impact || '').toLowerCase();
  if (!value) return null;
  const styles =
    value === 'high'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : value === 'medium'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles}`}>
      {formatFieldLabel(impact || '')} impact
    </span>
  );
}

export function RuledOutDriverCard({ item }: { item: unknown }) {
  const [open, setOpen] = useState(false);
  const parsed = parseMaybeJson(item);
  const record = isPlainObject(parsed) ? parsed : null;
  const title = record
    ? extractReadableText(record.driver || record.title || record.name || record.finding || record)
    : extractReadableText(item);
  const explanation = record
    ? extractReadableText(record.explanation || record.reason || record.detail || record.reasoning || '')
    : '';
  const impact = record ? extractReadableText(record.impact || record.impact_level || '') : '';
  const hasExtra = !!record && Object.keys(record).length > 3;

  return (
    <div className="p-3 rounded-xl bg-amber-50/40 border border-amber-100 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <span className="mt-0.5 text-amber-500 font-mono">?</span>
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 leading-snug">{title}</div>
            {explanation && <p className="text-slate-600 mt-1 leading-relaxed">{explanation}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {impactBadge(impact)}
          {hasExtra && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="More detail"
            >
              {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
      {open && record && (
        <div className="mt-2">
          <RawJsonToggle value={record} />
        </div>
      )}
    </div>
  );
}

export function FindingCard({ item }: { item: unknown }) {
  const parsed = parseMaybeJson(item);
  const text = extractReadableText(parsed);
  return (
    <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs text-slate-800 flex items-start gap-2.5">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
      <span className="leading-relaxed">{text}</span>
    </div>
  );
}
