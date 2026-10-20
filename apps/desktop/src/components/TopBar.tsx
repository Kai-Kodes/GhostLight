import React from 'react';
import {
  Play,
  FileText,
  Activity,
  Layers,
  Network,
  GitBranch,
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
  return (
    <header className="h-14 bg-canvas-900 border-b border-slate-800 flex items-center justify-between px-4 z-20">
      {/* Brand & Repository Input */}
      <div className="flex items-center space-x-4 flex-1">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded bg-gradient-to-tr from-cyan-500 to-sky-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <GitBranch className="w-4 h-4 text-canvas-950 font-bold" />
          </div>
          <span className="font-bold tracking-wider text-sm bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            GHOSTLIGHT
          </span>
        </div>

        {/* Repository Path Input */}
        <div className="flex items-center space-x-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <input
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="Enter absolute path to Python repository..."
              className="w-full bg-canvas-850 border border-slate-800 text-xs text-slate-200 px-3 py-1.5 rounded-md focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
            />
          </div>

          <button
            onClick={onScan}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-md text-xs font-medium transition shadow-md shadow-cyan-600/20"
          >
            {isLoading ? (
              <Activity className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>{isLoading ? 'Scanning...' : 'Analyze'}</span>
          </button>
        </div>

        {/* Quick Sample Selector */}
        <div className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-400">
          <span className="text-[11px] text-slate-500">Fixtures:</span>
          <button
            onClick={() => onSelectPresetFixture('simple-python')}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition"
          >
            simple
          </button>
          <button
            onClick={() => onSelectPresetFixture('complex-python')}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition"
          >
            complex
          </button>
          <button
            onClick={() => onSelectPresetFixture('regression-python')}
            className="px-2 py-0.5 bg-rose-950/60 border border-rose-900/50 hover:bg-rose-900/80 text-rose-300 rounded text-[11px] transition"
          >
            regression
          </button>
        </div>
      </div>

      {/* Metrics Chips & Right Action Controls */}
      <div className="flex items-center space-x-3">
        {/* Metric Badges */}
        <div className="hidden sm:flex items-center space-x-2 bg-canvas-850 border border-slate-800 px-2.5 py-1 rounded-md text-xs">
          <div className="flex items-center space-x-1 text-slate-400">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono text-slate-200">{fileCount}</span>
            <span className="text-[10px]">files</span>
          </div>
          <div className="w-px h-3 bg-slate-800" />
          <div className="flex items-center space-x-1 text-slate-400">
            <Network className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-slate-200">{nodeCount}</span>
            <span className="text-[10px]">nodes</span>
          </div>
          <div className="w-px h-3 bg-slate-800" />
          <div className="flex items-center space-x-1 text-slate-400">
            <span className="font-mono text-slate-200">{edgeCount}</span>
            <span className="text-[10px]">edges</span>
          </div>
        </div>

        {/* Doctor Diagnostics Button */}
        <button
          onClick={onOpenDoctor}
          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
          title="Doctor: Check System & Isolation Status"
        >
          <Activity className="w-4 h-4" />
        </button>

        {/* Export Report Button */}
        <button
          onClick={onOpenReport}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium transition border border-slate-700/60"
        >
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span>Report</span>
        </button>
      </div>
    </header>
  );
};
