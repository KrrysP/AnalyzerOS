'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { AlertTriangle, ChevronDown, Layers, Lightbulb, Loader2 } from 'lucide-react';
import { askAnalyzerOS } from '@/lib/api';
import { useWorkspace } from '@/context/WorkspaceContext';
import { formatMetricValue } from '@/lib/formatters';
import {
  formatDimensionLabel,
  formatMetricLabel,
  isSystemMetadataField,
  sanitizeUserFacingText,
} from '@/lib/display-labels';
import { TechnicalDetails } from '@/components/common/TechnicalDetails';
import type { DetectedColumn } from '@/lib/types';

interface SegmentExplorerProps {
  dimensions: unknown[];
  metrics: unknown[];
  detectedColumns?: DetectedColumn[];
  highlightKeys?: string[];
  onSelectElement?: (el: string) => void;
}

interface FieldOption {
  key: string;
  label: string;
}

interface SegmentRow {
  label: string;
  value: number;
  count?: number;
}

const DEFAULT_COLOR = '#6366F1';
const HIGHLIGHT_COLOR = '#4338CA';

function optionKey(value: unknown, kind: 'dimension' | 'metric'): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  return String(
    record.key ||
      record.column_name ||
      record.name ||
      (kind === 'metric' ? record.metric_name : record.dimension_name) ||
      ''
  );
}

function optionLabel(
  value: unknown,
  key: string,
  kind: 'dimension' | 'metric',
  columns: DetectedColumn[]
): string {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const column = columns.find((item) => item.name === key) as any;
  const backendLabel =
    record.label ||
    record.display_name ||
    record.business_name ||
    column?.label ||
    column?.display_name ||
    column?.business_name ||
    (typeof column?.meaning === 'string' && column.meaning.length <= 45 ? column.meaning : '');
  return kind === 'metric'
    ? formatMetricLabel(key, backendLabel)
    : formatDimensionLabel(key, backendLabel);
}

function toOptions(
  values: unknown[],
  kind: 'dimension' | 'metric',
  columns: DetectedColumn[]
): FieldOption[] {
  const seen = new Set<string>();
  return (Array.isArray(values) ? values : [])
    .map((value) => {
      const key = optionKey(value, kind);
      return { key, label: optionLabel(value, key, kind, columns) };
    })
    .filter((option) => {
      if (!option.key || seen.has(option.key)) return false;
      seen.add(option.key);
      return true;
    });
}

function findBreakdownRows(analysis: any, dimensionKey: string, metricKey: string): SegmentRow[] {
  const visualizations = Array.isArray(analysis?.visualizations) ? analysis.visualizations : [];
  for (const visualization of visualizations) {
    if (!Array.isArray(visualization?.data) || visualization.data.length === 0) continue;
    const xKey = visualization.xKey || visualization.x_field || dimensionKey;
    const yKey =
      visualization.yKeys?.[0] ||
      visualization.y_fields?.[0] ||
      visualization.y_field ||
      metricKey;
    const rows = visualization.data
      .map((row: Record<string, unknown>) => {
        const fallbackLabelKey = Object.keys(row).find((key) => typeof row[key] === 'string');
        const fallbackValueKey = Object.keys(row).find(
          (key) => key !== fallbackLabelKey && Number.isFinite(Number(row[key]))
        );
        const label = row[xKey] ?? row[dimensionKey] ?? row.label ?? row.name ?? row[fallbackLabelKey || ''];
        const rawValue = row[yKey] ?? row[metricKey] ?? row.value ?? row[fallbackValueKey || ''];
        const value = Number(rawValue);
        if (label === undefined || label === null || !Number.isFinite(value)) return null;
        return {
          label: String(label),
          value,
          count: Number.isFinite(Number(row.count)) ? Number(row.count) : undefined,
        };
      })
      .filter(Boolean) as SegmentRow[];
    if (rows.length > 0) return rows.sort((a, b) => b.value - a.value).slice(0, 10);
  }
  return [];
}

function shortTakeaway(value: unknown, rows: SegmentRow[], metricLabel: string): string {
  const cleaned = sanitizeUserFacingText(value);
  if (cleaned) return cleaned.split(/(?<=[.!?])\s+/)[0];
  if (rows.length === 0) return '';
  if (rows.length === 1) {
    return `${rows[0].label} leads ${metricLabel.toLowerCase()} with ${formatMetricValue(
      rows[0].value,
      'number'
    )}.`;
  }
  return `${rows[0].label} leads ${metricLabel.toLowerCase()}, followed by ${rows[1].label}.`;
}

