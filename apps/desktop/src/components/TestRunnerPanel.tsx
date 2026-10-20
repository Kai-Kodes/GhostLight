import React, { useState } from 'react';
import { TestCandidate, TestRunResult } from '../types';
import { runTests } from '../services/api';
import { CheckCircle2, XCircle, AlertTriangle, Play, ShieldAlert, Clock } from 'lucide-react';

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

  return (
    <div className="h-full flex flex-col overflow-hidden text-xs">
      {/* Header */}
      <div className="p-3 bg-canvas-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-semibold text-slate-100 font-mono">
            Targeted Test Verification
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          {candidates.length} Candidate{candidates.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-canvas-850 px-2 py-1 space-x-1">
        <button
          onClick={() => setActiveTab('Candidates')}
          className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
            activeTab === 'Candidates'
              ? 'bg-slate-800 text-slate-100'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Candidates ({candidates.length})
        </button>
        <button
          onClick={() => setActiveTab('Results')}
          className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
            activeTab === 'Results'
              ? 'bg-slate-800 text-slate-100'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Outcomes {runResult ? (runResult.passed ? '✓' : '✗') : ''}
        </button>
        <button
          onClick={() => setActiveTab('Logs')}
          className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
            activeTab === 'Logs'
              ? 'bg-slate-800 text-slate-100'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Console Logs
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'Candidates' && (
          <div className="space-y-3">
            {candidates.length === 0 ? (
              <div className="p-4 text-center text-slate-500 italic">
                No candidate tests identified for the current target.
              </div>
            ) : (
              <div className="space-y-1.5">
                {candidates.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-canvas-850 border border-slate-800 rounded-md flex items-center justify-between"
                  >
                    <div>
                      <div className="font-mono text-slate-200 text-[11px] font-medium">
                        {c.symbol_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {c.file_id}
                      </div>
                    </div>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-mono">
                      {c.reason}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Authorization & Security Card */}
            <div className="mt-4 p-3 bg-canvas-900 border border-slate-800 rounded-lg space-y-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-300 leading-tight">
                  Untrusted codebases may execute arbitrary code during test runs. Static analysis never executes repository code.
                </p>
              </div>

              {/* Explicit Authorization Checkbox */}
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={authorized}
                  onChange={(e) => setAuthorized(e.target.checked)}
                  className="rounded border-slate-700 bg-canvas-850 text-cyan-500 focus:ring-0 focus:outline-none"
                />
                <span className="text-[11px] font-medium text-slate-200">
                  I explicitly authorize executing these candidate tests
                </span>
              </label>

              {/* Isolation Engine Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                <span className="text-slate-400">Execution Isolation:</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setPreferDocker(true)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                      preferDocker
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Docker (Air-gapped)
                  </button>
                  <button
                    onClick={() => setPreferDocker(false)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                      !preferDocker
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Subprocess
                  </button>
                </div>
              </div>

              {/* Run Action Button */}
              <button
                onClick={handleExecute}
                disabled={!authorized || candidates.length === 0 || isRunning}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md font-medium text-xs shadow-md shadow-emerald-600/20 transition"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isRunning ? 'Running in Sandbox...' : 'Run Authorized Tests'}</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'Results' && (
          <div className="space-y-3">
            {!runResult ? (
              <p className="text-slate-500 italic p-2">No test run executed yet.</p>
            ) : (
              <div className="space-y-3">
                {/* Result Summary Banner */}
                <div
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    runResult.passed
                      ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                      : 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {runResult.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                    <div>
                      <h4 className="font-semibold text-xs uppercase tracking-wide">
                        {runResult.passed ? 'All Tests Passed' : 'Test Failures Observed'}
                      </h4>
                      <p className="text-[10px] opacity-80 font-mono">
                        Engine: {runResult.engine_used} (Isolated: {String(runResult.is_isolated)})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 text-xs font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{runResult.duration_ms} ms</span>
                  </div>
                </div>

                {/* Predicted vs Observed Reconciliation Table */}
                <div>
                  <h4 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Static Prediction vs Observed Facts
                  </h4>
                  <div className="space-y-1.5">
                    {runResult.comparisons.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-canvas-850 border border-slate-800 rounded flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono text-slate-200 text-[11px]">
                            {c.candidate_test}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Reason: {c.selection_reason} | {c.notes}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            c.observed_passed
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                              : 'bg-rose-950 text-rose-400 border border-rose-800/50'
                          }`}
                        >
                          {c.observed_passed ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Logs' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 bg-black/60 border border-slate-800 p-2.5 rounded font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre leading-relaxed select-text">
              {runResult ? (
                runResult.stdout || runResult.stderr || 'No console output.'
              ) : (
                'Run tests to inspect stdout and stderr.'
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
