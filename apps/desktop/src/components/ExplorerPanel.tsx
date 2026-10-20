import React, { useState } from 'react';
import { GraphNodeDto } from '../types';
import { Search, File, Code2, Box, CheckSquare } from 'lucide-react';

interface ExplorerPanelProps {
  nodes: GraphNodeDto[];
  selectedNodeId: string | null;
  onSelectNode: (node: GraphNodeDto) => void;
}

export const ExplorerPanel: React.FC<ExplorerPanelProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
}) => {
  const [query, setQuery] = useState('');
  const [filterKind, setFilterKind] = useState<string>('ALL');

  const filteredNodes = nodes.filter((n) => {
    if (filterKind !== 'ALL' && n.kind !== filterKind) return false;
    if (query.trim() === '') return true;
    const q = query.toLowerCase();
    return (
      n.label.toLowerCase().includes(q) ||
      (n.file_id && n.file_id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="h-full flex flex-col overflow-hidden text-xs">
      {/* Search Input */}
      <div className="p-3 bg-canvas-900 border-b border-slate-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbols, files, tests..."
            className="w-full bg-canvas-850 border border-slate-800 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-md focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* Kind Filters */}
        <div className="flex items-center space-x-1 mt-2 overflow-x-auto pb-0.5">
          {['ALL', 'File', 'Class', 'Function', 'Method', 'Test'].map((k) => (
            <button
              key={k}
              onClick={() => setFilterKind(k)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
                filterKind === k
                  ? 'bg-slate-800 text-cyan-400 font-medium'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredNodes.length === 0 ? (
          <p className="text-slate-500 italic p-3 text-center">No symbols found matching "{query}"</p>
        ) : (
          filteredNodes.map((node) => {
            const isSelected = node.id === selectedNodeId;

            return (
              <div
                key={node.id}
                onClick={() => onSelectNode(node)}
                className={`p-1.5 rounded flex items-center justify-between cursor-pointer border transition ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-700/80 text-cyan-200'
                    : 'bg-canvas-850/60 border-transparent hover:bg-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {node.kind === 'File' && <File className="w-3 h-3 text-blue-400" />}
                    {node.kind === 'Class' && <Box className="w-3 h-3 text-purple-400" />}
                    {node.kind === 'Function' && <Code2 className="w-3 h-3 text-cyan-400" />}
                    {node.kind === 'Method' && <Code2 className="w-3 h-3 text-sky-400" />}
                    {node.kind === 'Test' && <CheckSquare className="w-3 h-3 text-emerald-400" />}
                  </span>
                  <span className="font-mono text-[11px] truncate">{node.label}</span>
                </div>
                <span className="text-[9px] uppercase px-1 py-0.2 bg-canvas-900 text-slate-500 rounded font-mono">
                  {node.kind}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
