'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from 'recharts';
import { Visualization } from '@/lib/types';
import { formatMetricValue } from '@/lib/formatters';
import {
  formatFieldLabel,
  formatMetricLabel,
  sanitizeUserFacingText,
} from '@/lib/display-labels';
import { ChartCard } from './ChartCard';
import { MapPin, Table as TableIcon, BarChart2 } from 'lucide-react';

interface DynamicVisualizationProps {
  visualization: Visualization;
  highlightKeys?: string[];
  onSelectElement?: (key: string) => void;
}

const DEFAULT_COLORS = ['#6366F1', '#38BDF8', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];

export const DynamicVisualization: React.FC<DynamicVisualizationProps> = ({
  visualization,
  highlightKeys = [],
  onSelectElement,
}) => {
  const {
    type,
    title: rawTitle,
    description: rawDescription,
    xKey = 'name',
    yKeys = ['value'],
    data = [],
    colors = DEFAULT_COLORS,
  } = visualization;
  const title = sanitizeUserFacingText(rawTitle) || formatFieldLabel(rawTitle);
  const description = sanitizeUserFacingText(rawDescription);

  if (!data || data.length === 0) {
    return (
      <ChartCard title={title} subtitle={description || 'No data records available'}>
        <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
          No records are available for this chart.
        </div>
      </ChartCard>
    );
  }

  // Value formatting helper for tooltips/axes
  const formatValue = (val: any) => {
    if (typeof val === 'number') {
      if (Math.abs(val) >= 1000) return formatMetricValue(val, 'currency');
      return val.toLocaleString();
    }
    return String(val ?? '');
  };

  // 1. Line Chart
  if (type === 'line') {
    return (
      <ChartCard title={title} subtitle={description} badge="Line">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatValue} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(val: any, name: any) => [formatValue(val), formatMetricLabel(name)]}
              contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #E2E8F0' }}
            />
            {yKeys.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />}
            {yKeys.map((key, idx) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={formatMetricLabel(key)}
                stroke={colors[idx % colors.length] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
                strokeWidth={2.5}
                dot={{ r: 3.5 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  // 2. Bar Chart & Histogram
  if (type === 'bar' || type === 'histogram') {
    return (
      <ChartCard title={title} subtitle={description} badge={type === 'histogram' ? 'Histogram' : 'Bar'}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatValue} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(val: any, name: any) => [formatValue(val), formatMetricLabel(name)]}
              contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #E2E8F0' }}
            />
            {yKeys.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />}
            {yKeys.map((key, idx) => (
              <Bar
                key={key}
                dataKey={key}
                name={formatMetricLabel(key)}
                fill={colors[idx % colors.length] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
                radius={[4, 4, 0, 0]}
              >
                {data.map((entry, entryIdx) => {
                  const entryVal = String(entry[xKey] || '');
                  const isHighlighted = highlightKeys.includes(entryVal);
                  return (
                    <Cell
                      key={`cell-${entryIdx}`}
                      fill={
                        isHighlighted
                          ? '#4338CA'
                          : colors[idx % colors.length] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]
                      }
                      className="cursor-pointer transition-colors"
                      onClick={() => onSelectElement?.(entryVal)}
                    />
                  );
                })}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  // 3. Stacked Bar Chart
  if (type === 'stacked_bar') {
    return (
      <ChartCard title={title} subtitle={description} badge="Stacked Bar">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatValue} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(val: any, name: any) => [formatValue(val), formatMetricLabel(name)]}
              contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #E2E8F0' }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
            {yKeys.map((key, idx) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="a"
                name={formatMetricLabel(key)}
                fill={colors[idx % colors.length] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
                radius={idx === yKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  // 4. Scatter Chart
  if (type === 'scatter') {
    const xScatterKey = xKey || 'x';
    const yScatterKey = yKeys[0] || 'y';

    return (
      <ChartCard title={title} subtitle={description} badge="Scatter">
        <ResponsiveContainer width="100%" height={240}>
          <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey={xScatterKey} name={formatFieldLabel(xScatterKey)} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} />
            <YAxis dataKey={yScatterKey} name={formatMetricLabel(yScatterKey)} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickFormatter={formatValue} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Scatter name={title} data={data} fill="#6366F1" />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  // 5. Geographic Map Panel
  if (type === 'map') {
    const sortedGeo = [...data].sort((a, b) => {
      const valA = Number(a[yKeys[0]] || a.value || a.revenue || 0);
      const valB = Number(b[yKeys[0]] || b.value || b.revenue || 0);
      return valB - valA;
    });

    return (
      <ChartCard title={title} subtitle={description} badge="Geographic Distribution">
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <span>Regional Comparison</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {sortedGeo.slice(0, 6).map((item, idx) => {
              const label = String(item[xKey] || item.state || item.region || `Region ${idx + 1}`);
              const val = item[yKeys[0]] ?? item.value ?? item.revenue ?? 0;
              const isHigh = highlightKeys.includes(label);

              return (
                <div
                  key={idx}
                  onClick={() => onSelectElement?.(label)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isHigh
                      ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400/40 shadow-xs'
                      : 'bg-slate-50 border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-900 font-mono">{label}</span>
                    {idx === 0 && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-indigo-100 text-indigo-700 rounded">
                        #1 Top
                      </span>
                    )}
                  </div>
                  <div className="text-base font-bold text-slate-900 font-mono">
                    {formatValue(val)}
                  </div>
                  {item.share && (
                    <div className="text-[10px] text-slate-500 mt-0.5">{item.share} share</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </ChartCard>
    );
  }

  // 6. Generic Table Visualization
  if (type === 'table') {
    const tableKeys = Object.keys(data[0] || {});

    return (
      <ChartCard title={title} subtitle={description} badge="Data Table">
        <div className="overflow-x-auto max-h-[260px] border border-slate-100 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50 text-slate-600 text-[10px] uppercase font-semibold">
              <tr>
                {tableKeys.map((k) => (
                  <th key={k} className="py-2 px-3 border-b border-slate-200 whitespace-nowrap">
                    {formatFieldLabel(k)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {data.slice(0, 10).map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                  {tableKeys.map((k) => (
                    <td key={k} className="py-2 px-3 font-mono whitespace-nowrap">
                      {formatValue(row[k])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    );
  }

  // 7. KPI Card Spec — the backend sends this as either a single value or a
  // small array of {label, value} stat pairs (a mini KPI grid).
  if (type === 'kpi_card') {
    if (data.length > 1 || (data[0] && 'label' in data[0])) {
      return (
        <ChartCard title={title} subtitle={description} badge="Stats">
          <div className="grid grid-cols-2 gap-3 h-full content-start">
            {data.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] text-slate-500 font-medium truncate">
                  {formatMetricLabel(item.label ?? item.name ?? `Result ${idx + 1}`)}
                </div>
                <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                  {formatValue(item.value ?? item[yKeys[0]] ?? 0)}
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      );
    }
    return (
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
        <div className="text-xs text-slate-500 font-medium">{title}</div>
        <div className="text-2xl font-bold text-slate-900 font-mono mt-2">
          {formatValue(data[0]?.[yKeys[0]] || data[0]?.value || 0)}
        </div>
        {description && <div className="text-xs text-slate-500 mt-1">{description}</div>}
      </div>
    );
  }

  // Fallback to Bar Chart
  return (
    <ChartCard title={title} subtitle={description} badge="Visual">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatValue} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          <Bar dataKey={yKeys[0] || 'value'} fill="#6366F1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};
