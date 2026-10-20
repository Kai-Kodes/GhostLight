import React, { useState, useEffect, useRef } from 'react';
import { GraphNodeDto } from '../types';
import {
  Search,
  FileCode,
  Box,
  Code2,
  TestTube2,
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
      (n.file_id && n.file_id.toLowerCase().includes(q))
    );
  }).slice(0, 12);

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

  const getNodeIcon = (node: GraphNodeDto, isSelected: boolean) => {
    if (isSelected) {
      return <Code2 className="w-4 h-4 text-white shrink-0" />;
    }
    if (node.is_test || node.kind === 'Test') {
      return <TestTube2 className="w-4 h-4 text-mac-green shrink-0" />;
    }
    if (node.kind === 'Class') {
      return <Box className="w-4 h-4 text-mac-purple shrink-0" />;
    }
    if (node.kind === 'File') {
      return <FileCode className="w-4 h-4 text-mac-textSecondary shrink-0" />;
    }
    return <Code2 className="w-4 h-4 text-mac-blue shrink-0" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm select-none">
      <div className="w-full max-w-xl bg-mac-window/95 border border-mac-borderStrong rounded-xl shadow-mac-sheet overflow-hidden text-xs flex flex-col backdrop-blur-xl">
        {/* Search Input Bar */}
        <div className="p-3 border-b border-mac-border flex items-center space-x-3">
          <Search className="w-4 h-4 text-mac-textSecondary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbols, classes, files, or tests..."
            className="flex-1 bg-transparent text-sm text-mac-text focus:outline-none placeholder:text-mac-textTertiary"
          />
          <button
            onClick={onClose}
            className="text-mac-textSecondary hover:text-mac-text p-1 rounded hover:bg-mac-surface"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
          {filteredNodes.length === 0 ? (
            <div className="p-6 text-center text-mac-textTertiary text-xs">
              No matching symbols found.
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
                      ? 'bg-mac-blue text-white'
                      : 'hover:bg-mac-surface text-mac-text'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate min-w-0">
                    {getNodeIcon(node, isSelected)}
                    <div className="truncate">
                      <div className="font-mono text-xs font-medium truncate">
                        {node.label}
                      </div>
                      <div
                        className={`text-2xs truncate ${
                          isSelected ? 'text-blue-100' : 'text-mac-textTertiary font-mono'
                        }`}
                      >
                        {node.file_id || 'Root'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-2">
                    <span
                      className={`text-2xs font-mono px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-mac-surfaceActive text-mac-textSecondary border border-mac-border'
                      }`}
                    >
                      {node.kind}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="p-2 border-t border-mac-border bg-mac-canvas flex items-center justify-between text-2xs text-mac-textTertiary font-mono">
          <span>Navigate with <kbd className="px-1 py-0.2 bg-mac-surfaceActive rounded text-mac-textSecondary">↑</kbd> <kbd className="px-1 py-0.2 bg-mac-surfaceActive rounded text-mac-textSecondary">↓</kbd></span>
          <span>Open with <kbd className="px-1 py-0.2 bg-mac-surfaceActive rounded text-mac-textSecondary">↵</kbd></span>
        </div>
      </div>
    </div>
  );
};
