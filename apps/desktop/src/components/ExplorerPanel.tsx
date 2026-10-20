import React, { useState, useMemo } from 'react';
import { GraphNodeDto } from '../types';
import {
  Search,
  FileCode,
  Box,
  Code2,
  CheckSquare,
  X,
  List,
  FolderTree,
} from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('flat');

  // Filter nodes by search query and kind
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      if (filterKind !== 'ALL' && n.kind !== filterKind) return false;
      if (query.trim() === '') return true;
      const q = query.toLowerCase();
      return (
        n.label.toLowerCase().includes(q) ||
        (n.file_id && n.file_id.toLowerCase().includes(q))
      );
    });
  }, [nodes, query, filterKind]);

  // Group nodes by file if grouped view is selected
  const groupedNodes = useMemo(() => {
    if (viewMode !== 'grouped') return null;
    const groups: Record<string, GraphNodeDto[]> = {};
    for (const node of filteredNodes) {
      const fileKey = node.file_id || 'Global / External';
      if (!groups[fileKey]) groups[fileKey] = [];
      groups[fileKey].push(node);
    }
    return groups;
  }, [filteredNodes, viewMode]);

  const getNodeIcon = (kind: string) => {
    switch (kind) {
      case 'File':
        return <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      case 'Class':
        return <Box className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      case 'Function':
        return <Code2 className="w-3.5 h-3.5 text-ghost-cyan shrink-0" />;
      case 'Method':
        return <Code2 className="w-3.5 h-3.5 text-ghost-sky shrink-0" />;
      case 'Test':
        return <CheckSquare className="w-3.5 h-3.5 text-ghost-emerald shrink-0" />;
      default:
        return <Box className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden text-xs bg-canvas-900 select-none">
      {/* Search Header */}
      <div className="p-2.5 bg-canvas-850 border-b border-canvas-800 space-y-2">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter symbols, files, tests..."
            className="w-full bg-canvas-900 border border-canvas-800 text-xs text-slate-200 pl-8 pr-7 py-1 rounded focus:outline-none focus:border-cyan-500/60 font-mono transition"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Kind Filter Pills & View Mode Toggle */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center space-x-1 overflow-x-auto pb-0.5 max-w-[200px]">
            {['ALL', 'File', 'Class', 'Function', 'Method', 'Test'].map((k) => (
              <button
                key={k}
                onClick={() => setFilterKind(k)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition btn-interactive ${
                  filterKind === k
                    ? 'bg-canvas-750 text-ghost-cyan font-semibold border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-canvas-900 border border-canvas-800 rounded p-0.5">
            <button
              onClick={() => setViewMode('flat')}
              title="Flat List View"
              className={`p-1 rounded transition btn-interactive ${
                viewMode === 'flat' ? 'bg-canvas-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <List className="w-3 h-3" />
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              title="Grouped by File View"
              className={`p-1 rounded transition btn-interactive ${
                viewMode === 'grouped' ? 'bg-canvas-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <FolderTree className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Symbol List Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredNodes.length === 0 ? (
          <div className="p-4 text-center text-slate-500 italic text-[11px]">
            No symbols found matching "{query}".
          </div>
        ) : viewMode === 'flat' ? (
          filteredNodes.map((node) => {
            const isSelected = node.id === selectedNodeId;

            return (
              <div
                key={node.id}
                onClick={() => onSelectNode(node)}
                className={`p-1.5 rounded flex items-center justify-between cursor-pointer border transition btn-interactive relative ${
                  isSelected
                    ? 'bg-canvas-800 border-cyan-500/50 text-slate-100 shadow-subtle'
                    : 'bg-canvas-850/60 border-transparent hover:bg-canvas-800/70 text-slate-300'
                }`}
              >
                {isSelected && (
                  <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-ghost-cyan rounded-r" />
                )}
                <div className="flex items-center space-x-2 truncate min-w-0">
                  {getNodeIcon(node.kind)}
                  <span className="font-mono text-[11px] truncate">{node.label}</span>
                </div>
                <span className="text-[9px] uppercase px-1 py-0.2 bg-canvas-900 text-slate-500 rounded font-mono shrink-0 ml-1">
                  {node.kind}
                </span>
              </div>
            );
          })
        ) : (
          Object.entries(groupedNodes || {}).map(([file, gNodes]) => (
            <div key={file} className="mb-2">
              <div className="text-[10px] font-mono font-medium text-slate-400 px-1 py-0.5 bg-canvas-800/40 rounded flex items-center space-x-1.5 mb-1 truncate">
                <FileCode className="w-3 h-3 text-blue-400 shrink-0" />
                <span className="truncate">{file}</span>
                <span className="text-slate-500 font-normal">({gNodes.length})</span>
              </div>
              <div className="pl-2 space-y-1 border-l border-canvas-800 ml-1">
                {gNodes.map((node) => {
                  const isSelected = node.id === selectedNodeId;
                  return (
                    <div
                      key={node.id}
                      onClick={() => onSelectNode(node)}
                      className={`p-1 rounded flex items-center justify-between cursor-pointer border transition btn-interactive relative ${
                        isSelected
                          ? 'bg-canvas-800 border-cyan-500/50 text-slate-100'
                          : 'bg-canvas-850/40 border-transparent hover:bg-canvas-800/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate min-w-0">
                        {getNodeIcon(node.kind)}
                        <span className="font-mono text-[11px] truncate">{node.label}</span>
                      </div>
                      <span className="text-[8px] uppercase px-1 py-0.2 bg-canvas-900 text-slate-500 rounded font-mono shrink-0 ml-1">
                        {node.kind}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Explorer Footer Status */}
      <div className="p-2 border-t border-canvas-800 bg-canvas-850 text-2xs font-mono text-slate-400 flex items-center justify-between">
        <span>Showing {filteredNodes.length} of {nodes.length} symbols</span>
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setFilterKind('ALL');
            }}
            className="text-ghost-cyan hover:underline"
          >
            Reset filter
          </button>
        )}
      </div>
    </div>
  );
};
