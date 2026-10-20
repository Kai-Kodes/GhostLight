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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-3xl bg-mac-window border border-mac-borderStrong rounded-xl shadow-mac-sheet flex flex-col max-h-[85vh] overflow-hidden text-xs">
        {/* Header */}
        <div className="p-3 bg-mac-window border-b border-mac-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-semibold text-mac-text tracking-tight">
              Export Analysis Report
            </h3>
            <span className="text-2xs font-mono px-1.5 py-0.5 bg-mac-surfaceActive text-mac-blue border border-mac-border rounded">
              v1.0.0
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Format Segmented Control */}
            <div className="flex items-center bg-mac-canvas border border-mac-border rounded p-0.5 text-2xs">
              <button
                onClick={() => setFormat('markdown')}
                className={`px-2 py-0.5 rounded font-medium flex items-center space-x-1 apple-btn ${
                  format === 'markdown'
                    ? 'bg-mac-surfaceActive text-mac-text shadow-mac-button'
                    : 'text-mac-textSecondary hover:text-mac-text'
                }`}
              >
                <FileText className="w-3 h-3 text-mac-blue" />
                <span>Markdown</span>
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`px-2 py-0.5 rounded font-medium flex items-center space-x-1 apple-btn ${
                  format === 'json'
                    ? 'bg-mac-surfaceActive text-mac-text shadow-mac-button'
                    : 'text-mac-textSecondary hover:text-mac-text'
                }`}
              >
                <Code2 className="w-3 h-3 text-mac-orange" />
                <span>JSON</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-mac-textSecondary hover:text-mac-text rounded hover:bg-mac-surface apple-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 p-3 overflow-hidden bg-mac-canvas flex flex-col">
          <div className="flex-1 bg-mac-window border border-mac-border rounded-lg p-3 font-mono text-2xs text-mac-text overflow-y-auto whitespace-pre-wrap select-text leading-relaxed">
            {content}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-3 border-t border-mac-border bg-mac-window flex items-center justify-between">
          <span className="text-2xs text-mac-textTertiary">
            Exportable static analysis and evidence summary.
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-mac-surface hover:bg-mac-surfaceHover border border-mac-border text-mac-text rounded-md text-xs font-medium flex items-center space-x-1.5 apple-btn shadow-mac-button"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-mac-green" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Report'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-mac-blue hover:bg-blue-500 text-white font-medium rounded-md text-xs flex items-center space-x-1.5 apple-btn shadow-mac-button"
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
