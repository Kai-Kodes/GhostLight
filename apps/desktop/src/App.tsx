import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ExplanatoryPath,
  GraphExportDto,
  GraphNodeDto,
  ImpactReport,
  ScanResult,
} from './types';
import { analyzeImpact, fetchGraph, scanRepository } from './services/api';
import { MacToolbar } from './components/MacToolbar';
import { NavigatorSidebar } from './components/NavigatorSidebar';
import { GraphWorkspace } from './components/GraphWorkspace';
import { MacInspector } from './components/MacInspector';
import { InsightsView } from './components/InsightsView';
import { QuickSearchPalette } from './components/QuickSearchPalette';
import { ReportModal } from './components/ReportModal';
import { DoctorModal } from './components/DoctorModal';
import { AlertCircle, Network } from 'lucide-react';

export function App() {
  const [repoPath, setRepoPath] = useState('fixtures/complex-python');
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

  // View mode: 'graph' or 'insights'
  const [viewMode, setViewMode] = useState<'graph' | 'insights'>('graph');

  // Workstation panels state (Apple Pro split view)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

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
    const targetPath = `fixtures/${name}`;
    setRepoPath(targetPath);
    handleScan(targetPath);
  }, [handleScan]);

  // Initial load
  useEffect(() => {
    handleScan();
  }, []);

  // When node is selected
  const handleSelectNode = useCallback((node: GraphNodeDto | null) => {
    setSelectedNode(node);
    if (node) {
      setIsInspectorOpen(true);
    }
  }, []);

  const handleSelectNodeById = useCallback((nodeId: string) => {
    const node = graphData.nodes.find((n) => n.id === nodeId) || null;
    setSelectedNode(node);
    setViewMode('graph');
    if (node) {
      setIsInspectorOpen(true);
    }
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
      setIsInspectorOpen(true);
    } catch (err: any) {
      setErrorMsg(`Impact analysis failed: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  }, [repoPath]);

  // Affected nodes set for fast lookup
  const affectedNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (impactReport?.affected_nodes) {
      for (const aff of impactReport.affected_nodes) {
        set.add(aff.node_id);
      }
    }
    return set;
  }, [impactReport]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isCmd = e.ctrlKey || e.metaKey;

      if (isCmd && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === '/' && !isSearchOpen) {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (isCmd && e.key === '0') {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      } else if (isCmd && e.altKey && e.key === '0') {
        e.preventDefault();
        setIsInspectorOpen((prev) => !prev);
      } else if (isCmd && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setIsInspectorOpen((prev) => !prev);
      } else if (isCmd && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setIsReportOpen((prev) => !prev);
      } else if (isCmd && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsDoctorOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (selectedNode || impactReport) {
          setSelectedNode(null);
          setActiveExplanatoryPath(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, impactReport, isSearchOpen]);

  return (
    <div className="h-screen w-screen flex flex-col bg-mac-canvas font-sans overflow-hidden select-none text-mac-text">
      {/* Apple Unified Window Toolbar */}
      <MacToolbar
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
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isInspectorOpen={isInspectorOpen}
        onToggleInspector={() => setIsInspectorOpen(!isInspectorOpen)}
      />

      {/* Error Notification Bar */}
      {errorMsg && (
        <div className="bg-rose-950/80 border-b border-rose-900/60 px-4 py-2 flex items-center justify-between text-rose-200 text-xs z-30">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-mac-red shrink-0" />
            <span className="font-mono text-2xs">{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-mac-red hover:text-white text-2xs font-mono uppercase underline ml-4 apple-btn"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workstation Body (Split View) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Navigator Sidebar (Source List) */}
        {isSidebarOpen && (
          <NavigatorSidebar
            nodes={graphData.nodes}
            edges={graphData.edges}
            selectedNodeId={selectedNode?.id || impactReport?.target_id || null}
            onSelectNode={handleSelectNode}
            impactTargetId={impactReport?.target_id || null}
            affectedNodeIds={affectedNodeIds}
          />
        )}

        {/* Center Primary Area */}
        <div className="flex-1 h-full relative overflow-hidden bg-mac-canvas flex flex-col">
          {viewMode === 'graph' ? (
            graphData.nodes.length === 0 && !isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-mac-textTertiary">
                <Network className="w-12 h-12 mb-3 opacity-25 text-mac-blue" />
                <h3 className="text-sm font-semibold text-mac-text mb-1">
                  No Codebase Analyzed
                </h3>
                <p className="text-xs max-w-sm text-mac-textSecondary">
                  Select a fixture or enter a repository path in the toolbar to construct an AST dependency graph.
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
            )
          ) : (
            <InsightsView
              nodes={graphData.nodes}
              edges={graphData.edges}
              scanResult={scanResult}
              onNavigateToNode={handleSelectNodeById}
            />
          )}
        </div>

        {/* Right Inspector Utility Panel */}
        {isInspectorOpen && (
          <MacInspector
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
            onClose={() => setIsInspectorOpen(false)}
            repoPath={repoPath}
            totalFiles={scanResult?.file_count || 0}
            totalNodes={graphData.node_count}
            totalEdges={graphData.edge_count}
            fingerprint={scanResult?.fingerprint}
            hasCycles={false}
          />
        )}
      </div>

      {/* Bottom Telemetry & Status Strip */}
      <footer className="h-6 bg-mac-window border-t border-mac-border px-3 flex items-center justify-between text-2xs font-mono text-mac-textTertiary select-none z-10">
        <div className="flex items-center space-x-3">
          <span className="text-mac-textSecondary font-medium">
            {repoPath.split('/').slice(-2).join('/')}
          </span>
          {scanResult?.fingerprint && (
            <span>
              SHA-256: <strong className="text-mac-textSecondary font-normal">{scanResult.fingerprint.slice(0, 8)}</strong>
            </span>
          )}
          <span>{graphData.node_count} symbols</span>
          <span>{graphData.edge_count} edges</span>
        </div>

        <div className="flex items-center space-x-3 text-mac-textTertiary">
          <span><kbd className="px-1 py-0.2 bg-mac-surfaceActive rounded text-mac-textSecondary">⌘0</kbd> navigator</span>
          <span><kbd className="px-1 py-0.2 bg-mac-surfaceActive rounded text-mac-textSecondary">⌥⌘0</kbd> inspector</span>
          <span><kbd className="px-1 py-0.2 bg-mac-surfaceActive rounded text-mac-textSecondary">⌘K</kbd> search</span>
          <span><kbd className="px-1 py-0.2 bg-mac-surfaceActive rounded text-mac-textSecondary">Space</kbd> fit</span>
        </div>
      </footer>

      {/* Spotlight Command Palette */}
      <QuickSearchPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        nodes={graphData.nodes}
        onSelectNode={handleSelectNode}
      />

      {/* Export Report Sheet */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        scanResult={scanResult}
        graph={graphData}
        impactReport={impactReport}
      />

      {/* Diagnostics Sheet */}
      <DoctorModal
        isOpen={isDoctorOpen}
        onClose={() => setIsDoctorOpen(false)}
      />
    </div>
  );
}

export default App;
