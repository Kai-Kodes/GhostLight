import React, { useState } from 'react';
import { GraphExportDto, ImpactReport, ScanResult } from '../types';
import { X, Copy, Download, Check } from 'lucide-react';

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

  if (!isOpen) return null;

  // Generate Report Content
  const jsonReport = JSON.stringify(
    {
      schema_version: '1.0.0',
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
  mdReport += `- **Schema Version:** 1.0.0\n`;
  mdReport += `- **Repository:** \`${scanResult?.repository || 'unknown'}\`\n`;
  mdReport += `- **Fingerprint:** \`${scanResult?.fingerprint || 'unknown'}\`\n`;
  mdReport += `- **Files:** ${scanResult?.file_count || 0}\n`;
  mdReport += `- **Graph Nodes:** ${graph?.node_count || 0}\n`;
  mdReport += `- **Graph Edges:** ${graph?.edge_count || 0}\n\n`;

  if (impactReport) {
    mdReport += `## Change Impact: ${impactReport.target_name}\n\n`;
    mdReport += `- **Direct Impact:** ${impactReport.direct_count}\n`;
    mdReport += `- **Transitive Impact:** ${impactReport.transitive_count}\n`;
    mdReport += `- **Total Affected Entities:** ${impactReport.total_affected}\n`;
    mdReport += `- **Candidate Tests Identified:** ${impactReport.candidate_tests.length}\n\n`;

    if (impactReport.candidate_tests.length > 0) {
      mdReport += `### Candidate Tests\n\n`;
      mdReport += `| Test Symbol | File | Selection Reason |\n`;
      mdReport += `| :--- | :--- | :--- |\n`;
      for (const t of impactReport.candidate_tests) {
        mdReport += `| \`${t.symbol_name}\` | \`${t.file_id}\` | \`${t.reason}\` |\n`;
      }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-canvas-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold text-slate-100 font-mono">
              Codebase Intelligence Report
            </h3>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">
              v1.0.0
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-canvas-850 border border-slate-800 rounded p-0.5 text-xs">
              <button
                onClick={() => setFormat('markdown')}
                className={`px-2 py-0.5 rounded transition ${
                  format === 'markdown' ? 'bg-slate-800 text-white' : 'text-slate-400'
                }`}
              >
                Markdown
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`px-2 py-0.5 rounded transition ${
                  format === 'json' ? 'bg-slate-800 text-white' : 'text-slate-400'
                }`}
              >
                JSON
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-4 bg-canvas-950">
          <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap select-text leading-relaxed">
            {content}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-800 bg-canvas-900 flex items-center justify-end space-x-2">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-md transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-md transition shadow-md shadow-cyan-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};
