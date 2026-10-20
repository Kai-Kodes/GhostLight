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
    const diag = `GHOSTLIGHT Doctor Diagnostics:
- Rust Toolchain: ${doctor.rust_version}
- Python Interpreter: ${doctor.python_version}
- Pytest Version: ${doctor.pytest_version}
- Docker Sandboxing: ${doctor.docker_available ? 'Available (Air-Gapped)' : 'Unavailable (Restricted Subprocess)'}
- Security Model: ${doctor.security_status}`;
    navigator.clipboard.writeText(diag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-lg bg-canvas-900 border border-canvas-800 rounded-xl shadow-elevated overflow-hidden text-xs">
        {/* Header */}
        <div className="p-3.5 bg-canvas-850 border-b border-canvas-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-ghost-cyan" />
            <h3 className="text-xs font-semibold text-slate-100 font-mono tracking-tight">
              GHOSTLIGHT Environment Diagnostics
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-canvas-800 transition btn-interactive"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Diagnostic Items */}
        <div className="p-4 space-y-2.5">
          <div className="p-2.5 bg-canvas-850 border border-canvas-800 rounded-md flex items-center justify-between">
            <span className="text-slate-400 font-mono">Rust Engine Core:</span>
            <span className="font-mono text-slate-100 font-semibold">{doctor?.rust_version || 'Inspecting...'}</span>
          </div>

          <div className="p-2.5 bg-canvas-850 border border-canvas-800 rounded-md flex items-center justify-between">
            <span className="text-slate-400 font-mono">Host Python:</span>
            <span className="font-mono text-slate-200">{doctor?.python_version || 'Inspecting...'}</span>
          </div>

          <div className="p-2.5 bg-canvas-850 border border-canvas-800 rounded-md flex items-center justify-between">
            <span className="text-slate-400 font-mono">Host Pytest:</span>
            <span className="font-mono text-slate-200">{doctor?.pytest_version || 'Inspecting...'}</span>
          </div>

          <div className="p-2.5 bg-canvas-850 border border-canvas-800 rounded-md flex items-center justify-between">
            <span className="text-slate-400 font-mono">Docker Sandbox:</span>
            <span
              className={`font-mono px-2 py-0.5 rounded text-[10px] font-semibold flex items-center space-x-1 ${
                doctor?.docker_available
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                  : 'bg-amber-950 text-amber-300 border border-amber-800/60'
              }`}
            >
              {doctor?.docker_available ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Available (Air-Gapped)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>Unavailable (Subprocess Only)</span>
                </>
              )}
            </span>
          </div>

          <div className="p-2.5 bg-canvas-850 border border-canvas-800 rounded-md flex items-center justify-between">
            <span className="text-slate-400 font-mono">Security Model:</span>
            <span className="font-mono text-emerald-400 font-semibold flex items-center space-x-1 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Strict Zero-Execution Static Scan</span>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-canvas-800 bg-canvas-850 flex items-center justify-between">
          <button
            onClick={handleCopyDiagnostics}
            className="px-3 py-1 bg-canvas-800 hover:bg-canvas-750 border border-canvas-700 text-slate-300 rounded font-mono text-[11px] flex items-center space-x-1.5 transition btn-interactive"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Diagnostics'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded transition font-medium btn-interactive"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
