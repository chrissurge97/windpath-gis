import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, ExternalLink, CheckCircle2, Circle,
  Lightbulb, HelpCircle, Download, Play, Trophy, Star, ArrowLeft
} from 'lucide-react';
import { ACADEMY_MODULE_CONTENT } from '@/lib/academyModules';
import { ACADEMY_BADGES } from '@/lib/academyProgress';
import { loadProgress, markStepComplete, markModuleComplete, setModuleProgress, getModuleProgress } from '@/lib/academyProgress';
import { TRAINING_FILES, downloadTrainingFile } from '@/lib/trainingDownloads';
import { saveCheckpoint, buildGlenhavenBlank, buildGlenhavenWithConstraints, buildGlenhavenCableChallenge, buildGlenhavenFinalChallenge } from '@/lib/academyModules';

const COLOR_CLASSES = {
  cyan:   { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    text: 'text-cyan-400' },
  green:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  blue:   { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400' },
  orange: { bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  text: 'text-orange-400' },
  yellow: { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  text: 'text-yellow-400' },
  purple: { bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  text: 'text-purple-400' },
  amber:  { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400' },
};

function TaskItem({ task, completed }) {
  return (
    <div className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs border transition-all',
      completed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-800/60 border-slate-700 text-slate-400'
    )}>
      {completed
        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        : <div className={cn('w-3.5 h-3.5 rounded-full border-2 shrink-0', task.required ? 'border-slate-500 animate-pulse' : 'border-slate-700')} />
      }
      <span className="leading-snug">{task.label}</span>
      {!task.required && !completed && <span className="ml-auto text-[9px] text-slate-600">optional</span>}
    </div>
  );
}

function ChoicePrompt({ choices, selected, onSelect }) {
  return (
    <div className="space-y-2">
      {choices.map(choice => (
        <button
          key={choice.id}
          onClick={() => onSelect(choice.id)}
          className={cn('w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all',
            selected === choice.id
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500'
          )}
        >
          <p className="font-medium">{choice.label}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{choice.description}</p>
        </button>
      ))}
    </div>
  );
}

