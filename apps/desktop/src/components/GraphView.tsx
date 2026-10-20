import React, { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { ExplanatoryPath, GraphEdgeDto, GraphNodeDto, ImpactReport } from '../types';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Eye,
  EyeOff,
  HelpCircle,
  X,
} from 'lucide-react';

cytoscape.use(dagre);

interface GraphViewProps {
  nodes: GraphNodeDto[];
  edges: GraphEdgeDto[];
  selectedNodeId: string | null;
  onSelectNode: (node: GraphNodeDto | null) => void;
  impactReport: ImpactReport | null;
  activeExplanatoryPath: ExplanatoryPath | null;
}

export const GraphView: React.FC<GraphViewProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  impactReport,
  activeExplanatoryPath,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  const [showTests, setShowTests] = useState(true);
  const [showFiles, setShowFiles] = useState(true);
  const [showExternals, setShowExternals] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  // Initialize and update Cytoscape graph
  useEffect(() => {
    if (!containerRef.current) return;

    // Filter elements
    const filteredNodes = nodes.filter((n) => {
      if (!showTests && n.is_test) return false;
      if (!showFiles && n.kind === 'File') return false;
      if (!showExternals && n.kind === 'ExternalModule') return false;
      return true;
    });

    const activeNodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = edges.filter(
      (e) => activeNodeIds.has(e.source) && activeNodeIds.has(e.target)
    );

    const cyElements = [
      ...filteredNodes.map((n) => {
        const displayLabel = n.label.length > 24 ? n.label.slice(0, 21) + '…' : n.label;
        return {
          data: {
            id: n.id,
            label: displayLabel,
            fullLabel: n.label,
            kind: n.kind,
            file_id: n.file_id,
            is_test: n.is_test,
          },
        };
      }),
      ...filteredEdges.map((e, idx) => ({
        data: {
          id: `edge-${idx}-${e.source}-${e.target}`,
          source: e.source,
          target: e.target,
          edge_type: e.edge_type,
          confidence: e.confidence,
        },
      })),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements: cyElements,
      boxSelectionEnabled: false,
      autounselectify: false,
      style: [
        // Base node style
        {
          selector: 'node',
          style: {
            'background-color': '#0d131f',
            'border-width': 1.5,
            'border-color': '#2a364f',
            'label': 'data(label)',
            'color': '#cbd5e1',
            'font-family': 'Inter, system-ui, sans-serif',
            'font-size': '10px',
            'font-weight': 500,
            'text-valign': 'center',
            'text-halign': 'center',
            'text-outline-color': '#080a0f',
            'text-outline-width': 2,
            'width': 130,
            'height': 34,
            'shape': 'round-rectangle',
            'transition-property': 'background-color, border-color, opacity, underlay-opacity',
            'transition-duration': 0.15,
          },
        },
        // File Nodes
        {
          selector: 'node[kind = "File"]',
          style: {
            'background-color': '#0a101d',
            'border-color': '#2563eb',
            'shape': 'round-rectangle',
            'width': 140,
            'height': 32,
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '9.5px',
          },
        },
        // Class Nodes
        {
          selector: 'node[kind = "Class"]',
          style: {
            'background-color': '#160d26',
            'border-color': '#9333ea',
            'shape': 'round-rectangle',
            'width': 125,
            'height': 36,
          },
        },
        // Function Nodes
        {
          selector: 'node[kind = "Function"]',
          style: {
            'background-color': '#081a29',
            'border-color': '#0284c7',
            'shape': 'round-rectangle',
            'width': 120,
            'height': 34,
          },
        },
        // Method Nodes
        {
          selector: 'node[kind = "Method"]',
          style: {
            'background-color': '#08253a',
            'border-color': '#38bdf8',
            'shape': 'round-rectangle',
            'width': 125,
            'height': 34,
          },
        },
        // Test Nodes
        {
          selector: 'node[kind = "Test"]',
          style: {
            'background-color': '#072418',
            'border-color': '#059669',
            'shape': 'diamond',
            'width': 130,
            'height': 44,
            'color': '#6ee7b7',
          },
        },
        // External Module Nodes
        {
          selector: 'node[kind = "ExternalModule"]',
          style: {
            'background-color': '#11141c',
            'border-color': '#3f4b61',
            'border-style': 'dashed',
            'color': '#8091a8',
            'shape': 'round-rectangle',
            'width': 115,
            'height': 30,
            'font-size': '9px',
          },
        },
        // Base edge style
        {
          selector: 'edge',
          style: {
            'width': 1.2,
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#475569',
            'line-color': '#334155',
            'arrow-scale': 0.75,
            'opacity': 0.65,
            'transition-property': 'line-color, target-arrow-color, width, opacity',
            'transition-duration': 0.15,
          },
        },
        // Calls edge
        {
          selector: 'edge[edge_type = "Calls"]',
          style: {
            'line-color': '#38bdf8',
            'target-arrow-color': '#38bdf8',
            'width': 1.5,
            'opacity': 0.85,
          },
        },
        // Imports edge
        {
          selector: 'edge[edge_type = "Imports"]',
          style: {
            'line-color': '#64748b',
            'target-arrow-color': '#64748b',
            'line-style': 'dashed',
            'width': 1.2,
            'opacity': 0.7,
          },
        },
        // Inherits edge
        {
          selector: 'edge[edge_type = "Inherits"]',
          style: {
            'line-color': '#c084fc',
            'target-arrow-color': '#c084fc',
            'width': 2,
            'opacity': 0.9,
          },
        },
        // Active Selection State
        {
          selector: '.selected',
          style: {
            'border-color': '#00f0ff',
            'border-width': 2.5,
            'underlay-color': '#00f0ff',
            'underlay-padding': 6,
            'underlay-opacity': 0.3,
            'z-index': 999,
          },
        },
        // Blast Radius Focus States
        {
          selector: '.impact-target',
          style: {
            'border-color': '#00f0ff',
            'border-width': 3.5,
            'underlay-color': '#00f0ff',
            'underlay-padding': 8,
            'underlay-opacity': 0.45,
            'z-index': 1000,
          },
        },
        {
          selector: '.impact-direct',
          style: {
            'border-color': '#f59e0b',
            'border-width': 2.5,
            'underlay-color': '#f59e0b',
            'underlay-padding': 5,
            'underlay-opacity': 0.35,
            'z-index': 800,
          },
        },
        {
          selector: '.impact-transitive',
          style: {
            'border-color': '#f43f5e',
            'border-width': 2,
            'underlay-color': '#f43f5e',
            'underlay-padding': 4,
            'underlay-opacity': 0.25,
            'z-index': 700,
          },
        },
        // Explanatory Causal Path Highlight
        {
          selector: '.path-highlight',
          style: {
            'line-color': '#00f0ff',
            'target-arrow-color': '#00f0ff',
            'width': 3.5,
            'opacity': 1.0,
            'z-index': 950,
          },
        },
        // Dimmed State (Unrelated background elements when focus or impact is active)
        {
          selector: '.dimmed',
          style: {
            'opacity': 0.15,
          },
        },
      ],
      layout: {
        name: 'dagre',
        rankDir: 'LR',
        nodeDimensionsIncludeLabels: true,
        rankSep: 65,
        nodeSep: 32,
      } as any,
    });

    // Tap event handler
    cy.on('tap', 'node', (evt: EventObject) => {
      const nodeData = evt.target.data();
      const originalNode = nodes.find((n) => n.id === nodeData.id) || null;
      onSelectNode(originalNode);
    });

    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) {
        onSelectNode(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [nodes, edges, showTests, showFiles, showExternals]);

  // Update dynamic highlight classes without re-running layout
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
      // Remove previous highlights and dimming
      cy.elements().removeClass(
        'selected impact-target impact-direct impact-transitive path-highlight dimmed'
      );

      const hasActiveImpact = !!impactReport;
      const hasActiveSelection = !!selectedNodeId;

      if (hasActiveImpact) {
        const targetNode = cy.$(`node[id = "${impactReport.target_id}"]`);
        targetNode.addClass('impact-target');

        const directIds = new Set<string>();
        const transitiveIds = new Set<string>();

        impactReport.affected_nodes.forEach((aff) => {
          if (aff.impact_type === 'Direct') directIds.add(aff.node_id);
          else transitiveIds.add(aff.node_id);
        });

        cy.nodes().forEach((n) => {
          const id = n.id();
          if (id === impactReport.target_id) return;
          if (directIds.has(id)) {
            n.addClass('impact-direct');
          } else if (transitiveIds.has(id)) {
            n.addClass('impact-transitive');
          } else {
            // Unrelated node -> dim
            n.addClass('dimmed');
          }
        });

        // Dim unrelated edges
        cy.edges().forEach((e) => {
          const s = e.source().id();
          const t = e.target().id();
          const inImpact =
            (s === impactReport.target_id || directIds.has(s) || transitiveIds.has(s)) &&
            (t === impactReport.target_id || directIds.has(t) || transitiveIds.has(t));
          if (!inImpact) {
            e.addClass('dimmed');
          }
        });
      } else if (hasActiveSelection) {
        const sel = cy.$(`node[id = "${selectedNodeId}"]`);
        sel.addClass('selected');
      }

      // Explanatory Path Highlight
      if (activeExplanatoryPath) {
        for (const step of activeExplanatoryPath.steps) {
          const edge = cy.edges(`[source = "${step.from}"][target = "${step.to}"]`);
          edge.addClass('path-highlight');
          edge.removeClass('dimmed');
          cy.$(`node[id = "${step.from}"]`).removeClass('dimmed');
          cy.$(`node[id = "${step.to}"]`).removeClass('dimmed');
        }
      }
    });
  }, [selectedNodeId, impactReport, activeExplanatoryPath]);

  // Toolbar Actions
  const handleZoomIn = useCallback(() => {
    cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  }, []);

  const handleZoomOut = useCallback(() => {
    cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  }, []);

  const handleFit = useCallback(() => {
    cyRef.current?.fit(undefined, 40);
  }, []);

  const handleRelayout = useCallback(() => {
    cyRef.current?.layout({
      name: 'dagre',
      rankDir: 'LR',
      nodeDimensionsIncludeLabels: true,
      rankSep: 65,
      nodeSep: 32,
    } as any).run();
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden bg-canvas-950 select-none">
      {/* Cytoscape Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Canvas Viewport Controls HUD */}
      <div className="absolute top-3 right-3 flex items-center space-x-1 bg-canvas-900/90 border border-canvas-800 backdrop-blur-md p-1 rounded-lg shadow-elevated z-10">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-canvas-800 rounded transition btn-interactive"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-canvas-800 rounded transition btn-interactive"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleFit}
          title="Fit Graph to Viewport (Space)"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-canvas-800 rounded transition btn-interactive"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleRelayout}
          title="Recalculate Layout"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-canvas-800 rounded transition btn-interactive"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-3.5 bg-canvas-800" />

        {/* Filter Toggles */}
        <button
          onClick={() => setShowTests(!showTests)}
          title={showTests ? 'Hide Test Nodes' : 'Show Test Nodes'}
          className={`px-2 py-1 text-2xs font-mono rounded flex items-center space-x-1 transition btn-interactive ${
            showTests
              ? 'bg-canvas-800 text-emerald-400 border border-emerald-500/20'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {showTests ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>Tests</span>
        </button>

        <button
          onClick={() => setShowFiles(!showFiles)}
          title={showFiles ? 'Hide File Nodes' : 'Show File Nodes'}
          className={`px-2 py-1 text-2xs font-mono rounded flex items-center space-x-1 transition btn-interactive ${
            showFiles
              ? 'bg-canvas-800 text-blue-400 border border-blue-500/20'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {showFiles ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>Files</span>
        </button>

        <button
          onClick={() => setShowExternals(!showExternals)}
          title={showExternals ? 'Hide External Modules' : 'Show External Modules'}
          className={`px-2 py-1 text-2xs font-mono rounded flex items-center space-x-1 transition btn-interactive ${
            showExternals
              ? 'bg-canvas-800 text-slate-300 border border-canvas-750'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {showExternals ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>Externals</span>
        </button>

        <div className="w-px h-3.5 bg-canvas-800" />

        {/* Legend Button */}
        <button
          onClick={() => setShowLegend(!showLegend)}
          title="Graph Symbol Legend"
          className={`p-1.5 rounded transition btn-interactive ${
            showLegend
              ? 'bg-canvas-800 text-ghost-cyan'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Legend Overlay */}
      {showLegend && (
        <div className="absolute top-14 right-3 w-64 bg-canvas-900/95 border border-canvas-800 backdrop-blur-md p-3 rounded-lg shadow-elevated z-20 text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-canvas-800">
            <span className="font-mono font-semibold text-slate-200 text-2xs tracking-wider uppercase">
              Graph Geometry Legend
            </span>
            <button
              onClick={() => setShowLegend(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Node Kinds */}
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600/40 border border-blue-400 inline-block" />
                <span className="text-slate-300">File / Module</span>
              </span>
              <span className="text-[10px] text-slate-500">Box</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-600/40 border border-purple-400 inline-block" />
                <span className="text-slate-300">Class</span>
              </span>
              <span className="text-[10px] text-slate-500">Capsule</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-600/40 border border-sky-400 inline-block" />
                <span className="text-slate-300">Function / Method</span>
              </span>
              <span className="text-[10px] text-slate-500">Card</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rotate-45 bg-emerald-600/40 border border-emerald-400 inline-block" />
                <span className="text-slate-300">Candidate Test</span>
              </span>
              <span className="text-[10px] text-slate-500">Diamond</span>
            </div>
          </div>

          <div className="my-2 border-t border-canvas-800" />

          {/* Edge Types */}
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className="w-4 h-0.5 bg-sky-400 inline-block" />
                <span className="text-slate-300">Function Call</span>
              </span>
              <span className="text-[10px] text-sky-400">Solid Cyan</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className="w-4 h-0.5 border-t border-dashed border-slate-400 inline-block" />
                <span className="text-slate-300">Import</span>
              </span>
              <span className="text-[10px] text-slate-400">Dashed Slate</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className="w-4 h-0.5 bg-purple-400 inline-block" />
                <span className="text-slate-300">Inheritance</span>
              </span>
              <span className="text-[10px] text-purple-400">Solid Violet</span>
            </div>
          </div>

          <div className="my-2 border-t border-canvas-800" />

          {/* Impact Status */}
          <div className="space-y-1 font-mono text-[10px]">
            <div className="flex items-center space-x-1.5 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Direct Impact (Immediate dependent)</span>
            </div>
            <div className="flex items-center space-x-1.5 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Transitive Impact (Multi-hop dependent)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
