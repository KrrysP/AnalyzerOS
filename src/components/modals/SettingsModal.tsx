'use client';

import React, { useState } from 'react';
import { X, Check, Globe, Sliders, Shield, RefreshCw } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  n8nWebhookUrl: string;
  onSaveWebhookUrl: (url: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  n8nWebhookUrl,
  onSaveWebhookUrl,
}) => {
  const [url, setUrl] = useState(n8nWebhookUrl);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'fallback'>('idle');

  if (!isOpen) return null;

  const handleTest = async () => {
    setTestStatus('testing');
    try {
      if (!url.trim()) {
        setTimeout(() => setTestStatus('fallback'), 400);
        return;
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ping: true, client: 'AnalyzerOS-frontend' }),
      });
      if (res.ok) {
        setTestStatus('success');
      } else {
        setTestStatus('fallback');
      }
    } catch {
      setTestStatus('fallback');
    }
  };

  const handleSave = () => {
    onSaveWebhookUrl(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">AnalyzerOS Configuration</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              n8n DealOS Webhook Endpoint
            </label>
            <p className="text-slate-500 mb-2 text-[11px]">
              Configure an optional custom analysis service for this workspace.
            </p>
            <input
              type="text"
              placeholder="https://your-analysis-service.example"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleTest}
              disabled={testStatus === 'testing'}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-1.5 transition-colors"
            >
              {testStatus === 'testing' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>Pinging Webhook…</span>
                </>
              ) : (
                <span>Test Webhook</span>
              )}
            </button>

            {testStatus === 'success' && (
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Connected</span>
              </span>
            )}
            {testStatus === 'fallback' && (
              <span className="text-slate-500 text-[11px]">
                Offline • Using in-browser engine
              </span>
            )}
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px] text-slate-600">
            <div className="font-semibold text-slate-900 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span>Environment Variables Ready</span>
            </div>
            <p>
              In production, you can configure <code className="bg-slate-200/80 px-1 rounded text-slate-800">NEXT_PUBLIC_N8N_WEBHOOK_URL</code> in your deployment environment without modifying code.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