export const SegmentExplorer: React.FC<SegmentExplorerProps> = ({
  dimensions,
  metrics,
  detectedColumns = [],
  highlightKeys = [],
  onSelectElement,
}) => {
  const workspace = useWorkspace();
  const allDimensionOptions = useMemo(
    () => toOptions(dimensions, 'dimension', detectedColumns),
    [dimensions, detectedColumns]
  );
  const allMetricOptions = useMemo(
    () => toOptions(metrics, 'metric', detectedColumns),
    [metrics, detectedColumns]
  );
  const dimensionOptions = useMemo(
    () => allDimensionOptions.filter((option) => !isSystemMetadataField(option.key)),
    [allDimensionOptions]
  );
  const metricOptions = useMemo(
    () => allMetricOptions.filter((option) => !isSystemMetadataField(option.key)),
    [allMetricOptions]
  );
  const metadataOnly =
    (allDimensionOptions.length > 0 || allMetricOptions.length > 0) &&
    (dimensionOptions.length === 0 || metricOptions.length === 0);

  const [dimension, setDimension] = useState('');
  const [metric, setMetric] = useState('');
  const [rows, setRows] = useState<SegmentRow[]>([]);
  const [takeaway, setTakeaway] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!dimensionOptions.some((option) => option.key === dimension)) {
      setDimension(dimensionOptions[0]?.key || '');
    }
    if (!metricOptions.some((option) => option.key === metric)) {
      setMetric(metricOptions[0]?.key || '');
    }
  }, [dimension, metric, dimensionOptions, metricOptions]);

  const selectedDimension = dimensionOptions.find((option) => option.key === dimension);
  const selectedMetric = metricOptions.find((option) => option.key === metric);

  useEffect(() => {
    const activeDatasetId = workspace.activeDataset?.id || workspace.datasetId;
    if (!selectedDimension || !selectedMetric || !activeDatasetId) {
      setRows([]);
      return;
    }

    const currentRequest = ++requestId.current;
    setIsLoading(true);
    setError('');
    setRows([]);
    setTakeaway('');

    const question =
      `Group ${selectedMetric.label} (${selectedMetric.key}) by ` +
      `${selectedDimension.label} (${selectedDimension.key}) and return the top 10 segments. ` +
      'Include a bar chart and one short business takeaway. Do not include SQL.';

    askAnalyzerOS({
      datasetId: activeDatasetId,
      sessionId: `${workspace.sessionId}_segments`,
      question,
      expectedRowCount:
        workspace.activeDataset?.rowCount ?? workspace.uploadResponse?.dataset?.row_count_clean,
    })
      .then((analysis) => {
        if (requestId.current !== currentRequest) return;
        const nextRows = findBreakdownRows(analysis, selectedDimension.key, selectedMetric.key);
        setRows(nextRows);
        setTakeaway(
          shortTakeaway(
            analysis.executive_summary || analysis.headline,
            nextRows,
            selectedMetric.label
          )
        );
        if (nextRows.length === 0) {
          setError('AnalyzerOS could not produce this breakdown. Try another group or measure.');
        }
      })
      .catch((requestError: any) => {
        if (requestId.current !== currentRequest) return;
        setError(requestError?.message || 'AnalyzerOS could not load this breakdown.');
      })
      .finally(() => {
        if (requestId.current === currentRequest) setIsLoading(false);
      });
  }, [
    selectedDimension?.key,
    selectedMetric?.key,
    workspace.activeDataset?.id,
    workspace.activeDataset?.rowCount,
    workspace.datasetId,
    workspace.sessionId,
    workspace.uploadResponse?.dataset?.row_count_clean,
  ]);

  if (metadataOnly) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>AnalyzerOS detected system metadata instead of the uploaded dataset. Reprocess this dataset.</span>
        </div>
      </div>
    );
  }

  if (dimensionOptions.length === 0 || metricOptions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/90 bg-white p-8 text-center text-xs text-slate-500">
        AnalyzerOS could not find a suitable dimension and metric combination for this dataset.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-slate-900">Segment Explorer</h3>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {[
          {
            label: 'Group By',
            value: dimension,
            onChange: setDimension,
            options: dimensionOptions,
          },
          { label: 'Measure', value: metric, onChange: setMetric, options: metricOptions },
        ].map((control) => (
          <div className="relative" key={control.label}>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {control.label}
            </label>
            <div className="relative">
              <select
                value={control.value}
                onChange={(event) => control.onChange(event.target.value)}
                className="min-w-[160px] appearance-none rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-2.5 pr-7 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {control.options.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 opacity-60" />
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
          Building this breakdown…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-center text-xs text-amber-800">
          {error}
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={rows} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(value) => formatMetricValue(value, 'number')}
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: any) => [
                  formatMetricValue(value, 'number'),
                  selectedMetric?.label || 'Measure',
                ]}
                contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #E2E8F0' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {rows.map((entry, index) => (
                  <Cell
                    key={entry.label}
                    fill={highlightKeys.includes(entry.label) ? HIGHLIGHT_COLOR : DEFAULT_COLOR}
                    className="cursor-pointer"
                    onClick={() => onSelectElement?.(entry.label)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 font-semibold text-slate-500">
                  <th className="px-3 py-2">{selectedDimension?.label}</th>
                  <th className="px-3 py-2">{selectedMetric?.label}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.label} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2 font-medium text-slate-800">{row.label}</td>
                    <td className="px-3 py-2 font-mono text-slate-900">
                      {formatMetricValue(row.value, 'number')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {takeaway && (
            <div className="flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-slate-700">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-indigo-600" />
              <span>{takeaway}</span>
            </div>
          )}
        </>
      )}

      <TechnicalDetails>
        <div>Raw group field: {dimension}</div>
        <div>Raw measure field: {metric}</div>
        <div>Source: AnalyzerOS full-dataset analysis</div>
      </TechnicalDetails>
    </div>
  );
};
