import React, { useState } from 'react';
import {
  GraphEdgeDto,
  GraphNodeDto,
  ImpactReport,
  ExplanatoryPath,
  TestRunResult,
} from '../types';
import { runTests } from '../services/api';
import {
  X,
  Crosshair,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  ShieldAlert,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  Terminal,
  Copy,
  Check,
  Share2,
  FileCode,
} from 'lucide-react';

interface UnifiedInspectorProps {
  node: GraphNodeDto | null;
  edges: GraphEdgeDto[];
  impactReport: ImpactReport | null;
  activePath: ExplanatoryPath | null;
  onAnalyzeImpact: (node: GraphNodeDto) => void;
  onSelectNodeById: (id: string) => void;
  onSelectExplanatoryPath: (path: ExplanatoryPath | null) => void;
  onClearImpact: () => void;
  onClose: () => void;
  repoPath: string;
}

export const UnifiedInspector: React.FC<UnifiedInspectorProps> = ({
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
}) => {
  const [activeTab, setActiveTab] = useState<'structure' | 'impact' | 'tests'>('structure');
  const [impactFilter, setImpactFilter] = useState<'All' | 'Direct' | 'Transitive'>('All');
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);

  // Test execution state
  const [authorized, setAuthorized] = useState(false);
  const [preferDocker, setPreferDocker] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<TestRunResult | null>(null);
  const [copiedLogs, setCopiedLogs] = useState(false);

  if (!node && !impactReport) return null;

  // Incoming and outgoing edges for the selected node
  const incoming = node ? edges.filter((e) => e.target === node.id) : [];
  const outgoing = node ? edges.filter((e) => e.source === node.id) : [];

  const candidateTests = impactReport?.candidate_tests || [];

  const handleExecuteTests = async () => {
    if (!authorized || candidateTests.length === 0) return;
    setIsRunning(true);
    try {
      const res = await runTests(repoPath, candidateTests, true, preferDocker);
      setRunResult(res);
    } catch (e: any) {
      alert(`Test execution failed: ${e?.message || e}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyLogs = () => {
    if (!runResult) return;
    const text = `--- STDOUT ---\n${runResult.stdout}\n\n--- STDERR ---\n${runResult.stderr}`;
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const toggleExpand = (nodeId: string, path?: ExplanatoryPath) => {
    if (expandedNodeId === nodeId) {
      setExpandedNodeId(null);
      onSelectExplanatoryPath(null);
    } else {
      setExpandedNodeId(nodeId);
      if (path) onSelectExplanatoryPath(path);
    }
  };

  const filteredImpactNodes = (impactReport?.affected_nodes || []).filter((n) => {
    if (impactFilter === 'Direct') return n.impact_type === 'Direct';
    if (impactFilter === 'Transitive') return n.impact_type === 'Transitive';
    return true;
  });

  return (
    <aside className="w-96 bg-obsidian-900 border-l border-obsidian-800 flex flex-col h-full shadow-dossier z-20 select-none">
      {/* Dossier Header */}
      <div className="p-3.5 bg-obsidian-850 border-b border-obsidian-800 flex items-start justify-between">
        <div className="truncate pr-2">
          <div className="flex items-center space-x-1.5 mb-1">
            <span className="px-1.5 py-0.2 rounded text-2xs uppercase font-mono font-semibold bg-obsidian-800 text-slate-300 border border-obsidian-750">
              {node?.kind || 'Analysis Target'}
            </span>
            {node?.is_test && (
              <span className="px-1.5 py-0.2 rounded text-2xs uppercase font-mono font-semibold bg-emerald-950 text-signal-emerald border border-emerald-800/40">
                Test Suite
              </span>
            )}
          </div>
          <h2 className="text-sm font-bold text-slate-100 font-mono truncate" title={node?.label || impactReport?.target_name}>
            {node?.label || impactReport?.target_name}
          </h2>
          {node?.file_id && (
            <div className="flex items-center space-x-1 text-2xs text-slate-400 font-mono truncate mt-0.5">
              <FileCode className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="truncate">{node.file_id}</span>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-obsidian-800 btn-tactile"
          title="Close Dossier (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Segmented Dossier Tabs */}
      <div className="flex border-b border-obsidian-800 bg-obsidian-900 px-3 py-1.5 space-x-1 text-xs">
        <button
          onClick={() => setActiveTab('structure')}
          className={`flex-1 py-1 rounded text-center font-medium transition btn-tactile ${
            activeTab === 'structure'
              ? 'bg-obsidian-800 text-slate-100 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Structure
        </button>
        <button
          onClick={() => setActiveTab('impact')}
          className={`flex-1 py-1 rounded text-center font-medium transition btn-tactile ${
            activeTab === 'impact'
              ? 'bg-obsidian-800 text-signal-amber shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Blast Radius {impactReport ? `(${impactReport.total_affected})` : ''}
        </button>
        <button
          onClick={() => setActiveTab('tests')}
          className={`flex-1 py-1 rounded text-center font-medium transition btn-tactile ${
            activeTab === 'tests'
              ? 'bg-obsidian-800 text-signal-emerald shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Tests {candidateTests.length > 0 ? `(${candidateTests.length})` : ''}
        </button>
      </div>

      {/* Dossier Content Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
        {/* TAB 1: STRUCTURE */}
        {activeTab === 'structure' && (
          <div className="space-y-4">
            {/* Primary Action Button: Calculate Blast Radius */}
            {node && (
              <button
                onClick={() => {
                  onAnalyzeImpact(node);
                  setActiveTab('impact');
                }}
                className="w-full py-2 px-3 bg-signal-cyan hover:bg-sky-400 text-obsidian-950 font-bold rounded-lg transition flex items-center justify-center space-x-2 shadow-sm btn-tactile"
              >
                <Crosshair className="w-4 h-4" />
                <span>Calculate Blast Radius</span>
              </button>
            )}

            {/* In-Degree / Out-Degree Topology */}
            <div className="grid grid-cols-2 gap-2 text-2xs font-mono">
              <div className="p-2.5 rounded-lg bg-obsidian-850 border border-obsidian-800">
                <span className="text-slate-400 block mb-0.5">Dependents (In)</span>
                <span className="text-sm font-bold text-signal-amber">{incoming.length}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-obsidian-850 border border-obsidian-800">
                <span className="text-slate-400 block mb-0.5">Dependencies (Out)</span>
                <span className="text-sm font-bold text-signal-cyan">{outgoing.length}</span>
              </div>
            </div>

            {/* Outgoing Dependencies */}
            <div>
              <h3 className="text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-2 flex items-center space-x-1.5 font-mono">
                <ArrowRight className="w-3.5 h-3.5 text-signal-cyan" />
                <span>Dependencies ({outgoing.length})</span>
              </h3>
              {outgoing.length === 0 ? (
                <p className="text-slate-500 italic text-2xs p-2 bg-obsidian-850/50 rounded">
                  No outgoing dependencies (leaf node).
                </p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {outgoing.map((e, idx) => (
                    <div
                      key={idx}
                      onClick={() => onSelectNodeById(e.target)}
                      className="p-2 rounded bg-obsidian-850 hover:bg-obsidian-800 border border-obsidian-800 flex items-center justify-between cursor-pointer transition btn-tactile"
                    >
                      <span className="font-mono text-xs text-slate-200 truncate max-w-[200px]" title={e.target}>
                        {e.target.split('::').pop() || e.target}
                      </span>
                      <span className="text-2xs font-mono text-slate-400 uppercase px-1 py-0.2 bg-obsidian-900 rounded">
                        {e.edge_type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Incoming Dependents */}
            <div>
              <h3 className="text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-2 flex items-center space-x-1.5 font-mono">
                <ArrowLeft className="w-3.5 h-3.5 text-signal-amber" />
                <span>Immediate Dependents ({incoming.length})</span>
              </h3>
              {incoming.length === 0 ? (
                <p className="text-slate-500 italic text-2xs p-2 bg-obsidian-850/50 rounded">
                  No incoming dependents (root or uncalled symbol).
                </p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {incoming.map((e, idx) => (
                    <div
                      key={idx}
                      onClick={() => onSelectNodeById(e.source)}
                      className="p-2 rounded bg-obsidian-850 hover:bg-obsidian-800 border border-obsidian-800 flex items-center justify-between cursor-pointer transition btn-tactile"
                    >
                      <span className="font-mono text-xs text-slate-200 truncate max-w-[200px]" title={e.source}>
                        {e.source.split('::').pop() || e.source}
                      </span>
                      <span className="text-2xs font-mono text-slate-400 uppercase px-1 py-0.2 bg-obsidian-900 rounded">
                        {e.edge_type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BLAST RADIUS */}
        {activeTab === 'impact' && (
          <div className="space-y-3.5">
            {!impactReport ? (
              <div className="p-6 text-center text-slate-500 text-xs bg-obsidian-850/50 rounded-lg border border-obsidian-800">
                <Crosshair className="w-8 h-8 mx-auto mb-2 opacity-30 text-signal-amber" />
                <p className="font-semibold text-slate-300">No active impact calculation.</p>
                <p className="text-2xs text-slate-500 mt-1">
                  Switch to Structure tab and click "Calculate Blast Radius".
                </p>
              </div>
            ) : (
              <>
                {/* Severity Breakdown Bar */}
                <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-2xs">
                  <div className="p-2 rounded bg-obsidian-850 border border-obsidian-800">
                    <span className="text-slate-400 block text-2xs">TOTAL</span>
                    <span className="text-xs font-bold text-slate-100">{impactReport.total_affected}</span>
                  </div>
                  <div className="p-2 rounded bg-amber-950/20 border border-amber-900/40">
                    <span className="text-amber-400 block text-2xs">DIRECT</span>
                    <span className="text-xs font-bold text-amber-300">{impactReport.direct_count}</span>
                  </div>
                  <div className="p-2 rounded bg-rose-950/20 border border-rose-900/40">
                    <span className="text-rose-400 block text-2xs">TRANSITIVE</span>
                    <span className="text-xs font-bold text-rose-300">{impactReport.transitive_count}</span>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex border-b border-obsidian-800 pb-1.5 space-x-1">
                  {(['All', 'Direct', 'Transitive'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setImpactFilter(t)}
                      className={`px-2 py-0.5 rounded text-2xs font-mono transition ${
                        impactFilter === t
                          ? 'bg-obsidian-800 text-slate-100 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                  <button
                    onClick={onClearImpact}
                    className="ml-auto text-2xs text-slate-500 hover:text-rose-400 transition"
                  >
                    Clear
                  </button>
                </div>

                {/* Affected Entities */}
                <div className="space-y-1.5">
                  {filteredImpactNodes.map((aff) => {
                    const isExpanded = expandedNodeId === aff.node_id;
                    const isPathActive = activePath?.source === aff.node_id;

                    return (
                      <div
                        key={aff.node_id}
                        className={`rounded-lg border transition ${
                          aff.impact_type === 'Direct'
                            ? 'bg-amber-950/15 border-amber-900/40'
                            : 'bg-rose-950/15 border-rose-900/40'
                        } ${isPathActive ? 'ring-1 ring-signal-cyan' : ''}`}
                      >
                        <div className="p-2 flex items-center justify-between">
                          <div className="flex items-center space-x-1.5 truncate min-w-0">
                            <button
                              onClick={() => toggleExpand(aff.node_id, aff.explanatory_path)}
                              className="text-slate-400 hover:text-white"
                            >
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-signal-cyan" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                            <div className="truncate">
                              <div
                                onClick={() => onSelectNodeById(aff.node_id)}
                                className="font-mono text-xs text-slate-200 font-medium truncate cursor-pointer hover:underline"
                              >
                                {aff.name}
                              </div>
                              <div className="text-2xs text-slate-500 font-mono truncate">
                                {aff.file_id || 'Root'}
                              </div>
                            </div>
                          </div>

                          <span className="text-2xs font-mono text-slate-400 px-1.5 py-0.5 rounded bg-obsidian-950 shrink-0 ml-1">
                            {aff.distance} hop{aff.distance === 1 ? '' : 's'}
                          </span>
                        </div>

                        {/* Expandable Causal Chain */}
                        {isExpanded && aff.explanatory_path && (
                          <div className="px-3 pb-2.5 pt-1 border-t border-obsidian-800 bg-obsidian-950/60 font-mono text-2xs space-y-1.5">
                            <div className="flex items-center justify-between text-slate-400 pt-0.5">
                              <span>Propagation Path</span>
                              <button
                                onClick={() => onSelectExplanatoryPath(aff.explanatory_path || null)}
                                className="text-signal-cyan hover:underline flex items-center space-x-0.5"
                              >
                                <Share2 className="w-2.5 h-2.5 mr-0.5" />
                                <span>Highlight on Map</span>
                              </button>
                            </div>

                            <div className="space-y-1">
                              {aff.explanatory_path.steps.map((st, sIdx) => (
                                <div key={sIdx} className="p-1 rounded bg-obsidian-900 border border-obsidian-800 flex items-center justify-between text-slate-300">
                                  <span className="truncate max-w-[90px]">{st.from.split('::').pop()}</span>
                                  <span className="text-signal-cyan text-[9px] uppercase font-bold">{st.edge.edge_type}</span>
                                  <span className="truncate max-w-[90px]">{st.to.split('::').pop()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: TEST VERIFICATION */}
        {activeTab === 'tests' && (
          <div className="space-y-3.5">
            {candidateTests.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs bg-obsidian-850/50 rounded-lg border border-obsidian-800">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30 text-signal-emerald" />
                <p className="font-semibold text-slate-300">No candidate tests identified.</p>
                <p className="text-2xs text-slate-500 mt-1">
                  Run blast radius analysis on a symbol with downstream test suites.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Candidate Tests List */}
                <div className="space-y-1">
                  <span className="text-2xs uppercase tracking-wider text-slate-400 font-semibold font-mono block mb-1">
                    Affected Test Suites ({candidateTests.length})
                  </span>
                  {candidateTests.map((t, idx) => (
                    <div key={idx} className="p-2 rounded bg-obsidian-850 border border-obsidian-800 flex items-center justify-between">
                      <div className="truncate min-w-0 pr-2">
                        <div className="font-mono text-xs font-semibold text-slate-200 truncate">
                          {t.symbol_name}
                        </div>
                        <div className="text-2xs text-slate-500 font-mono truncate">{t.file_id}</div>
                      </div>
                      <span className="text-2xs font-mono uppercase px-1.5 py-0.5 rounded bg-obsidian-950 text-signal-cyan border border-signal-cyan/20 shrink-0">
                        {t.reason}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Security Authorization & Execution Card */}
                <div className="p-3 bg-obsidian-850 border border-obsidian-800 rounded-xl space-y-2.5">
                  <div className="flex items-start space-x-2">
                    <ShieldAlert className="w-4 h-4 text-signal-amber shrink-0 mt-0.5" />
                    <p className="text-2xs text-slate-300 leading-relaxed">
                      <strong>Security Policy:</strong> Static scan never executes code. Test execution runs repository code. Explicit user authorization required.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-obsidian-800 flex items-center justify-between text-2xs font-mono">
                    <span className="text-slate-400">Sandbox Strategy:</span>
                    <button
                      onClick={() => setPreferDocker(!preferDocker)}
                      className="px-2 py-0.5 rounded bg-obsidian-800 border border-obsidian-750 text-signal-cyan flex items-center space-x-1"
                    >
                      {preferDocker ? <span>Air-Gapped Docker</span> : <span>Restricted Subprocess</span>}
                    </button>
                  </div>

                  <label className="flex items-center space-x-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={authorized}
                      onChange={(e) => setAuthorized(e.target.checked)}
                      className="rounded bg-obsidian-950 border-obsidian-700 text-signal-cyan"
                    />
                    <span className="text-xs text-slate-200 font-medium">
                      Authorize candidate test execution
                    </span>
                  </label>

                  <button
                    onClick={handleExecuteTests}
                    disabled={!authorized || isRunning}
                    className="w-full py-2 px-3 bg-signal-emerald hover:bg-emerald-400 disabled:opacity-40 text-obsidian-950 font-bold rounded-lg transition flex items-center justify-center space-x-2 btn-tactile"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isRunning ? 'Running in Sandbox...' : 'Run Candidate Tests'}</span>
                  </button>
                </div>

                {/* Execution Results Reconciliation */}
                {runResult && (
                  <div className="space-y-2 pt-2 border-t border-obsidian-800">
                    <div
                      className={`p-3 rounded-lg border flex items-center justify-between ${
                        runResult.passed
                          ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                          : 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {runResult.passed ? <CheckCircle2 className="w-4 h-4 text-signal-emerald" /> : <XCircle className="w-4 h-4 text-signal-rose" />}
                        <span className="font-mono text-xs font-bold">
                          {runResult.passed ? 'ALL PREDICTED TESTS PASSED' : 'TEST REGRESSIONS OBSERVED'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-2xs font-mono text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{runResult.duration_ms}ms</span>
                      </div>
                    </div>

                    {/* Console Output Toggle */}
                    <div className="p-2.5 rounded-lg bg-obsidian-950 border border-obsidian-800 space-y-1.5 font-mono text-2xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="flex items-center space-x-1">
                          <Terminal className="w-3 h-3" />
                          <span>Terminal Sandbox Output</span>
                        </span>
                        <button onClick={handleCopyLogs} className="text-signal-cyan hover:underline flex items-center space-x-0.5">
                          {copiedLogs ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedLogs ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="max-h-40 overflow-y-auto whitespace-pre-wrap text-slate-300 p-1.5 bg-obsidian-900 rounded select-text">
                        {runResult.stdout || runResult.stderr || 'No captured output.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
