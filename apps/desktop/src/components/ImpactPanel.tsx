import React, { useState } from 'react';
import { ExplanatoryPath, ImpactReport } from '../types';
import { ArrowUpRight, GitCommit, X } from 'lucide-react';

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

  if (!impactReport) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs">
        <GitCommit className="w-10 h-10 mb-2 opacity-30 text-cyan-400" />
        <p>No active change-impact calculation.</p>
        <p className="mt-1 text-[11px] text-slate-600">Select any node in the graph and click "Calculate Change Impact".</p>
      </div>
    );
  }

  const filteredNodes = impactReport.affected_nodes.filter((n) => {
    if (filterType === 'Direct') return n.impact_type === 'Direct';
    if (filterType === 'Transitive') return n.impact_type === 'Transitive';
    return true;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden text-xs">
      {/* Header */}
      <div className="p-3 bg-canvas-900 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase font-mono font-bold text-cyan-400">
              Blast Radius
            </span>
            <span className="px-1.5 py-0.2 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded text-[10px] font-mono">
              {impactReport.total_affected} entities
            </span>
          </div>
          <h2 className="text-xs font-semibold text-slate-200 font-mono mt-0.5 truncate max-w-[220px]">
            Target: {impactReport.target_name}
          </h2>
        </div>
        <button
          onClick={onClearImpact}
          className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
          title="Clear Impact"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-800 bg-canvas-850 px-2 py-1.5 space-x-1">
        {(['All', 'Direct', 'Transitive'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterType(tab)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
              filterType === tab
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}{' '}
            <span className="text-[10px] opacity-75 font-mono">
              ({tab === 'All' ? impactReport.total_affected : tab === 'Direct' ? impactReport.direct_count : impactReport.transitive_count})
            </span>
          </button>
        ))}
      </div>

      {/* Affected Entities List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredNodes.length === 0 ? (
          <p className="text-slate-500 italic p-2">No matching affected entities.</p>
        ) : (
          filteredNodes.map((aff, idx) => {
            const isPathActive = activePath?.source === aff.node_id;

            return (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border transition ${
                  aff.impact_type === 'Direct'
                    ? 'bg-amber-950/20 border-amber-900/40 hover:border-amber-700/60'
                    : 'bg-rose-950/20 border-rose-900/40 hover:border-rose-700/60'
                } ${isPathActive ? 'ring-2 ring-cyan-400' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    onClick={() => onSelectNodeById(aff.node_id)}
                    className="font-mono font-medium text-slate-200 hover:text-cyan-400 cursor-pointer truncate max-w-[180px]"
                  >
                    {aff.name}
                  </span>
                  <span
                    className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-semibold ${
                      aff.impact_type === 'Direct'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                        : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                    }`}
                  >
                    {aff.impact_type} (dist: {aff.distance})
                  </span>
                </div>

                {aff.file_id && (
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    {aff.file_id}
                  </p>
                )}

                {/* Explanatory Path Action */}
                {aff.explanatory_path && (
                  <button
                    onClick={() =>
                      onSelectExplanatoryPath(isPathActive ? null : aff.explanatory_path!)
                    }
                    className="mt-2 text-[10px] flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-medium transition"
                  >
                    <ArrowUpRight className="w-3 h-3" />
                    <span>
                      {isPathActive ? 'Hide Path' : `Explain Path (${aff.explanatory_path.hop_count} hops)`}
                    </span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
