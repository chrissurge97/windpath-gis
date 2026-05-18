import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MODULES } from '@/lib/trainingModules';
import { saveLessonProject } from '@/lib/lessonProjects';
import { EXERCISES } from '@/lib/exercises';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Map, BookOpen, Wind, Zap, Layers, ShieldAlert, CircleDot,
  Award, Star, Trophy, CheckCircle2, ChevronRight, ChevronLeft, BarChart2, ExternalLink
} from 'lucide-react';

const ICON_MAP = { Map, BookOpen, Wind, Zap, Layers, ShieldAlert, CircleDot, Award, Star, Trophy, BarChart2 };
const COLOR_MAP = {
  blue:   { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400',    badge: 'bg-blue-500'    },
  cyan:   { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    text: 'text-cyan-400',    badge: 'bg-cyan-500'    },
  orange: { bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  text: 'text-orange-400',  badge: 'bg-orange-500'  },
  purple: { bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  text: 'text-purple-400',  badge: 'bg-purple-500'  },
  green:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500' },
  yellow: { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  text: 'text-yellow-400',  badge: 'bg-yellow-500'  },
};

function LessonView({ module, onComplete }) {
  const [lessonIndex, setLessonIndex] = useState(0);
  const navigate = useNavigate();
  const colors = COLOR_MAP[module.color] || COLOR_MAP.blue;
  const lesson = module.lessons[lessonIndex];
  const isLast = lessonIndex === module.lessons.length - 1;

  const openInPlanner = () => {
    const project = saveLessonProject(module.id, lessonIndex);
    navigate('/planning', { state: { lessonProjectId: project.id, moduleId: module.id, lessonIndex } });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Progress dots */}
      <div className="flex gap-2 mb-6">
        {module.lessons.map((_, i) => (
          <button
            key={i}
            onClick={() => setLessonIndex(i)}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i < lessonIndex ? cn(colors.badge, 'w-6') :
              i === lessonIndex ? cn(colors.badge, 'w-8') :
              'bg-slate-800 w-4'
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={lessonIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="flex-1"
        >
          <p className={cn('text-xs uppercase tracking-wider font-medium mb-2', colors.text)}>
            Lesson {lessonIndex + 1} of {module.lessons.length}
          </p>
          <h2 className="text-xl font-bold text-white mb-4">{lesson.title}</h2>
          <div className={cn('rounded-xl border p-5 text-sm leading-relaxed text-slate-300 whitespace-pre-line', colors.bg, colors.border)}>
            {lesson.content}
          </div>

          <button
            onClick={openInPlanner}
            className={cn(
              'mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors',
              colors.border, colors.bg, colors.text,
              'hover:brightness-125'
            )}
          >
            <ExternalLink className="w-4 h-4" />
            Open this lesson in Planner Tool
          </button>
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-3 mt-4">
        {lessonIndex > 0 && (
          <button
            onClick={() => setLessonIndex(i => i - 1)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
        <button
          onClick={() => isLast ? onComplete() : setLessonIndex(i => i + 1)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium text-white transition-colors"
        >
          {isLast ? 'Go to Exercise' : 'Next Lesson'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function Learn() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialModuleId = location.state?.moduleId || MODULES[0].id;
  const [selectedModuleId, setSelectedModuleId] = useState(initialModuleId);
  const [view, setView] = useState('lesson');

  useEffect(() => {
    if (location.state?.moduleId) {
      setSelectedModuleId(location.state.moduleId);
    }
  }, [location.state]);

  const selectedModule = MODULES.find(m => m.id === selectedModuleId) || MODULES[0];
  const colors = COLOR_MAP[selectedModule.color] || COLOR_MAP.blue;

  return (
    <div className="flex h-full">
      {/* Scenario sidebar */}
      <div className="w-56 shrink-0 bg-slate-900 border-r border-slate-800 overflow-y-auto hidden md:block">
        <div className="p-3 space-y-1">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider px-2 pb-2">Training Scenarios</p>
          {MODULES.map((mod) => {
            const Icon = ICON_MAP[mod.icon] || BookOpen;
            const isActive = mod.id === selectedModuleId;
            return (
              <button
                key={mod.id}
                onClick={() => { setSelectedModuleId(mod.id); setView('lesson'); }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all text-xs',
                  isActive ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                )}
              >
                <div className={cn('w-6 h-6 rounded flex items-center justify-center shrink-0', isActive ? 'bg-slate-700 text-slate-200' : 'bg-slate-800 text-slate-500')}>
                  <Icon className="w-3 h-3" />
                </div>
                <span className="truncate font-medium">{mod.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className={cn('px-6 py-4 border-b border-slate-800 flex items-center gap-4 flex-wrap', colors.bg)}>
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border shrink-0', colors.bg, colors.border)}>
            {React.createElement(ICON_MAP[selectedModule.icon] || BookOpen, { className: cn('w-5 h-5', colors.text) })}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white truncate">{selectedModule.title}</h1>
            <p className="text-xs text-slate-400 truncate">{selectedModule.subtitle}</p>
          </div>
          {/* Tabs */}
          <div className="flex rounded-lg overflow-hidden border border-slate-800 shrink-0">
            {[
              { id: 'lesson', label: 'Lessons' },
              { id: 'exercise', label: '🗺 Exercise' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={cn('px-3 py-1.5 text-xs font-medium transition-colors',
                  view === id ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {view === 'lesson' && (
              <motion.div key="lesson" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <LessonView module={selectedModule} onComplete={() => setView('exercise')} />
              </motion.div>
            )}
            {view === 'exercise' && (
              <motion.div key="exercise" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {(() => {
                  const ex = EXERCISES[selectedModuleId];
                  if (!ex) return (
                    <div className="text-center py-10 text-slate-500 text-sm">No exercise for this module yet.</div>
                  );
                  return (
                    <div className="max-w-lg">
                      <p className={cn('text-xs uppercase tracking-wider font-medium mb-1', colors.text)}>
                        Practical Exercise
                      </p>
                      <h2 className="text-xl font-bold text-white mb-2">{ex.title}</h2>
                      <p className="text-slate-400 text-sm mb-6">{ex.intro}</p>

                      <div className="space-y-2 mb-6">
                        {ex.steps.map((step, i) => (
                          <div key={i} className="flex items-start gap-3 bg-slate-800/60 rounded-xl px-3 py-2.5 border border-slate-700">
                            <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0 mt-0.5">{i + 1}</div>
                            <p className="text-xs text-slate-300 leading-snug">{step.instruction}</p>
                          </div>
                        ))}
                      </div>

                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4">
                        <p className="text-xs text-emerald-300 leading-relaxed">
                          <strong>How it works:</strong> Click the button below to open the Planning Tool with a step-by-step guide floating over the map. Complete each step — the guide detects your progress automatically.
                        </p>
                      </div>

                      <button
                        onClick={() => navigate('/planning', { state: { exerciseId: selectedModuleId } })}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold text-white transition-colors"
                      >
                        Open Exercise in Planning Tool <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}