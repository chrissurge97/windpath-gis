import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MODULES, BADGES } from '@/lib/trainingModules';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Map, BookOpen, Wind, Zap, Layers, ShieldAlert, CircleDot,
  Award, Star, Trophy, CheckCircle2, ChevronRight, ChevronLeft,
  Lock, ArrowRight, RotateCcw, BarChart2
} from 'lucide-react';
import MapExample from '@/components/learn/MapExample';
import { MAP_EXAMPLES } from '@/lib/mapExamples';

const ICON_MAP = { Map, BookOpen, Wind, Zap, Layers, ShieldAlert, CircleDot, Award, Star, Trophy, BarChart2 };
const COLOR_MAP = {
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', badge: 'bg-cyan-500' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', badge: 'bg-purple-500' },
  green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500' },
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', badge: 'bg-yellow-500' },
};

function LessonView({ module, onComplete }) {
  const [lessonIndex, setLessonIndex] = useState(0);
  const colors = COLOR_MAP[module.color] || COLOR_MAP.blue;
  const lesson = module.lessons[lessonIndex];
  const isLast = lessonIndex === module.lessons.length - 1;

  return (
    <div className="flex flex-col h-full">
      {/* Progress dots */}
      <div className="flex gap-2 mb-6">
        {module.lessons.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i < lessonIndex ? cn("bg-opacity-100", colors.badge, "w-6") :
              i === lessonIndex ? cn(colors.badge, "w-8") :
              "bg-slate-800 w-4"
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
          <p className={cn("text-xs uppercase tracking-wider font-medium mb-2", colors.text)}>
            Lesson {lessonIndex + 1} of {module.lessons.length}
          </p>
          <h2 className="text-xl font-bold text-white mb-4">{lesson.title}</h2>
          <div className={cn("rounded-xl border p-5 text-sm leading-relaxed text-slate-300", colors.bg, colors.border)}>
            {lesson.content}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-3 mt-6">
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
          {isLast ? 'Take Quiz' : 'Next Lesson'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function QuizView({ module, onPass, onFail, previousScore }) {
  const [selected, setSelected] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const colors = COLOR_MAP[module.color] || COLOR_MAP.blue;

  const score = submitted
    ? module.quiz.questions.filter((q, i) => selected[i] === q.answer).length
    : 0;
  const passing = score >= Math.ceil(module.quiz.questions.length * 0.75);

  const handleSubmit = () => {
    setSubmitted(true);
    if (passing) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      setTimeout(() => onPass(score), 1200);
    }
  };

  const reset = () => { setSelected({}); setSubmitted(false); };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-5">
        <p className={cn("text-xs uppercase tracking-wider font-medium mb-1", colors.text)}>Quiz</p>
        <h2 className="text-xl font-bold text-white">{module.title}</h2>
        <p className="text-slate-400 text-sm">{module.quiz.questions.length} questions • 75% to pass</p>
        {previousScore !== undefined && (
          <p className="text-xs text-slate-500 mt-1">Previous score: {previousScore}/{module.quiz.questions.length}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-5 pr-1">
        {module.quiz.questions.map((q, qi) => (
          <div key={qi}>
            <p className="text-sm font-medium text-slate-200 mb-2.5">
              {qi + 1}. {q.q}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const isSelected = selected[qi] === oi;
                const isCorrect = oi === q.answer;
                const showResult = submitted;

                return (
                  <button
                    key={oi}
                    disabled={submitted}
                    onClick={() => setSelected(s => ({ ...s, [qi]: oi }))}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg text-sm border transition-all",
                      !showResult && isSelected && "bg-slate-700 border-slate-500 text-white",
                      !showResult && !isSelected && "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200",
                      showResult && isCorrect && "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
                      showResult && isSelected && !isCorrect && "bg-red-500/15 border-red-500/40 text-red-300",
                      showResult && !isSelected && !isCorrect && "bg-slate-900 border-slate-800 text-slate-600",
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={Object.keys(selected).length < module.quiz.questions.length}
          className="mt-5 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
        >
          Submit Answers
        </button>
      ) : (
        <div className="mt-5 space-y-3">
          <div className={cn(
            "text-center p-3 rounded-lg text-sm font-medium",
            passing ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
          )}>
            {passing ? '🎉 Passed!' : '❌ Not quite.'} Score: {score}/{module.quiz.questions.length}
          </div>
          {!passing && (
            <div className="flex gap-2">
              <button onClick={reset} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors">
                <RotateCcw className="w-3 h-3" /> Retry
              </button>
              <button onClick={() => onFail(score)} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 transition-colors">
                Skip for now
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Learn() {
  const location = useLocation();
  const queryClient = useQueryClient();

  const { data: progressList } = useQuery({
    queryKey: ['userProgress'],
    queryFn: () => base44.entities.UserProgress.list(),
    initialData: [],
  });

  const progress = progressList[0] || {
    xp: 0, level: 1, completed_modules: [], badges: [],
    completed_quizzes: [], quiz_scores: {}, current_module: 'gis_basics'
  };

  const initialModuleId = location.state?.moduleId || progress.current_module || MODULES[0].id;
  const [selectedModuleId, setSelectedModuleId] = useState(initialModuleId);
  const [view, setView] = useState('lesson'); // 'lesson' | 'quiz'

  useEffect(() => {
    if (location.state?.moduleId) setSelectedModuleId(location.state.moduleId);
  }, [location.state]);

  const selectedModule = MODULES.find(m => m.id === selectedModuleId) || MODULES[0];

  const updateProgress = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UserProgress.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userProgress'] }),
  });

  const handleQuizPass = (score) => {
    const wasAlreadyCompleted = progress.completed_modules?.includes(selectedModuleId);
    const newCompleted = wasAlreadyCompleted
      ? progress.completed_modules
      : [...(progress.completed_modules || []), selectedModuleId];

    const xpGain = wasAlreadyCompleted ? 0 : selectedModule.xp_reward;
    const newXP = (progress.xp || 0) + xpGain;
    const newLevel = Math.floor(newXP / 200) + 1;

    // Determine new badges
    const newBadges = [...(progress.badges || [])];
    const addBadge = (b) => { if (!newBadges.includes(b)) newBadges.push(b); };

    if (!wasAlreadyCompleted) {
      addBadge('first_steps');
      if (selectedModuleId === 'gis_basics') addBadge('map_navigator');
      if (selectedModuleId === 'turbine_placement') addBadge('turbine_placer');
      if (selectedModuleId === 'cable_routing') addBadge('cable_runner');
      if (selectedModuleId === 'wind_resource') addBadge('wind_analyst');
      if (selectedModuleId === 'site_suitability') addBadge('site_surveyor');
      if (selectedModuleId === 'turbine_layout') addBadge('layout_pro');
      if (score === selectedModule.quiz.questions.length) addBadge('quiz_ace');
      if (newCompleted.length === MODULES.length) addBadge('completionist');
    }

    const nextModuleIndex = MODULES.findIndex(m => !newCompleted.includes(m.id));
    const nextModule = nextModuleIndex >= 0 ? MODULES[nextModuleIndex].id : selectedModuleId;

    if (progress.id) {
      updateProgress.mutate({
        id: progress.id,
        data: {
          xp: newXP,
          level: newLevel,
          completed_modules: newCompleted,
          completed_quizzes: [...new Set([...(progress.completed_quizzes || []), selectedModule.quiz.id])],
          quiz_scores: { ...(progress.quiz_scores || {}), [selectedModule.quiz.id]: score },
          badges: newBadges,
          current_module: nextModule,
        }
      });
    }
  };

  const handleQuizFail = (score) => {
    if (progress.id) {
      updateProgress.mutate({
        id: progress.id,
        data: {
          quiz_scores: { ...(progress.quiz_scores || {}), [selectedModule.quiz.id]: score },
        }
      });
    }
    setView('lesson');
  };

  const isCompleted = progress.completed_modules?.includes(selectedModuleId);
  const colors = COLOR_MAP[selectedModule.color] || COLOR_MAP.blue;

  return (
    <div className="flex h-full">
      {/* Module sidebar */}
      <div className="w-56 shrink-0 bg-slate-900 border-r border-slate-800 overflow-y-auto hidden md:block">
        <div className="p-3 space-y-1">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider px-2 pb-2">Modules</p>
          {MODULES.map((mod, i) => {
            const done = progress.completed_modules?.includes(mod.id);
            const Icon = ICON_MAP[mod.icon] || BookOpen;
            const isActive = mod.id === selectedModuleId;

            return (
              <button
                key={mod.id}
                onClick={() => { setSelectedModuleId(mod.id); setView('lesson'); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all text-xs",
                  isActive ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded flex items-center justify-center shrink-0",
                  done ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-500"
                )}>
                  {done ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                </div>
                <span className="truncate font-medium">{mod.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Module header */}
        <div className={cn("px-6 py-4 border-b border-slate-800 flex items-center gap-4", colors.bg)}>
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors.bg, colors.border, "border")}>
            {React.createElement(ICON_MAP[selectedModule.icon] || BookOpen, { className: cn("w-5 h-5", colors.text) })}
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-white">{selectedModule.title}</h1>
            <p className="text-xs text-slate-400">{selectedModule.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {isCompleted && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Completed
              </span>
            )}
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">+{selectedModule.xp_reward} XP</span>
          </div>
          {/* Tabs */}
          <div className="flex rounded-lg overflow-hidden border border-slate-800">
            {[
              { id: 'lesson', label: 'Lessons' },
              { id: 'map', label: '🗺 Map Exercise' },
              { id: 'quiz', label: 'Quiz' },
            ].map(({ id, label }) => (
              <button key={id}
                onClick={() => setView(id)}
                className={cn("px-3 py-1.5 text-xs font-medium transition-colors",
                  view === id ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"
                )}
              >{label}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {view === 'lesson' && (
              <motion.div key="lesson" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <LessonView module={selectedModule} onComplete={() => setView('map')} />
              </motion.div>
            )}
            {view === 'map' && (
              <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-4">
                  <p className={cn("text-xs uppercase tracking-wider font-medium mb-1", colors.text)}>Interactive Map Exercise</p>
                  <h2 className="text-xl font-bold text-white">
                    {MAP_EXAMPLES[selectedModuleId]?.title || 'Map Exercise'}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Complete the steps on the map, then take the quiz.</p>
                </div>
                {MAP_EXAMPLES[selectedModuleId] ? (
                  <MapExample
                    steps={MAP_EXAMPLES[selectedModuleId].steps}
                    center={MAP_EXAMPLES[selectedModuleId].center}
                    zoom={MAP_EXAMPLES[selectedModuleId].zoom}
                    onComplete={() => setView('quiz')}
                  />
                ) : (
                  <div className="text-center py-10 text-slate-500 text-sm">No map exercise for this module yet.</div>
                )}
              </motion.div>
            )}
            {view === 'quiz' && (
              <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <QuizView
                  module={selectedModule}
                  onPass={handleQuizPass}
                  onFail={handleQuizFail}
                  previousScore={progress.quiz_scores?.[selectedModule.quiz.id]}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}