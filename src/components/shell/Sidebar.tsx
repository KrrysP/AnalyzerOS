'use client';

import React, { useState, useRef } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Layers,
  ShieldCheck,
  Search,
  Database,
  Columns,
  Settings,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  datasetName: string;
  rowCount: number;
  colCount: number;
  onNewDataset: () => void;
  onOpenSettings: () => void;
  dimensions?: string[];
  metrics?: string[];
  investigationCount?: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  label: string | null;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  datasetName,
  rowCount,
  colCount,
  onNewDataset,
  onOpenSettings,
  dimensions = [],
  metrics = [],
  investigationCount = 0,
  collapsed,
  onToggleCollapsed,
}) => {
  const [hoverExpand, setHoverExpand] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expanded = !collapsed || hoverExpand;
  const overlayPeek = collapsed && hoverExpand;

  const startHoverExpand = () => {
    if (!collapsed) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoverExpand(true), 450);
  };

  const endHoverExpand = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoverExpand(false), 150);
  };

  const navSections: NavSection[] = [
    {
      label: null,
      items: [{ id: 'overview', label: 'Overview', icon: LayoutDashboard }],
    },
    {
      label: 'Analysis',
      items: [
        { id: 'metrics', label: 'Measures', icon: BarChart3, badge: metrics.length > 0 ? String(metrics.length) : undefined },
        { id: 'trends', label: 'Trends', icon: TrendingUp },
        { id: 'segments', label: 'Segments', icon: Layers, badge: dimensions.length > 0 ? String(dimensions.length) : undefined },
        { id: 'data_quality', label: 'Data Quality', icon: ShieldCheck },
      ],
    },
    {
      label: 'Explore',
      items: [
        { id: 'columns', label: 'Fields', icon: Columns },
        { id: 'dataset', label: 'Dataset', icon: Database },
      ],
    },
    {
      label: 'Saved',
      items: [
        {
          id: 'investigations',
          label: 'Investigations',
          icon: Search,
          badge: investigationCount > 0 ? String(investigationCount) : undefined,
        },
      ],
    },
  ];

  return (
    <div className={`relative h-full flex-shrink-0 transition-[width] duration-200 ease-out ${collapsed ? 'w-[68px]' : 'w-[240px]'}`}>
    <aside
      onMouseEnter={startHoverExpand}
      onMouseLeave={endHoverExpand}
      className={`bg-[#0B1120] text-slate-400 flex flex-col border-r border-slate-800/80 select-none z-30 h-full transition-[width] duration-200 ease-out ${
        overlayPeek ? 'absolute left-0 top-0 w-[240px] shadow-2xl' : 'w-full'
      }`}
    >
      {/* Brand Header + toggle */}
      <div className={`p-3 border-b border-slate-800/80 flex items-center ${expanded ? 'justify-between' : 'justify-center'}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/30 flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
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
          {expanded && (
            <div className="min-w-0">
              <span className="font-semibold text-sm text-white tracking-tight">AnalyzerOS</span>
              <div className="text-[10px] text-slate-500 font-medium tracking-wide flex items-center gap-1">
                <span>BI ENGINE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>
          )}
        </div>
        {expanded && (
          <button
            onClick={onToggleCollapsed}
            title="Collapse sidebar"
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {!expanded && (
        <div className="px-2 pt-2 flex justify-center">
          <button
            onClick={onToggleCollapsed}
            title="Expand sidebar"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className={`flex-1 py-3 overflow-y-auto space-y-4 ${expanded ? 'px-2.5' : 'px-1.5'}`}>
        {navSections.map((section, sIdx) => (
          <div key={sIdx}>
            {expanded && section.label && (
              <div className="px-2.5 mb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {section.label}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  currentView === item.id ||
                  (item.id === 'investigations' && currentView === 'investigation');

                return (
                  <button
                    key={item.id}
                    title={item.label}
                    onClick={() => onSelectView(item.id)}
                    className={`w-full flex items-center rounded-lg text-xs font-medium cursor-pointer transition-all duration-150 ${
                      expanded ? 'justify-between px-2.5 py-2' : 'justify-center px-0 py-2.5'
                    } ${
                      isActive
                        ? `bg-indigo-600/25 text-white font-semibold shadow-xs ${
                            expanded ? 'border-l-[3px] border-indigo-500 pl-2' : 'border border-indigo-500/40'
                          }`
                        : `text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 ${
                            expanded ? 'border-l-[3px] border-transparent' : ''
                          }`
                    }`}
                  >
                    <div className={`flex items-center min-w-0 ${expanded ? 'gap-2.5' : ''}`}>
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 transition-colors ${
                          isActive ? 'text-indigo-400' : 'text-slate-400'
                        }`}
                      />
                      {expanded && <span className="truncate">{item.label}</span>}
                    </div>

                    {expanded &&
                      (item.badge ? (
                        <span className="px-1.5 py-0.5 text-[10px] bg-indigo-500/20 text-indigo-300 rounded font-semibold border border-indigo-500/30">
                          {item.badge}
                        </span>
                      ) : isActive ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      ) : null)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Footer Actions */}
      <div className={`p-3 border-t border-slate-800/80 space-y-2 ${expanded ? '' : 'flex flex-col items-center'}`}>
        <button
          onClick={onNewDataset}
          title="New Dataset"
          className={`flex items-center rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer ${
            expanded ? 'w-full gap-2 px-2.5 py-1.5' : 'p-2'
          }`}
        >
          <PlusCircle className="w-4 h-4 text-slate-400" />
          {expanded && <span>New Dataset</span>}
        </button>
        <button
          onClick={onOpenSettings}
          title="Settings"
          className={`flex items-center rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer ${
            expanded ? 'w-full gap-2 px-2.5 py-1.5' : 'p-2'
          }`}
        >
          <Settings className="w-4 h-4 text-slate-400" />
          {expanded && <span>Settings</span>}
        </button>

        {expanded && (
          <div className="mt-2 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px]">
            <div className="text-slate-200 font-medium truncate mb-0.5">{datasetName}</div>
            <div className="text-slate-500 font-mono">
              {rowCount.toLocaleString()} rows • {colCount} cols
            </div>
          </div>
        )}
      </div>
    </aside>
    </div>
  );
};
