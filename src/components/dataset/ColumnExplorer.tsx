'use client';

import React, { useMemo, useState } from 'react';
import { ColumnDefinition, ColumnRole } from '@/lib/types';
import { asText } from '@/lib/formatters';
import { formatFieldLabel, formatRoleLabel } from '@/lib/display-labels';
import { TechnicalDetails } from '@/components/common/TechnicalDetails';
import { Check, ChevronDown, Sparkles, Search, X } from 'lucide-react';

interface ColumnExplorerProps {
  columns: ColumnDefinition[];
  onUpdateRole?: (columnName: string, newRole: ColumnRole) => void;
}

const ROLE_FILTERS = ['all', 'metric', 'dimension', 'time', 'identifier', 'flag', 'text', 'unknown'] as const;

export const ColumnExplorer: React.FC<ColumnExplorerProps> = ({
  columns: initialColumns,
  onUpdateRole,
}) => {
  const [columns, setColumns] = useState<ColumnDefinition[]>(initialColumns);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number]>('all');
  const [selectedColumn, setSelectedColumn] = useState<ColumnDefinition | null>(null);

  const normalizedRole = (role?: string) => (role || 'unknown').toLowerCase();

  const handleRoleChange = (colName: string, newRole: ColumnRole) => {
    setColumns((prev) =>
      prev.map((c) => (c.name === colName ? { ...c, role: newRole } : c))
    );
    if (onUpdateRole) {
      onUpdateRole(colName, newRole);
    }
    setSuccessNotice(`Updated ${formatFieldLabel(colName)}.`);
    setTimeout(() => setSuccessNotice(null), 2500);
  };

  const getRoleBadge = (role?: string) => {
    switch (normalizedRole(role)) {
      case 'metric':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'dimension':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'time':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'identifier':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'flag':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'text':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      default:
        return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  // Metrics discovery groupings
  const metrics = columns.filter((c) => normalizedRole(c.role) === 'metric');
  const dimensions = columns.filter((c) => normalizedRole(c.role) === 'dimension');
  const timeFields = columns.filter((c) => normalizedRole(c.role) === 'time');

  const filteredColumns = useMemo(() => {
    return columns.filter((c) => {
      const matchesSearch = !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || normalizedRole(c.role) === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [columns, searchTerm, roleFilter]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: columns.length };
    for (const c of columns) {
      const r = normalizedRole(c.role);
      counts[r] = (counts[r] || 0) + 1;
    }
    return counts;
  }, [columns]);

  return (
    <div className="space-y-6">
      {/* Automatic Metric Discovery Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
            <Sparkles className="w-3 h-3" />
            <span>Suggested Fields</span>
          </span>
        </div>
        <h3 className="text-base font-bold text-slate-900 tracking-tight mb-1">
          Suggested Measures and Groups
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          AnalyzerOS reviewed your fields and suggested how each one can be used. You can adjust them below.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Metrics */}
          <div className="p-4 rounded-lg bg-indigo-50/40 border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                Measures ({metrics.length})
              </span>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">Values</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {metrics.map((m, idx) => (
                <span
                  key={`${m.name}_${idx}`}
                  className="px-2 py-1 rounded bg-white text-indigo-700 text-xs font-medium border border-indigo-200 shadow-2xs"
                >
                  {formatFieldLabel(m.name)}
                </span>
              ))}
            </div>
          </div>

          {/* Dimensions */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Groups ({dimensions.length})
              </span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">Categories</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {dimensions.slice(0, 6).map((d, idx) => (
                <span
                  key={`${d.name}_${idx}`}
                  className="px-2 py-1 rounded bg-white text-slate-700 text-xs font-medium border border-slate-200 shadow-2xs"
                >
                  {formatFieldLabel(d.name)}
                </span>
              ))}
              {dimensions.length > 6 && (
                <span className="text-xs text-slate-400 self-center">+{dimensions.length - 6} more</span>
              )}
            </div>
          </div>

          {/* Time Fields */}
          <div className="p-4 rounded-lg bg-emerald-50/40 border border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Dates ({timeFields.length})
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">Temporal</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {timeFields.map((t, idx) => (
                <span
                  key={`${t.name}_${idx}`}
                  className="px-2 py-1 rounded bg-white text-emerald-700 text-xs font-medium border border-emerald-200 shadow-2xs"
                >
                  {formatFieldLabel(t.name)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {successNotice && (
          <div className="mt-4 p-2.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg border border-emerald-200 flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4" />
            <span>{successNotice}</span>
          </div>
        )}
      </div>

      {/* Schema Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Fields</h3>
            <p className="text-xs text-slate-500">
              Search your fields or adjust how AnalyzerOS should use them.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search fields…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {/* Role filter chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {ROLE_FILTERS.filter((r) => r === 'all' || roleCounts[r] > 0).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-colors cursor-pointer ${
                    roleFilter === r
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {formatRoleLabel(r)} {roleCounts[r] ? `(${roleCounts[r]})` : ''}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4">Field</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4">Meaning</th>
                <th className="py-2.5 px-4">Missing</th>
                <th className="py-2.5 px-4">Unique Values</th>
                <th className="py-2.5 px-4">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredColumns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No fields match this search or filter.
                  </td>
                </tr>
              ) : (
                filteredColumns.map((col, idx) => (
                  <tr
                    key={`${col.name}_${idx}`}
                    onClick={() => setSelectedColumn(col)}
                    className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-medium text-slate-900">{formatFieldLabel(col.name)}</td>
                    <td className="py-3 px-4 text-slate-600 capitalize">{asText(col.type) || 'unknown'}</td>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <select
                          value={col.role || 'unknown'}
                          onChange={(e) => handleRoleChange(col.name, e.target.value as ColumnRole)}
                          className={`text-xs font-semibold py-1 pl-2.5 pr-7 rounded-md border appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 ${getRoleBadge(
                            col.role
                          )}`}
                        >
                          <option value="metric">Measure</option>
                          <option value="dimension">Group</option>
                          <option value="time">Date</option>
                          <option value="identifier">ID</option>
                          <option value="flag">Yes/No</option>
                          <option value="text">Text</option>
                          <option value="unknown">Not set</option>
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-[220px] truncate" title={asText(col.meaning)}>
                      {asText(col.meaning) || '—'}
                    </td>
                    <td className="py-3 px-4">
                      {typeof col.missing_pct === 'number' ? (
                        <span className={`font-mono ${col.missing_pct > 0 ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                          {col.missing_pct}%
                        </span>
                      ) : (
                        <span className="font-mono text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {col.unique_values ? col.unique_values.toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {typeof col.confidence === 'number' ? `${Math.round(col.confidence * 100)}%` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Column Detail Drawer */}
      {selectedColumn && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setSelectedColumn(null)}>
          <div className="absolute inset-0 bg-slate-900/30" />
          <div
            className="relative w-full max-w-sm bg-white h-full shadow-xl p-6 space-y-4 overflow-y-auto animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">{formatFieldLabel(selectedColumn.name)}</h3>
              <button
                onClick={() => setSelectedColumn(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500">Type</span>
                <span className="font-semibold text-slate-900 capitalize">{asText(selectedColumn.type) || 'unknown'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500">Field Role</span>
                <span
                  className={`px-2 py-0.5 rounded-md border font-semibold capitalize ${getRoleBadge(
                    selectedColumn.role
                  )}`}
                >
                  {formatRoleLabel(selectedColumn.role)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500">Missing Values</span>
                <span className="font-mono font-semibold text-slate-900">
                  {typeof selectedColumn.missing_pct === 'number' ? `${selectedColumn.missing_pct}%` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500">Unique Values</span>
                <span className="font-mono font-semibold text-slate-900">
                  {selectedColumn.unique_values ? selectedColumn.unique_values.toLocaleString() : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500">Confidence</span>
                <span className="font-mono font-semibold text-slate-900">
                  {typeof selectedColumn.confidence === 'number' ? `${Math.round(selectedColumn.confidence * 100)}%` : '—'}
                </span>
              </div>

              {selectedColumn.meaning && (
                <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100">
                  <div className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider mb-1">
                    Meaning
                  </div>
                  <p className="text-slate-700 leading-relaxed">{asText(selectedColumn.meaning)}</p>
                </div>
              )}

              {selectedColumn.sample_values && selectedColumn.sample_values.length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Sample Values
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedColumn.sample_values.slice(0, 8).map((v, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-[11px] text-slate-700"
                      >
                        {asText(v)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <TechnicalDetails>
                <div>Raw field name: {selectedColumn.name}</div>
                <div>Detected type: {asText(selectedColumn.type) || 'unknown'}</div>
                <div>Internal role: {asText(selectedColumn.role) || 'unknown'}</div>
              </TechnicalDetails>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
