import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  X, Minimize2, BookOpen, ChevronLeft, ChevronRight, CheckCircle2,
  GripVertical, Lightbulb, HelpCircle, Download, ChevronDown, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ACADEMY_MODULE_CONTENT } from '@/lib/academyModules';
import { markStepComplete, markModuleComplete, getModuleProgress } from '@/lib/academyProgress';
import { downloadTrainingFile, TRAINING_FILES } from '@/lib/trainingDownloads';

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400',    bar: 'bg-blue-400' },
  cyan:   { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    text: 'text-cyan-400',    bar: 'bg-cyan-400' },
  orange: { bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  text: 'text-orange-400',  bar: 'bg-orange-400' },
  purple: { bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  text: 'text-purple-400',  bar: 'bg-purple-400' },
  green:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', bar: 'bg-emerald-400' },
  yellow: { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  text: 'text-yellow-400',  bar: 'bg-yellow-400' },
  amber:  { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400',   bar: 'bg-amber-400' },
};

function TaskRow({ task, completed }) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs border transition-all',
      completed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-800/60 border-slate-700 text-slate-400'
    )}>
      {completed
        ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
        : <div className={cn('w-3 h-3 rounded-full border-2 shrink-0', task.required ? 'border-slate-500 animate-pulse' : 'border-slate-700')} />
      }
      <span className="leading-snug">{task.label}</span>
      {!task.required && !completed && <span className="ml-auto text-[8px] text-slate-600">opt</span>}
    </div>
  );
}

