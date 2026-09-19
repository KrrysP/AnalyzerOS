'use client';

import React, { useState } from 'react';
import { UploadResponse } from '@/lib/types';
import { DataTable } from './DataTable';
import { ColumnExplorer } from './ColumnExplorer';
import { FileSpreadsheet } from 'lucide-react';

interface DatasetViewProps {
  uploadData: UploadResponse;
  defaultTab?: 'table' | 'columns';
}

export const DatasetView: React.FC<DatasetViewProps> = ({
  uploadData,
  defaultTab = 'table',
}) => {
  const [activeTab, setActiveTab] = useState<'table' | 'columns'>(defaultTab);

  const datasetInfo = uploadData.dataset || uploadData.profile || {
    name: 'dataset.csv',
    domain: 'General Business Analytics',
    row_count_clean: 1000,
    column_count: 10,
    quality_score: 95,
    grain: 'One record per transaction',
    upload_date: 'Today',
    file_size: '1.5 MB',
  };

  const grainText =
    typeof datasetInfo.grain === 'object'
      ? datasetInfo.grain.description
      : datasetInfo.grain || 'One record per transaction';

  const rowCount =
    datasetInfo.row_count_clean ?? (uploadData.profile?.rows_clean || 1000);
  const originalRowCount =
    datasetInfo.row_count_raw ?? uploadData.profile?.rows_raw ?? rowCount;
  const columnCount =
    datasetInfo.column_count ?? (uploadData.profile?.columns || 10);
  const qualityScore =
    datasetInfo.quality_score ?? (uploadData.profile?.quality_score || 95);

  const columnsList =
    uploadData.detected?.columns || (uploadData as any).detected_columns || [];

  return (
    <div className="space-y-6 animate-fadeIn pb-12 select-none">
      {/* Dataset Metadata Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                Dataset Type
              </span>
              <span className="text-xs text-slate-500">{datasetInfo.domain}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
              <span>{datasetInfo.name}</span>
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Dataset level: {grainText}. Data quality: {qualityScore}/100.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] text-slate-500 font-medium">Original Rows</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                {originalRowCount.toLocaleString()}
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] text-slate-500 font-medium">Clean Rows</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                {rowCount.toLocaleString()}
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] text-slate-500 font-medium">Columns</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                {columnCount}
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] text-slate-500 font-medium">Upload Date</div>
              <div className="text-xs font-bold text-slate-900 mt-0.5 truncate max-w-[90px]">
                {datasetInfo.upload_date || 'Today'}
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[10px] text-slate-500 font-medium">File Size</div>
              <div className="text-xs font-bold text-slate-900 mt-0.5 font-mono">
                {datasetInfo.file_size || '1.5 MB'}
              </div>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('table')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'table'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Data Preview
          </button>
          <button
            onClick={() => setActiveTab('columns')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'columns'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Fields
          </button>
        </div>
      </div>

      {/* Content depending on active tab */}
      {activeTab === 'table' ? (
        <DataTable rows={uploadData.sample_rows || []} />
      ) : (
        <ColumnExplorer columns={columnsList as any} />
      )}
    </div>
  );
};
