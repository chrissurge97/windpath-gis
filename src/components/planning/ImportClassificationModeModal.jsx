import React from 'react';
import { BarChart2, Wand2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ImportClassificationModeModal({ onAuto, onManual, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Import Classification</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-400 mb-6">Choose how to classify imported features:</p>

        <div className="space-y-3">
          <button
            onClick={onAuto}
            className={cn(
              "w-full flex items-start gap-3 p-4 rounded-lg border-2 transition-all",
              "bg-slate-800/50 border-slate-700 hover:border-emerald-500/60 hover:bg-emerald-500/10"
            )}
          >
            <Wand2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Auto-Classify</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically detect turbines, cables, and substations by geometry type
              </p>
            </div>
          </button>

          <button
            onClick={onManual}
            className={cn(
              "w-full flex items-start gap-3 p-4 rounded-lg border-2 transition-all",
              "bg-slate-800/50 border-slate-700 hover:border-cyan-500/60 hover:bg-cyan-500/10"
            )}
          >
            <BarChart2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Manual Classify</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Manually assign each layer to a classification (turbines, cables, substations, or keep)
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}