import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { ExplanatoryPath, GraphEdgeDto, GraphNodeDto, ImpactReport } from '../types';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, Eye, EyeOff } from 'lucide-react';

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
      ...filteredNodes.map((n) => ({
        data: {
          id: n.id,
          label: n.label.length > 25 ? n.label.slice(0, 22) + '...' : n.label,
          fullLabel: n.label,
          kind: n.kind,
          file_id: n.file_id,
          is_test: n.is_test,
        },
      })),
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
        {
          selector: 'node',
          style: {
            'background-color': '#1e293b',
            'border-width': 2,
            'border-color': '#475569',
            'label': 'data(label)',
            'color': '#cbd5e1',
            'font-family': 'Inter, sans-serif',
            'font-size': '11px',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-outline-color': '#090a0f',
            'text-outline-width': 2,
            'width': 130,
            'height': 38,
            'shape': 'round-rectangle',
            'transition-property': 'background-color, border-color, shadow-blur, shadow-color',
            'transition-duration': 0.2,
          },
        },
        // Node kinds styling
        {
          selector: 'node[kind = "File"]',
          style: {
            'background-color': '#0f172a',
            'border-color': '#3b82f6',
            'shape': 'round-rectangle',
            'width': 150,
          },
        },
        {
          selector: 'node[kind = "Class"]',
          style: {
            'background-color': '#2e1065',
            'border-color': '#a855f7',
            'shape': 'round-rectangle',
          },
        },
        {
          selector: 'node[kind = "Function"]',
          style: {
            'background-color': '#082f49',
            'border-color': '#0284c7',
            'shape': 'ellipse',
            'width': 120,
            'height': 42,
          },
        },
        {
          selector: 'node[kind = "Method"]',
          style: {
            'background-color': '#075985',
            'border-color': '#38bdf8',
            'shape': 'ellipse',
            'width': 130,
            'height': 42,
          },
        },
        {
          selector: 'node[kind = "Test"]',
          style: {
            'background-color': '#064e3b',
            'border-color': '#10b981',
            'shape': 'diamond',
            'width': 130,
            'height': 50,
          },
        },
        {
          selector: 'node[kind = "ExternalModule"]',
          style: {
            'background-color': '#18181b',
            'border-color': '#52525b',
            'color': '#71717a',
            'shape': 'round-rectangle',
          },
        },
        // Edge styling
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#475569',
            'line-color': '#334155',
            'arrow-scale': 0.8,
            'opacity': 0.65,
          },
        },
        {
          selector: 'edge[edge_type = "Calls"]',
          style: {
            'line-color': '#38bdf8',
            'target-arrow-color': '#38bdf8',
            'width': 2,
            'opacity': 0.85,
          },
        },
        {
          selector: 'edge[edge_type = "Imports"]',
          style: {
            'line-color': '#64748b',
            'target-arrow-color': '#64748b',
            'line-style': 'dashed',
            'opacity': 0.7,
          },
        },
        {
          selector: 'edge[edge_type = "Inherits"]',
          style: {
            'line-color': '#c084fc',
            'target-arrow-color': '#c084fc',
            'width': 2.5,
            'opacity': 0.9,
          },
        },
        // Highlighting classes
        {
          selector: '.selected',
          style: {
            'border-color': '#00f2fe',
            'border-width': 3,
            'underlay-color': '#00f2fe',
            'underlay-padding': 6,
            'underlay-opacity': 0.35,
            'z-index': 999,
          },
        },
        {
          selector: '.impact-target',
          style: {
            'border-color': '#38bdf8',
            'border-width': 4,
            'underlay-color': '#38bdf8',
            'underlay-padding': 8,
            'underlay-opacity': 0.5,
            'z-index': 1000,
          },
        },
        {
          selector: '.impact-direct',
          style: {
            'border-color': '#f59e0b',
            'border-width': 3,
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
            'border-width': 2.5,
            'underlay-color': '#f43f5e',
            'underlay-padding': 4,
            'underlay-opacity': 0.25,
            'z-index': 700,
          },
        },
        {
          selector: '.path-highlight',
          style: {
            'line-color': '#00f2fe',
            'target-arrow-color': '#00f2fe',
            'width': 4,
            'opacity': 1,
            'z-index': 950,
          },
        },
      ],
      layout: {
        name: 'dagre',
        rankDir: 'LR',
        nodeDimensionsIncludeLabels: true,
        rankSep: 60,
        nodeSep: 35,
      } as any,
    });

    cy.on('tap', 'node', (evt: EventObject) => {
      const nodeData = evt.target.data();
      const rawNode = nodes.find((n) => n.id === nodeData.id) || null;
      onSelectNode(rawNode);
    });

    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) {
        onSelectNode(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [nodes, edges, showTests, showFiles, showExternals]);

  // Update selection and impact styles on cy instance
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
      // Clear previous highlight classes
      cy.elements().removeClass(
        'selected impact-target impact-direct impact-transitive path-highlight'
      );

      // Selected node
      if (selectedNodeId) {
        cy.$id(selectedNodeId).addClass('selected');
      }

      // Impact highlights
      if (impactReport) {
        cy.$id(impactReport.target_id).addClass('impact-target');
        for (const aff of impactReport.affected_nodes) {
          if (aff.impact_type === 'Direct') {
            cy.$id(aff.node_id).addClass('impact-direct');
          } else {
            cy.$id(aff.node_id).addClass('impact-transitive');
          }
        }
      }

      // Explanatory path highlight
      if (activeExplanatoryPath) {
        for (const step of activeExplanatoryPath.steps) {
          cy.edges(`[source = "${step.from}"][target = "${step.to}"]`).addClass('path-highlight');
        }
      }
    });
  }, [selectedNodeId, impactReport, activeExplanatoryPath]);

  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current?.fit(undefined, 30);
  const handleRelayout = () => {
    cyRef.current?.layout({
      name: 'dagre',
      rankDir: 'LR',
      nodeDimensionsIncludeLabels: true,
      rankSep: 60,
      nodeSep: 35,
    } as any).run();
  };

  return (
    <div className="relative w-full h-full bg-canvas-950 flex flex-col overflow-hidden">
      {/* Cytoscape Canvas */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Canvas Controls */}
      <div className="absolute bottom-4 left-4 flex items-center space-x-1.5 bg-canvas-900/90 backdrop-blur-md border border-slate-800 p-1.5 rounded-lg shadow-xl text-xs text-slate-300">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleFit}
          title="Fit Graph"
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-slate-800 mx-1" />
        <button
          onClick={handleRelayout}
          title="Re-layout Graph"
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition flex items-center space-x-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Layout</span>
        </button>
      </div>

      {/* Legend & Filter Controls */}
      <div className="absolute top-4 right-4 flex items-center space-x-2 bg-canvas-900/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg shadow-xl text-xs text-slate-300">
        <span className="text-slate-500 font-medium">Filters:</span>
        <button
          onClick={() => setShowTests(!showTests)}
          className={`flex items-center space-x-1 px-2 py-1 rounded transition ${
            showTests ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50' : 'text-slate-500'
          }`}
        >
          {showTests ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>Tests</span>
        </button>
        <button
          onClick={() => setShowFiles(!showFiles)}
          className={`flex items-center space-x-1 px-2 py-1 rounded transition ${
            showFiles ? 'bg-blue-950/80 text-blue-400 border border-blue-800/50' : 'text-slate-500'
          }`}
        >
          {showFiles ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>Files</span>
        </button>
        <button
          onClick={() => setShowExternals(!showExternals)}
          className={`flex items-center space-x-1 px-2 py-1 rounded transition ${
            showExternals ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' : 'text-slate-500'
          }`}
        >
          {showExternals ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>External</span>
        </button>
      </div>
    </div>
  );
};
