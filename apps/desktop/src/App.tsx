import { useEffect, useState } from 'react';
import {
  ExplanatoryPath,
  GraphExportDto,
  GraphNodeDto,
  ImpactReport,
  ScanResult,
} from './types';
import { analyzeImpact, fetchGraph, scanRepository } from './services/api';
import { TopBar } from './components/TopBar';
import { GraphView } from './components/GraphView';
import { NodeDetails } from './components/NodeDetails';
import { ImpactPanel } from './components/ImpactPanel';
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

  const [selectedNode, setSelectedNode] = useState<GraphNodeDto | null>(null);
  const [impactReport, setImpactReport] = useState<ImpactReport | null>(null);
  const [activeExplanatoryPath, setActiveExplanatoryPath] = useState<ExplanatoryPath | null>(null);

  const [leftTab, setLeftTab] = useState<'Explorer' | 'Impact'>('Explorer');
  const [rightTab, setRightTab] = useState<'Details' | 'Tests'>('Details');

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isDoctorOpen, setIsDoctorOpen] = useState(false);

  // Scan and load repository
  const handleScan = async (targetPath = repoPath) => {
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
  };

  // Preset fixture selector
  const handleSelectPresetFixture = (name: string) => {
    const fullPath = `/home/redsheronin/ghostlight/fixtures/${name}`;
    setRepoPath(fullPath);
    handleScan(fullPath);
  };

  // Initial load
  useEffect(() => {
    handleScan();
  }, []);

  // When node is selected
  const handleSelectNode = (node: GraphNodeDto | null) => {
    setSelectedNode(node);
    if (node) {
      setRightTab('Details');
    }
  };

  const handleSelectNodeById = (nodeId: string) => {
    const node = graphData.nodes.find((n) => n.id === nodeId) || null;
    setSelectedNode(node);
    if (node) {
      setRightTab('Details');
    }
  };

  // Run impact calculation on a node
  const handleAnalyzeImpact = async (node: GraphNodeDto) => {
    setIsLoading(true);
    try {
      const isFile = node.kind === 'File';
      const fileArg = node.file_id;
      const symbolArg = isFile ? undefined : node.label;

      const report = await analyzeImpact(repoPath, fileArg, symbolArg);
      setImpactReport(report);
      setLeftTab('Impact');

      if (report.candidate_tests.length > 0) {
        setRightTab('Tests');
      }
    } catch (err: any) {
      setErrorMsg(`Impact analysis failed: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-canvas-950 font-sans overflow-hidden">
      {/* Top Header Bar */}
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

      {/* Error Alert Bar */}
      {errorMsg && (
        <div className="bg-rose-950 border-b border-rose-800 px-4 py-2 flex items-center justify-between text-rose-200 text-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-white text-[11px] font-mono underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workbench Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side Panel (Explorer / Impact) */}
        <aside className="w-80 bg-canvas-900 border-r border-slate-800 flex flex-col shrink-0">
          <div className="flex border-b border-slate-800 bg-canvas-850 px-2 py-1.5 space-x-1">
            <button
              onClick={() => setLeftTab('Explorer')}
              className={`flex-1 py-1 text-center rounded text-xs font-medium transition ${
                leftTab === 'Explorer'
                  ? 'bg-slate-800 text-slate-100 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Explorer
            </button>
            <button
              onClick={() => setLeftTab('Impact')}
              className={`flex-1 py-1 text-center rounded text-xs font-medium transition ${
                leftTab === 'Impact'
                  ? 'bg-slate-800 text-cyan-400 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Impact {impactReport ? `(${impactReport.total_affected})` : ''}
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {leftTab === 'Explorer' ? (
              <ExplorerPanel
                nodes={graphData.nodes}
                selectedNodeId={selectedNode?.id || null}
                onSelectNode={handleSelectNode}
              />
            ) : (
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
          </div>
        </aside>

        {/* Center Canvas Area (Interactive Graph) */}
        <main className="flex-1 relative overflow-hidden bg-canvas-950">
          {graphData.nodes.length === 0 && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <FolderGit2 className="w-12 h-12 mb-3 opacity-30 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-400 mb-1">No Repository Analyzed</h3>
              <p className="text-xs max-w-sm text-slate-600">
                Enter a repository directory above or pick a sample fixture to build an evidence-backed dependency graph.
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

        {/* Right Side Panel (Details / Tests) */}
        <aside className="w-84 bg-canvas-900 border-l border-slate-800 flex flex-col shrink-0">
          <div className="flex border-b border-slate-800 bg-canvas-850 px-2 py-1.5 space-x-1">
            <button
              onClick={() => setRightTab('Details')}
              className={`flex-1 py-1 text-center rounded text-xs font-medium transition ${
                rightTab === 'Details'
                  ? 'bg-slate-800 text-slate-100 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Node Details
            </button>
            <button
              onClick={() => setRightTab('Tests')}
              className={`flex-1 py-1 text-center rounded text-xs font-medium transition ${
                rightTab === 'Tests'
                  ? 'bg-slate-800 text-emerald-400 shadow'
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
