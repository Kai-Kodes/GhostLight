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

interface GraphWorkspaceProps {
  nodes: GraphNodeDto[];
  edges: GraphEdgeDto[];
  selectedNodeId: string | null;
  onSelectNode: (node: GraphNodeDto | null) => void;
  impactReport: ImpactReport | null;
  activeExplanatoryPath: ExplanatoryPath | null;
}

export const GraphWorkspace: React.FC<GraphWorkspaceProps> = ({
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

    // Filter elements based on layer toggles
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
        const displayLabel = n.label.length > 28 ? n.label.slice(0, 25) + '…' : n.label;
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
        // Base node styling
        {
          selector: 'node',
          style: {
            'background-color': '#0d1017',
            'border-width': 1.5,
            'border-color': '#283142',
            'label': 'data(label)',
            'color': '#e2e8f0',
            'font-family': 'Inter, system-ui, sans-serif',
            'font-size': '11px',
            'font-weight': 500,
            'text-valign': 'center',
            'text-halign': 'center',
            'text-outline-color': '#07080a',
            'text-outline-width': 2,
            'width': 140,
            'height': 38,
            'shape': 'round-rectangle',
            'transition-property': 'background-color, border-color, opacity, underlay-opacity',
            'transition-duration': 0.15,
          },
        },
        // File Nodes
        {
          selector: 'node[kind = "File"]',
          style: {
            'background-color': '#0b0f17',
            'border-color': '#2563eb',
            'shape': 'round-rectangle',
            'width': 150,
            'height': 36,
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '10px',
          },
        },
        // Class Nodes
        {
          selector: 'node[kind = "Class"]',
          style: {
            'background-color': '#140d1f',
            'border-color': '#9333ea',
            'shape': 'round-rectangle',
            'width': 135,
            'height': 40,
          },
        },
        // Function Nodes
        {
          selector: 'node[kind = "Function"]',
          style: {
            'background-color': '#081624',
            'border-color': '#0284c7',
            'shape': 'round-rectangle',
            'width': 130,
            'height': 38,
          },
        },
        // Method Nodes
        {
          selector: 'node[kind = "Method"]',
          style: {
            'background-color': '#0a1a2b',
            'border-color': '#38bdf8',
            'shape': 'round-rectangle',
            'width': 135,
            'height': 38,
          },
        },
        // Test Nodes
        {
          selector: 'node[kind = "Test"]',
          style: {
            'background-color': '#071f16',
            'border-color': '#059669',
            'shape': 'diamond',
            'width': 135,
            'height': 48,
            'color': '#6ee7b7',
          },
        },
        // External Module Nodes
        {
          selector: 'node[kind = "ExternalModule"]',
          style: {
            'background-color': '#0f1218',
            'border-color': '#3f4b61',
            'border-style': 'dashed',
            'color': '#8091a8',
            'shape': 'round-rectangle',
            'width': 120,
            'height': 32,
            'font-size': '9.5px',
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
            'line-color': '#2a3344',
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
            'width': 1.6,
            'opacity': 0.8,
          },
        },
        // Imports edge
        {
          selector: 'edge[edge_type = "Imports"]',
          style: {
            'line-color': '#57657d',
            'target-arrow-color': '#57657d',
            'line-style': 'dashed',
            'width': 1.2,
            'opacity': 0.65,
          },
        },
        // Inherits edge
        {
          selector: 'edge[edge_type = "Inherits"]',
          style: {
            'line-color': '#c084fc',
            'target-arrow-color': '#c084fc',
            'width': 2.2,
            'opacity': 0.9,
          },
        },
        // Active Selection State
        {
          selector: '.selected',
          style: {
            'border-color': '#38bdf8',
            'border-width': 2.5,
            'underlay-color': '#38bdf8',
            'underlay-padding': 6,
            'underlay-opacity': 0.35,
            'z-index': 999,
          },
        },
        // Blast Radius Focus States
        {
          selector: '.impact-target',
          style: {
            'border-color': '#38bdf8',
            'border-width': 3.5,
            'underlay-color': '#38bdf8',
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
            'line-color': '#38bdf8',
            'target-arrow-color': '#38bdf8',
            'width': 3.5,
            'opacity': 1.0,
            'z-index': 950,
          },
        },
        // Dimmed State for Unrelated Nodes
        {
          selector: '.dimmed',
          style: {
            'opacity': 0.12,
          },
        },
      ],
      layout: {
        name: 'dagre',
        rankDir: 'LR',
        nodeDimensionsIncludeLabels: true,
        rankSep: 70,
        nodeSep: 35,
      } as any,
    });

    // Events
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
  }, [nodes, edges, showTests, showFiles, showExternals, onSelectNode]);

  // Dynamic Highlight Class Updates
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
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
            n.addClass('dimmed');
          }
        });

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

  // Center on node if selected externally
  useEffect(() => {
    if (selectedNodeId && cyRef.current) {
      const el = cyRef.current.$(`node[id = "${selectedNodeId}"]`);
      if (el.length > 0) {
        cyRef.current.animate({
          center: { eles: el },
          duration: 350,
          easing: 'ease-out-cubic' as any,
        });
      }
    }
  }, [selectedNodeId]);

  const handleZoomIn = useCallback(() => cyRef.current?.zoom(cyRef.current.zoom() * 1.25), []);
  const handleZoomOut = useCallback(() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8), []);
  const handleFit = useCallback(() => cyRef.current?.fit(undefined, 50), []);
  const handleRelayout = useCallback(() => {
    cyRef.current?.layout({
      name: 'dagre',
      rankDir: 'LR',
      nodeDimensionsIncludeLabels: true,
      rankSep: 70,
      nodeSep: 35,
    } as any).run();
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden bg-obsidian-950 select-none">
      {/* Cytoscape Canvas */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Spatial Toolbar (Clean, Unobtrusive) */}
      <div className="absolute bottom-5 left-5 flex items-center space-x-1.5 bg-obsidian-900/90 border border-obsidian-800 backdrop-blur-md px-2 py-1.5 rounded-lg shadow-dossier z-10 text-xs">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-obsidian-800 rounded transition btn-tactile"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-obsidian-800 rounded transition btn-tactile"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleFit}
          title="Fit Graph to Viewport (Space)"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-obsidian-800 rounded transition btn-tactile"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleRelayout}
          title="Recalculate Layout"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-obsidian-800 rounded transition btn-tactile"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-3.5 bg-obsidian-800" />

        {/* Visibility Toggles */}
        <button
          onClick={() => setShowTests(!showTests)}
          className={`px-2 py-1 rounded text-2xs font-mono flex items-center space-x-1 transition btn-tactile ${
            showTests ? 'bg-obsidian-800 text-signal-emerald' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {showTests ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>Tests</span>
        </button>

        <button
          onClick={() => setShowFiles(!showFiles)}
          className={`px-2 py-1 rounded text-2xs font-mono flex items-center space-x-1 transition btn-tactile ${
            showFiles ? 'bg-obsidian-800 text-blue-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {showFiles ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>Files</span>
        </button>

        <button
          onClick={() => setShowExternals(!showExternals)}
          className={`px-2 py-1 rounded text-2xs font-mono flex items-center space-x-1 transition btn-tactile ${
            showExternals ? 'bg-obsidian-800 text-slate-300' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {showExternals ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>Externals</span>
        </button>

        <div className="w-px h-3.5 bg-obsidian-800" />

        {/* Legend Button */}
        <button
          onClick={() => setShowLegend(!showLegend)}
          title="Graph Symbol Legend"
          className={`p-1.5 rounded transition btn-tactile ${
            showLegend ? 'bg-obsidian-800 text-signal-cyan' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Legend Popover */}
      {showLegend && (
        <div className="absolute bottom-16 left-5 w-64 bg-obsidian-900/95 border border-obsidian-750 backdrop-blur-md p-3.5 rounded-xl shadow-dossier z-20 text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-obsidian-800">
            <span className="font-semibold text-slate-200 text-2xs uppercase tracking-wider font-mono">
              Graph Geometry Legend
            </span>
            <button onClick={() => setShowLegend(false)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 font-mono text-2xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600/30 border border-blue-400" />
                <span className="text-slate-300">File / Module</span>
              </span>
              <span className="text-slate-500">Box</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-600/30 border border-purple-400" />
                <span className="text-slate-300">Class</span>
              </span>
              <span className="text-slate-500">Capsule</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-600/30 border border-sky-400" />
                <span className="text-slate-300">Function / Method</span>
              </span>
              <span className="text-slate-500">Card</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rotate-45 bg-emerald-600/30 border border-emerald-400" />
                <span className="text-slate-300">Test Suite</span>
              </span>
              <span className="text-slate-500">Diamond</span>
            </div>
          </div>

          <div className="my-2 border-t border-obsidian-800" />

          <div className="space-y-1 font-mono text-2xs">
            <div className="flex items-center space-x-2 text-signal-amber">
              <span className="w-2 h-2 rounded-full bg-signal-amber" />
              <span>Direct Downstream Impact</span>
            </div>
            <div className="flex items-center space-x-2 text-signal-rose">
              <span className="w-2 h-2 rounded-full bg-signal-rose" />
              <span>Transitive Impact Ripple</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
