'use client';

import React from 'react';
import { X, Download, FileText, Database, Code, Check } from 'lucide-react';
import { AnalysisResponse, UploadDatasetResult } from '@/lib/types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisData: AnalysisResponse;
  uploadData: UploadDatasetResult;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  analysisData,
  uploadData,
}) => {
  if (!isOpen) return null;

  const datasetName = uploadData.dataset?.name || uploadData.profile?.name || 'dataset.csv';

  const downloadJSON = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            dataset: uploadData.dataset || uploadData.profile,
            analysis: analysisData,
            exported_at: new Date().toISOString(),
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AnalyzerOS_Export_${datasetName.replace('.csv', '')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const downloadCSV = () => {
    if (!uploadData.sample_rows || uploadData.sample_rows.length === 0) return;
    const keys = Object.keys(uploadData.sample_rows[0]);
    const header = keys.join(',');
    const rows = uploadData.sample_rows.map((r) =>
      keys.map((k) => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Clean_${datasetName}`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const printReport = () => {
    window.print();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Export Analysis</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <button
            onClick={downloadJSON}
            className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 flex items-center justify-between transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Code className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-slate-900 group-hover:text-indigo-600">
                  Export Executive JSON Report
                </div>
                <div className="text-[11px] text-slate-500">
                  Includes KPIs, mathematical drivers, and confirmed findings
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
          </button>

          <button
            onClick={downloadCSV}
            className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 flex items-center justify-between transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-slate-900 group-hover:text-indigo-600">
                  Export Cleaned CSV Data
                </div>
                <div className="text-[11px] text-slate-500">
                  Standardized fields, dates, and measures
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
          </button>

          <button
            onClick={printReport}
            className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 flex items-center justify-between transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-slate-900 group-hover:text-indigo-600">
                  Print / Save to PDF
                </div>
                <div className="text-[11px] text-slate-500">
                  Print current dashboard view to PDF
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
          </button>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
