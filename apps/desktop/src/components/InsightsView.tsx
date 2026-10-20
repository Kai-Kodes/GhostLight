import React, { useMemo } from 'react';
import { GraphEdgeDto, GraphNodeDto, ScanResult } from '../types';
import {
  RotateCw,
  Flame,
  GitFork,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface InsightsViewProps {
  nodes: GraphNodeDto[];
  edges: GraphEdgeDto[];
  scanResult: ScanResult | null;
  onNavigateToNode: (nodeId: string) => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  nodes,
  edges,
  scanResult,
  onNavigateToNode,
}) => {
  // Graph metrics calculation
  const { topHubs, topCoupled, detectedCycles, externalModules, testCount } = useMemo(() => {
    const inDeg: Record<string, number> = {};
    const outDeg: Record<string, number> = {};
    const externals = new Set<string>();
    let tests = 0;

    for (const node of nodes) {
      inDeg[node.id] = 0;
      outDeg[node.id] = 0;
      if (node.is_test || node.kind === 'Test') tests++;
      if (node.kind === 'ExternalModule') externals.add(node.label);
    }

    for (const edge of edges) {
      if (inDeg[edge.target] !== undefined) inDeg[edge.target]++;
      if (outDeg[edge.source] !== undefined) outDeg[edge.source]++;
    }

    // Top in-degree hubs
    const hubs = [...nodes]
      .filter((n) => n.kind !== 'ExternalModule' && inDeg[n.id] > 0)
      .sort((a, b) => inDeg[b.id] - inDeg[a.id])
      .slice(0, 6)
      .map((n) => ({ node: n, count: inDeg[n.id] }));

    // Top out-degree coupled
    const coupled = [...nodes]
      .filter((n) => n.kind !== 'ExternalModule' && outDeg[n.id] > 0)
      .sort((a, b) => outDeg[b.id] - outDeg[a.id])
      .slice(0, 6)
      .map((n) => ({ node: n, count: outDeg[n.id] }));

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

      for (const next of adj[curr] || []) {
        if (!visited[next]) {
          dfs(next, path);
        } else if (inStack[next]) {
          const startIdx = path.indexOf(next);
          if (startIdx !== -1 && cycles.length < 5) {
            cycles.push([...path.slice(startIdx), next]);
          }
        }
      }

      inStack[curr] = false;
      path.pop();
    };

    for (const node of nodes) {
      if (!visited[node.id]) dfs(node.id, []);
    }

    return {
      topHubs: hubs,
      topCoupled: coupled,
      detectedCycles: cycles,
      externalModules: Array.from(externals).sort(),
      testCount: tests,
    };
  }, [nodes, edges]);

  const testRatio = nodes.length > 0 ? ((testCount / nodes.length) * 100).toFixed(1) : '0';

  return (
    <div className="h-full overflow-y-auto bg-obsidian-950 p-8 select-text">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* View Header */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-signal-amber text-xs font-semibold uppercase tracking-wider font-mono">
            <span>Repository Architecture</span>
          </div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Codebase Structural Health & Topology
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Evidence-backed analysis of coupling, dependency cycles, architectural hubs, and candidate blast-radius hot spots calculated directly from AST syntax trees and multi-graph traversal.
          </p>
        </div>

        {/* High-Level Topology Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-obsidian-900 border border-obsidian-800 space-y-1">
            <span className="text-2xs uppercase tracking-wider text-slate-500 font-semibold font-mono">
              Source Files
            </span>
            <div className="text-2xl font-bold font-mono text-slate-100">
              {scanResult?.file_count || 0}
            </div>
            <div className="text-2xs text-slate-400 font-mono">
              SHA-256 state verified
            </div>
          </div>

          <div className="p-4 rounded-xl bg-obsidian-900 border border-obsidian-800 space-y-1">
            <span className="text-2xs uppercase tracking-wider text-slate-500 font-semibold font-mono">
              Graph Nodes
            </span>
            <div className="text-2xl font-bold font-mono text-signal-cyan">
              {nodes.length}
            </div>
            <div className="text-2xs text-slate-400 font-mono">
              {edges.length} dependency edges
            </div>
          </div>

          <div className="p-4 rounded-xl bg-obsidian-900 border border-obsidian-800 space-y-1">
            <span className="text-2xs uppercase tracking-wider text-slate-500 font-semibold font-mono">
              Dependency Loops
            </span>
            <div className="text-2xl font-bold font-mono flex items-center space-x-2">
              <span className={detectedCycles.length > 0 ? 'text-signal-amber' : 'text-signal-emerald'}>
                {detectedCycles.length}
              </span>
            </div>
            <div className="text-2xs text-slate-400 font-mono">
              {detectedCycles.length === 0 ? 'Acyclic dependency tree' : 'Circular import/call loops'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-obsidian-900 border border-obsidian-800 space-y-1">
            <span className="text-2xs uppercase tracking-wider text-slate-500 font-semibold font-mono">
              Test Density
            </span>
            <div className="text-2xl font-bold font-mono text-signal-emerald">
              {testRatio}%
            </div>
            <div className="text-2xs text-slate-400 font-mono">
              {testCount} automated test suites
            </div>
          </div>
        </div>

        {/* Circular Dependency Cycles Section */}
        <div className="p-5 rounded-xl bg-obsidian-900 border border-obsidian-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <RotateCw className="w-4 h-4 text-signal-amber" />
              <h2 className="text-sm font-semibold text-slate-100">
                Circular Dependency Detection
              </h2>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-2xs font-mono font-medium ${
                detectedCycles.length > 0
                  ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                  : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
              }`}
            >
              {detectedCycles.length === 0 ? '0 cycles (Acyclic)' : `${detectedCycles.length} cycles detected`}
            </span>
          </div>

          {detectedCycles.length === 0 ? (
            <div className="p-4 rounded-lg bg-obsidian-950/60 border border-obsidian-800/60 text-xs text-slate-400 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-signal-emerald shrink-0" />
              <span>Clean acyclic architecture. No mutual import or call recursion loops detected between modules.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {detectedCycles.map((cycle, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-lg space-y-2"
                >
                  <div className="text-amber-400 font-mono text-xs font-semibold flex items-center space-x-1.5">
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Circular Loop #{idx + 1} ({cycle.length - 1} hops)</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-slate-200">
                    {cycle.map((id, sIdx) => {
                      const label = id.split('::').pop() || id;
                      return (
                        <React.Fragment key={sIdx}>
                          <button
                            onClick={() => onNavigateToNode(id)}
                            className="px-2 py-1 rounded bg-obsidian-900 border border-obsidian-800 hover:border-signal-cyan hover:text-signal-cyan transition text-xs"
                            title={id}
                          >
                            {label}
                          </button>
                          {sIdx < cycle.length - 1 && <ArrowRight className="w-3 h-3 text-slate-500" />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Core Hubs & Coupling Hotspots (2-Column Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Hub Symbols */}
          <div className="p-5 rounded-xl bg-obsidian-900 border border-obsidian-800 space-y-3">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-signal-cyan" />
              <h2 className="text-sm font-semibold text-slate-100">
                Core Architectural Hubs
              </h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Symbols with the highest incoming dependencies. Modifying these symbols creates the widest direct and transitive blast radius.
            </p>

            <div className="space-y-1.5 pt-1">
              {topHubs.length === 0 ? (
                <p className="text-slate-500 italic text-xs">No dependent relationships mapped.</p>
              ) : (
                topHubs.map(({ node, count }) => (
                  <div
                    key={node.id}
                    onClick={() => onNavigateToNode(node.id)}
                    className="p-2.5 bg-obsidian-950 hover:bg-obsidian-850 border border-obsidian-800 rounded-lg flex items-center justify-between cursor-pointer transition group"
                  >
                    <div className="truncate min-w-0 pr-2">
                      <div className="font-mono text-xs text-slate-200 group-hover:text-signal-cyan font-semibold truncate">
                        {node.label}
                      </div>
                      <div className="text-2xs text-slate-500 font-mono truncate">
                        {node.file_id || 'Root'}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-signal-cyan shrink-0">
                      {count} dependents
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* High-Coupling Symbols */}
          <div className="p-5 rounded-xl bg-obsidian-900 border border-obsidian-800 space-y-3">
            <div className="flex items-center space-x-2">
              <GitFork className="w-4 h-4 text-signal-amber" />
              <h2 className="text-sm font-semibold text-slate-100">
                High-Coupling Hotspots
              </h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Symbols with the highest outgoing fan-out. These functions and files rely on many disparate internal dependencies.
            </p>

            <div className="space-y-1.5 pt-1">
              {topCoupled.length === 0 ? (
                <p className="text-slate-500 italic text-xs">No outgoing dependencies mapped.</p>
              ) : (
                topCoupled.map(({ node, count }) => (
                  <div
                    key={node.id}
                    onClick={() => onNavigateToNode(node.id)}
                    className="p-2.5 bg-obsidian-950 hover:bg-obsidian-850 border border-obsidian-800 rounded-lg flex items-center justify-between cursor-pointer transition group"
                  >
                    <div className="truncate min-w-0 pr-2">
                      <div className="font-mono text-xs text-slate-200 group-hover:text-signal-amber font-semibold truncate">
                        {node.label}
                      </div>
                      <div className="text-2xs text-slate-500 font-mono truncate">
                        {node.file_id || 'Root'}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-400 shrink-0">
                      {count} calls/imports
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* External Packages Inventory */}
        <div className="p-5 rounded-xl bg-obsidian-900 border border-obsidian-800 space-y-3">
          <div className="flex items-center space-x-2">
            <ExternalLink className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              External Dependencies Inventory ({externalModules.length})
            </h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Third-party libraries and standard library modules referenced by source files.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {externalModules.length === 0 ? (
              <p className="text-slate-500 italic text-xs">No external packages referenced.</p>
            ) : (
              externalModules.map((pkg) => (
                <span
                  key={pkg}
                  className="px-2.5 py-1 rounded-md bg-obsidian-950 border border-obsidian-800 text-xs font-mono text-slate-300 font-medium"
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
