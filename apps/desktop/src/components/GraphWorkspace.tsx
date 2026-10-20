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
        // Base node styling (Apple Pro Rounded Card)
        {
          selector: 'node',
          style: {
            'background-color': '#202026',
            'border-width': 1,
            'border-color': '#363640',
            'label': 'data(label)',
            'color': '#f5f5f7',
            'font-family': '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
            'font-size': '11px',
            'font-weight': 500,
            'text-valign': 'center',
            'text-halign': 'center',
            'width': 140,
            'height': 36,
            'shape': 'round-rectangle',
            'corner-radius': '6px' as any,
            'transition-property': 'background-color, border-color, opacity, underlay-opacity',
            'transition-duration': 0.12,
          },
        },
        // File Nodes
        {
          selector: 'node[kind = "File"]',
          style: {
            'background-color': '#1a1a20',
            'border-color': '#444452',
            'font-family': '"SF Mono", Menlo, monospace',
            'font-size': '10px',
            'width': 150,
            'height': 34,
          },
        },
        // Class Nodes
        {
          selector: 'node[kind = "Class"]',
          style: {
            'background-color': '#231f2b',
            'border-color': '#bf5af2',
            'width': 135,
            'height': 38,
          },
        },
        // Function Nodes
        {
          selector: 'node[kind = "Function"]',
          style: {
            'background-color': '#1a202a',
            'border-color': '#0a84ff',
            'width': 130,
            'height': 36,
          },
        },
        // Method Nodes
        {
          selector: 'node[kind = "Method"]',
          style: {
            'background-color': '#1a202a',
            'border-color': '#0a84ff',
            'width': 135,
            'height': 36,
          },
        },
        // Test Nodes
        {
          selector: 'node[kind = "Test"]',
          style: {
            'background-color': '#18241d',
            'border-color': '#30d158',
            'shape': 'round-rectangle',
            'width': 135,
            'height': 38,
            'color': '#30d158',
          },
        },
        // External Module Nodes
        {
          selector: 'node[kind = "ExternalModule"]',
          style: {
            'background-color': '#17171a',
            'border-color': '#484852',
            'border-style': 'dashed',
            'color': '#8e8e93',
            'width': 120,
            'height': 30,
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
            'target-arrow-color': '#484852',
            'line-color': '#33333d',
            'arrow-scale': 0.7,
            'opacity': 0.7,
            'transition-property': 'line-color, target-arrow-color, width, opacity',
            'transition-duration': 0.12,
          },
        },
        // Calls edge
        {
          selector: 'edge[edge_type = "Calls"]',
          style: {
            'line-color': '#0a84ff',
            'target-arrow-color': '#0a84ff',
            'width': 1.4,
            'opacity': 0.8,
          },
        },
        // Imports edge
        {
          selector: 'edge[edge_type = "Imports"]',
          style: {
            'line-color': '#636366',
            'target-arrow-color': '#636366',
            'line-style': 'dashed',
            'width': 1.1,
            'opacity': 0.6,
          },
        },
        // Inherits edge
        {
          selector: 'edge[edge_type = "Inherits"]',
          style: {
            'line-color': '#bf5af2',
            'target-arrow-color': '#bf5af2',
            'width': 1.8,
            'opacity': 0.85,
          },
        },
        // Active Selection State
        {
          selector: '.selected',
          style: {
            'border-color': '#0a84ff',
            'border-width': 2,
            'underlay-color': '#0a84ff',
            'underlay-padding': 3,
            'underlay-opacity': 0.25,
            'z-index': 999,
          },
        },
        // Blast Radius Focus States (Apple Semantic Colors)
        {
          selector: '.impact-target',
          style: {
            'border-color': '#0a84ff',
            'border-width': 2.5,
            'underlay-color': '#0a84ff',
            'underlay-padding': 4,
            'underlay-opacity': 0.3,
            'z-index': 1000,
          },
        },
        {
          selector: '.impact-direct',
          style: {
            'border-color': '#ff9f0a',
            'border-width': 2,
            'underlay-color': '#ff9f0a',
            'underlay-padding': 3,
            'underlay-opacity': 0.25,
            'z-index': 800,
          },
        },
        {
          selector: '.impact-transitive',
          style: {
            'border-color': '#ff453a',
            'border-width': 2,
            'underlay-color': '#ff453a',
            'underlay-padding': 3,
            'underlay-opacity': 0.2,
            'z-index': 700,
          },
        },
        // Explanatory Causal Path Highlight
        {
          selector: '.path-highlight',
          style: {
            'line-color': '#0a84ff',
            'target-arrow-color': '#0a84ff',
            'width': 2.5,
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
        rankSep: 65,
        nodeSep: 32,
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
          duration: 300,
          easing: 'ease-out-cubic' as any,
        });
      }
    }
  }, [selectedNodeId]);

  const handleZoomIn = useCallback(() => cyRef.current?.zoom(cyRef.current.zoom() * 1.2), []);
  const handleZoomOut = useCallback(() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8), []);
  const handleFit = useCallback(() => cyRef.current?.fit(undefined, 40), []);
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
    <div className="w-full h-full relative overflow-hidden bg-mac-canvas select-none">
      {/* Cytoscape Canvas */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Spatial Toolbar (Apple Pro Glass HUD) */}
      <div className="absolute bottom-4 left-4 flex items-center space-x-1 bg-mac-window/90 border border-mac-border backdrop-blur-md px-1.5 py-1 rounded-lg shadow-mac-popover z-10 text-xs">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 text-mac-textSecondary hover:text-mac-text hover:bg-mac-surface rounded apple-btn"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 text-mac-textSecondary hover:text-mac-text hover:bg-mac-surface rounded apple-btn"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleFit}
          title="Fit Graph to Viewport (Space)"
          className="p-1.5 text-mac-textSecondary hover:text-mac-text hover:bg-mac-surface rounded apple-btn"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleRelayout}
          title="Recalculate Layout"
          className="p-1.5 text-mac-textSecondary hover:text-mac-text hover:bg-mac-surface rounded apple-btn"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-3.5 bg-mac-border" />

        {/* Visibility Toggles */}
        <button
          onClick={() => setShowTests(!showTests)}
          className={`px-2 py-0.5 rounded text-2xs font-medium flex items-center space-x-1 apple-btn ${
            showTests ? 'bg-mac-surfaceActive text-mac-green' : 'text-mac-textTertiary hover:text-mac-text'
          }`}
        >
          {showTests ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>Tests</span>
        </button>

        <button
          onClick={() => setShowFiles(!showFiles)}
          className={`px-2 py-0.5 rounded text-2xs font-medium flex items-center space-x-1 apple-btn ${
            showFiles ? 'bg-mac-surfaceActive text-mac-blue' : 'text-mac-textTertiary hover:text-mac-text'
          }`}
        >
          {showFiles ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>Files</span>
        </button>

        <button
          onClick={() => setShowExternals(!showExternals)}
          className={`px-2 py-0.5 rounded text-2xs font-medium flex items-center space-x-1 apple-btn ${
            showExternals ? 'bg-mac-surfaceActive text-mac-text' : 'text-mac-textTertiary hover:text-mac-text'
          }`}
        >
          {showExternals ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>Externals</span>
        </button>

        <div className="w-px h-3.5 bg-mac-border" />

        {/* Legend Button */}
        <button
          onClick={() => setShowLegend(!showLegend)}
          title="Graph Legend"
          className={`p-1.5 rounded apple-btn ${
            showLegend ? 'bg-mac-surfaceActive text-mac-blue' : 'text-mac-textSecondary hover:text-mac-text'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Legend Popover */}
      {showLegend && (
        <div className="absolute bottom-14 left-4 w-60 bg-mac-window/95 border border-mac-borderStrong backdrop-blur-md p-3 rounded-lg shadow-mac-popover z-20 text-xs">
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-mac-border">
            <span className="font-semibold text-mac-text text-2xs uppercase tracking-wider">
              Symbol Legend
            </span>
            <button onClick={() => setShowLegend(false)} className="text-mac-textSecondary hover:text-mac-text">
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-1.5 text-2xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-mac-surfaceActive border border-mac-borderStrong" />
                <span className="text-mac-text">File / Module</span>
              </span>
              <span className="text-mac-textTertiary">Box</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-950/40 border border-mac-purple" />
                <span className="text-mac-text">Class</span>
              </span>
              <span className="text-mac-textTertiary">Purple</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-950/40 border border-mac-blue" />
                <span className="text-mac-text">Function / Method</span>
              </span>
              <span className="text-mac-textTertiary">Blue</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-950/40 border border-mac-green" />
                <span className="text-mac-text">Test Suite</span>
              </span>
              <span className="text-mac-textTertiary">Green</span>
            </div>
          </div>

          <div className="my-2 border-t border-mac-border" />

          <div className="space-y-1 text-2xs">
            <div className="flex items-center space-x-2 text-mac-orange">
              <span className="w-2 h-2 rounded-full bg-mac-orange" />
              <span>Direct impact</span>
            </div>
            <div className="flex items-center space-x-2 text-mac-red">
              <span className="w-2 h-2 rounded-full bg-mac-red" />
              <span>Transitive impact</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
