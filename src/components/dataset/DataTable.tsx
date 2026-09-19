'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatFieldLabel } from '@/lib/display-labels';

interface DataTableProps {
  rows: Record<string, any>[];
  /** Maximum rows to display. Defaults to 50. */
  maxRows?: number;
}

export const DataTable: React.FC<DataTableProps> = ({ rows, maxRows = 50 }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Cap at maxRows to avoid rendering thousands of DOM cells
  const cappedRows = useMemo(() => rows.slice(0, maxRows), [rows, maxRows]);

  // Stable column list — only recompute when the first row changes shape
  const columns = useMemo(
    () => (cappedRows.length > 0 ? Object.keys(cappedRows[0]) : []),
    [cappedRows]
  );

  if (!rows || rows.length === 0) {
    return <div className="p-8 text-center text-xs text-slate-400">No rows to display.</div>;
  }

  // Search filtering on capped rows
  const filteredRows = searchTerm
    ? cappedRows.filter((r) =>
        columns.some((c) => String(r[c] ?? '').toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : cappedRows;

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Data Table Preview</h3>
          <span className="text-xs text-slate-500 font-mono">
            Showing {cappedRows.length} preview rows
            {rows.length > maxRows ? ` (capped from ${rows.length})` : ''}
          </span>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search records…"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-2.5 px-3 w-12 text-center text-slate-400">#</th>
              {columns.map((col) => (
                <th key={col} className="py-2.5 px-3 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>{formatFieldLabel(col)}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                  {(currentPage - 1) * pageSize + idx + 1}
                </td>
                {columns.map((col) => {
                  const val = row[col];
                  const isNum = typeof val === 'number';
                  return (
                    <td
                      key={col}
                      className={`py-2.5 px-3 text-slate-700 whitespace-nowrap ${
                        isNum ? 'font-mono text-slate-900' : ''
                      }`}
                    >
                      {val !== null && val !== undefined ? String(val) : <span className="text-slate-300 italic">Missing</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing {(currentPage - 1) * pageSize + 1} to{' '}
          {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} entries
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 font-mono">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
