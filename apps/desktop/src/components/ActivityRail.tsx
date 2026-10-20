import React from 'react';
import {
  FolderTree,
  Crosshair,
  Compass,
  Cpu,
  FileDown,
} from 'lucide-react';

export type ActiveSidebarTab = 'explorer' | 'impact' | 'insights';

interface ActivityRailProps {
  activeTab: ActiveSidebarTab;
  onSelectTab: (tab: ActiveSidebarTab) => void;
  impactCount: number | null;
  onOpenDoctor: () => void;
  onOpenReport: () => void;
}

export const ActivityRail: React.FC<ActivityRailProps> = ({
  activeTab,
  onSelectTab,
  impactCount,
  onOpenDoctor,
  onOpenReport,
}) => {
  return (
    <nav
      aria-label="Activity Rail"
      className="w-12 bg-canvas-900 border-r border-canvas-800 flex flex-col items-center justify-between py-3 z-30 select-none shrink-0"
    >
      {/* Top Primary Navigation Workflows */}
      <div className="flex flex-col items-center space-y-2 w-full">
        {/* Explorer Tab */}
        <button
          onClick={() => onSelectTab('explorer')}
          title="Codebase Explorer (Symbols & Files)"
          className={`w-9 h-9 rounded-md flex items-center justify-center btn-interactive relative ${
            activeTab === 'explorer'
              ? 'bg-canvas-800 text-ghost-cyan border border-cyan-500/30 shadow-subtle'
              : 'text-slate-400 hover:text-slate-200 hover:bg-canvas-850'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          {activeTab === 'explorer' && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-ghost-cyan rounded-r" />
          )}
        </button>

        {/* Blast Radius / Impact Tab */}
        <button
          onClick={() => onSelectTab('impact')}
          title="Change Impact & Blast Radius"
          className={`w-9 h-9 rounded-md flex items-center justify-center btn-interactive relative ${
            activeTab === 'impact'
              ? 'bg-canvas-800 text-ghost-amber border border-amber-500/30 shadow-subtle'
              : 'text-slate-400 hover:text-slate-200 hover:bg-canvas-850'
          }`}
        >
          <Crosshair className="w-4 h-4" />
          {impactCount !== null && impactCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1 min-w-[14px] h-3.5 bg-ghost-amber text-canvas-950 font-mono text-[9px] font-bold rounded-full flex items-center justify-center">
              {impactCount > 99 ? '99+' : impactCount}
            </span>
          )}
          {activeTab === 'impact' && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-ghost-amber rounded-r" />
          )}
        </button>

        {/* Repository Insights Tab */}
        <button
          onClick={() => onSelectTab('insights')}
          title="Repository Structural Insights & Metrics"
          className={`w-9 h-9 rounded-md flex items-center justify-center btn-interactive relative ${
            activeTab === 'insights'
              ? 'bg-canvas-800 text-ghost-violet border border-purple-500/30 shadow-subtle'
              : 'text-slate-400 hover:text-slate-200 hover:bg-canvas-850'
          }`}
        >
          <Compass className="w-4 h-4" />
          {activeTab === 'insights' && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-ghost-violet rounded-r" />
          )}
        </button>
      </div>

      {/* Bottom Utility Tools */}
      <div className="flex flex-col items-center space-y-2 w-full pt-3 border-t border-canvas-800/80">
        <button
          onClick={onOpenReport}
          title="Export Analysis Report (Markdown / JSON)"
          className="w-9 h-9 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-canvas-850 btn-interactive"
        >
          <FileDown className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenDoctor}
          title="System Diagnostics & Isolation Doctor"
          className="w-9 h-9 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-canvas-850 btn-interactive"
        >
          <Cpu className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
};
