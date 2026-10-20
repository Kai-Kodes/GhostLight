import React, { useState, useEffect } from 'react';
import { GraphExportDto, ImpactReport, ScanResult } from '../types';
import { X, Copy, Download, Check, FileText, Code2 } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanResult: ScanResult | null;
  graph: GraphExportDto | null;
  impactReport: ImpactReport | null;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  scanResult,
  graph,
  impactReport,
}) => {
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<'markdown' | 'json'>('markdown');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Generate Report Content
  const jsonReport = JSON.stringify(
    {
      schema_version: '1.0.0',
      timestamp: new Date().toISOString(),
      repository: scanResult?.repository || 'unknown',
      fingerprint: scanResult?.fingerprint || 'unknown',
      metrics: {
        file_count: scanResult?.file_count || 0,
        total_nodes: graph?.node_count || 0,
        total_edges: graph?.edge_count || 0,
      },
      impact: impactReport,
    },
    null,
    2
  );

  let mdReport = `# GHOSTLIGHT Codebase Intelligence & Impact Report\n\n`;
  mdReport += `> Generated on ${new Date().toISOString()} via GHOSTLIGHT local engine.\n\n`;
  mdReport += `## Metadata\n\n`;
  mdReport += `- **Schema Version:** 1.0.0\n`;
  mdReport += `- **Repository:** \`${scanResult?.repository || 'unknown'}\`\n`;
  mdReport += `- **Fingerprint (SHA-256):** \`${scanResult?.fingerprint || 'unknown'}\`\n`;
  mdReport += `- **Analyzed Files:** ${scanResult?.file_count || 0}\n`;
  mdReport += `- **Graph Nodes:** ${graph?.node_count || 0}\n`;
  mdReport += `- **Graph Edges:** ${graph?.edge_count || 0}\n\n`;

  if (impactReport) {
    mdReport += `## Change Impact Analysis: \`${impactReport.target_name}\`\n\n`;
    mdReport += `- **Direct Dependents:** ${impactReport.direct_count}\n`;
    mdReport += `- **Transitive Dependents:** ${impactReport.transitive_count}\n`;
    mdReport += `- **Total Affected Entities:** ${impactReport.total_affected}\n`;
    mdReport += `- **Candidate Tests Identified:** ${impactReport.candidate_tests.length}\n\n`;

    if (impactReport.affected_nodes.length > 0) {
      mdReport += `### Affected Entities\n\n`;
      mdReport += `| Entity | Kind | Impact Type | Distance |\n`;
      mdReport += `| :--- | :--- | :--- | :--- |\n`;
      for (const aff of impactReport.affected_nodes) {
        mdReport += `| \`${aff.name}\` | ${aff.kind} | ${aff.impact_type} | ${aff.distance} hop(s) |\n`;
      }
      mdReport += `\n`;
    }

    if (impactReport.candidate_tests.length > 0) {
      mdReport += `### Candidate Test Selection\n\n`;
      mdReport += `| Test Symbol | File Path | Selection Rationale |\n`;
      mdReport += `| :--- | :--- | :--- |\n`;
      for (const t of impactReport.candidate_tests) {
        mdReport += `| \`${t.symbol_name}\` | \`${t.file_id}\` | \`${t.reason}\` |\n`;
      }
      mdReport += `\n`;
    }
  }

  const content = format === 'markdown' ? mdReport : jsonReport;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], {
      type: format === 'markdown' ? 'text/markdown' : 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ghostlight-report.${format === 'markdown' ? 'md' : 'json'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-3xl bg-canvas-900 border border-canvas-800 rounded-xl shadow-elevated flex flex-col max-h-[85vh] overflow-hidden text-xs">
        {/* Header */}
        <div className="p-3.5 bg-canvas-850 border-b border-canvas-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-semibold text-slate-100 font-mono tracking-tight">
              Export Analysis Report
            </h3>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-canvas-800 text-ghost-cyan border border-cyan-500/20 rounded">
              v1.0.0
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Format Toggle */}
            <div className="flex items-center bg-canvas-900 border border-canvas-800 rounded p-0.5">
              <button
                onClick={() => setFormat('markdown')}
                className={`px-2 py-0.5 rounded font-mono text-[10px] flex items-center space-x-1 transition btn-interactive ${
                  format === 'markdown'
                    ? 'bg-canvas-800 text-slate-100 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3 h-3 text-ghost-sky" />
                <span>Markdown</span>
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`px-2 py-0.5 rounded font-mono text-[10px] flex items-center space-x-1 transition btn-interactive ${
                  format === 'json'
                    ? 'bg-canvas-800 text-slate-100 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3 h-3 text-ghost-cyan" />
                <span>JSON</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-canvas-800 transition btn-interactive"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 p-3 overflow-hidden bg-canvas-950 flex flex-col">
          <div className="flex-1 bg-canvas-900 border border-canvas-800 rounded p-3 font-mono text-[10px] text-slate-300 overflow-y-auto whitespace-pre-wrap select-text leading-relaxed">
            {content}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-3 border-t border-canvas-800 bg-canvas-850 flex items-center justify-between">
          <span className="text-2xs font-mono text-slate-500">
            Exportable static analysis and evidence summary.
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1 bg-canvas-800 hover:bg-canvas-750 border border-canvas-700 text-slate-200 rounded font-mono text-[11px] flex items-center space-x-1.5 transition btn-interactive"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Report'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-canvas-950 font-semibold rounded font-mono text-[11px] flex items-center space-x-1.5 transition btn-interactive"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .{format === 'markdown' ? 'md' : 'json'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
