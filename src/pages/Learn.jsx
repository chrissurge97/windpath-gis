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
  Award, Star, Trophy, CheckCircle2, ChevronRight, ChevronLeft, BarChart2
} from 'lucide-react';
import MapExample from '@/components/learn/MapExample';
import { MAP_EXAMPLES } from '@/lib/mapExamples';

const ICON_MAP = { Map, BookOpen, Wind, Zap, Layers, ShieldAlert, CircleDot, Award, Star, Trophy, BarChart2 };
const COLOR_MAP = {
  blue:   { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400',    badge: 'bg-blue-500'    },
  cyan:   { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    text: 'text-cyan-400',    badge: 'bg-cyan-500'    },
  orange: { bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  text: 'text-orange-400',  badge: 'bg-orange-500'  },
  purple: { bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  text: 'text-purple-400',  badge: 'bg-purple-500'  },
  green:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500' },
  yellow: { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  text: 'text-yellow-400',  badge: 'bg-yellow-500'  },
};

// Badge IDs awarded per module
const MODULE_BADGE = {
  land_acquisition: 'land_mapper',
  turbine_placement: 'turbine_placer',
  cable_routing: 'cable_runner',
  wind_resource: 'wind_analyst',
  layer_data: 'layer_master',
  site_constraints: 'site_surveyor',
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
          <div className={cn('rounded-xl border p-5 text-sm leading-relaxed text-slate-300', colors.bg, colors.border)}>
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
          {isLast ? 'Go to Map Exercise' : 'Next Lesson'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
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
    completed_quizzes: [], quiz_scores: {}, current_module: MODULES[0].id,
  };

  const initialModuleId = location.state?.moduleId || progress.current_module || MODULES[0].id;
  const [selectedModuleId, setSelectedModuleId] = useState(initialModuleId);
  const [view, setView] = useState('lesson'); // 'lesson' | 'map'

  useEffect(() => {
    if (location.state?.moduleId) setSelectedModuleId(location.state.moduleId);
  }, [location.state]);

  const selectedModule = MODULES.find(m => m.id === selectedModuleId) || MODULES[0];

  const updateProgress = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UserProgress.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userProgress'] }),
  });

  // Called when the map scenario is completed
  const handleScenarioComplete = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    const wasAlreadyCompleted = progress.completed_modules?.includes(selectedModuleId);
    if (wasAlreadyCompleted) return; // already awarded XP

    const newCompleted = [...(progress.completed_modules || []), selectedModuleId];
    const xpGain = selectedModule.xp_reward;
    const newXP = (progress.xp || 0) + xpGain;
    const newLevel = Math.floor(newXP / 200) + 1;

    const newBadges = [...(progress.badges || [])];
    const addBadge = (b) => { if (!newBadges.includes(b)) newBadges.push(b); };

    addBadge('first_steps');
    const moduleBadge = MODULE_BADGE[selectedModuleId];
    if (moduleBadge) addBadge(moduleBadge);
    if (newCompleted.length === MODULES.length) addBadge('completionist');

    const nextModuleIdx = MODULES.findIndex(m => !newCompleted.includes(m.id));
    const nextModule = nextModuleIdx >= 0 ? MODULES[nextModuleIdx].id : selectedModuleId;

    if (progress.id) {
      updateProgress.mutate({
        id: progress.id,
        data: {
          xp: newXP,
          level: newLevel,
          completed_modules: newCompleted,
          badges: newBadges,
          current_module: nextModule,
        },
      });
    }
  };

  const isCompleted = progress.completed_modules?.includes(selectedModuleId);
  const colors = COLOR_MAP[selectedModule.color] || COLOR_MAP.blue;

  return (
    <div className="flex h-full">
      {/* Scenario sidebar */}
      <div className="w-56 shrink-0 bg-slate-900 border-r border-slate-800 overflow-y-auto hidden md:block">
        <div className="p-3 space-y-1">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider px-2 pb-2">Training Scenarios</p>
          {MODULES.map((mod) => {
            const done = progress.completed_modules?.includes(mod.id);
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
                <div className={cn(
                  'w-6 h-6 rounded flex items-center justify-center shrink-0',
                  done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
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
        {/* Header */}
        <div className={cn('px-6 py-4 border-b border-slate-800 flex items-center gap-4 flex-wrap', colors.bg)}>
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border shrink-0', colors.bg, colors.border)}>
            {React.createElement(ICON_MAP[selectedModule.icon] || BookOpen, { className: cn('w-5 h-5', colors.text) })}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white truncate">{selectedModule.title}</h1>
            <p className="text-xs text-slate-400 truncate">{selectedModule.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isCompleted && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Completed
              </span>
            )}
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">+{selectedModule.xp_reward} XP</span>
          </div>
          {/* Tabs */}
          <div className="flex rounded-lg overflow-hidden border border-slate-800 shrink-0">
            {[
              { id: 'lesson', label: 'Lessons' },
              { id: 'map', label: '🗺 Scenario' },
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
                <LessonView module={selectedModule} onComplete={() => setView('map')} />
              </motion.div>
            )}
            {view === 'map' && (
              <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-4">
                  <p className={cn('text-xs uppercase tracking-wider font-medium mb-1', colors.text)}>
                    Interactive Scenario
                  </p>
                  <h2 className="text-xl font-bold text-white">
                    {MAP_EXAMPLES[selectedModuleId]?.title || 'Map Scenario'}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Work through each step. Complete the scenario to earn XP and unlock a badge.
                  </p>
                </div>
                {MAP_EXAMPLES[selectedModuleId] ? (
                  <MapExample
                    key={selectedModuleId}
                    steps={MAP_EXAMPLES[selectedModuleId].steps}
                    center={MAP_EXAMPLES[selectedModuleId].center}
                    zoom={MAP_EXAMPLES[selectedModuleId].zoom}
                    onComplete={handleScenarioComplete}
                  />
                ) : (
                  <div className="text-center py-10 text-slate-500 text-sm">
                    No map scenario for this module yet.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}