export default function LessonGuide({ moduleId, initialLessonIndex = 0, mapRef, onClose }) {
  const navigate = useNavigate();
  const module = ACADEMY_MODULE_CONTENT[moduleId];
  const [stepIndex, setStepIndex] = useState(initialLessonIndex);
  const [minimized, setMinimized] = useState(false);
  const [completedTasks, setCompletedTasks] = useState({});
  const [showHint, setShowHint] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [showStuck, setShowStuck] = useState(false);
  const [justCompleted, setJustCompleted] = useState(null); // id of just-completed task
  const [downloadedFiles, setDownloadedFiles] = useState({});
  const stepEnteredAt = useRef(Date.now());

  // Drag state
  const panelRef = useRef(null);
  const [fixedPos, setFixedPos] = useState({ x: null, y: null });
  const [useFixed, setUseFixed] = useState(false);
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const onMouseDown = useCallback((e) => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: rect.left, py: rect.top };
    setUseFixed(true);
    setFixedPos({ x: rect.left, y: rect.top });
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      setFixedPos({
        x: Math.max(0, Math.min(window.innerWidth - 360, dragStart.current.px + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 80, dragStart.current.py + dy)),
      });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // Snap map to lesson location
  const step = module?.steps?.[stepIndex];
  useEffect(() => {
    if (!module || !step?.mapCenter || !mapRef?.current) return;
    const [lat, lng] = step.mapCenter;
    setTimeout(() => {
      mapRef.current.setView([lat, lng], step.mapZoom || 12, { animate: true, duration: 0.8 });
    }, 200);
  }, [stepIndex, module, step?.mapCenter]);

  // Poll for task completion from global state
  useEffect(() => {
    if (!module || !step?.tasks?.length) return;
    const poll = setInterval(() => {
      const state = window.__lessonGuideState__;
      const evt = window.__trainingEvent__;
      if (!state && !evt) return;

      const next = { ...completedTasks };
      let changed = false;

      (step.tasks || []).forEach(task => {
        if (next[task.id]) return;
        let done = false;

        // Watch-based completion
        if (task.watch === 'mode' && state?.mode === task.value) done = true;
        if (task.watch === 'tab' && state?.tab === task.value) done = true;
        if (task.watch === 'basemap' && state?.basemap === task.value) done = true;
        if (task.watch === 'turbineCount' && (state?.turbineCount || 0) >= (task.minValue || 1)) done = true;
        if (task.watch === 'cableCount' && (state?.cableCount || 0) >= (task.minValue || 1)) done = true;
        if (task.watch === 'substationCount' && (state?.substationCount || 0) >= (task.minValue || 1)) done = true;
        if (task.watch === 'polygonCount' && (state?.polygonCount || 0) >= (task.minValue || 1)) done = true;
        if (task.watch === 'polygonLayerCount' && (state?.polygonLayerCount || 0) >= (task.minValue || 1)) done = true;
        if (task.watch === 'totalLayerCount' && (state?.totalLayerCount || 0) >= (task.minValue || 1)) done = true;
        if (task.watch === 'noTurbineZoneCount' && (state?.noTurbineZoneCount || 0) >= (task.minValue || 1)) done = true;
        if (task.watch === 'importCount' && (state?.importCount || 0) >= (task.minValue || 1)) done = true;

        // Event-based completion — only accept events that fired AFTER this step was entered
        const evtFresh = evt?.ts >= stepEnteredAt.current;
        if (task.watch === 'event' && evtFresh && evt?.type === task.value) done = true;
        if (task.watch === 'download' && evtFresh && evt?.type === 'download_clicked' && evt?.payload?.fileId === task.value) done = true;

        // Layer name checks (case-insensitive, trimmed)
        if (task.watch === 'layerExists') {
          const target = task.value?.trim().toLowerCase();
          done = (state?.layerNames || []).includes(target);
        }
        if (task.watch === 'layerSelected') {
          const target = task.value?.trim().toLowerCase();
          done = evt?.type === 'layer_selected' && evt?.payload?.layerName?.trim().toLowerCase() === target;
        }

        if (done) { next[task.id] = true; changed = true; setJustCompleted(task.id); setTimeout(() => setJustCompleted(null), 2000); }
      });

      if (changed) setCompletedTasks(next);
    }, 500);
    return () => clearInterval(poll);
  }, [step, completedTasks, module]);

  useEffect(() => {
    setCompletedTasks({});
    setShowHint(false);
    setShowWhy(false);
    setShowStuck(false);
    stepEnteredAt.current = Date.now();
  }, [stepIndex]);

  if (!module) return null;

  const steps = module.steps || [];
  const isLast = stepIndex === steps.length - 1;
  const colors = COLOR_MAP[module.color] || COLOR_MAP.cyan;
  const allRequired = (step?.tasks || []).filter(t => t.required);
  const allRequiredDone = allRequired.every(t => completedTasks[t.id]);
  const canAdvance = allRequiredDone;

  const advance = () => {
    if (step) markStepComplete(moduleId, step.id);
    if (isLast) {
      markModuleComplete(moduleId);
      navigate('/learn', { state: { moduleId } });
    } else {
      setStepIndex(i => i + 1);
    }
  };

  const panelStyle = useFixed && fixedPos.x !== null
    ? { position: 'fixed', left: fixedPos.x, top: fixedPos.y, width: 340, zIndex: 1500 }
    : { position: 'absolute', bottom: 16, right: 16, width: 340, zIndex: 1500 };

  if (minimized) {
    const minStyle = useFixed && fixedPos.x !== null
      ? { position: 'fixed', left: fixedPos.x, top: fixedPos.y, zIndex: 1500 }
      : { position: 'absolute', bottom: 16, left: 16, zIndex: 1500 };
    return (
      <button ref={panelRef} onClick={() => setMinimized(false)} style={minStyle}
        className={cn('w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 bg-slate-800 border border-slate-600')}>
        <BookOpen className={cn('w-5 h-5', colors.text)} />
      </button>
    );
  }

  const downloadFile = step?.downloadFile;
  const fileInfo = downloadFile ? TRAINING_FILES.find(f => f.id === downloadFile) : null;

  return (
    <div
      ref={panelRef}
      style={{ ...panelStyle, maxHeight: 'calc(100vh - 80px)', userSelect: 'none' }}
      className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
    >
      {/* Header — drag handle */}
      <div className={cn('flex items-center gap-2 px-3 py-2.5 border-b border-slate-700 shrink-0 cursor-grab active:cursor-grabbing', colors.bg)} onMouseDown={onMouseDown}>
        <GripVertical className="w-3 h-3 text-slate-600 shrink-0" />
        <BookOpen className={cn('w-3.5 h-3.5 shrink-0', colors.text)} />
        <div className="flex-1 min-w-0">
          <p className={cn('text-[10px] font-semibold uppercase tracking-wider', colors.text)}>{module.title}</p>
          <p className="text-[10px] text-slate-500 truncate">{step?.title}</p>
        </div>
        <button onClick={() => setMinimized(true)} className="p-0.5 text-slate-500 hover:text-white" onMouseDown={e => e.stopPropagation()}>
          <Minimize2 className="w-3 h-3" />
        </button>
        <button onClick={onClose} className="p-0.5 text-slate-500 hover:text-white" onMouseDown={e => e.stopPropagation()}>
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1 px-3 pt-2 shrink-0">
        {steps.map((_, i) => (
          <button key={i} onClick={() => setStepIndex(i)}
            className={cn('h-1 flex-1 rounded-full transition-all', i < stepIndex ? 'bg-emerald-500' : i === stepIndex ? colors.bar || 'bg-cyan-400' : 'bg-slate-700')} />
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-1 space-y-3" style={{ userSelect: 'text' }}>
        {/* Step story */}
        <div>
          <p className="text-sm font-semibold text-white leading-snug">{step?.title}</p>
          {step?.story && <p className="text-[10px] text-slate-400 mt-1 leading-relaxed italic">{step.story}</p>}
        </div>

        {/* Goal */}
        {step?.goal && (
          <div className={cn('rounded-lg border px-3 py-2 text-xs font-medium', colors.bg, colors.border, colors.text)}>
            🎯 {step.goal}
          </div>
        )}

        {/* Download button */}
        {fileInfo && (
          <button
            onClick={() => {
              downloadTrainingFile(fileInfo.id);
              setDownloadedFiles(p => ({ ...p, [fileInfo.id]: true }));
              window.__trainingEvent__ = { type: 'download_clicked', payload: { fileId: fileInfo.id }, ts: Date.now() };
            }}
            className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all',
              downloadedFiles[fileInfo.id]
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-300 hover:brightness-125'
            )}>
            {downloadedFiles[fileInfo.id] ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <Download className="w-3.5 h-3.5 shrink-0" />}
            <span className="flex-1 text-left">{downloadedFiles[fileInfo.id] ? 'Downloaded ✓' : `Download ${fileInfo.label}`}</span>
          </button>
        )}

        {/* Tasks */}
        {(step?.tasks || []).length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider">✅ Complete to progress</p>
            {(step.tasks || []).map(task => (
              <TaskRow key={task.id} task={task} completed={!!completedTasks[task.id]} />
            ))}
          </div>
        )}

        {/* Coach tip */}
        {step?.coachTip && (
          <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2.5 py-2">
            <span className="text-xs shrink-0">💡</span>
            <p className="text-[10px] text-blue-300 leading-relaxed">{step.coachTip}</p>
          </div>
        )}

        {/* Expandable: Why / Hint / Stuck */}
        <div className="space-y-1">
          {step?.why && (
            <>
              <button onClick={() => setShowWhy(v => !v)}
                className="w-full flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-300 transition-colors py-1">
                <Lightbulb className="w-3 h-3" /> Why this matters
                <ChevronDown className={cn('w-2.5 h-2.5 ml-auto transition-transform', showWhy && 'rotate-180')} />
              </button>
              {showWhy && <div className="bg-slate-800/30 rounded-lg px-2.5 py-2 text-[10px] text-slate-400 leading-relaxed">{step.why}</div>}
            </>
          )}

          {step?.hint && (
            <>
              <button onClick={() => setShowHint(v => !v)}
                className="w-full flex items-center gap-1.5 text-[10px] text-yellow-600 hover:text-yellow-400 transition-colors py-1">
                <HelpCircle className="w-3 h-3" /> Nudge me
                <ChevronDown className={cn('w-2.5 h-2.5 ml-auto transition-transform', showHint && 'rotate-180')} />
              </button>
              {showHint && <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-2.5 py-2 text-[10px] text-yellow-300 leading-relaxed">💡 {step.hint}</div>}
            </>
          )}

          {step?.stuckHelp && (
            <>
              <button onClick={() => setShowStuck(v => !v)}
                className="w-full flex items-center gap-1.5 text-[10px] text-red-600 hover:text-red-400 transition-colors py-1">
                <HelpCircle className="w-3 h-3" /> I'm stuck
                <ChevronDown className={cn('w-2.5 h-2.5 ml-auto transition-transform', showStuck && 'rotate-180')} />
              </button>
              {showStuck && <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-2.5 py-2 text-[10px] text-red-300 leading-relaxed">🆘 {step.stuckHelp}</div>}
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2 px-3 pb-3 pt-2 shrink-0 border-t border-slate-800">
        <button onClick={() => { if (stepIndex > 0) setStepIndex(i => i - 1); }} disabled={stepIndex === 0}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30 px-2 py-1.5 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button onClick={advance} disabled={!canAdvance}
          className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
            canAdvance ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
          )}>
          {isLast ? '🎉 Finish Module' : 'Next Step'} {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        {!canAdvance && allRequired.length > 0 && (
          <button
            onClick={() => {
              (step?.tasks || []).forEach(t => {
                setCompletedTasks(prev => ({ ...prev, [t.id]: true }));
              });
            }}
            className="px-2 py-1.5 text-[10px] text-slate-700 hover:text-slate-500 transition-colors" title="Skip step">
            Skip
          </button>
        )}
      </div>
    </div>
  );
}