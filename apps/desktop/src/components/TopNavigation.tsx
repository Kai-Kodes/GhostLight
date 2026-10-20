import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Search,
  Network,
  Activity,
  ChevronDown,
  Cpu,
  FileDown,
  RotateCw,
  FolderGit2,
  Check,
} from 'lucide-react';

interface TopNavigationProps {
  repoPath: string;
  setRepoPath: (path: string) => void;
  onScan: () => void;
  isLoading: boolean;
  fileCount: number;
  nodeCount: number;
  edgeCount: number;
  viewMode: 'graph' | 'insights';
  setViewMode: (mode: 'graph' | 'insights') => void;
  onOpenReport: () => void;
  onOpenDoctor: () => void;
  onSelectFixture: (name: string) => void;
  onOpenSearchPalette: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  repoPath,
  setRepoPath,
  onScan,
  isLoading,
  fileCount,
  nodeCount,
  edgeCount,
  viewMode,
  setViewMode,
  onOpenReport,
  onOpenDoctor,
  onSelectFixture,
  onOpenSearchPalette,
}) => {
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fixtures = [
    { id: 'complex-python', label: 'complex-python', desc: 'Classes, methods, inheritance, pytest suites' },
    { id: 'regression-python', label: 'regression-python', desc: 'Deliberate pricing bug with verified failures' },
    { id: 'cycle-python', label: 'cycle-python', desc: 'Circular dependencies & dynamic recursion' },
    { id: 'simple-python', label: 'simple-python', desc: 'Clean functions, direct calls & tests' },
  ];

  const currentRepoName = repoPath.includes('/fixtures/')
    ? repoPath.split('/fixtures/')[1]
    : repoPath.split('/').filter(Boolean).pop() || repoPath;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setRepoDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-13 bg-obsidian-900 border-b border-obsidian-800 px-4 flex items-center justify-between z-30 select-none">
      {/* Left: Brand & Repository Selector */}
      <div className="flex items-center space-x-3.5">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-obsidian-800 border border-obsidian-700 flex items-center justify-center text-signal-cyan">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold tracking-wide text-xs text-slate-100">
            GHOSTLIGHT
          </span>
        </div>

        <div className="w-px h-4 bg-obsidian-800" />

        {/* Repository Dropdown Pill */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
            className="flex items-center space-x-2 px-2.5 py-1.5 rounded-md bg-obsidian-850 hover:bg-obsidian-800 border border-obsidian-800 text-xs text-slate-200 btn-tactile font-medium"
          >
            <FolderGit2 className="w-3.5 h-3.5 text-signal-cyan shrink-0" />
            <span className="font-mono text-xs">{currentRepoName}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Repository Selector Dropdown Menu */}
          {repoDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-80 bg-obsidian-900 border border-obsidian-750 rounded-lg shadow-dossier p-2 z-50 text-xs">
              <span className="text-2xs uppercase tracking-wider text-slate-500 font-semibold px-2 py-1 block">
                Preset Codebase Fixtures
              </span>

              <div className="space-y-1 mt-1">
                {fixtures.map((f) => {
                  const isCurrent = repoPath.endsWith(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        onSelectFixture(f.id);
                        setRepoDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-md flex items-start justify-between transition ${
                        isCurrent
                          ? 'bg-obsidian-800 text-signal-cyan border border-signal-cyan/20'
                          : 'hover:bg-obsidian-850 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-mono text-xs font-semibold">{f.label}</div>
                        <div className="text-2xs text-slate-400 mt-0.5 leading-snug">{f.desc}</div>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-signal-cyan shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>

              <div className="my-2 border-t border-obsidian-800" />

              {/* Custom Path Input inside Dropdown */}
              <div className="p-1">
                <span className="text-2xs text-slate-400 block mb-1 font-medium">Or enter local path:</span>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    value={repoPath}
                    onChange={(e) => setRepoPath(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onScan();
                        setRepoDropdownOpen(false);
                      }
                    }}
                    placeholder="/absolute/path/to/repo"
                    className="flex-1 bg-obsidian-950 border border-obsidian-750 text-xs text-slate-200 px-2 py-1 rounded font-mono focus:outline-none focus:border-signal-cyan"
                  />
                  <button
                    onClick={() => {
                      onScan();
                      setRepoDropdownOpen(false);
                    }}
                    className="px-2.5 py-1 bg-obsidian-800 hover:bg-obsidian-750 text-slate-200 rounded text-xs font-semibold btn-tactile"
                  >
                    Go
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scan / Re-analyze Trigger */}
        <button
          onClick={onScan}
          disabled={isLoading}
          title="Analyze Repository (Enter)"
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-obsidian-850 hover:bg-obsidian-800 border border-obsidian-800 text-xs text-slate-300 hover:text-white btn-tactile"
        >
          <RotateCw className={`w-3 h-3 text-signal-cyan ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Scanning...' : 'Re-scan'}</span>
        </button>
      </div>

      {/* Center: Global Quick-Jump Palette Trigger */}
      <div className="flex-1 max-w-md mx-4">
        <button
          onClick={onOpenSearchPalette}
          className="w-full flex items-center justify-between px-3 py-1.5 bg-obsidian-850 hover:bg-obsidian-800 border border-obsidian-800 hover:border-obsidian-700 rounded-md text-xs text-slate-400 transition"
        >
          <div className="flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400">Jump to symbol, file, or test...</span>
          </div>
          <kbd className="text-2xs font-mono px-1.5 py-0.5 rounded bg-obsidian-800 border border-obsidian-750 text-slate-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: View Switcher, Telemetry, and Utility Actions */}
      <div className="flex items-center space-x-3">
        {/* View Switcher: Graph Map vs Structural Insights */}
        <div className="flex items-center bg-obsidian-850 border border-obsidian-800 rounded-md p-0.5 text-xs font-medium">
          <button
            onClick={() => setViewMode('graph')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded transition btn-tactile ${
              viewMode === 'graph'
                ? 'bg-obsidian-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-3.5 h-3.5 text-signal-cyan" />
            <span>Map</span>
          </button>
          <button
            onClick={() => setViewMode('insights')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded transition btn-tactile ${
              viewMode === 'insights'
                ? 'bg-obsidian-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-signal-amber" />
            <span>Insights</span>
          </button>
        </div>

        {/* Telemetry Indicator */}
        <div className="hidden lg:flex items-center space-x-2 text-2xs font-mono text-slate-400 px-2.5 py-1 bg-obsidian-850 rounded border border-obsidian-800">
          <span>{fileCount} files</span>
          <span className="text-slate-600">·</span>
          <span>{nodeCount} nodes</span>
          <span className="text-slate-600">·</span>
          <span>{edgeCount} edges</span>
        </div>

        {/* Diagnostics & Export */}
        <button
          onClick={onOpenDoctor}
          title="System Diagnostics & Isolation Check (⌘D)"
          className="p-1.5 bg-obsidian-850 hover:bg-obsidian-800 border border-obsidian-800 text-slate-400 hover:text-slate-200 rounded-md transition btn-tactile"
        >
          <Cpu className="w-4 h-4 text-slate-300" />
        </button>

        <button
          onClick={onOpenReport}
          title="Export Markdown/JSON Report (⌘E)"
          className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-obsidian-800 hover:bg-obsidian-750 border border-obsidian-700 text-slate-200 rounded-md text-xs font-medium transition btn-tactile"
        >
          <FileDown className="w-3.5 h-3.5 text-signal-cyan" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
