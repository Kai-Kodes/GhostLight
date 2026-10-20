import React from 'react';
import { GraphEdgeDto, GraphNodeDto } from '../types';
import {
  Crosshair,
  ArrowRight,
  ArrowLeft,
  FileCode,
  Box,
} from 'lucide-react';

interface NodeDetailsProps {
  node: GraphNodeDto | null;
  edges: GraphEdgeDto[];
  onAnalyzeImpact: (node: GraphNodeDto) => void;
  onSelectNodeById: (id: string) => void;
}

export const NodeDetails: React.FC<NodeDetailsProps> = ({
  node,
  edges,
  onAnalyzeImpact,
  onSelectNodeById,
}) => {
  if (!node) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs bg-canvas-900 select-none">
        <Box className="w-10 h-10 mb-2 opacity-25" />
        <h3 className="font-semibold text-slate-300 mb-1">No Entity Selected</h3>
        <p className="text-slate-500 max-w-xs text-[11px] leading-relaxed">
          Select any file, symbol, class, or test in the graph or explorer to inspect its structural connections and calculate blast radius.
        </p>
      </div>
    );
  }

  // Incoming edges (dependents - who relies on this node)
  const incoming = edges.filter((e) => e.target === node.id);
  // Outgoing edges (dependencies - who this node relies on)
  const outgoing = edges.filter((e) => e.source === node.id);

  return (
    <div className="h-full flex flex-col p-3 space-y-3.5 overflow-y-auto text-xs bg-canvas-900 select-none">
      {/* Header Info */}
      <div className="p-3 bg-canvas-850 border border-canvas-800 rounded-lg space-y-1.5 select-text">
        <div className="flex items-center space-x-1.5">
          <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-mono font-semibold bg-canvas-800 text-slate-300 border border-canvas-750">
            {node.kind}
          </span>
          {node.is_test && (
            <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/40">
              Test Suite
            </span>
          )}
        </div>

        <h2 className="text-xs font-semibold text-slate-100 font-mono break-all leading-snug">
          {node.label}
        </h2>

        {node.file_id && (
          <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-mono pt-0.5">
            <FileCode className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="truncate">{node.file_id}</span>
          </div>
        )}

        {/* Structural Metrics */}
        <div className="pt-2 border-t border-canvas-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>In-Degree: <strong className="text-slate-200">{incoming.length}</strong></span>
          <span>Out-Degree: <strong className="text-slate-200">{outgoing.length}</strong></span>
          <span>Total Degree: <strong className="text-ghost-cyan">{incoming.length + outgoing.length}</strong></span>
        </div>
      </div>

      {/* Primary Action Button: Calculate Change Impact */}
      <button
        onClick={() => onAnalyzeImpact(node)}
        className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-canvas-950 font-semibold rounded text-xs transition shadow-subtle btn-interactive"
      >
        <Crosshair className="w-4 h-4" />
        <span>Calculate Blast Radius</span>
      </button>

      {/* Outgoing Dependencies (This node calls/imports...) */}
      <div>
        <h3 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
          <ArrowRight className="w-3.5 h-3.5 text-ghost-sky" />
          <span>Dependencies ({outgoing.length})</span>
        </h3>
        {outgoing.length === 0 ? (
          <p className="text-slate-500 italic text-[11px] p-2 bg-canvas-850/40 rounded border border-canvas-800/40">
            No outgoing dependencies (leaf node).
          </p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {outgoing.map((e, idx) => (
              <div
                key={idx}
                onClick={() => onSelectNodeById(e.target)}
                className="p-1.5 bg-canvas-850 hover:bg-canvas-800 rounded cursor-pointer border border-canvas-800 flex items-center justify-between transition btn-interactive"
              >
                <span className="font-mono text-slate-200 truncate max-w-[170px]" title={e.target}>
                  {e.target.split('::').pop() || e.target}
                </span>
                <span className="text-[9px] text-slate-400 font-mono uppercase px-1 py-0.2 bg-canvas-900 rounded">
                  {e.edge_type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incoming Dependents (Who calls/imports this node...) */}
      <div>
        <h3 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
          <ArrowLeft className="w-3.5 h-3.5 text-ghost-amber" />
          <span>Immediate Dependents ({incoming.length})</span>
        </h3>
        {incoming.length === 0 ? (
          <p className="text-slate-500 italic text-[11px] p-2 bg-canvas-850/40 rounded border border-canvas-800/40">
            No incoming dependents (root or unreferenced symbol).
          </p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {incoming.map((e, idx) => (
              <div
                key={idx}
                onClick={() => onSelectNodeById(e.source)}
                className="p-1.5 bg-canvas-850 hover:bg-canvas-800 rounded cursor-pointer border border-canvas-800 flex items-center justify-between transition btn-interactive"
              >
                <span className="font-mono text-slate-200 truncate max-w-[170px]" title={e.source}>
                  {e.source.split('::').pop() || e.source}
                </span>
                <span className="text-[9px] text-slate-400 font-mono uppercase px-1 py-0.2 bg-canvas-900 rounded">
                  {e.edge_type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
