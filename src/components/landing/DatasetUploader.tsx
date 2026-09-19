'use client';

import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, Lock, AlertCircle, Loader2 } from 'lucide-react';

interface DatasetUploaderProps {
  onFileSelected: (file: File) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  onClearError?: () => void;
}

export const DatasetUploader: React.FC<DatasetUploaderProps> = ({
  onFileSelected,
  isLoading,
  errorMessage,
  onClearError,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset the file input so the same file can be selected again after an error
  const resetFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const validateAndUpload = useCallback(
    (file: File | null | undefined) => {
      setLocalError(null);
      onClearError?.();

      if (!file) {
        setLocalError('No file selected. Please select a CSV file.');
        return;
      }

      // Lightweight checks — extension + non-empty. No CSV parsing in browser.
      const isCsvExtension = file.name.toLowerCase().endsWith('.csv');
      if (!isCsvExtension) {
        setLocalError('Invalid file type. Only .csv files are supported.');
        resetFileInput();
        return;
      }

      if (file.size === 0) {
        setLocalError('The selected CSV file is empty (0 bytes). Please upload a file containing data.');
        resetFileInput();
        return;
      }

      onFileSelected(file);
    },
    [onFileSelected, onClearError, resetFileInput]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!isLoading) setIsDragging(true);
    },
    [isLoading]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (isLoading) return;
      validateAndUpload(e.dataTransfer.files?.[0]);
    },
    [isLoading, validateAndUpload]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      validateAndUpload(e.target.files?.[0]);
      // Reset so the same file can be picked again after error
      e.target.value = '';
    },
    [validateAndUpload]
  );

  const handleAreaClick = useCallback(() => {
    if (!isLoading && fileInputRef.current) {
      resetFileInput();
      fileInputRef.current.click();
    }
  }, [isLoading, resetFileInput]);

  const handleBrowseClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isLoading && fileInputRef.current) {
        resetFileInput();
        fileInputRef.current.click();
      }
    },
    [isLoading, resetFileInput]
  );

  const displayError = localError || errorMessage;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleAreaClick}
        className={`relative border-2 border-dashed rounded-2xl p-10 md:p-14 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]'
            : 'border-slate-300 hover:border-slate-400 bg-white shadow-xs'
        } ${isLoading ? 'opacity-70 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleInputChange}
          disabled={isLoading}
        />

        <div className="flex flex-col items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 transition-transform duration-200 hover:scale-105">
            {isLoading ? (
              <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
            ) : (
              <UploadCloud className="w-7 h-7 text-indigo-600" />
            )}
          </div>

          <div>
            <div className="text-lg font-bold text-slate-900">Drop your CSV here</div>
            <div className="text-xs text-slate-500 mt-1">
              or{' '}
              <button
                type="button"
                onClick={handleBrowseClick}
                className="text-indigo-600 font-semibold hover:underline"
              >
                Browse files
              </button>{' '}
              from your computer
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium mt-1">
            <span>Only .csv supported</span>
            <span>•</span>
            <span>Non-empty files</span>
            <span>•</span>
            <span>Up to 50 MB</span>
          </div>
        </div>

        {displayError && (
          <div className="mt-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{displayError}</span>
          </div>
        )}
      </div>

      {/* Enterprise Security Note */}
      <div className="flex items-center justify-center gap-2 mt-4 text-[11px] text-slate-400">
        <Lock className="w-3.5 h-3.5 text-slate-400" />
        <span>Enterprise-grade privacy • Your data is processed securely</span>
      </div>
    </div>
  );
};
