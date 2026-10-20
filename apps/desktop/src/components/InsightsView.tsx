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
    <div className="h-full overflow-y-auto bg-mac-canvas p-8 select-text">
      <div className="max-w-5xl mx-auto space-y-7">
        {/* View Header */}
        <div className="space-y-1">
          <span className="text-2xs font-semibold text-mac-orange tracking-wider uppercase">
            Codebase Architecture
          </span>
          <h1 className="text-xl font-bold text-mac-text tracking-tight">
            Structural Health & Topology
          </h1>
          <p className="text-xs text-mac-textSecondary max-w-2xl leading-relaxed">
            Evidence-backed analysis of coupling, dependency cycles, architectural hubs, and blast-radius hot spots calculated directly from AST syntax trees and multi-graph traversal.
          </p>
        </div>

        {/* High-Level Topology Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg bg-mac-window border border-mac-border space-y-1">
            <span className="text-2xs font-medium text-mac-textSecondary">
              Source files
            </span>
            <div className="text-xl font-bold font-mono text-mac-text">
              {scanResult?.file_count || 0}
            </div>
            <div className="text-2xs text-mac-textTertiary font-mono">
              SHA-256 state verified
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-mac-window border border-mac-border space-y-1">
            <span className="text-2xs font-medium text-mac-textSecondary">
              Graph symbols
            </span>
            <div className="text-xl font-bold font-mono text-mac-blue">
              {nodes.length}
            </div>
            <div className="text-2xs text-mac-textTertiary font-mono">
              {edges.length} dependency edges
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-mac-window border border-mac-border space-y-1">
            <span className="text-2xs font-medium text-mac-textSecondary">
              Dependency loops
            </span>
            <div className="text-xl font-bold font-mono flex items-center space-x-2">
              <span className={detectedCycles.length > 0 ? 'text-mac-orange' : 'text-mac-green'}>
                {detectedCycles.length}
              </span>
            </div>
            <div className="text-2xs text-mac-textTertiary">
              {detectedCycles.length === 0 ? 'Acyclic dependency tree' : 'Circular import/call loops'}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-mac-window border border-mac-border space-y-1">
            <span className="text-2xs font-medium text-mac-textSecondary">
              Test density
            </span>
            <div className="text-xl font-bold font-mono text-mac-green">
              {testRatio}%
            </div>
            <div className="text-2xs text-mac-textTertiary font-mono">
              {testCount} automated test suites
            </div>
          </div>
        </div>

        {/* Circular Dependency Cycles Section */}
        <div className="p-4 rounded-lg bg-mac-window border border-mac-border space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <RotateCw className="w-4 h-4 text-mac-orange" />
              <h2 className="text-sm font-semibold text-mac-text">
                Circular Dependency Detection
              </h2>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-2xs font-medium ${
                detectedCycles.length > 0
                  ? 'bg-orange-950/40 text-mac-orange border border-orange-800/40'
                  : 'bg-emerald-950/40 text-mac-green border border-emerald-800/40'
              }`}
            >
              {detectedCycles.length === 0 ? '0 cycles (Acyclic)' : `${detectedCycles.length} cycles detected`}
            </span>
          </div>

          {detectedCycles.length === 0 ? (
            <div className="p-3 rounded-md bg-mac-surface border border-mac-border text-xs text-mac-textSecondary flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-mac-green shrink-0" />
              <span>Clean acyclic architecture. No mutual import or call recursion loops detected between modules.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {detectedCycles.map((cycle, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-mac-surface border border-orange-900/40 rounded-md space-y-2"
                >
                  <div className="text-mac-orange font-mono text-xs font-semibold flex items-center space-x-1.5">
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Circular Loop #{idx + 1} ({cycle.length - 1} hops)</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-mac-text">
                    {cycle.map((id, sIdx) => {
                      const label = id.split('::').pop() || id;
                      return (
                        <React.Fragment key={sIdx}>
                          <button
                            onClick={() => onNavigateToNode(id)}
                            className="px-2 py-1 rounded bg-mac-window border border-mac-border hover:border-mac-blue hover:text-mac-blue transition text-xs"
                            title={id}
                          >
                            {label}
                          </button>
                          {sIdx < cycle.length - 1 && <ArrowRight className="w-3 h-3 text-mac-textTertiary" />}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Top Hub Symbols */}
          <div className="p-4 rounded-lg bg-mac-window border border-mac-border space-y-2.5">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-mac-blue" />
              <h2 className="text-sm font-semibold text-mac-text">
                Core Architectural Hubs
              </h2>
            </div>
            <p className="text-xs text-mac-textSecondary leading-relaxed">
              Symbols with the highest incoming dependencies. Modifying these symbols creates the widest direct and transitive blast radius.
            </p>

            <div className="space-y-1 pt-1">
              {topHubs.length === 0 ? (
                <p className="text-mac-textTertiary italic text-xs">No dependent relationships mapped.</p>
              ) : (
                topHubs.map(({ node, count }) => (
                  <div
                    key={node.id}
                    onClick={() => onNavigateToNode(node.id)}
                    className="p-2 bg-mac-surface hover:bg-mac-surfaceHover border border-mac-border rounded-md flex items-center justify-between cursor-pointer transition group"
                  >
                    <div className="truncate min-w-0 pr-2">
                      <div className="font-mono text-xs text-mac-text group-hover:text-mac-blue font-semibold truncate">
                        {node.label}
                      </div>
                      <div className="text-2xs text-mac-textTertiary font-mono truncate">
                        {node.file_id || 'Root'}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-mac-blue shrink-0">
                      {count} dependents
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* High-Coupling Symbols */}
          <div className="p-4 rounded-lg bg-mac-window border border-mac-border space-y-2.5">
            <div className="flex items-center space-x-2">
              <GitFork className="w-4 h-4 text-mac-orange" />
              <h2 className="text-sm font-semibold text-mac-text">
                High-Coupling Hotspots
              </h2>
            </div>
            <p className="text-xs text-mac-textSecondary leading-relaxed">
              Symbols with the highest outgoing fan-out. These functions and files rely on many disparate internal dependencies.
            </p>

            <div className="space-y-1 pt-1">
              {topCoupled.length === 0 ? (
                <p className="text-mac-textTertiary italic text-xs">No outgoing dependencies mapped.</p>
              ) : (
                topCoupled.map(({ node, count }) => (
                  <div
                    key={node.id}
                    onClick={() => onNavigateToNode(node.id)}
                    className="p-2 bg-mac-surface hover:bg-mac-surfaceHover border border-mac-border rounded-md flex items-center justify-between cursor-pointer transition group"
                  >
                    <div className="truncate min-w-0 pr-2">
                      <div className="font-mono text-xs text-mac-text group-hover:text-mac-orange font-semibold truncate">
                        {node.label}
                      </div>
                      <div className="text-2xs text-mac-textTertiary font-mono truncate">
                        {node.file_id || 'Root'}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-medium text-mac-textSecondary shrink-0">
                      {count} calls/imports
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* External Packages Inventory */}
        <div className="p-4 rounded-lg bg-mac-window border border-mac-border space-y-2.5">
          <div className="flex items-center space-x-2">
            <ExternalLink className="w-4 h-4 text-mac-textSecondary" />
            <h2 className="text-sm font-semibold text-mac-text">
              External Dependencies Inventory ({externalModules.length})
            </h2>
          </div>
          <p className="text-xs text-mac-textSecondary leading-relaxed">
            Third-party libraries and standard library modules referenced by source files.
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {externalModules.length === 0 ? (
              <p className="text-mac-textTertiary italic text-xs">No external packages referenced.</p>
            ) : (
              externalModules.map((pkg) => (
                <span
                  key={pkg}
                  className="px-2 py-1 rounded bg-mac-surface border border-mac-border text-xs font-mono text-mac-text font-medium"
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
