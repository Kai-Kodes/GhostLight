import React, { useMemo } from 'react';
import { GraphEdgeDto, GraphNodeDto, ScanResult } from '../types';
import {
  Compass,
  RotateCw,
  GitFork,
  ExternalLink,
  Flame,
  FileCode,
} from 'lucide-react';

interface RepoOverviewPanelProps {
  nodes: GraphNodeDto[];
  edges: GraphEdgeDto[];
  scanResult: ScanResult | null;
  onSelectNodeById: (id: string) => void;
}

export const RepoOverviewPanel: React.FC<RepoOverviewPanelProps> = ({
  nodes,
  edges,
  scanResult,
  onSelectNodeById,
}) => {
  // 1. Calculate In-degree and Out-degree per node
  const { topDependedUpon, topCoupled, kindCounts, externalModules, detectedCycles } = useMemo(() => {
    const inDegrees: Record<string, number> = {};
    const outDegrees: Record<string, number> = {};
    const kinds: Record<string, number> = {};
    const externals = new Set<string>();

    for (const node of nodes) {
      inDegrees[node.id] = 0;
      outDegrees[node.id] = 0;
      kinds[node.kind] = (kinds[node.kind] || 0) + 1;
      if (node.kind === 'ExternalModule') {
        externals.add(node.label);
      }
    }

    for (const edge of edges) {
      if (inDegrees[edge.target] !== undefined) inDegrees[edge.target]++;
      if (outDegrees[edge.source] !== undefined) outDegrees[edge.source]++;
    }

    // Sort by highest in-degree (most depended-upon hubs)
    const sortedIn = [...nodes]
      .filter((n) => n.kind !== 'ExternalModule' && inDegrees[n.id] > 0)
      .sort((a, b) => inDegrees[b.id] - inDegrees[a.id])
      .slice(0, 5)
      .map((n) => ({ node: n, count: inDegrees[n.id] }));

    // Sort by highest out-degree (most coupled / high fan-out)
    const sortedOut = [...nodes]
      .filter((n) => n.kind !== 'ExternalModule' && outDegrees[n.id] > 0)
      .sort((a, b) => outDegrees[b.id] - outDegrees[a.id])
      .slice(0, 5)
      .map((n) => ({ node: n, count: outDegrees[n.id] }));

    // Cycle detection using DFS
    const adj: Record<string, string[]> = {};
    for (const edge of edges) {
      if (edge.edge_type === 'Imports' || edge.edge_type === 'Calls') {
        if (!adj[edge.source]) adj[edge.source] = [];
        adj[edge.source].push(edge.target);
      }
    }

    const visited: Record<string, boolean> = {};
    const inStack: Record<string, boolean> = {};
    const cycles: string[][] = [];

    const dfs = (curr: string, path: string[]) => {
      visited[curr] = true;
      inStack[curr] = true;
      path.push(curr);

      const neighbors = adj[curr] || [];
      for (const next of neighbors) {
        if (!visited[next]) {
          dfs(next, path);
        } else if (inStack[next]) {
          const cycleStartIndex = path.indexOf(next);
          if (cycleStartIndex !== -1) {
            const cyclePath = path.slice(cycleStartIndex);
            if (cycles.length < 5) {
              cycles.push([...cyclePath, next]);
            }
          }
        }
      }

      inStack[curr] = false;
      path.pop();
    };

    for (const node of nodes) {
      if (!visited[node.id]) {
        dfs(node.id, []);
      }
    }

    return {
      topDependedUpon: sortedIn,
      topCoupled: sortedOut,
      kindCounts: kinds,
      externalModules: Array.from(externals).sort(),
      detectedCycles: cycles,
    };
  }, [nodes, edges]);

  const totalSymbols = nodes.length;
  const testCount = kindCounts['Test'] || 0;
  const testRatio = totalSymbols > 0 ? ((testCount / totalSymbols) * 100).toFixed(1) : '0';

  return (
    <div className="h-full flex flex-col overflow-y-auto text-xs bg-canvas-900 select-none">
      {/* Panel Header */}
      <div className="p-3 border-b border-canvas-800 bg-canvas-850 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Compass className="w-4 h-4 text-ghost-violet" />
          <h2 className="text-xs font-semibold text-slate-100 font-mono tracking-tight">
            Codebase Structural Metrics
          </h2>
        </div>
        <span className="font-mono text-[10px] text-slate-400">
          {nodes.length} symbols
        </span>
      </div>

      <div className="p-3 space-y-4">
        {/* Core Structural Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 bg-canvas-850 border border-canvas-800 rounded-md">
            <span className="text-[10px] text-slate-400 font-mono block">Files Analyzed</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="font-mono text-base font-semibold text-slate-100">
                {scanResult?.file_count || 0}
              </span>
              <FileCode className="w-3.5 h-3.5 text-ghost-cyan opacity-80" />
            </div>
          </div>

          <div className="p-2.5 bg-canvas-850 border border-canvas-800 rounded-md">
            <span className="text-[10px] text-slate-400 font-mono block">Test Density</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="font-mono text-base font-semibold text-emerald-400">
                {testRatio}%
              </span>
              <span className="text-[10px] text-slate-500 font-mono">({testCount} tests)</span>
            </div>
          </div>
        </div>

        {/* Circular Dependency Cycles Section */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <RotateCw className="w-3.5 h-3.5 text-ghost-amber" />
              <span>Dependency Cycles</span>
            </h3>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-medium ${
                detectedCycles.length > 0
                  ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                  : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
              }`}
            >
              {detectedCycles.length === 0 ? '0 cycles (Acyclic)' : `${detectedCycles.length} circular paths`}
            </span>
          </div>

          {detectedCycles.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic p-2 bg-canvas-850/50 rounded border border-canvas-800/50">
              Clean directed acyclic dependency structure. No import/call loops found.
            </p>
          ) : (
            <div className="space-y-1.5">
              {detectedCycles.map((cyc, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-amber-950/20 border border-amber-900/40 rounded text-[11px] font-mono space-y-1"
                >
                  <div className="text-amber-400 font-semibold text-[10px] flex items-center space-x-1">
                    <RotateCw className="w-3 h-3" />
                    <span>Cycle #{idx + 1} ({cyc.length - 1} hops)</span>
                  </div>
                  <div className="text-slate-300 truncate text-[10px] flex flex-wrap gap-1 items-center">
                    {cyc.map((id, sIdx) => {
                      const label = id.split('::').pop() || id;
                      return (
                        <React.Fragment key={sIdx}>
                          <button
                            onClick={() => onSelectNodeById(id)}
                            className="hover:text-cyan-400 hover:underline text-slate-200"
                            title={id}
                          >
                            {label}
                          </button>
                          {sIdx < cyc.length - 1 && <span className="text-slate-600">→</span>}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Architectural Hubs (High In-Degree) */}
        <div>
          <h3 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
            <Flame className="w-3.5 h-3.5 text-ghost-cyan" />
            <span>Core Hub Symbols (Top Dependents)</span>
          </h3>
          <p className="text-[10px] text-slate-500 mb-2">
            Symbols with highest incoming dependencies; changing these causes broad impact.
          </p>

          <div className="space-y-1">
            {topDependedUpon.length === 0 ? (
              <p className="text-slate-500 italic text-[11px]">No dependencies mapped.</p>
            ) : (
              topDependedUpon.map(({ node, count }) => (
                <div
                  key={node.id}
                  onClick={() => onSelectNodeById(node.id)}
                  className="p-1.5 bg-canvas-850 hover:bg-canvas-800 rounded border border-canvas-800 flex items-center justify-between cursor-pointer btn-interactive"
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className="text-[9px] uppercase font-mono px-1 py-0.2 bg-canvas-800 text-slate-400 rounded">
                      {node.kind}
                    </span>
                    <span className="font-mono text-slate-200 text-[11px] truncate">
                      {node.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-ghost-cyan font-semibold shrink-0 ml-2">
                    {count} dependents
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* High Coupling Symbols (High Out-Degree) */}
        <div>
          <h3 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
            <GitFork className="w-3.5 h-3.5 text-ghost-amber" />
            <span>High-Coupling Symbols (Top Fan-Out)</span>
          </h3>
          <p className="text-[10px] text-slate-500 mb-2">
            Symbols with the highest outgoing calls and imports.
          </p>

          <div className="space-y-1">
            {topCoupled.length === 0 ? (
              <p className="text-slate-500 italic text-[11px]">No outgoing dependencies.</p>
            ) : (
              topCoupled.map(({ node, count }) => (
                <div
                  key={node.id}
                  onClick={() => onSelectNodeById(node.id)}
                  className="p-1.5 bg-canvas-850 hover:bg-canvas-800 rounded border border-canvas-800 flex items-center justify-between cursor-pointer btn-interactive"
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className="text-[9px] uppercase font-mono px-1 py-0.2 bg-canvas-800 text-slate-400 rounded">
                      {node.kind}
                    </span>
                    <span className="font-mono text-slate-200 text-[11px] truncate">
                      {node.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                    {count} calls/imports
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* External Packages Detected */}
        <div>
          <h3 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>External Dependencies ({externalModules.length})</span>
          </h3>

          <div className="flex flex-wrap gap-1">
            {externalModules.length === 0 ? (
              <p className="text-slate-500 italic text-[11px]">No external modules referenced.</p>
            ) : (
              externalModules.map((pkg) => (
                <span
                  key={pkg}
                  className="px-2 py-0.5 bg-canvas-850 border border-canvas-800 rounded text-[10px] font-mono text-slate-300"
                >
                  {pkg}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
