import React, { useState, useMemo } from 'react';
import {
  Search,
  FileCode,
  Box,
  Code2,
  TestTube2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { GraphEdgeDto, GraphNodeDto } from '../types';

interface NavigatorSidebarProps {
  nodes: GraphNodeDto[];
  edges: GraphEdgeDto[];
  selectedNodeId: string | null;
  onSelectNode: (node: GraphNodeDto) => void;
  impactTargetId?: string | null;
  affectedNodeIds?: Set<string>;
}

export const NavigatorSidebar: React.FC<NavigatorSidebarProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  impactTargetId,
  affectedNodeIds = new Set(),
}) => {
  const [filterText, setFilterText] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'hubs' | 'tests'>('all');
  const [filesExpanded, setFilesExpanded] = useState(true);
  const [symbolsExpanded, setSymbolsExpanded] = useState(true);
  const [testsExpanded, setTestsExpanded] = useState(true);

  // In-degree & Out-degree calculation for hub identification
  const inDegreeMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const node of nodes) {
      map.set(node.id, 0);
    }
    for (const edge of edges) {
      map.set(edge.target, (map.get(edge.target) || 0) + 1);
    }
    return map;
  }, [nodes, edges]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      // Text match
      if (filterText) {
        const query = filterText.toLowerCase();
        const matchesLabel = node.label.toLowerCase().includes(query);
        const matchesFile = node.file_id?.toLowerCase().includes(query);
        if (!matchesLabel && !matchesFile) return false;
      }

      // Scope match
      if (scopeFilter === 'tests') {
        return node.is_test || node.kind === 'Test';
      }
      if (scopeFilter === 'hubs') {
        return (inDegreeMap.get(node.id) || 0) >= 2;
      }
      return true;
    });
  }, [nodes, filterText, scopeFilter, inDegreeMap]);

  // Group by category
  const fileNodes = useMemo(() => {
    return filteredNodes.filter((n) => n.kind === 'File');
  }, [filteredNodes]);

  const testNodes = useMemo(() => {
    return filteredNodes.filter((n) => n.is_test || n.kind === 'Test');
  }, [filteredNodes]);

  const symbolNodes = useMemo(() => {
    return filteredNodes.filter((n) => n.kind !== 'File' && !n.is_test && n.kind !== 'Test');
  }, [filteredNodes]);

  const getNodeIcon = (node: GraphNodeDto) => {
    if (node.is_test || node.kind === 'Test') {
      return <TestTube2 className="w-3.5 h-3.5 text-mac-green shrink-0" />;
    }
    if (node.kind === 'Class') {
      return <Box className="w-3.5 h-3.5 text-mac-purple shrink-0" />;
    }
    if (node.kind === 'File') {
      return <FileCode className="w-3.5 h-3.5 text-mac-textSecondary shrink-0" />;
    }
    return <Code2 className="w-3.5 h-3.5 text-mac-blue shrink-0" />;
  };

  return (
    <aside className="w-64 h-full bg-mac-sidebar border-r border-mac-border flex flex-col select-none overflow-hidden shrink-0">
      {/* Top Filter & Search */}
      <div className="p-2.5 border-b border-mac-border space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-mac-textTertiary absolute left-2 top-2 pointer-events-none" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter symbols..."
            className="w-full bg-mac-canvas border border-mac-border rounded-md pl-7 pr-2 py-1 text-xs text-mac-text placeholder-mac-textTertiary focus:outline-none focus:border-mac-blue"
          />
        </div>

        {/* Scope Filter Segmented Control */}
        <div className="grid grid-cols-3 bg-mac-canvas p-0.5 rounded-md border border-mac-border text-2xs">
          <button
            onClick={() => setScopeFilter('all')}
            className={`py-0.5 rounded font-medium apple-btn ${
              scopeFilter === 'all'
                ? 'bg-mac-surfaceActive text-mac-text shadow-mac-button'
                : 'text-mac-textSecondary hover:text-mac-text'
            }`}
          >
            All ({nodes.length})
          </button>
          <button
            onClick={() => setScopeFilter('hubs')}
            className={`py-0.5 rounded font-medium apple-btn ${
              scopeFilter === 'hubs'
                ? 'bg-mac-surfaceActive text-mac-text shadow-mac-button'
                : 'text-mac-textSecondary hover:text-mac-text'
            }`}
          >
            Hubs
          </button>
          <button
            onClick={() => setScopeFilter('tests')}
            className={`py-0.5 rounded font-medium apple-btn ${
              scopeFilter === 'tests'
                ? 'bg-mac-surfaceActive text-mac-text shadow-mac-button'
                : 'text-mac-textSecondary hover:text-mac-text'
            }`}
          >
            Tests
          </button>
        </div>
      </div>

      {/* Hierarchical Source List */}
      <div className="flex-1 overflow-y-auto px-1.5 py-2 space-y-3 text-xs">
        {/* Source Files Section */}
        {fileNodes.length > 0 && (
          <div>
            <button
              onClick={() => setFilesExpanded(!filesExpanded)}
              className="w-full flex items-center justify-between px-2 py-1 text-2xs font-semibold text-mac-textSecondary uppercase tracking-wider hover:text-mac-text"
            >
              <div className="flex items-center space-x-1">
                {filesExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <span>Files</span>
              </div>
              <span className="text-mac-textTertiary font-mono">{fileNodes.length}</span>
            </button>

            {filesExpanded && (
              <div className="mt-0.5 space-y-0.5">
                {fileNodes.map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  const isTarget = impactTargetId === node.id;
                  const isAffected = affectedNodeIds.has(node.id);

                  return (
                    <button
                      key={node.id}
                      onClick={() => onSelectNode(node)}
                      className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-left transition ${
                        isSelected
                          ? 'bg-mac-blue text-white font-medium'
                          : 'text-mac-text hover:bg-mac-surface'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {getNodeIcon(node)}
                        <span className="truncate">{node.label}</span>
                      </div>
                      {isTarget && (
                        <span className="w-1.5 h-1.5 rounded-full bg-mac-orange shrink-0" />
                      )}
                      {!isTarget && isAffected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-mac-red shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Classes & Functions Section */}
        {symbolNodes.length > 0 && (
          <div>
            <button
              onClick={() => setSymbolsExpanded(!symbolsExpanded)}
              className="w-full flex items-center justify-between px-2 py-1 text-2xs font-semibold text-mac-textSecondary uppercase tracking-wider hover:text-mac-text"
            >
              <div className="flex items-center space-x-1">
                {symbolsExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <span>Symbols & Classes</span>
              </div>
              <span className="text-mac-textTertiary font-mono">{symbolNodes.length}</span>
            </button>

            {symbolsExpanded && (
              <div className="mt-0.5 space-y-0.5">
                {symbolNodes.map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  const isTarget = impactTargetId === node.id;
                  const isAffected = affectedNodeIds.has(node.id);
                  const inDeg = inDegreeMap.get(node.id) || 0;

                  return (
                    <button
                      key={node.id}
                      onClick={() => onSelectNode(node)}
                      className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-left transition ${
                        isSelected
                          ? 'bg-mac-blue text-white font-medium'
                          : 'text-mac-text hover:bg-mac-surface'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {getNodeIcon(node)}
                        <span className="truncate">{node.label}</span>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0 ml-1">
                        {inDeg > 0 && (
                          <span
                            className={`text-2xs font-mono px-1 rounded ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'text-mac-textTertiary bg-mac-canvas'
                            }`}
                          >
                            {inDeg}
                          </span>
                        )}
                        {isTarget && (
                          <span className="w-1.5 h-1.5 rounded-full bg-mac-orange" />
                        )}
                        {!isTarget && isAffected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-mac-red" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Test Suites Section */}
        {testNodes.length > 0 && (
          <div>
            <button
              onClick={() => setTestsExpanded(!testsExpanded)}
              className="w-full flex items-center justify-between px-2 py-1 text-2xs font-semibold text-mac-textSecondary uppercase tracking-wider hover:text-mac-text"
            >
              <div className="flex items-center space-x-1">
                {testsExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <span>Test Suites</span>
              </div>
              <span className="text-mac-textTertiary font-mono">{testNodes.length}</span>
            </button>

            {testsExpanded && (
              <div className="mt-0.5 space-y-0.5">
                {testNodes.map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  const isTarget = impactTargetId === node.id;
                  const isAffected = affectedNodeIds.has(node.id);

                  return (
                    <button
                      key={node.id}
                      onClick={() => onSelectNode(node)}
                      className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-left transition ${
                        isSelected
                          ? 'bg-mac-blue text-white font-medium'
                          : 'text-mac-text hover:bg-mac-surface'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {getNodeIcon(node)}
                        <span className="truncate">{node.label}</span>
                      </div>
                      {isTarget && (
                        <span className="w-1.5 h-1.5 rounded-full bg-mac-orange shrink-0" />
                      )}
                      {!isTarget && isAffected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-mac-red shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {filteredNodes.length === 0 && (
          <div className="px-3 py-6 text-center text-mac-textTertiary text-2xs">
            No matching symbols found.
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t border-mac-border flex items-center justify-between text-2xs font-mono text-mac-textTertiary">
        <span>{filteredNodes.length} visible</span>
        <span>{nodes.length} total</span>
      </div>
    </aside>
  );
};
