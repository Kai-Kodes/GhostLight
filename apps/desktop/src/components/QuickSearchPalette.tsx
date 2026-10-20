import React, { useState, useEffect, useRef } from 'react';
import { GraphNodeDto } from '../types';
import {
  Search,
  FileCode,
  Box,
  Code2,
  CheckSquare,
  ArrowRight,
  X,
} from 'lucide-react';

interface QuickSearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: GraphNodeDto[];
  onSelectNode: (node: GraphNodeDto) => void;
}

export const QuickSearchPalette: React.FC<QuickSearchPaletteProps> = ({
  isOpen,
  onClose,
  nodes,
  onSelectNode,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredNodes = nodes.filter((n) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      n.label.toLowerCase().includes(q) ||
      (n.file_id && n.file_id.toLowerCase().includes(q)) ||
      n.kind.toLowerCase().includes(q)
    );
  }).slice(0, 15);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredNodes.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredNodes.length) % (filteredNodes.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredNodes[selectedIndex]) {
          onSelectNode(filteredNodes[selectedIndex]);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredNodes, selectedIndex, onSelectNode, onClose]);

  if (!isOpen) return null;

  const getNodeIcon = (kind: string) => {
    switch (kind) {
      case 'File':
        return <FileCode className="w-3.5 h-3.5 text-blue-400" />;
      case 'Class':
        return <Box className="w-3.5 h-3.5 text-purple-400" />;
      case 'Function':
        return <Code2 className="w-3.5 h-3.5 text-signal-cyan" />;
      case 'Method':
        return <Code2 className="w-3.5 h-3.5 text-sky-400" />;
      case 'Test':
        return <CheckSquare className="w-3.5 h-3.5 text-signal-emerald" />;
      default:
        return <Box className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/75 backdrop-blur-sm select-none">
      <div className="w-full max-w-xl bg-obsidian-900 border border-obsidian-750 rounded-xl shadow-modal overflow-hidden text-xs flex flex-col">
        {/* Search Input Bar */}
        <div className="p-3 border-b border-obsidian-800 flex items-center space-x-2.5">
          <Search className="w-4 h-4 text-signal-cyan shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code architecture, classes, functions, files, or tests..."
            className="flex-1 bg-transparent text-sm text-slate-100 focus:outline-none font-mono placeholder:font-sans placeholder:text-slate-500"
          />
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-obsidian-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
          {filteredNodes.length === 0 ? (
            <div className="p-6 text-center text-slate-500 italic">
              No matching architectural symbols found.
            </div>
          ) : (
            filteredNodes.map((node, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={node.id}
                  onClick={() => {
                    onSelectNode(node);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition ${
                    isSelected
                      ? 'bg-obsidian-800 text-slate-100 border border-signal-cyan/30'
                      : 'hover:bg-obsidian-850 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate min-w-0">
                    {getNodeIcon(node.kind)}
                    <div className="truncate">
                      <div className="font-mono text-xs font-medium text-slate-200 truncate">
                        {node.label}
                      </div>
                      <div className="text-2xs text-slate-500 font-mono truncate">
                        {node.file_id || 'Root Scope'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-2">
                    <span className="text-2xs uppercase font-mono px-1.5 py-0.5 rounded bg-obsidian-950 text-slate-400 border border-obsidian-800">
                      {node.kind}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-signal-cyan" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="p-2 border-t border-obsidian-800 bg-obsidian-950 flex items-center justify-between text-2xs text-slate-500 font-mono">
          <span>Navigate with <kbd className="px-1 py-0.2 bg-obsidian-800 rounded">↑</kbd> <kbd className="px-1 py-0.2 bg-obsidian-800 rounded">↓</kbd></span>
          <span>Select with <kbd className="px-1 py-0.2 bg-obsidian-800 rounded">↵ Enter</kbd></span>
        </div>
      </div>
    </div>
  );
};
