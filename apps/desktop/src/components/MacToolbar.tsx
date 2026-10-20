import React, { useState, useRef, useEffect } from 'react';
import {
  FolderGit2,
  ChevronDown,
  RotateCw,
  Search,
  Network,
  Activity,
  Cpu,
  FileDown,
  Check,
  PanelLeft,
  PanelRight,
} from 'lucide-react';

interface MacToolbarProps {
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
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
}

export const MacToolbar: React.FC<MacToolbarProps> = ({
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
  isSidebarOpen,
  onToggleSidebar,
  isInspectorOpen,
  onToggleInspector,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fixtures = [
    { id: 'complex-python', label: 'complex-python', desc: 'Classes, methods, inheritance & test suites' },
    { id: 'regression-python', label: 'regression-python', desc: 'Pricing bug with verified failures' },
    { id: 'cycle-python', label: 'cycle-python', desc: 'Mutual recursion & circular dependencies' },
    { id: 'simple-python', label: 'simple-python', desc: 'Direct function calls & assertions' },
  ];

  const repoName = repoPath.includes('/fixtures/')
    ? repoPath.split('/fixtures/')[1]
    : repoPath.split('/').filter(Boolean).pop() || repoPath;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-12 bg-mac-window border-b border-mac-border px-3.5 flex items-center justify-between z-30 select-none">
      {/* Left Group: Window Controls Space, Sidebar Toggle, Repository Picker */}
      <div className="flex items-center space-x-2">
        {/* Sidebar Toggle Button */}
        <button
          onClick={onToggleSidebar}
          title="Toggle Navigator Sidebar (⌘0)"
          className={`p-1.5 rounded-md apple-btn ${
            isSidebarOpen
              ? 'bg-mac-surfaceActive text-mac-text shadow-mac-button'
              : 'text-mac-textSecondary hover:bg-mac-surface hover:text-mac-text'
          }`}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-mac-border" />

        {/* Brand Label */}
        <span className="text-xs font-semibold tracking-tight text-mac-text px-1">
          GHOSTLIGHT
        </span>

        {/* Repository Popover Picker */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-mac-surface hover:bg-mac-surfaceHover border border-mac-border text-xs text-mac-text apple-btn"
          >
            <FolderGit2 className="w-3.5 h-3.5 text-mac-blue shrink-0" />
            <span className="font-medium max-w-[140px] truncate">{repoName}</span>
            <ChevronDown className="w-3 h-3 text-mac-textSecondary ml-0.5" />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-80 bg-mac-window border border-mac-borderStrong rounded-lg shadow-mac-popover p-2 z-50 text-xs">
              <span className="text-2xs font-semibold text-mac-textSecondary px-2 py-1 block uppercase tracking-wider">
                Preset Codebase Fixtures
              </span>

              <div className="space-y-0.5 mt-1">
                {fixtures.map((f) => {
                  const isCurrent = repoPath.endsWith(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        onSelectFixture(f.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-md flex items-start justify-between transition ${
                        isCurrent
                          ? 'bg-mac-blue text-white'
                          : 'hover:bg-mac-surface text-mac-text'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-xs">{f.label}</div>
                        <div
                          className={`text-2xs mt-0.5 ${
                            isCurrent ? 'text-blue-100' : 'text-mac-textSecondary'
                          }`}
                        >
                          {f.desc}
                        </div>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>

              <div className="my-2 border-t border-mac-border" />

              <div className="px-1 py-0.5">
                <span className="text-2xs text-mac-textSecondary block mb-1 font-medium">
                  Custom repository path:
                </span>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    value={repoPath}
                    onChange={(e) => setRepoPath(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onScan();
                        setDropdownOpen(false);
                      }
                    }}
                    placeholder="/path/to/repo"
                    className="flex-1 bg-mac-canvas border border-mac-border text-xs text-mac-text px-2 py-1 rounded font-mono focus:outline-none focus:border-mac-blue"
                  />
                  <button
                    onClick={() => {
                      onScan();
                      setDropdownOpen(false);
                    }}
                    className="px-2.5 py-1 bg-mac-surfaceActive hover:bg-mac-surfaceHover text-mac-text rounded text-xs font-medium apple-btn"
                  >
                    Open
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Re-scan Button */}
        <button
          onClick={onScan}
          disabled={isLoading}
          title="Re-analyze Repository (⌘R)"
          className="p-1.5 rounded-md hover:bg-mac-surface text-mac-textSecondary hover:text-mac-text apple-btn"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-mac-blue' : ''}`} />
        </button>
      </div>

      {/* Center: Activity Capsule & Quick Search */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenSearchPalette}
          className="flex items-center space-x-2 px-3 py-1 rounded-md bg-mac-canvas hover:bg-mac-surface border border-mac-border text-xs text-mac-textSecondary hover:text-mac-text transition w-64 justify-between"
        >
          <div className="flex items-center space-x-2 truncate">
            <Search className="w-3.5 h-3.5 text-mac-textTertiary shrink-0" />
            <span className="truncate">
              {isLoading ? 'Analyzing AST...' : 'Jump to symbol or test...'}
            </span>
          </div>
          <kbd className="text-2xs font-mono px-1 py-0.5 rounded bg-mac-surfaceActive text-mac-textSecondary">
            ⌘K
          </kbd>
        </button>

        <div className="hidden xl:flex items-center space-x-1.5 text-2xs font-mono text-mac-textTertiary px-2 py-1 rounded bg-mac-canvas border border-mac-border">
          <span>{fileCount}f</span>
          <span>·</span>
          <span>{nodeCount}s</span>
          <span>·</span>
          <span>{edgeCount}e</span>
        </div>
      </div>

      {/* Right Group: Segmented View Switcher, Diagnostics, Export, Inspector Toggle */}
      <div className="flex items-center space-x-2">
        {/* Apple Segmented Control */}
        <div className="flex items-center bg-mac-canvas p-0.5 rounded-lg border border-mac-border">
          <button
            onClick={() => setViewMode('graph')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium apple-btn ${
              viewMode === 'graph'
                ? 'bg-mac-surfaceActive text-mac-text shadow-mac-button'
                : 'text-mac-textSecondary hover:text-mac-text'
            }`}
          >
            <Network className="w-3.5 h-3.5 text-mac-blue" />
            <span>Graph</span>
          </button>
          <button
            onClick={() => setViewMode('insights')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium apple-btn ${
              viewMode === 'insights'
                ? 'bg-mac-surfaceActive text-mac-text shadow-mac-button'
                : 'text-mac-textSecondary hover:text-mac-text'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-mac-orange" />
            <span>Structural Insights</span>
          </button>
        </div>

        <div className="w-px h-4 bg-mac-border mx-1" />

        {/* Doctor Diagnostics */}
        <button
          onClick={onOpenDoctor}
          title="System Diagnostics & Isolation Guarantees (⌘D)"
          className="p-1.5 rounded-md hover:bg-mac-surface text-mac-textSecondary hover:text-mac-text apple-btn"
        >
          <Cpu className="w-4 h-4" />
        </button>

        {/* Export Report */}
        <button
          onClick={onOpenReport}
          title="Export Markdown/JSON Report (⌘E)"
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-mac-surface hover:bg-mac-surfaceHover border border-mac-border text-xs text-mac-text font-medium apple-btn"
        >
          <FileDown className="w-3.5 h-3.5 text-mac-blue" />
          <span>Export</span>
        </button>

        {/* Inspector Toggle Button */}
        <button
          onClick={onToggleInspector}
          title="Toggle Inspector Panel (⌥⌘0)"
          className={`p-1.5 rounded-md apple-btn ${
            isInspectorOpen
              ? 'bg-mac-surfaceActive text-mac-text shadow-mac-button'
              : 'text-mac-textSecondary hover:bg-mac-surface hover:text-mac-text'
          }`}
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
