'use client';

import React, { useState } from 'react';
import { WorkspaceProvider, useWorkspace } from '@/context/WorkspaceContext';
import { LandingHero, CapabilityCards } from '@/components/landing/LandingHero';
import { DatasetUploader } from '@/components/landing/DatasetUploader';
import { UploadProgress } from '@/components/landing/UploadProgress';
import { DatasetReview } from '@/components/dataset/DatasetReview';
import { AppShell } from '@/components/shell/AppShell';
import { HowItWorksModal } from '@/components/modals/HowItWorksModal';

function AnalyzerOSApp() {
  const {
    screen,
    uploadResponse,
    baseAnalysis,
    processingStep,
    processingFileName,
    processingFileSize,
    error,
    canRetryProcessing,
    confirmedMetrics,
    isAnalyzing,
    handleFileUpload,
    handleLoadDemo,
    handleRetry,
    handleConfirmMetric,
    handleBuildDashboard,
    handleNewDataset,
    clearError,
  } = useWorkspace();

  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  // State 2: Uploading / Processing
  if (screen === 'processing') {
    return (
      <UploadProgress
        fileName={processingFileName}
        fileSize={processingFileSize}
        step={processingStep}
        error={error}
        canRetryProcessing={canRetryProcessing}
        onRetry={handleRetry}
        onCancel={handleNewDataset}
      />
    );
  }

  // State 3: Dataset Review
  if (screen === 'review' && uploadResponse) {
    return (
      <DatasetReview
        uploadResponse={uploadResponse}
        onBuildDashboard={handleBuildDashboard}
        onConfirmMetric={handleConfirmMetric}
        confirmedMetrics={confirmedMetrics}
        isBuilding={isAnalyzing}
        errorMessage={error}
      />
    );
  }

  // State 4: BI Workspace (show once we're in workspace screen, even if analysis is still loading)
  if (screen === 'workspace' && uploadResponse) {
    return (
      <AppShell
        uploadData={uploadResponse}
        initialAnalysis={baseAnalysis ?? undefined}
        onNewDataset={handleNewDataset}
      />
    );
  }

  // State 1: No Dataset / Upload Landing Page
  return (
    <div className="h-full overflow-y-auto bg-[#F8FAFC] flex flex-col justify-between">
      {/* Top Navbar */}
      <nav className="h-16 px-6 md:px-12 border-b border-slate-200/80 bg-white flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/30">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#6366F1" />
              <path
                d="M8 22L16 10L24 22"
                stroke="white"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="16" cy="18" r="2" fill="white" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-base text-slate-900 tracking-tight">AnalyzerOS</span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              Autonomous BI
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <button
            onClick={() => setIsHowItWorksOpen(true)}
            className="text-slate-600 hover:text-slate-900 font-medium transition-colors hidden sm:block cursor-pointer"
          >
            How it works
          </button>
          <button
            onClick={handleLoadDemo}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold transition-colors cursor-pointer"
          >
            Demo Dataset
          </button>
          <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
            BI
          </div>
        </div>
      </nav>

      {/* Hero & Upload Center */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 flex flex-col items-center justify-center">
        <LandingHero
          onLoadDemo={handleLoadDemo}
          onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
        />

        <DatasetUploader
          onFileSelected={handleFileUpload}
          isLoading={isAnalyzing}
          errorMessage={error}
          onClearError={clearError}
        />

        <CapabilityCards />
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-200/60 text-center text-xs text-slate-400">
        AnalyzerOS • Know what changed. Understand why. • Connected to live n8n BI backend
      </footer>

      {/* How it works modal */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
        onGetStarted={handleLoadDemo}
      />
    </div>
  );
}

export default function Home() {
  return (
    <WorkspaceProvider>
      <AnalyzerOSApp />
    </WorkspaceProvider>
  );
}
