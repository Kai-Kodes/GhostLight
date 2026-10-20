import React from 'react';
import {
  Play,
  Activity,
  Layers,
  Network,
  Cpu,
  FileDown,
  Sparkles,
} from 'lucide-react';

interface TopBarProps {
  repoPath: string;
  setRepoPath: (path: string) => void;
  onScan: () => void;
  isLoading: boolean;
  fileCount: number;
  nodeCount: number;
  edgeCount: number;
  onOpenReport: () => void;
  onOpenDoctor: () => void;
  onSelectPresetFixture: (name: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  repoPath,
  setRepoPath,
  onScan,
  isLoading,
  fileCount,
  nodeCount,
  edgeCount,
  onOpenReport,
  onOpenDoctor,
  onSelectPresetFixture,
}) => {
  const currentFixture = repoPath.includes('/fixtures/')
    ? repoPath.split('/fixtures/')[1]
    : null;

  return (
    <header className="h-12 bg-canvas-900 border-b border-canvas-800 flex items-center justify-between px-3 z-30 select-none">
      {/* Brand & Repository Input */}
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {/* Brand Lockup */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="w-6 h-6 rounded bg-canvas-800 border border-cyan-500/40 flex items-center justify-center text-ghost-cyan shadow-glow-cyan">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono font-bold tracking-wider text-xs text-slate-100 flex items-center space-x-1.5">
              <span>GHOSTLIGHT</span>
              <span className="text-[9px] font-normal px-1 py-0.2 rounded bg-canvas-800 text-ghost-cyan border border-cyan-500/20">
                v0.1.0
              </span>
            </span>
          </div>
        </div>

        <div className="w-px h-4 bg-canvas-800 shrink-0 hidden md:block" />

        {/* Repository Path Input & Analyze Action */}
        <div className="flex items-center space-x-1.5 flex-1 max-w-xl min-w-0">
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onScan();
              }}
              placeholder="Enter absolute repository path..."
              className="w-full bg-canvas-850 border border-canvas-800 text-xs text-slate-200 px-2.5 py-1 rounded focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 font-mono tracking-tight transition"
            />
          </div>

          <button
            onClick={onScan}
            disabled={isLoading}
            title="Scan repository and build dependency graph (Enter)"
            className="flex items-center space-x-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 active:scale-[0.98] disabled:opacity-50 text-canvas-950 font-semibold rounded text-xs transition shadow-subtle shrink-0 btn-interactive"
          >
            {isLoading ? (
              <Activity className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isLoading ? 'Scanning' : 'Analyze'}</span>
            <kbd className="hidden sm:inline-block text-[9px] px-1 bg-cyan-700 text-cyan-100 rounded ml-0.5">
              ↵
            </kbd>
          </button>
        </div>

        {/* Quick Sample Selector */}
        <div className="hidden lg:flex items-center space-x-1 text-2xs font-mono shrink-0">
          <span className="text-slate-500 mr-1">Fixtures:</span>
          {[
            { id: 'simple-python', label: 'simple' },
            { id: 'complex-python', label: 'complex' },
            { id: 'cycle-python', label: 'cycle' },
            { id: 'regression-python', label: 'regression' },
          ].map((f) => {
            const isActive = currentFixture === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onSelectPresetFixture(f.id)}
                className={`px-2 py-0.5 rounded transition btn-interactive ${
                  isActive
                    ? 'bg-canvas-800 text-ghost-cyan border border-cyan-500/30'
                    : 'bg-canvas-850 hover:bg-canvas-800 text-slate-400 hover:text-slate-200 border border-canvas-800'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Metrics Chips & Right Action Controls */}
      <div className="flex items-center space-x-2 shrink-0 ml-3">
        {/* Metric Badges */}
        <div className="hidden sm:flex items-center space-x-2 bg-canvas-850 border border-canvas-800 px-2 py-0.5 rounded text-2xs font-mono">
          <div className="flex items-center space-x-1 text-slate-400" title={`${fileCount} source files`}>
            <Layers className="w-3 h-3 text-ghost-sky" />
            <span className="text-slate-200">{fileCount}</span>
            <span className="text-slate-500">files</span>
          </div>
          <div className="w-px h-2.5 bg-canvas-800" />
          <div className="flex items-center space-x-1 text-slate-400" title={`${nodeCount} nodes, ${edgeCount} edges`}>
            <Network className="w-3 h-3 text-ghost-cyan" />
            <span className="text-slate-200">{nodeCount}</span>
            <span className="text-slate-500">n</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-200">{edgeCount}</span>
            <span className="text-slate-500">e</span>
          </div>
        </div>

        {/* Doctor Action Button */}
        <button
          onClick={onOpenDoctor}
          title="System Diagnostics & Isolation Check"
          className="flex items-center space-x-1 px-2 py-1 bg-canvas-850 hover:bg-canvas-800 border border-canvas-800 text-slate-300 rounded text-xs transition btn-interactive"
        >
          <Cpu className="w-3.5 h-3.5 text-ghost-cyan" />
          <span className="hidden md:inline text-2xs font-mono">Doctor</span>
        </button>

        {/* Export Report Button */}
        <button
          onClick={onOpenReport}
          title="Export Analysis Report"
          className="flex items-center space-x-1 px-2.5 py-1 bg-canvas-800 hover:bg-canvas-750 border border-canvas-700 text-slate-200 rounded text-xs transition btn-interactive"
        >
          <FileDown className="w-3.5 h-3.5 text-ghost-sky" />
          <span className="text-2xs font-mono font-medium">Export</span>
        </button>
      </div>
    </header>
  );
};
