import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ExplanatoryPath,
  GraphExportDto,
  GraphNodeDto,
  ImpactReport,
  ScanResult,
} from './types';
import { analyzeImpact, fetchGraph, scanRepository, getDoctor } from './services/api';
import { TopBar } from './components/TopBar';
import { ActivityRail, ActiveSidebarTab } from './components/ActivityRail';
import { StatusBar } from './components/StatusBar';
import { GraphView } from './components/GraphView';
import { NodeDetails } from './components/NodeDetails';
import { ImpactPanel } from './components/ImpactPanel';
import { RepoOverviewPanel } from './components/RepoOverviewPanel';
import { TestRunnerPanel } from './components/TestRunnerPanel';
import { ExplorerPanel } from './components/ExplorerPanel';
import { ReportModal } from './components/ReportModal';
import { DoctorModal } from './components/DoctorModal';
import { FolderGit2, AlertCircle } from 'lucide-react';

export function App() {
  const [repoPath, setRepoPath] = useState('/home/redsheronin/ghostlight/fixtures/complex-python');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [graphData, setGraphData] = useState<GraphExportDto>({
    nodes: [],
    edges: [],
    node_count: 0,
    edge_count: 0,
  });

  const [dockerAvailable, setDockerAvailable] = useState<boolean>(false);

  const [selectedNode, setSelectedNode] = useState<GraphNodeDto | null>(null);
  const [impactReport, setImpactReport] = useState<ImpactReport | null>(null);
  const [activeExplanatoryPath, setActiveExplanatoryPath] = useState<ExplanatoryPath | null>(null);

  // Active sidebar workflow tab ('explorer' | 'impact' | 'insights')
  const [sidebarTab, setSidebarTab] = useState<ActiveSidebarTab>('explorer');
  // Right inspector tab ('Details' | 'Tests')
  const [rightTab, setRightTab] = useState<'Details' | 'Tests'>('Details');

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isDoctorOpen, setIsDoctorOpen] = useState(false);

  // Scan and load repository
  const handleScan = useCallback(async (targetPath = repoPath) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [scanRes, graphRes] = await Promise.all([
        scanRepository(targetPath),
        fetchGraph(targetPath),
      ]);
      setScanResult(scanRes);
      setGraphData(graphRes);
      setSelectedNode(null);
      setImpactReport(null);
      setActiveExplanatoryPath(null);
    } catch (err: any) {
      setErrorMsg(err?.message || String(err));
    } finally {
      setIsLoading(false);
    }
  }, [repoPath]);

  // Preset fixture selector
  const handleSelectPresetFixture = useCallback((name: string) => {
    const fullPath = `/home/redsheronin/ghostlight/fixtures/${name}`;
    setRepoPath(fullPath);
    handleScan(fullPath);
  }, [handleScan]);

  // Initial load
  useEffect(() => {
    handleScan();
    getDoctor()
      .then((doc) => setDockerAvailable(doc.docker_available))
      .catch(() => setDockerAvailable(false));
  }, []);

  // When node is selected
  const handleSelectNode = useCallback((node: GraphNodeDto | null) => {
    setSelectedNode(node);
    if (node) {
      setRightTab('Details');
    }
  }, []);

  const handleSelectNodeById = useCallback((nodeId: string) => {
    const node = graphData.nodes.find((n) => n.id === nodeId) || null;
    setSelectedNode(node);
    if (node) {
      setRightTab('Details');
    }
  }, [graphData.nodes]);

  // Run impact calculation on a node
  const handleAnalyzeImpact = useCallback(async (node: GraphNodeDto) => {
    if (!node.file_id && node.kind !== 'File') {
      setErrorMsg(`Cannot analyze impact on external entity "${node.label}" (no local file definition). Please select an internal symbol or file.`);
      return;
    }
    setIsLoading(true);
    try {
      const isFile = node.kind === 'File';
      const fileArg = node.file_id;
      let symbolArg: string | undefined = undefined;
      if (!isFile) {
        if (node.id.startsWith('symbol:') && node.id.includes('::')) {
          symbolArg = node.id.split('::').slice(1).join('::');
        } else {
          symbolArg = node.label;
        }
      }

      const report = await analyzeImpact(repoPath, fileArg, symbolArg);
      setImpactReport(report);
      setSidebarTab('impact');

      if (report.candidate_tests.length > 0) {
        setRightTab('Tests');
      }
    } catch (err: any) {
      setErrorMsg(`Impact analysis failed: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  }, [repoPath]);

  // Cycle detection count for status bar
  const cycleCount = useMemo(() => {
    const adj: Record<string, string[]> = {};
    for (const edge of graphData.edges) {
      if (edge.edge_type === 'Imports' || edge.edge_type === 'Calls') {
        if (!adj[edge.source]) adj[edge.source] = [];
        adj[edge.source].push(edge.target);
      }
    }

    let count = 0;
    const visited: Record<string, boolean> = {};
    const inStack: Record<string, boolean> = {};

    const dfs = (curr: string) => {
      visited[curr] = true;
      inStack[curr] = true;

      for (const next of adj[curr] || []) {
        if (!visited[next]) {
          dfs(next);
        } else if (inStack[next]) {
          count++;
        }
      }

      inStack[curr] = false;
    };

    for (const node of graphData.nodes) {
      if (!visited[node.id]) {
        dfs(node.id);
      }
    }

    return count;
  }, [graphData]);

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setActiveExplanatoryPath(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setIsReportOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsDoctorOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-canvas-950 font-sans overflow-hidden select-none">
      {/* Top Application Header */}
      <TopBar
        repoPath={repoPath}
        setRepoPath={setRepoPath}
        onScan={() => handleScan()}
        isLoading={isLoading}
        fileCount={scanResult?.file_count || 0}
        nodeCount={graphData.node_count}
        edgeCount={graphData.edge_count}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenDoctor={() => setIsDoctorOpen(true)}
        onSelectPresetFixture={handleSelectPresetFixture}
      />

      {/* Error Alert Notification */}
      {errorMsg && (
        <div className="bg-rose-950/80 border-b border-rose-800 px-4 py-2 flex items-center justify-between text-rose-200 text-xs z-30">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-mono">{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-white text-2xs font-mono uppercase underline ml-4 btn-interactive"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workbench Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Far-left Activity Rail */}
        <ActivityRail
          activeTab={sidebarTab}
          onSelectTab={setSidebarTab}
          impactCount={impactReport?.total_affected || null}
          onOpenDoctor={() => setIsDoctorOpen(true)}
          onOpenReport={() => setIsReportOpen(true)}
        />

        {/* Left Side Workflow Panel */}
        <aside className="w-80 bg-canvas-900 border-r border-canvas-800 flex flex-col shrink-0 overflow-hidden">
          {sidebarTab === 'explorer' && (
            <ExplorerPanel
              nodes={graphData.nodes}
              selectedNodeId={selectedNode?.id || null}
              onSelectNode={handleSelectNode}
            />
          )}

          {sidebarTab === 'impact' && (
            <ImpactPanel
              impactReport={impactReport}
              onClearImpact={() => {
                setImpactReport(null);
                setActiveExplanatoryPath(null);
              }}
              onSelectExplanatoryPath={setActiveExplanatoryPath}
              activePath={activeExplanatoryPath}
              onSelectNodeById={handleSelectNodeById}
            />
          )}

          {sidebarTab === 'insights' && (
            <RepoOverviewPanel
              nodes={graphData.nodes}
              edges={graphData.edges}
              scanResult={scanResult}
              onSelectNodeById={handleSelectNodeById}
            />
          )}
        </aside>

        {/* Center Interactive Graph Canvas */}
        <main className="flex-1 relative overflow-hidden bg-canvas-950">
          {graphData.nodes.length === 0 && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <FolderGit2 className="w-12 h-12 mb-3 opacity-25 text-ghost-cyan" />
              <h3 className="text-xs font-semibold text-slate-300 mb-1 font-mono">
                No Codebase Analyzed
              </h3>
              <p className="text-[11px] max-w-sm text-slate-500">
                Specify a repository directory in the bar above or select a test fixture to construct an evidence-backed dependency graph.
              </p>
            </div>
          ) : (
            <GraphView
              nodes={graphData.nodes}
              edges={graphData.edges}
              selectedNodeId={selectedNode?.id || null}
              onSelectNode={handleSelectNode}
              impactReport={impactReport}
              activeExplanatoryPath={activeExplanatoryPath}
            />
          )}
        </main>

        {/* Right Inspection & Test Action Panel */}
        <aside className="w-80 bg-canvas-900 border-l border-canvas-800 flex flex-col shrink-0 overflow-hidden">
          {/* Sub-tab navigation */}
          <div className="flex border-b border-canvas-800 bg-canvas-850 px-2 py-1 space-x-1">
            <button
              onClick={() => setRightTab('Details')}
              className={`flex-1 py-1 text-center rounded text-2xs font-mono font-medium transition btn-interactive ${
                rightTab === 'Details'
                  ? 'bg-canvas-800 text-slate-100 border border-canvas-750 shadow-subtle'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Node Inspector
            </button>
            <button
              onClick={() => setRightTab('Tests')}
              className={`flex-1 py-1 text-center rounded text-2xs font-mono font-medium transition btn-interactive ${
                rightTab === 'Tests'
                  ? 'bg-canvas-800 text-emerald-400 border border-emerald-500/20 shadow-subtle'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Candidate Tests{' '}
              {impactReport?.candidate_tests.length ? `(${impactReport.candidate_tests.length})` : ''}
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {rightTab === 'Details' ? (
              <NodeDetails
                node={selectedNode}
                edges={graphData.edges}
                onAnalyzeImpact={handleAnalyzeImpact}
                onSelectNodeById={handleSelectNodeById}
              />
            ) : (
              <TestRunnerPanel
                candidates={impactReport?.candidate_tests || []}
                repoPath={repoPath}
              />
            )}
          </div>
        </aside>
      </div>

      {/* High-Density Bottom Status Bar */}
      <StatusBar
        repoPath={repoPath}
        fingerprint={scanResult?.fingerprint || null}
        fileCount={scanResult?.file_count || 0}
        nodeCount={graphData.node_count}
        edgeCount={graphData.edge_count}
        cycleCount={cycleCount}
        dockerAvailable={dockerAvailable}
        selectedLabel={selectedNode?.label || null}
      />

      {/* Modals */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        scanResult={scanResult}
        graph={graphData}
        impactReport={impactReport}
      />

      <DoctorModal
        isOpen={isDoctorOpen}
        onClose={() => setIsDoctorOpen(false)}
      />
    </div>
  );
}

export default App;
