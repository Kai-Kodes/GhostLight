import { useEffect, useState, useCallback } from 'react';
import {
  ExplanatoryPath,
  GraphExportDto,
  GraphNodeDto,
  ImpactReport,
  ScanResult,
} from './types';
import { analyzeImpact, fetchGraph, scanRepository } from './services/api';
import { TopNavigation } from './components/TopNavigation';
import { GraphWorkspace } from './components/GraphWorkspace';
import { UnifiedInspector } from './components/UnifiedInspector';
import { InsightsView } from './components/InsightsView';
import { QuickSearchPalette } from './components/QuickSearchPalette';
import { ReportModal } from './components/ReportModal';
import { DoctorModal } from './components/DoctorModal';
import { AlertCircle, Network } from 'lucide-react';

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

  // View mode: 'graph' (interactive map) or 'insights' (full-page topology dossier)
  const [viewMode, setViewMode] = useState<'graph' | 'insights'>('graph');

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
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

  // Fixture preset selector
  const handleSelectFixture = useCallback((name: string) => {
    const fullPath = `/home/redsheronin/ghostlight/fixtures/${name}`;
    setRepoPath(fullPath);
    handleScan(fullPath);
  }, [handleScan]);

  // Initial load
  useEffect(() => {
    handleScan();
  }, []);

  // When node is selected
  const handleSelectNode = useCallback((node: GraphNodeDto | null) => {
    setSelectedNode(node);
  }, []);

  const handleSelectNodeById = useCallback((nodeId: string) => {
    const node = graphData.nodes.find((n) => n.id === nodeId) || null;
    setSelectedNode(node);
    setViewMode('graph');
  }, [graphData.nodes]);

  // Run impact calculation on a node
  const handleAnalyzeImpact = useCallback(async (node: GraphNodeDto) => {
    if (!node.file_id && node.kind !== 'File') {
      setErrorMsg(`Cannot analyze impact on external entity "${node.label}" (no local source file).`);
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
      setSelectedNode(node);
    } catch (err: any) {
      setErrorMsg(`Impact analysis failed: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  }, [repoPath]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === '/' && !isSearchOpen) {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === 'Escape') {
        if (selectedNode || impactReport) {
          setSelectedNode(null);
          setActiveExplanatoryPath(null);
        }
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
  }, [selectedNode, impactReport, isSearchOpen]);

  return (
    <div className="h-screen w-screen flex flex-col bg-obsidian-950 font-sans overflow-hidden select-none">
      {/* Top Application Header */}
      <TopNavigation
        repoPath={repoPath}
        setRepoPath={setRepoPath}
        onScan={() => handleScan()}
        isLoading={isLoading}
        fileCount={scanResult?.file_count || 0}
        nodeCount={graphData.node_count}
        edgeCount={graphData.edge_count}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenDoctor={() => setIsDoctorOpen(true)}
        onSelectFixture={handleSelectFixture}
        onOpenSearchPalette={() => setIsSearchOpen(true)}
      />

      {/* Error Notification Bar */}
      {errorMsg && (
        <div className="bg-rose-950/80 border-b border-rose-850 px-4 py-2 flex items-center justify-between text-rose-200 text-xs z-30">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-mono">{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-white text-2xs font-mono uppercase underline ml-4 btn-tactile"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {viewMode === 'graph' ? (
          <>
            {/* Full-Bleed Graph Canvas */}
            <main className="flex-1 h-full relative overflow-hidden bg-obsidian-950">
              {graphData.nodes.length === 0 && !isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <Network className="w-12 h-12 mb-3 opacity-20 text-signal-cyan" />
                  <h3 className="text-sm font-semibold text-slate-300 mb-1">
                    No Codebase Analyzed
                  </h3>
                  <p className="text-xs max-w-sm text-slate-500">
                    Select a fixture in the header bar to construct an evidence-backed dependency graph.
                  </p>
                </div>
              ) : (
                <GraphWorkspace
                  nodes={graphData.nodes}
                  edges={graphData.edges}
                  selectedNodeId={selectedNode?.id || impactReport?.target_id || null}
                  onSelectNode={handleSelectNode}
                  impactReport={impactReport}
                  activeExplanatoryPath={activeExplanatoryPath}
                />
              )}
            </main>

            {/* Contextual Analysis Dossier (Sliding Right Inspector) */}
            {(selectedNode || impactReport) && (
              <UnifiedInspector
                node={selectedNode}
                edges={graphData.edges}
                impactReport={impactReport}
                activePath={activeExplanatoryPath}
                onAnalyzeImpact={handleAnalyzeImpact}
                onSelectNodeById={handleSelectNodeById}
                onSelectExplanatoryPath={setActiveExplanatoryPath}
                onClearImpact={() => {
                  setImpactReport(null);
                  setActiveExplanatoryPath(null);
                }}
                onClose={() => {
                  setSelectedNode(null);
                  setImpactReport(null);
                  setActiveExplanatoryPath(null);
                }}
                repoPath={repoPath}
              />
            )}
          </>
        ) : (
          /* Full-Screen Structural Insights & Topology Dossier */
          <InsightsView
            nodes={graphData.nodes}
            edges={graphData.edges}
            scanResult={scanResult}
            onNavigateToNode={handleSelectNodeById}
          />
        )}
      </div>

      {/* Floating Bottom Telemetry Strip */}
      <footer className="h-6 bg-obsidian-900 border-t border-obsidian-800 px-3 flex items-center justify-between text-2xs font-mono text-slate-500 select-none z-10">
        <div className="flex items-center space-x-3">
          <span className="text-slate-400 font-semibold">{repoPath.split('/').slice(-2).join('/')}</span>
          {scanResult?.fingerprint && (
            <span>SHA-256: <strong className="text-slate-400 font-normal">{scanResult.fingerprint.slice(0, 8)}</strong></span>
          )}
          <span>{graphData.node_count} nodes</span>
          <span>{graphData.edge_count} edges</span>
        </div>

        <div className="flex items-center space-x-3">
          <span><kbd className="px-1 py-0.2 bg-obsidian-800 rounded">⌘K</kbd> search</span>
          <span><kbd className="px-1 py-0.2 bg-obsidian-800 rounded">Space</kbd> fit</span>
          <span><kbd className="px-1 py-0.2 bg-obsidian-800 rounded">Esc</kbd> deselect</span>
        </div>
      </footer>

      {/* Command Palette */}
      <QuickSearchPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        nodes={graphData.nodes}
        onSelectNode={handleSelectNode}
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
