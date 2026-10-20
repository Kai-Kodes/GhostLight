import { useEffect, useState } from 'react';
import { DoctorReport } from '../types';
import { getDoctor } from '../services/api';
import { X, ShieldCheck, Cpu } from 'lucide-react';

interface DoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DoctorModal: React.FC<DoctorModalProps> = ({ isOpen, onClose }) => {
  const [doctor, setDoctor] = useState<DoctorReport | null>(null);

  useEffect(() => {
    if (isOpen) {
      getDoctor().then(setDoctor);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-canvas-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-100 font-mono">
              GHOSTLIGHT Doctor Diagnostics
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Diagnostic Items */}
        <div className="p-4 space-y-3">
          <div className="p-2.5 bg-canvas-850 border border-slate-800 rounded-lg flex items-center justify-between">
            <span className="text-slate-400">Rust Core Toolchain:</span>
            <span className="font-mono text-slate-200">{doctor?.rust_version || 'Loading...'}</span>
          </div>

          <div className="p-2.5 bg-canvas-850 border border-slate-800 rounded-lg flex items-center justify-between">
            <span className="text-slate-400">Host Python:</span>
            <span className="font-mono text-slate-200">{doctor?.python_version || 'Loading...'}</span>
          </div>

          <div className="p-2.5 bg-canvas-850 border border-slate-800 rounded-lg flex items-center justify-between">
            <span className="text-slate-400">Host Pytest:</span>
            <span className="font-mono text-slate-200">{doctor?.pytest_version || 'Loading...'}</span>
          </div>

          <div className="p-2.5 bg-canvas-850 border border-slate-800 rounded-lg flex items-center justify-between">
            <span className="text-slate-400">Docker Isolation:</span>
            <span
              className={`font-mono px-2 py-0.5 rounded font-semibold ${
                doctor?.docker_available
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                  : 'bg-amber-950 text-amber-400 border border-amber-800/60'
              }`}
            >
              {doctor?.docker_available ? 'Available (Air-Gapped)' : 'Unavailable (Subprocess Only)'}
            </span>
          </div>

          <div className="p-2.5 bg-canvas-850 border border-slate-800 rounded-lg flex items-center justify-between">
            <span className="text-slate-400">Security Model:</span>
            <span className="font-mono text-emerald-400 font-semibold flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Strict Zero-Execution Static Scan</span>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-canvas-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
