import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  GitCommit,
  Network,
  RotateCw,
  FolderGit2,
} from 'lucide-react';

interface StatusBarProps {
  repoPath: string;
  fingerprint: string | null;
  fileCount: number;
  nodeCount: number;
  edgeCount: number;
  cycleCount: number;
  dockerAvailable: boolean;
  selectedLabel: string | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  repoPath,
  fingerprint,
  fileCount,
  nodeCount,
  edgeCount,
  cycleCount,
  dockerAvailable,
  selectedLabel,
}) => {
  const shortPath = repoPath.split('/').slice(-2).join('/');
  const shortFingerprint = fingerprint ? fingerprint.slice(0, 8) : null;

  return (
    <footer className="h-7 bg-canvas-900 border-t border-canvas-800 px-3 flex items-center justify-between text-2xs font-mono text-slate-400 select-none z-30">
      {/* Left section: Repository & Graph Stats */}
      <div className="flex items-center space-x-3 truncate">
        {/* Active Repo */}
        <div className="flex items-center space-x-1.5 text-slate-300" title={repoPath}>
          <FolderGit2 className="w-3.5 h-3.5 text-ghost-cyan shrink-0" />
          <span className="font-medium truncate max-w-[160px] sm:max-w-[240px]">{shortPath || 'No repository'}</span>
        </div>

        {/* SHA-256 Fingerprint */}
        {shortFingerprint && (
          <div className="hidden md:flex items-center space-x-1 text-slate-500" title={`Repository Fingerprint: ${fingerprint}`}>
            <GitCommit className="w-3 h-3 text-slate-500" />
            <span className="text-slate-400">{shortFingerprint}</span>
          </div>
        )}

        <div className="w-px h-3 bg-canvas-800 hidden sm:block" />

        {/* Counts */}
        <div className="hidden sm:flex items-center space-x-3">
          <span title={`${fileCount} scanned source files`}>
            <span className="text-slate-200">{fileCount}</span> files
          </span>
          <span className="flex items-center space-x-1" title={`${nodeCount} graph nodes, ${edgeCount} edges`}>
            <Network className="w-3 h-3 text-ghost-sky opacity-80" />
            <span>
              <span className="text-slate-200">{nodeCount}</span>n / <span className="text-slate-200">{edgeCount}</span>e
            </span>
          </span>

          {cycleCount > 0 && (
            <span className="flex items-center space-x-1 text-ghost-amber" title={`${cycleCount} circular dependency cycles detected`}>
              <RotateCw className="w-3 h-3" />
              <span>{cycleCount} cycles</span>
            </span>
          )}
        </div>
      </div>

      {/* Center: Selected Node Context */}
      <div className="hidden lg:flex items-center justify-center truncate px-2">
        {selectedLabel ? (
          <div className="flex items-center space-x-1.5 text-slate-300 bg-canvas-850 px-2 py-0.5 rounded border border-canvas-800">
            <span className="text-slate-500 text-[10px]">FOCUS:</span>
            <span className="text-ghost-cyan font-semibold truncate max-w-[200px]">{selectedLabel}</span>
          </div>
        ) : (
          <span className="text-slate-600">Static AST & Multi-Graph Engine</span>
        )}
      </div>

      {/* Right section: Sandbox Isolation & Keyboard Shortcuts */}
      <div className="flex items-center space-x-3 shrink-0">
        <div
          className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px]"
          title={
            dockerAvailable
              ? 'Docker sandbox active: Network disabled, read-only rootfs'
              : 'Subprocess runner: Restricted execution with process tree supervision'
          }
        >
          {dockerAvailable ? (
            <>
              <ShieldCheck className="w-3 h-3 text-ghost-emerald" />
              <span className="text-emerald-400">Docker Sandbox</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-3 h-3 text-ghost-amber" />
              <span className="text-amber-400">Restricted Subprocess</span>
            </>
          )}
        </div>

        <div className="hidden xl:flex items-center space-x-2 text-slate-500 text-[10px]">
          <span><kbd className="px-1 py-0.2 bg-canvas-800 text-slate-400 rounded border border-canvas-750">Space</kbd> fit</span>
          <span><kbd className="px-1 py-0.2 bg-canvas-800 text-slate-400 rounded border border-canvas-750">Esc</kbd> clear</span>
        </div>
      </div>
    </footer>
  );
};
