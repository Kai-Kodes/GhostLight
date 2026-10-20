import React from 'react';
import { GraphEdgeDto, GraphNodeDto } from '../types';
import { Box, PlayCircle, ArrowRight, ArrowLeft } from 'lucide-react';

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
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500">
        <Box className="w-10 h-10 mb-2 opacity-30" />
        <p className="text-xs">Select a file, symbol, or test in the graph to inspect structure and analyze impact.</p>
      </div>
    );
  }

  // Incoming edges (dependents)
  const incoming = edges.filter((e) => e.target === node.id);
  // Outgoing edges (dependencies)
  const outgoing = edges.filter((e) => e.source === node.id);

  return (
    <div className="h-full flex flex-col p-4 space-y-4 overflow-y-auto text-xs">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-slate-400 mb-1">
          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-slate-800 text-slate-300">
            {node.kind}
          </span>
          {node.is_test && (
            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/40">
              Test
            </span>
          )}
        </div>
        <h2 className="text-sm font-semibold text-slate-100 font-mono break-all">
          {node.label}
        </h2>
        {node.file_id && (
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
            {node.file_id}
          </p>
        )}
      </div>

      {/* Action Button: Calculate Impact */}
      <button
        onClick={() => onAnalyzeImpact(node)}
        className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white rounded-md font-medium text-xs shadow-md shadow-cyan-600/20 transition"
      >
        <PlayCircle className="w-4 h-4" />
        <span>Calculate Change Impact</span>
      </button>

      {/* Outgoing Dependencies (This node calls/imports...) */}
      <div>
        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1">
          <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
          <span>Dependencies ({outgoing.length})</span>
        </h3>
        {outgoing.length === 0 ? (
          <p className="text-slate-500 italic">No outgoing dependencies</p>
        ) : (
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {outgoing.map((e, idx) => (
              <div
                key={idx}
                onClick={() => onSelectNodeById(e.target)}
                className="p-1.5 bg-canvas-850 hover:bg-slate-800 rounded cursor-pointer border border-slate-800/80 flex items-center justify-between"
              >
                <span className="font-mono text-slate-300 truncate max-w-[160px]">
                  {e.target.split('::').pop() || e.target}
                </span>
                <span className="text-[10px] text-slate-500 uppercase">{e.edge_type}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incoming Dependents (What depends on this node...) */}
      <div>
        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1">
          <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
          <span>Direct Dependents ({incoming.length})</span>
        </h3>
        {incoming.length === 0 ? (
          <p className="text-slate-500 italic">No incoming dependents (root or orphan)</p>
        ) : (
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {incoming.map((e, idx) => (
              <div
                key={idx}
                onClick={() => onSelectNodeById(e.source)}
                className="p-1.5 bg-canvas-850 hover:bg-slate-800 rounded cursor-pointer border border-slate-800/80 flex items-center justify-between"
              >
                <span className="font-mono text-slate-300 truncate max-w-[160px]">
                  {e.source.split('::').pop() || e.source}
                </span>
                <span className="text-[10px] text-slate-500 uppercase">{e.edge_type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
