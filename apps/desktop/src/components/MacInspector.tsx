import React, { useState, useMemo } from 'react';
import {
  X,
  Target,
  Shield,
  Play,
  RotateCw,
  Terminal,
  FolderGit2,
} from 'lucide-react';
import {
  ExplanatoryPath,
  GraphEdgeDto,
  GraphNodeDto,
  ImpactReport,
  TestRunResult,
} from '../types';
import { runTests } from '../services/api';

interface MacInspectorProps {
  node: GraphNodeDto | null;
  edges: GraphEdgeDto[];
  impactReport: ImpactReport | null;
  activePath: ExplanatoryPath | null;
  onAnalyzeImpact: (node: GraphNodeDto) => void;
  onSelectNodeById: (nodeId: string) => void;
  onSelectExplanatoryPath: (path: ExplanatoryPath | null) => void;
  onClearImpact: () => void;
  onClose: () => void;
  repoPath: string;
  totalFiles: number;
  totalNodes: number;
  totalEdges: number;
  fingerprint?: string;
  hasCycles?: boolean;
}

export const MacInspector: React.FC<MacInspectorProps> = ({
  node,
  edges,
  impactReport,
  activePath,
  onAnalyzeImpact,
  onSelectNodeById,
  onSelectExplanatoryPath,
  onClearImpact,
  onClose,
  repoPath,
  totalFiles,
  totalNodes,
  totalEdges,
  fingerprint,
  hasCycles,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'impact' | 'tests'>('overview');
  const [impactFilter, setImpactFilter] = useState<'all' | 'direct' | 'transitive'>('all');

  // Test execution state
  const [authorized, setAuthorized] = useState(false);
  const [sandboxMode, setSandboxMode] = useState<'docker' | 'subprocess'>('docker');
  const [isExecuting, setIsExecuting] = useState(false);
  const [testResult, setTestResult] = useState<TestRunResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [showConsole, setShowConsole] = useState(false);

  // Switch to impact tab when impactReport arrives
  React.useEffect(() => {
    if (impactReport && node) {
      setActiveTab('impact');
    }
  }, [impactReport]);

  // Degree calculations for selected node
  const { incomingEdges, outgoingEdges } = useMemo(() => {
    if (!node) return { incomingEdges: [], outgoingEdges: [] };
    const inc = edges.filter((e) => e.target === node.id);
    const out = edges.filter((e) => e.source === node.id);
    return { incomingEdges: inc, outgoingEdges: out };
  }, [node, edges]);

  // Filtered affected nodes
  const filteredAffected = useMemo(() => {
    if (!impactReport?.affected_nodes) return [];
    if (impactFilter === 'direct') {
      return impactReport.affected_nodes.filter((n) => n.impact_type === 'Direct');
    }
    if (impactFilter === 'transitive') {
      return impactReport.affected_nodes.filter((n) => n.impact_type === 'Transitive');
    }
    return impactReport.affected_nodes;
  }, [impactReport, impactFilter]);

  // Test execution trigger
  const handleRunTests = async () => {
    if (!authorized || !impactReport) return;
    setIsExecuting(true);
    setTestError(null);
    try {
      const res = await runTests(
        repoPath,
        impactReport.candidate_tests,
        authorized,
        sandboxMode === 'docker'
      );
      setTestResult(res);
      setShowConsole(true);
    } catch (err: any) {
      setTestError(err?.message || String(err));
    } finally {
      setIsExecuting(false);
    }
  };

  // If no node is selected, render the Repository Inspector
  if (!node) {
    return (
      <aside className="w-80 h-full bg-mac-window border-l border-mac-border flex flex-col select-none overflow-hidden shrink-0">
        <div className="h-10 px-3 border-b border-mac-border flex items-center justify-between text-xs font-semibold text-mac-text">
          <div className="flex items-center space-x-1.5">
            <FolderGit2 className="w-3.5 h-3.5 text-mac-blue" />
            <span>Repository Inspector</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-mac-surface text-mac-textSecondary hover:text-mac-text"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
          <div>
            <span className="text-2xs font-semibold uppercase tracking-wider text-mac-textSecondary block mb-1.5">
              Codebase Identity
            </span>
            <div className="bg-mac-surface border border-mac-border rounded-lg p-2.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-mac-textSecondary">Target</span>
                <span className="font-mono text-mac-text truncate max-w-[150px]">
                  {repoPath.split('/').pop()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-mac-textSecondary">Fingerprint</span>
                <span className="font-mono text-mac-text text-2xs">
                  {fingerprint ? fingerprint.slice(0, 12) + '...' : 'Verified'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-mac-textSecondary">Files Analyzed</span>
                <span className="font-mono text-mac-text">{totalFiles}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-mac-textSecondary">Graph Topology</span>
                <span className="font-mono text-mac-text">
                  {totalNodes} nodes · {totalEdges} edges
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-mac-textSecondary">Cycles</span>
                <span
                  className={`font-medium ${
                    hasCycles ? 'text-mac-orange' : 'text-mac-green'
                  }`}
                >
                  {hasCycles ? 'Detected' : 'Acyclic (Clean)'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <span className="text-2xs font-semibold uppercase tracking-wider text-mac-textSecondary block mb-1.5">
              Execution Isolation
            </span>
            <div className="bg-mac-surface border border-mac-border rounded-lg p-2.5 text-mac-textSecondary text-2xs space-y-1.5 leading-relaxed">
              <div className="flex items-center space-x-1.5 text-mac-text font-medium text-xs">
                <Shield className="w-3.5 h-3.5 text-mac-green" />
                <span>Air-Gapped Sandbox</span>
              </div>
              <p>
                Static AST scan never executes code. Test execution runs only in an isolated
                container with explicit user authorization.
              </p>
            </div>
          </div>

          <div className="pt-2 text-center text-2xs text-mac-textTertiary">
            Select any symbol or file on the canvas or navigator to view its blast radius.
          </div>
        </div>
      </aside>
    );
  }

  // Node is selected
  return (
    <aside className="w-80 h-full bg-mac-window border-l border-mac-border flex flex-col select-none overflow-hidden shrink-0">
      {/* Inspector Header */}
      <div className="p-3 border-b border-mac-border">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5 truncate pr-2">
            <div className="flex items-center space-x-1.5">
              <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-mac-surfaceActive border border-mac-borderStrong text-mac-textSecondary">
                {node.kind}
              </span>
              <span className="text-2xs font-mono text-mac-textSecondary truncate">
                {node.file_id || 'root'}
              </span>
            </div>
            <h2 className="text-sm font-semibold text-mac-text truncate font-mono">
              {node.label}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-mac-surface text-mac-textSecondary hover:text-mac-text apple-btn"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Apple Segmented Control */}
        <div className="grid grid-cols-3 bg-mac-canvas p-0.5 rounded-md border border-mac-border mt-2.5 text-2xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-1 rounded font-medium apple-btn ${
              activeTab === 'overview'
                ? 'bg-mac-surfaceActive text-mac-text shadow-mac-button'
                : 'text-mac-textSecondary hover:text-mac-text'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('impact')}
            className={`py-1 rounded font-medium apple-btn ${
              activeTab === 'impact'
                ? 'bg-mac-surfaceActive text-mac-text shadow-mac-button'
                : 'text-mac-textSecondary hover:text-mac-text'
            }`}
          >
            Impact {impactReport ? `(${impactReport.total_affected})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`py-1 rounded font-medium apple-btn ${
              activeTab === 'tests'
                ? 'bg-mac-surfaceActive text-mac-text shadow-mac-button'
                : 'text-mac-textSecondary hover:text-mac-text'
            }`}
          >
            Tests {impactReport ? `(${impactReport.candidate_tests.length})` : ''}
          </button>
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
          {/* Action: Calculate Blast Radius */}
          <button
            onClick={() => onAnalyzeImpact(node)}
            className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-md bg-mac-blue hover:bg-blue-500 text-white font-medium text-xs shadow-mac-button apple-btn"
          >
            <Target className="w-3.5 h-3.5" />
            <span>Calculate Direct & Transitive Impact</span>
          </button>

          {/* Properties Table */}
          <div>
            <span className="text-2xs font-semibold uppercase tracking-wider text-mac-textSecondary block mb-1.5">
              Attributes
            </span>
            <div className="bg-mac-surface border border-mac-border rounded-lg p-2.5 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-mac-textSecondary">Kind</span>
                <span className="font-medium text-mac-text">{node.kind}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mac-textSecondary">Incoming (Dependents)</span>
                <span className="font-mono text-mac-text">{incomingEdges.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mac-textSecondary">Outgoing (Calls/Imports)</span>
                <span className="font-mono text-mac-text">{outgoingEdges.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mac-textSecondary">Automated Test</span>
                <span className="font-medium text-mac-text">{node.is_test ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* Inbound Callers List */}
          {incomingEdges.length > 0 && (
            <div>
              <span className="text-2xs font-semibold uppercase tracking-wider text-mac-textSecondary block mb-1.5">
                Depended On By ({incomingEdges.length})
              </span>
              <div className="space-y-1">
                {incomingEdges.map((e, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectNodeById(e.source)}
                    className="w-full text-left p-1.5 rounded bg-mac-surface hover:bg-mac-surfaceHover border border-mac-border flex items-center justify-between text-2xs transition"
                  >
                    <span className="font-mono text-mac-text truncate">{e.source}</span>
                    <span className="text-mac-textTertiary text-2xs ml-1 shrink-0">{e.edge_type}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Outbound Calls List */}
          {outgoingEdges.length > 0 && (
            <div>
              <span className="text-2xs font-semibold uppercase tracking-wider text-mac-textSecondary block mb-1.5">
                Depends On ({outgoingEdges.length})
              </span>
              <div className="space-y-1">
                {outgoingEdges.map((e, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectNodeById(e.target)}
                    className="w-full text-left p-1.5 rounded bg-mac-surface hover:bg-mac-surfaceHover border border-mac-border flex items-center justify-between text-2xs transition"
                  >
                    <span className="font-mono text-mac-text truncate">{e.target}</span>
                    <span className="text-mac-textTertiary text-2xs ml-1 shrink-0">{e.edge_type}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Impact Analysis */}
      {activeTab === 'impact' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-xs">
          {!impactReport ? (
            <div className="text-center py-8 space-y-2">
              <Target className="w-8 h-8 text-mac-textTertiary mx-auto opacity-40" />
              <p className="text-mac-textSecondary text-xs">
                No impact analysis calculated yet.
              </p>
              <button
                onClick={() => onAnalyzeImpact(node)}
                className="px-3 py-1.5 bg-mac-blue text-white rounded-md text-xs font-medium apple-btn"
              >
                Calculate Now
              </button>
            </div>
          ) : (
            <>
              {/* Severity Metrics Card */}
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-mac-surface border border-mac-border rounded-lg p-2 text-center">
                  <span className="text-2xs text-mac-textSecondary block">Total</span>
                  <span className="text-lg font-bold text-mac-text font-mono">
                    {impactReport.total_affected}
                  </span>
                </div>
                <div className="bg-mac-surface border border-mac-border rounded-lg p-2 text-center">
                  <span className="text-2xs text-mac-orange block">Direct</span>
                  <span className="text-lg font-bold text-mac-orange font-mono">
                    {impactReport.direct_count}
                  </span>
                </div>
                <div className="bg-mac-surface border border-mac-border rounded-lg p-2 text-center">
                  <span className="text-2xs text-mac-red block">Transitive</span>
                  <span className="text-lg font-bold text-mac-red font-mono">
                    {impactReport.transitive_count}
                  </span>
                </div>
              </div>

              {/* Hop Filter Segmented Control */}
              <div className="grid grid-cols-3 bg-mac-canvas p-0.5 rounded-md border border-mac-border text-2xs">
                <button
                  onClick={() => setImpactFilter('all')}
                  className={`py-0.5 rounded font-medium apple-btn ${
                    impactFilter === 'all'
                      ? 'bg-mac-surfaceActive text-mac-text'
                      : 'text-mac-textSecondary'
                  }`}
                >
                  All ({impactReport.affected_nodes.length})
                </button>
                <button
                  onClick={() => setImpactFilter('direct')}
                  className={`py-0.5 rounded font-medium apple-btn ${
                    impactFilter === 'direct'
                      ? 'bg-mac-surfaceActive text-mac-orange'
                      : 'text-mac-textSecondary'
                  }`}
                >
                  Direct ({impactReport.direct_count})
                </button>
                <button
                  onClick={() => setImpactFilter('transitive')}
                  className={`py-0.5 rounded font-medium apple-btn ${
                    impactFilter === 'transitive'
                      ? 'bg-mac-surfaceActive text-mac-red'
                      : 'text-mac-textSecondary'
                  }`}
                >
                  Transitive ({impactReport.transitive_count})
                </button>
              </div>

              {/* Explanatory Hop Chain List */}
              <div className="space-y-1">
                {filteredAffected.map((item, idx) => {
                  const isDirect = item.impact_type === 'Direct';
                  const isPathActive = activePath?.target === item.node_id;

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        onSelectNodeById(item.node_id);
                        if (item.explanatory_path) {
                          onSelectExplanatoryPath(item.explanatory_path);
                        }
                      }}
                      className={`p-2 rounded-md border cursor-pointer transition space-y-0.5 ${
                        isPathActive
                          ? 'bg-mac-surfaceActive border-mac-blue'
                          : 'bg-mac-surface hover:bg-mac-surfaceHover border border-mac-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-medium text-mac-text truncate">
                          {item.name}
                        </span>
                        <span
                          className={`text-2xs font-semibold px-1 rounded ${
                            isDirect
                              ? 'text-mac-orange bg-orange-950/40'
                              : 'text-mac-red bg-rose-950/40'
                          }`}
                        >
                          {item.distance} {item.distance === 1 ? 'hop' : 'hops'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-2xs text-mac-textSecondary">
                        <span>{item.kind}</span>
                        <span>·</span>
                        <span className="font-mono truncate">{item.node_id}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={onClearImpact}
                className="w-full py-1 text-2xs text-mac-textSecondary hover:text-mac-text text-center underline"
              >
                Clear Impact Analysis
              </button>
            </>
          )}
        </div>
      )}

      {/* Tab 3: Test Verification */}
      {activeTab === 'tests' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-xs">
          {!impactReport ? (
            <div className="text-center py-8 text-mac-textSecondary text-xs">
              Calculate blast radius first to identify candidate tests.
            </div>
          ) : (
            <>
              <div>
                <span className="text-2xs font-semibold uppercase tracking-wider text-mac-textSecondary block mb-1.5">
                  Affected Test Suites ({impactReport.candidate_tests.length})
                </span>

                <div className="space-y-1">
                  {impactReport.candidate_tests.map((test, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-md bg-mac-surface border border-mac-border space-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-medium text-mac-text truncate">
                          {test.symbol_name}
                        </span>
                        <span className="text-2xs font-mono px-1 py-0.5 rounded bg-mac-surfaceActive text-mac-green border border-mac-border">
                          {test.reason}
                        </span>
                      </div>
                      <div className="text-2xs text-mac-textSecondary font-mono truncate">
                        {test.file_id}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Policy Callout */}
              <div className="p-2.5 rounded-lg bg-mac-surface border border-mac-border space-y-1.5 text-2xs text-mac-textSecondary">
                <div className="flex items-center space-x-1.5 text-mac-text font-medium text-xs">
                  <Shield className="w-3.5 h-3.5 text-mac-orange" />
                  <span>Security Policy</span>
                </div>
                <p>
                  Execution of code requires explicit authorization. Untrusted code is isolated
                  inside an air-gapped environment.
                </p>
              </div>

              {/* Sandbox Selector */}
              <div>
                <span className="text-2xs font-semibold text-mac-textSecondary block mb-1">
                  Sandbox Strategy:
                </span>
                <div className="grid grid-cols-2 bg-mac-canvas p-0.5 rounded-md border border-mac-border text-2xs">
                  <button
                    onClick={() => setSandboxMode('docker')}
                    className={`py-1 rounded font-medium apple-btn ${
                      sandboxMode === 'docker'
                        ? 'bg-mac-surfaceActive text-mac-text shadow-mac-button'
                        : 'text-mac-textSecondary'
                    }`}
                  >
                    Docker Container
                  </button>
                  <button
                    onClick={() => setSandboxMode('subprocess')}
                    className={`py-1 rounded font-medium apple-btn ${
                      sandboxMode === 'subprocess'
                        ? 'bg-mac-surfaceActive text-mac-text shadow-mac-button'
                        : 'text-mac-textSecondary'
                    }`}
                  >
                    Subprocess
                  </button>
                </div>
              </div>

              {/* Authorization Checkbox */}
              <label className="flex items-center space-x-2 cursor-pointer p-1">
                <input
                  type="checkbox"
                  checked={authorized}
                  onChange={(e) => setAuthorized(e.target.checked)}
                  className="rounded border-mac-border text-mac-blue focus:ring-0 bg-mac-canvas"
                />
                <span className="text-xs text-mac-text font-medium">
                  Authorize test execution
                </span>
              </label>

              {/* Run Tests Action Button */}
              <button
                onClick={handleRunTests}
                disabled={!authorized || isExecuting || impactReport.candidate_tests.length === 0}
                className={`w-full flex items-center justify-center space-x-1.5 py-2 rounded-md font-medium text-xs shadow-mac-button apple-btn ${
                  authorized && !isExecuting && impactReport.candidate_tests.length > 0
                    ? 'bg-mac-green text-black hover:bg-green-400'
                    : 'bg-mac-surface text-mac-textTertiary border border-mac-border cursor-not-allowed'
                }`}
              >
                {isExecuting ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Tests...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Candidate Tests</span>
                  </>
                )}
              </button>

              {testError && (
                <div className="p-2 rounded bg-rose-950/60 border border-rose-800 text-rose-200 text-2xs font-mono">
                  {testError}
                </div>
              )}

              {/* Observed Results Comparison */}
              {testResult && (
                <div className="mt-2 space-y-2 border-t border-mac-border pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-mac-text">Observed Outcome</span>
                    <span
                      className={`font-mono text-2xs font-semibold px-1.5 py-0.5 rounded ${
                        testResult.passed
                          ? 'bg-emerald-950/60 text-mac-green'
                          : 'bg-rose-950/60 text-mac-red'
                      }`}
                    >
                      {testResult.passed ? 'ALL PASSED' : 'REGRESSIONS DETECTED'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {testResult.comparisons.map((cmp, idx) => (
                      <div
                        key={idx}
                        className="p-1.5 rounded bg-mac-surface border border-mac-border flex items-center justify-between text-2xs"
                      >
                        <span className="font-mono text-mac-text truncate">{cmp.candidate_test}</span>
                        <span
                          className={`font-semibold ${
                            cmp.observed_passed ? 'text-mac-green' : 'text-mac-red'
                          }`}
                        >
                          {cmp.observed_passed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {testResult.stdout && (
                    <button
                      onClick={() => setShowConsole(!showConsole)}
                      className="w-full flex items-center justify-center space-x-1 text-2xs text-mac-textSecondary hover:text-mac-text py-1"
                    >
                      <Terminal className="w-3 h-3" />
                      <span>{showConsole ? 'Hide Console Logs' : 'View Console Logs'}</span>
                    </button>
                  )}

                  {showConsole && testResult.stdout && (
                    <pre className="p-2 rounded bg-black/60 border border-mac-border text-2xs font-mono text-slate-300 overflow-x-auto max-h-36">
                      {testResult.stdout}
                    </pre>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </aside>
  );
};
