import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronRight, ChevronLeft, CheckCircle2, X, Minimize2, Maximize2,
  Wind, Pentagon, Zap, MousePointer, Edit2, BookOpen, Map
} from 'lucide-react';

const ACTION_ICON = {
  read: BookOpen,
  place_turbine: Wind,
  draw_polygon: Pentagon,
  draw_cable: Zap,
  place_substation: Map,
  edit: Edit2,
};

const ACTION_COLOR = {
  read: 'text-cyan-400',
  place_turbine: 'text-emerald-400',
  draw_polygon: 'text-purple-400',
  draw_cable: 'text-orange-400',
  place_substation: 'text-yellow-400',
  edit: 'text-blue-400',
};

export default function ExerciseGuide({ exercise, onComplete, onClose }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [stepDone, setStepDone] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [completed, setCompleted] = useState(false);

  const step = exercise.steps[stepIdx];
  const isLast = stepIdx === exercise.steps.length - 1;

  // Poll localStorage for planning data to auto-check step completion
  useEffect(() => {
    if (step.action === 'read') { setStepDone(true); return; }
    if (stepDone) return;

    const check = () => {
      try {
        const raw = localStorage.getItem('planning_v3_ire');
        if (!raw) return;
        const data = JSON.parse(raw);
        const layers = data.layers || [];
        const turbineLyr = layers.find(l => l.type === 'turbine');
        const cableLyr = layers.find(l => l.type === 'cable');
        const substationLyr = layers.find(l => l.type === 'substation');
        const turbines = turbineLyr?.features || [];
        const cables = cableLyr?.features || [];
        const substations = substationLyr?.features || [];
        const result = step.check({ layers, turbines, cables, substations });
        if (result) setStepDone(true);
      } catch {}
    };

    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [stepIdx, step, stepDone]);

  const advance = () => {
    if (isLast) {
      setCompleted(true);
      onComplete?.();
    } else {
      setStepIdx(i => i + 1);
      setStepDone(false);
    }
  };

  const goBack = () => {
    if (stepIdx > 0) { setStepIdx(i => i - 1); setStepDone(false); }
  };

  if (completed) {
    return (
      <div className="absolute bottom-20 right-4 z-[1500] bg-slate-900 border border-emerald-500/50 rounded-2xl shadow-2xl p-5 w-80">
        <div className="text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <p className="text-white font-bold text-base mb-1">Exercise Complete!</p>
          <p className="text-slate-400 text-xs mb-4">Return to the Learn page to claim your XP and badge.</p>
          <button onClick={onClose} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors">
            Back to Learn
          </button>
        </div>
      </div>
    );
  }

  const ActionIcon = ACTION_ICON[step.action] || BookOpen;
  const actionColor = ACTION_COLOR[step.action] || 'text-cyan-400';
  const canAdvance = step.action === 'read' || stepDone;

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="absolute bottom-20 right-4 z-[1500] bg-slate-900 border border-emerald-500/50 rounded-xl shadow-2xl px-3 py-2.5 flex items-center gap-2 hover:bg-slate-800 hover:border-emerald-400 transition-all group"
      >
        <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
        <div className="flex flex-col items-start">
          <span className="text-xs text-white font-semibold leading-tight">{exercise.title}</span>
          <span className="text-[10px] text-slate-400">Step {stepIdx + 1}/{exercise.steps.length}</span>
        </div>
        <Maximize2 className="w-3.5 h-3.5 text-emerald-400 group-hover:text-white ml-1 transition-colors" />
      </button>
    );
  }

  return (
    <div className="absolute bottom-20 right-4 z-[1500] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-800 border-b border-slate-700">
        <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="text-xs font-semibold text-white flex-1 truncate">{exercise.title}</span>
        <span className="text-[10px] text-slate-500">{stepIdx + 1}/{exercise.steps.length}</span>
        <button onClick={() => setMinimized(true)} className="p-0.5 text-slate-500 hover:text-white">
          <Minimize2 className="w-3 h-3" />
        </button>
        <button onClick={onClose} className="p-0.5 text-slate-500 hover:text-white">
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Step progress bar */}
      <div className="flex gap-0.5 px-3 pt-2.5">
        {exercise.steps.map((_, i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-all',
            i < stepIdx ? 'bg-emerald-500' : i === stepIdx ? 'bg-cyan-500' : 'bg-slate-700'
          )} />
        ))}
      </div>

      {/* Step content */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-start gap-2 mb-2">
          <ActionIcon className={cn('w-4 h-4 shrink-0 mt-0.5', actionColor)} />
          <p className="text-sm font-medium text-white leading-snug">{step.instruction}</p>
        </div>
        {step.hint && (
          <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-800/60 rounded-lg px-2.5 py-2 mb-2">
            💡 {step.hint}
          </p>
        )}

        {/* Completion indicator */}
        {step.action !== 'read' && (
          <div className={cn('flex items-center gap-1.5 text-[11px] font-medium rounded-lg px-2.5 py-1.5 mb-2',
            stepDone ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800/60 text-slate-500'
          )}>
            {stepDone
              ? <><CheckCircle2 className="w-3 h-3" /> Step complete — ready to continue</>
              : <><div className="w-3 h-3 rounded-full border border-slate-600 animate-pulse" /> Waiting for action in Planning tool…</>
            }
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2 px-3 pb-3">
        <button
          onClick={goBack}
          disabled={stepIdx === 0}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors px-2 py-1.5"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button
          onClick={advance}
          disabled={!canAdvance}
          className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
            canAdvance ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
          )}
        >
          {isLast ? 'Finish Exercise' : 'Next Step'} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}