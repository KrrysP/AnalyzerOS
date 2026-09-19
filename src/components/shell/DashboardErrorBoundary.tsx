'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface DashboardErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
  /** Reset key — when it changes, the boundary clears its error state. */
  resetKey?: unknown;
}

interface DashboardErrorBoundaryState {
  hasError: boolean;
}

/**
 * The n8n backend's output isn't schema-validated (it's LLM-generated), so
 * an occasional malformed field can throw during render. Without this
 * boundary that crash takes down the entire workspace with a blank screen.
 * We catch it here and show a recoverable error instead of a stack trace.
 */
export class DashboardErrorBoundary extends React.Component<
  DashboardErrorBoundaryProps,
  DashboardErrorBoundaryState
> {
  constructor(props: DashboardErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[DashboardErrorBoundary] Caught rendering error:', error);
  }

  componentDidUpdate(prevProps: DashboardErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center text-center py-24 px-6 bg-white rounded-2xl border border-slate-200/90">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">AnalyzerOS could not process this dataset.</h3>
          <p className="text-xs text-slate-500 mt-1.5 max-w-sm">
            Something in the backend response couldn't be displayed. Try again, or ask a different question.
          </p>
          {this.props.onRetry && (
            <button
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onRetry?.();
              }}
              className="mt-5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