function DownloadButtons({ fileIds }) {
  const [downloaded, setDownloaded] = useState({});
  const files = (fileIds || []).map(id => TRAINING_FILES.find(f => f.id === id)).filter(Boolean);
  if (!files.length) return null;

  return (
    <div className="space-y-1.5">
      {files.map(file => (
        <button
          key={file.id}
          onClick={() => { downloadTrainingFile(file.id); setDownloaded(p => ({ ...p, [file.id]: true })); }}
          className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs transition-all',
            downloaded[file.id] ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-blue-500/10 border-blue-500/30 text-blue-300 hover:brightness-125'
          )}>
          {downloaded[file.id] ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <Download className="w-3.5 h-3.5 shrink-0" />}
          <div className="text-left min-w-0">
            <p className="font-medium truncate">{file.label}</p>
            <p className="text-[10px] text-slate-500 truncate">{file.name}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function AcademyModuleView({ moduleId, onBack, onOpenInPlanner }) {
  const navigate = useNavigate();
  const module = ACADEMY_MODULE_CONTENT[moduleId];
  const [stepIndex, setStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(() => {
    const mp = getModuleProgress(moduleId);
    return new Set(mp.completedSteps || []);
  });
  const [showHint, setShowHint] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [showStuck, setShowStuck] = useState(false);
  const [choice, setChoice] = useState(null);
  const [moduleComplete, setModuleComplete] = useState(() => getModuleProgress(moduleId)?.status === 'complete');

  useEffect(() => {
    // Mark module as started
    const mp = getModuleProgress(moduleId);
    if (mp.status === 'not_started') {
      setModuleProgress(moduleId, { status: 'in_progress', startedAt: Date.now() });
    }
  }, [moduleId]);

  if (!module) return <div className="flex items-center justify-center h-full text-slate-500">Module not found.</div>;

  const colors = COLOR_CLASSES[module.color] || COLOR_CLASSES.cyan;
  const steps = module.steps || [];
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const allRequired = (step?.tasks || []).filter(t => t.required);
  const allRequiredDone = allRequired.every(t => completedSteps.has(t.id));
  const choiceRequired = step?.isChoice && !choice;

  const handleOpenInPlanner = () => {
    const checkpointBuilders = {
      bootcamp: buildGlenhavenBlank, polygons: buildGlenhavenBlank,
      importing: buildGlenhavenBlank, turbines: buildGlenhavenWithConstraints,
      cables: buildGlenhavenCableChallenge, analysis: buildGlenhavenCableChallenge,
      challenge: buildGlenhavenFinalChallenge,
    };
    const builder = checkpointBuilders[moduleId];
    if (builder) saveCheckpoint(moduleId, builder());
    const id = `academy_checkpoint_${moduleId}`;
    navigate('/planning', { state: { lessonProjectId: id, moduleId, lessonIndex: stepIndex } });
  };

  const handleNext = () => {
    if (step) {
      markStepComplete(moduleId, step.id);
      setCompletedSteps(prev => new Set([...prev, step.id]));
    }
    setShowHint(false);
    setShowWhy(false);
    setShowStuck(false);
    if (isLast) {
      const result = markModuleComplete(moduleId, 100);
      setModuleComplete(true);
    } else {
      setStepIndex(i => i + 1);
    }
  };

  const handleChoiceSelect = (choiceId) => {
    setChoice(choiceId);
    // Log the choice as a training event
    if (typeof window !== 'undefined') {
      window.__trainingEvent__ = { type: 'analysis_goal_selected', payload: { goal: choiceId }, ts: Date.now() };
    }
    markStepComplete(moduleId, step.id + '_choice');
    setCompletedSteps(prev => new Set([...prev, step.id + '_choice']));
  };

  const canAdvance = !choiceRequired && allRequiredDone;

  // ── Completion screen ────────────────────────────────────────────────────
  if (moduleComplete || (isLast && completedSteps.has(step?.id))) {
    const mp = getModuleProgress(moduleId);
    return (
      <div className="flex flex-col h-full overflow-y-auto bg-slate-950">
        <div className="shrink-0 flex items-center gap-2 px-4 py-3 bg-slate-900 border-b border-slate-800">
          <button onClick={onBack} className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Academy
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.5 }}>
            <div className="text-6xl mb-4">🎉</div>
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2">{module.title}</h2>
          <p className="text-sm text-emerald-400 mb-6">{module.successMessage}</p>
          <div className="flex gap-3 mb-6">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
              <p className="text-2xl font-bold text-amber-400">+{module.xp}</p>
              <p className="text-[10px] text-slate-500">XP Earned</p>
            </div>
            {module.badge && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl">{ACADEMY_BADGES[module.badge]?.icon || '🏆'}</p>
                <p className="text-[10px] text-slate-500">Badge Earned</p>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onBack} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm text-slate-300 border border-slate-700 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Academy
            </button>
            <button onClick={handleOpenInPlanner} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold text-white transition-colors">
              <ExternalLink className="w-4 h-4" /> Open in Planner
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-950">
      {/* Header */}
      <div className={cn('shrink-0 px-4 py-3 border-b border-slate-800', colors.bg)}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors shrink-0">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xl">{module.icon}</span>
          <div className="flex-1 min-w-0">
            <p className={cn('text-xs font-bold uppercase tracking-wider', colors.text)}>{module.title}</p>
            <p className="text-[10px] text-slate-500 truncate">{module.subtitle}</p>
          </div>
          <span className="text-[10px] text-slate-500 shrink-0">{stepIndex + 1}/{steps.length}</span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 flex gap-1">
          {steps.map((s, i) => (
            <button key={s.id} onClick={() => { setStepIndex(i); setShowHint(false); setShowWhy(false); setShowStuck(false); }}
              className={cn('flex-1 h-1 rounded-full transition-all', i < stepIndex ? 'bg-emerald-500' : i === stepIndex ? (colors.text.replace('text-', 'bg-')) : 'bg-slate-700')} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key={stepIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}
            className="p-4 space-y-4">
            {/* Story / Context */}
            <div>
              <p className={cn('text-[10px] font-semibold uppercase tracking-wider mb-1', colors.text)}>
                Step {stepIndex + 1} of {steps.length}
              </p>
              <h2 className="text-base font-bold text-white mb-2">{step.title}</h2>
              <div className={cn('rounded-xl border p-3 text-xs leading-relaxed text-slate-300', colors.bg, colors.border)}>
                <p className="italic text-slate-400 mb-2">{step.story}</p>
                <p className="text-white font-medium">{step.goal}</p>
              </div>
            </div>

            {/* Choice prompt */}
            {step.isChoice && (
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Choose your goal</p>
                <ChoicePrompt choices={step.choices || []} selected={choice} onSelect={handleChoiceSelect} />
              </div>
            )}

            {/* Download buttons */}
            {step.downloadFile && <DownloadButtons fileIds={[step.downloadFile]} />}

            {/* Tasks checklist */}
            {(step.tasks || []).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Complete to continue</p>
                {step.tasks.map(task => (
                  <TaskItem key={task.id} task={task} completed={completedSteps.has(task.id)} />
                ))}
                <p className="text-[9px] text-slate-600 mt-1">Complete these steps in the Planning tool, then come back here to continue.</p>
              </div>
            )}

            {/* Coach tip */}
            {step.coachTip && (
              <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                <span className="text-sm shrink-0">💡</span>
                <p className="text-[10px] text-blue-300 leading-relaxed">{step.coachTip}</p>
              </div>
            )}

            {/* Expandable sections */}
            <div className="space-y-1.5">
              {step.why && (
                <button onClick={() => setShowWhy(v => !v)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-xs text-slate-400 hover:text-white transition-colors">
                  <Lightbulb className="w-3 h-3 shrink-0" />
                  <span className="flex-1 text-left">Why this matters</span>
                  <ChevronRight className={cn('w-3 h-3 transition-transform', showWhy && 'rotate-90')} />
                </button>
              )}
              {showWhy && step.why && (
                <div className="px-3 py-2 bg-slate-800/30 rounded-lg text-[10px] text-slate-400 leading-relaxed">
                  {step.why}
                </div>
              )}

              {step.hint && (
                <button onClick={() => setShowHint(v => !v)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-xs text-slate-400 hover:text-yellow-300 transition-colors">
                  <HelpCircle className="w-3 h-3 shrink-0" />
                  <span className="flex-1 text-left">Nudge me</span>
                  <ChevronRight className={cn('w-3 h-3 transition-transform', showHint && 'rotate-90')} />
                </button>
              )}
              {showHint && step.hint && (
                <div className="px-3 py-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg text-[10px] text-yellow-300 leading-relaxed">
                  💡 {step.hint}
                </div>
              )}

              {step.stuckHelp && (
                <button onClick={() => setShowStuck(v => !v)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-xs text-slate-400 hover:text-red-300 transition-colors">
                  <HelpCircle className="w-3 h-3 text-red-400 shrink-0" />
                  <span className="flex-1 text-left">I'm stuck</span>
                  <ChevronRight className={cn('w-3 h-3 transition-transform', showStuck && 'rotate-90')} />
                </button>
              )}
              {showStuck && step.stuckHelp && (
                <div className="px-3 py-2 bg-red-500/5 border border-red-500/20 rounded-lg text-[10px] text-red-300 leading-relaxed">
                  🆘 {step.stuckHelp}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-slate-800 p-3 space-y-2 bg-slate-900">
        <button onClick={handleOpenInPlanner}
          className={cn('w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium border transition-all', colors.bg, colors.border, colors.text, 'hover:brightness-125')}>
          <ExternalLink className="w-3.5 h-3.5" /> Open in Planning Tool
        </button>
        <div className="flex gap-2">
          <button onClick={() => { setStepIndex(i => Math.max(0, i - 1)); setShowHint(false); setShowWhy(false); setShowStuck(false); }}
            disabled={stepIndex === 0}
            className="flex items-center gap-1 px-3 py-2 text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors rounded-lg hover:bg-slate-800">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          <button onClick={handleNext} disabled={!canAdvance}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
              canAdvance ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            )}>
            {isLast ? 'Complete Module 🎉' : 'Next Step'} {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {!canAdvance && allRequired.length > 0 && (
            <button onClick={() => { markStepComplete(moduleId, step.id); setCompletedSteps(prev => { const next = new Set([...prev]); (step.tasks || []).forEach(t => next.add(t.id)); return next; }); }}
              className="px-3 py-2 text-xs text-slate-600 hover:text-slate-400 border border-slate-700 rounded-lg transition-colors" title="Skip this step">
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}