import React, { useEffect, useState } from 'react';
import { DoctorReport } from '../types';
import { getDoctor } from '../services/api';
import {
  X,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';

interface DoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DoctorModal: React.FC<DoctorModalProps> = ({ isOpen, onClose }) => {
  const [doctor, setDoctor] = useState<DoctorReport | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getDoctor().then(setDoctor);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyDiagnostics = () => {
    if (!doctor) return;
    const diag = `GHOSTLIGHT Diagnostics:
- Rust Engine: ${doctor.rust_version}
- Python: ${doctor.python_version}
- Pytest: ${doctor.pytest_version}
- Sandbox: ${doctor.docker_available ? 'Docker Container (Air-Gapped)' : 'Restricted Subprocess'}
- Policy: ${doctor.security_status}`;
    navigator.clipboard.writeText(diag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-md bg-mac-window border border-mac-borderStrong rounded-xl shadow-mac-sheet overflow-hidden text-xs">
        {/* Header */}
        <div className="p-3 bg-mac-window border-b border-mac-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-mac-blue" />
            <h3 className="text-xs font-semibold text-mac-text tracking-tight">
              System Environment Diagnostics
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-mac-textSecondary hover:text-mac-text rounded hover:bg-mac-surface apple-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Diagnostic Items */}
        <div className="p-3.5 space-y-2">
          <div className="p-2 bg-mac-surface border border-mac-border rounded-md flex items-center justify-between">
            <span className="text-mac-textSecondary">Rust Engine Core:</span>
            <span className="font-mono text-mac-text font-medium">{doctor?.rust_version || 'Inspecting...'}</span>
          </div>

          <div className="p-2 bg-mac-surface border border-mac-border rounded-md flex items-center justify-between">
            <span className="text-mac-textSecondary">Host Python:</span>
            <span className="font-mono text-mac-text">{doctor?.python_version || 'Inspecting...'}</span>
          </div>

          <div className="p-2 bg-mac-surface border border-mac-border rounded-md flex items-center justify-between">
            <span className="text-mac-textSecondary">Host Pytest:</span>
            <span className="font-mono text-mac-text">{doctor?.pytest_version || 'Inspecting...'}</span>
          </div>

          <div className="p-2 bg-mac-surface border border-mac-border rounded-md flex items-center justify-between">
            <span className="text-mac-textSecondary">Docker Sandboxing:</span>
            <span
              className={`font-mono px-2 py-0.5 rounded text-2xs font-semibold flex items-center space-x-1 ${
                doctor?.docker_available
                  ? 'bg-emerald-950/40 text-mac-green border border-emerald-800/40'
                  : 'bg-orange-950/40 text-mac-orange border border-orange-800/40'
              }`}
            >
              {doctor?.docker_available ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-mac-green" />
                  <span>Available (Air-Gapped)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3 text-mac-orange" />
                  <span>Restricted Subprocess</span>
                </>
              )}
            </span>
          </div>

          <div className="p-2 bg-mac-surface border border-mac-border rounded-md flex items-center justify-between">
            <span className="text-mac-textSecondary">Security Model:</span>
            <span className="font-medium text-mac-green flex items-center space-x-1 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Zero-Execution Static Scan</span>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-mac-border bg-mac-window flex items-center justify-between">
          <button
            onClick={handleCopyDiagnostics}
            className="px-3 py-1 bg-mac-surface hover:bg-mac-surfaceHover border border-mac-border text-mac-text rounded-md text-xs font-medium flex items-center space-x-1.5 apple-btn shadow-mac-button"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-mac-green" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Diagnostics'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1 bg-mac-surfaceActive hover:bg-mac-surfaceHover text-mac-text rounded-md text-xs font-medium apple-btn shadow-mac-button"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
