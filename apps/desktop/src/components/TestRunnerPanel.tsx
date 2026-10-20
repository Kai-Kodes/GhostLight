import React, { useState } from 'react';
import { TestCandidate, TestRunResult } from '../types';
import { runTests } from '../services/api';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Terminal,
  Copy,
  Check,
} from 'lucide-react';

interface TestRunnerPanelProps {
  candidates: TestCandidate[];
  repoPath: string;
}

export const TestRunnerPanel: React.FC<TestRunnerPanelProps> = ({
  candidates,
  repoPath,
}) => {
  const [authorized, setAuthorized] = useState(false);
  const [preferDocker, setPreferDocker] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<TestRunResult | null>(null);
  const [activeTab, setActiveTab] = useState<'Candidates' | 'Results' | 'Logs'>('Candidates');
  const [copiedLogs, setCopiedLogs] = useState(false);

  const handleExecute = async () => {
    if (!authorized || candidates.length === 0) return;
    setIsRunning(true);
    try {
      const res = await runTests(repoPath, candidates, true, preferDocker);
      setRunResult(res);
      setActiveTab('Results');
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

  return (
    <div className="h-full flex flex-col overflow-hidden text-xs bg-canvas-900 select-none">
      {/* Panel Header */}
      <div className="p-3 bg-canvas-850 border-b border-canvas-800 flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <ShieldAlert className="w-4 h-4 text-ghost-emerald" />
          <h2 className="text-xs font-semibold text-slate-100 font-mono">
            Targeted Test Verification
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          {candidates.length} Candidate{candidates.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-canvas-800 bg-canvas-900 px-2 py-1 space-x-1">
        <button
          onClick={() => setActiveTab('Candidates')}
          className={`px-2 py-0.5 rounded text-[11px] font-mono transition btn-interactive ${
            activeTab === 'Candidates'
              ? 'bg-canvas-800 text-slate-100 font-medium border border-canvas-750'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Candidates ({candidates.length})
        </button>
        <button
          onClick={() => setActiveTab('Results')}
          className={`px-2 py-0.5 rounded text-[11px] font-mono transition btn-interactive ${
            activeTab === 'Results'
              ? 'bg-canvas-800 text-slate-100 font-medium border border-canvas-750'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Outcomes {runResult ? (runResult.passed ? '✓' : '✗') : ''}
        </button>
        <button
          onClick={() => setActiveTab('Logs')}
          className={`px-2 py-0.5 rounded text-[11px] font-mono transition btn-interactive ${
            activeTab === 'Logs'
              ? 'bg-canvas-800 text-slate-100 font-medium border border-canvas-750'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Terminal Logs
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'Candidates' && (
          <div className="space-y-3">
            {candidates.length === 0 ? (
              <div className="p-4 text-center text-slate-500 italic text-[11px] bg-canvas-850/50 rounded border border-canvas-800">
                No candidate tests identified. Calculate impact on a symbol with downstream test suites to populate candidates.
              </div>
            ) : (
              <div className="space-y-1.5">
                {candidates.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-canvas-850 border border-canvas-800 rounded flex items-center justify-between"
                  >
                    <div className="truncate min-w-0 pr-2">
                      <div className="font-mono text-slate-200 text-[11px] font-medium truncate">
                        {c.symbol_name}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono truncate">
                        {c.file_id}
                      </div>
                    </div>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 bg-canvas-900 text-ghost-cyan border border-cyan-500/20 rounded font-mono shrink-0">
                      {c.reason}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Security Authorization Card */}
            <div className="p-3 bg-canvas-850 border border-canvas-800 rounded-lg space-y-2.5">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-ghost-amber shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  <strong>Security Guarantee:</strong> GHOSTLIGHT static scans are strictly zero-execution. Executing tests runs repository code. Explicit authorization is required.
                </p>
              </div>

              {/* Isolation Engine Toggle */}
              <div className="pt-2 border-t border-canvas-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-mono">Sandbox Strategy:</span>
                <button
                  onClick={() => setPreferDocker(!preferDocker)}
                  className="px-2 py-0.5 bg-canvas-800 border border-canvas-750 rounded text-ghost-cyan font-mono text-[10px] flex items-center space-x-1 btn-interactive"
                >
                  {preferDocker ? (
                    <>
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>Air-Gapped Docker</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3 h-3 text-amber-400" />
                      <span>Restricted Subprocess</span>
                    </>
                  )}
                </button>
              </div>

              {/* Authorization Checkbox */}
              <label className="flex items-center space-x-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={authorized}
                  onChange={(e) => setAuthorized(e.target.checked)}
                  className="rounded bg-canvas-900 border-canvas-750 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-[11px] text-slate-300 font-medium">
                  I authorize executing candidate tests
                </span>
              </label>

              {/* Execution Action Button */}
              <button
                onClick={handleExecute}
                disabled={!authorized || candidates.length === 0 || isRunning}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-canvas-950 font-semibold rounded text-xs transition flex items-center justify-center space-x-2 btn-interactive"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isRunning ? 'Running in Sandbox…' : 'Execute Candidate Tests'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Results Tab: Static Predictions vs Observed Outcomes */}
        {activeTab === 'Results' && (
          <div className="space-y-3">
            {!runResult ? (
              <div className="p-4 text-center text-slate-500 italic text-[11px]">
                No test run recorded yet. Authorize and execute candidate tests to view verification outcomes.
              </div>
            ) : (
              <>
                {/* Result Status Banner */}
                <div
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    runResult.passed
                      ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                      : 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {runResult.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="font-semibold text-xs font-mono">
                      {runResult.passed ? 'ALL CANDIDATE TESTS PASSED' : 'TEST FAILURES OBSERVED'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{runResult.duration_ms}ms</span>
                  </div>
                </div>

                {/* Evidence Comparison Table */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                    Prediction vs Execution Evidence
                  </span>

                  {runResult.comparisons.map((cmp, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-canvas-850 border border-canvas-800 rounded space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="text-slate-100 font-semibold truncate max-w-[180px]">
                          {cmp.candidate_test}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold ${
                            cmp.observed_passed
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                              : 'bg-rose-950 text-rose-300 border border-rose-800/40'
                          }`}
                        >
                          {cmp.observed_passed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Rationale: <span className="text-ghost-cyan">{cmp.selection_reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Terminal Logs Tab */}
        {activeTab === 'Logs' && (
          <div className="h-full flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 flex items-center space-x-1">
                <Terminal className="w-3.5 h-3.5" />
                <span>Execution Sandbox Output</span>
              </span>
              {runResult && (
                <button
                  onClick={handleCopyLogs}
                  className="px-2 py-0.5 bg-canvas-800 hover:bg-canvas-750 text-slate-300 rounded text-[10px] font-mono flex items-center space-x-1 btn-interactive"
                >
                  {copiedLogs ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLogs ? 'Copied' : 'Copy Logs'}</span>
                </button>
              )}
            </div>

            <div className="flex-1 bg-canvas-950 border border-canvas-800 rounded p-2.5 font-mono text-[10px] text-slate-300 overflow-y-auto whitespace-pre-wrap select-text max-h-[360px]">
              {runResult ? (
                <>
                  <div className="text-slate-500 pb-1 border-b border-canvas-850 mb-1">
                    [Runner: {runResult.engine_used} | Isolated: {String(runResult.is_isolated)}]
                  </div>
                  {runResult.stdout || runResult.stderr || 'No stdout/stderr generated.'}
                </>
              ) : (
                <span className="text-slate-600 italic">No execution logs available.</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
