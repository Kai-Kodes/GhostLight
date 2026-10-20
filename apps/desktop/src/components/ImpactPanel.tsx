import React, { useState } from 'react';
import { ExplanatoryPath, ImpactReport } from '../types';
import {
  Crosshair,
  X,
  ChevronRight,
  ChevronDown,
  Share2,
} from 'lucide-react';

interface ImpactPanelProps {
  impactReport: ImpactReport | null;
  onClearImpact: () => void;
  onSelectExplanatoryPath: (path: ExplanatoryPath | null) => void;
  activePath: ExplanatoryPath | null;
  onSelectNodeById: (id: string) => void;
}

export const ImpactPanel: React.FC<ImpactPanelProps> = ({
  impactReport,
  onClearImpact,
  onSelectExplanatoryPath,
  activePath,
  onSelectNodeById,
}) => {
  const [filterType, setFilterType] = useState<'All' | 'Direct' | 'Transitive'>('All');
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);

  if (!impactReport) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs bg-canvas-900 select-none">
        <Crosshair className="w-10 h-10 mb-2 opacity-25 text-ghost-amber" />
        <h3 className="font-semibold text-slate-300 mb-1">No Active Blast Radius</h3>
        <p className="text-slate-500 max-w-xs text-[11px] leading-relaxed">
          Select any symbol, class, or file in the Codebase Explorer or Graph View and click <span className="text-slate-300 font-mono">Calculate Impact</span> to map its propagation blast radius.
        </p>
      </div>
    );
  }

  const filteredNodes = impactReport.affected_nodes.filter((n) => {
    if (filterType === 'Direct') return n.impact_type === 'Direct';
    if (filterType === 'Transitive') return n.impact_type === 'Transitive';
    return true;
  });

  const toggleExpand = (nodeId: string, path?: ExplanatoryPath) => {
    if (expandedNodeId === nodeId) {
      setExpandedNodeId(null);
      onSelectExplanatoryPath(null);
    } else {
      setExpandedNodeId(nodeId);
      if (path) {
        onSelectExplanatoryPath(path);
      }
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden text-xs bg-canvas-900 select-none">
      {/* Header */}
      <div className="p-3 bg-canvas-850 border-b border-canvas-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-ghost-amber animate-pulse" />
            <span className="text-2xs uppercase font-mono font-bold text-ghost-amber tracking-wider">
              Blast Radius Analysis
            </span>
          </div>

          <button
            onClick={onClearImpact}
            className="p-1 text-slate-400 hover:text-slate-100 hover:bg-canvas-800 rounded transition btn-interactive"
            title="Clear active blast radius"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-1.5">
          <span className="text-[10px] text-slate-500 font-mono block">ORIGIN TARGET:</span>
          <div
            onClick={() => onSelectNodeById(impactReport.target_id)}
            className="font-mono text-xs font-semibold text-ghost-cyan truncate cursor-pointer hover:underline"
            title={impactReport.target_id}
          >
            {impactReport.target_name}
          </div>
        </div>

        {/* Severity Metrics Bar */}
        <div className="grid grid-cols-3 gap-1.5 mt-2.5 font-mono text-[10px]">
          <div className="p-1.5 bg-canvas-900 border border-canvas-800 rounded text-center">
            <span className="text-slate-400 block text-[9px]">TOTAL</span>
            <span className="font-semibold text-slate-100 text-xs">
              {impactReport.total_affected}
            </span>
          </div>
          <div className="p-1.5 bg-amber-950/20 border border-amber-900/40 rounded text-center">
            <span className="text-amber-400 block text-[9px]">DIRECT</span>
            <span className="font-semibold text-amber-300 text-xs">
              {impactReport.direct_count}
            </span>
          </div>
          <div className="p-1.5 bg-rose-950/20 border border-rose-900/40 rounded text-center">
            <span className="text-rose-400 block text-[9px]">TRANSITIVE</span>
            <span className="font-semibold text-rose-300 text-xs">
              {impactReport.transitive_count}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-canvas-800 bg-canvas-900 px-2 py-1 space-x-1">
        {(['All', 'Direct', 'Transitive'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterType(tab)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition btn-interactive ${
              filterType === tab
                ? 'bg-canvas-800 text-slate-100 font-medium border border-canvas-750'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}{' '}
            <span className="text-[10px] opacity-75">
              ({tab === 'All' ? impactReport.total_affected : tab === 'Direct' ? impactReport.direct_count : impactReport.transitive_count})
            </span>
          </button>
        ))}
      </div>

      {/* Affected Entities List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredNodes.length === 0 ? (
          <p className="text-slate-500 italic p-3 text-center">No affected entities in this category.</p>
        ) : (
          filteredNodes.map((aff) => {
            const isExpanded = expandedNodeId === aff.node_id;
            const isPathActive = activePath?.source === aff.node_id;

            return (
              <div
                key={aff.node_id}
                className={`rounded border transition select-text ${
                  aff.impact_type === 'Direct'
                    ? 'bg-amber-950/15 border-amber-900/40'
                    : 'bg-rose-950/15 border-rose-900/40'
                } ${isPathActive ? 'ring-1 ring-ghost-cyan' : ''}`}
              >
                {/* Node Summary Row */}
                <div className="p-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate min-w-0">
                    <button
                      onClick={() => toggleExpand(aff.node_id, aff.explanatory_path)}
                      className="text-slate-400 hover:text-white"
                      title="Toggle propagation path"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-ghost-cyan" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <div className="truncate">
                      <div
                        onClick={() => onSelectNodeById(aff.node_id)}
                        className="font-mono text-[11px] font-medium text-slate-100 truncate cursor-pointer hover:underline"
                        title={aff.node_id}
                      >
                        {aff.name}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono truncate">
                        {aff.file_id || 'Root Scope'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                    <span
                      className={`text-[9px] font-mono font-semibold px-1 py-0.2 rounded uppercase ${
                        aff.impact_type === 'Direct'
                          ? 'bg-amber-900/50 text-amber-300'
                          : 'bg-rose-900/50 text-rose-300'
                      }`}
                    >
                      {aff.impact_type}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 px-1 py-0.2 bg-canvas-850 rounded">
                      {aff.distance} hop{aff.distance === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {/* Explanatory Propagation Path Details */}
                {isExpanded && aff.explanatory_path && (
                  <div className="px-3 pb-2.5 pt-1 border-t border-canvas-800/80 bg-canvas-950/50 text-[10px] font-mono space-y-1.5">
                    <div className="flex items-center justify-between text-slate-400 text-[9px] uppercase tracking-wider">
                      <span>Causal Chain ({aff.explanatory_path.hop_count} hops)</span>
                      <button
                        onClick={() => onSelectExplanatoryPath(aff.explanatory_path || null)}
                        className="text-ghost-cyan hover:underline flex items-center space-x-0.5"
                      >
                        <Share2 className="w-2.5 h-2.5 mr-0.5" />
                        <span>Illuminate Graph</span>
                      </button>
                    </div>

                    <div className="space-y-1">
                      {aff.explanatory_path.steps.map((step, sIdx) => {
                        const fromLabel = step.from.split('::').pop() || step.from;
                        const toLabel = step.to.split('::').pop() || step.to;

                        return (
                          <div
                            key={sIdx}
                            className="p-1 bg-canvas-900 border border-canvas-800 rounded flex items-center justify-between text-slate-300"
                          >
                            <span
                              onClick={() => onSelectNodeById(step.from)}
                              className="text-slate-200 hover:text-cyan-400 cursor-pointer truncate max-w-[90px]"
                              title={step.from}
                            >
                              {fromLabel}
                            </span>
                            <span className="text-[9px] text-ghost-cyan px-1 bg-cyan-950/60 rounded uppercase font-semibold">
                              {step.edge.edge_type}
                            </span>
                            <span
                              onClick={() => onSelectNodeById(step.to)}
                              className="text-slate-200 hover:text-cyan-400 cursor-pointer truncate max-w-[90px]"
                              title={step.to}
                            >
                              {toLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
