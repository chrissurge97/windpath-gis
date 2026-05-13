import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  X, Minimize2, Maximize2, BookOpen, ChevronLeft, ChevronRight,
  CheckCircle2, MousePointer, Pentagon, Wind, Zap, Target,
  Eye, Layers, BarChart2, Settings, Map, Upload, Type, Save
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MODULES } from '@/lib/trainingModules';

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400'    },
  cyan:   { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    text: 'text-cyan-400'    },
  orange: { bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  text: 'text-orange-400'  },
  purple: { bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  text: 'text-purple-400'  },
  green:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  yellow: { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  text: 'text-yellow-400'  },
};

// Per-lesson config: map snap location + which buttons to highlight + tasks to complete
const LESSON_CONFIG = {
  land_acquisition: {
    0: { center: [53.72, -8.45], zoom: 12, highlight: ['btn-select', 'btn-draw_polygon', 'btn-place_turbine', 'btn-draw_cable', 'btn-place_substation'], tasks: [{ id: 'polygon', label: 'Activate Polygon mode (Draw Tools)', watch: 'mode', value: 'draw_polygon' }, { id: 'turbine', label: 'Activate Place Turbine mode', watch: 'mode', value: 'place_turbine' }] },
    1: { center: [53.72, -8.45], zoom: 12, highlight: ['btn-file', 'btn-import', 'btn-export'], tasks: [] },
    2: { center: [53.72, -8.45], zoom: 12, highlight: ['btn-basemap', 'btn-substations'], tasks: [] },
    3: { center: [53.72, -8.45], zoom: 12, highlight: ['tab-turbines', 'tab-cables'], tasks: [{ id: 'turbines_tab', label: 'Click the Turbines tab', watch: 'tab', value: 'turbines' }, { id: 'cables_tab', label: 'Click the Cables tab', watch: 'tab', value: 'cables' }] },
    4: { center: [53.72, -8.45], zoom: 12, highlight: ['tab-analysis', 'tab-layers', 'tab-types'], tasks: [{ id: 'analysis_tab', label: 'Click the Analysis tab', watch: 'tab', value: 'analysis' }, { id: 'layers_tab', label: 'Click the Layers tab', watch: 'tab', value: 'layers' }] },
  },
  turbine_placement: {
    0: { center: [53.72, -8.45], zoom: 13, highlight: ['btn-draw_polygon'], tasks: [{ id: 'polygon_mode', label: 'Activate Polygon mode', watch: 'mode', value: 'draw_polygon' }] },
    1: { center: [53.72, -8.45], zoom: 13, highlight: ['btn-select'], tasks: [{ id: 'select', label: 'Switch to Select mode', watch: 'mode', value: 'select' }] },
    2: { center: [53.72, -8.45], zoom: 13, highlight: ['btn-select'], tasks: [] },
    3: { center: [53.72, -8.45], zoom: 13, highlight: ['tab-layers'], tasks: [{ id: 'layers_tab', label: 'Open the Layers tab', watch: 'tab', value: 'layers' }] },
    4: { center: [53.72, -8.45], zoom: 13, highlight: ['tab-layers'], tasks: [] },
  },
  cable_routing: {
    0: { center: [53.72, -8.45], zoom: 13, highlight: ['tab-turbines', 'tab-types'], tasks: [{ id: 'turbines_tab', label: 'Open the Turbines tab', watch: 'tab', value: 'turbines' }] },
    1: { center: [53.72, -8.45], zoom: 12, highlight: ['btn-place_turbine'], tasks: [{ id: 'turbine_mode', label: 'Activate Place Turbine mode', watch: 'mode', value: 'place_turbine' }] },
    2: { center: [53.72, -8.45], zoom: 13, highlight: ['btn-select'], tasks: [{ id: 'select', label: 'Switch to Select mode', watch: 'mode', value: 'select' }] },
    3: { center: [53.72, -8.45], zoom: 13, highlight: ['tab-turbines'], tasks: [{ id: 'turbines_tab', label: 'Open Turbines tab', watch: 'tab', value: 'turbines' }] },
    4: { center: [53.72, -8.45], zoom: 12, highlight: ['btn-select'], tasks: [] },
  },
  wind_resource: {
    0: { center: [53.72, -8.45], zoom: 13, highlight: ['btn-draw_cable'], tasks: [] },
    1: { center: [53.72, -8.45], zoom: 13, highlight: ['tab-cables'], tasks: [{ id: 'cables_tab', label: 'Open Cables tab', watch: 'tab', value: 'cables' }] },
    2: { center: [53.72, -8.45], zoom: 13, highlight: ['btn-draw_cable'], tasks: [{ id: 'cable_mode', label: 'Activate Draw Cable mode', watch: 'mode', value: 'draw_cable' }] },
    3: { center: [53.72, -8.45], zoom: 13, highlight: ['btn-place_substation'], tasks: [{ id: 'sub_mode', label: 'Activate Substation mode', watch: 'mode', value: 'place_substation' }] },
    4: { center: [53.72, -8.45], zoom: 13, highlight: ['tab-analysis'], tasks: [{ id: 'analysis_tab', label: 'Open Analysis tab', watch: 'tab', value: 'analysis' }] },
  },
  layer_data: {
    0: { center: [53.72, -8.45], zoom: 12, highlight: ['tab-layers'], tasks: [{ id: 'layers_tab', label: 'Open Layers tab', watch: 'tab', value: 'layers' }] },
    1: { center: [53.72, -8.45], zoom: 13, highlight: ['tab-layers', 'btn-draw_polygon'], tasks: [{ id: 'polygon_mode', label: 'Activate Polygon mode', watch: 'mode', value: 'draw_polygon' }] },
    2: { center: [53.72, -8.45], zoom: 12, highlight: ['btn-import'], tasks: [] },
    3: { center: [53.72, -8.45], zoom: 12, highlight: ['tab-layers'], tasks: [] },
    4: { center: [53.72, -8.45], zoom: 12, highlight: ['tab-analysis'], tasks: [{ id: 'analysis_tab', label: 'Open Analysis tab', watch: 'tab', value: 'analysis' }] },
  },
  site_constraints: {
    0: { center: [53.72, -8.45], zoom: 11, highlight: ['btn-draw_polygon', 'tab-layers'], tasks: [{ id: 'polygon_mode', label: 'Activate Polygon mode', watch: 'mode', value: 'draw_polygon' }] },
    1: { center: [53.72, -8.45], zoom: 12, highlight: ['btn-draw_polygon', 'tab-layers'], tasks: [] },
    2: { center: [53.72, -8.45], zoom: 12, highlight: ['btn-place_turbine', 'tab-turbines'], tasks: [{ id: 'turbine_mode', label: 'Activate Place Turbine mode', watch: 'mode', value: 'place_turbine' }] },
    3: { center: [53.72, -8.45], zoom: 12, highlight: ['btn-select'], tasks: [] },
    4: { center: [53.72, -8.45], zoom: 12, highlight: ['btn-place_substation', 'btn-draw_cable'], tasks: [] },
    5: { center: [53.72, -8.45], zoom: 11, highlight: ['btn-export', 'btn-file'], tasks: [] },
  },
};

const HIGHLIGHT_LABELS = {
  'btn-select':           { label: 'Select',         icon: MousePointer },
  'btn-draw_polygon':     { label: 'Polygon',         icon: Pentagon     },
  'btn-place_turbine':    { label: 'Turbine',         icon: Wind         },
  'btn-draw_cable':       { label: 'Cable',           icon: Zap          },
  'btn-place_substation': { label: 'Substation',      icon: Target       },
  'btn-file':             { label: 'File Menu',       icon: Save         },
  'btn-import':           { label: 'Import',          icon: Upload       },
  'btn-export':           { label: 'Export',          icon: Map          },
  'btn-basemap':          { label: 'Base Map',        icon: Map          },
  'btn-substations':      { label: 'Substations',     icon: Target       },
  'btn-place_text':       { label: 'Place Text',      icon: Type         },
  'tab-turbines':         { label: 'Turbines Tab',    icon: Wind         },
  'tab-cables':           { label: 'Cables Tab',      icon: Zap          },
  'tab-analysis':         { label: 'Analysis Tab',    icon: BarChart2    },
  'tab-layers':           { label: 'Layers Tab',      icon: Layers       },
  'tab-types':            { label: 'Types Tab',       icon: Settings     },
};

function HighlightBadge({ id }) {
  const cfg = HIGHLIGHT_LABELS[id] || { label: id, icon: Eye };
  const Icon = cfg.icon;
  return (
    <span className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded px-1.5 py-0.5 text-[10px] font-medium">
      <Icon className="w-2.5 h-2.5" /> {cfg.label}
    </span>
  );
}

export default function LessonGuide({ moduleId, initialLessonIndex = 0, mapRef, onClose }) {
  const navigate = useNavigate();
  const module = MODULES.find(m => m.id === moduleId);
  const [lessonIndex, setLessonIndex] = useState(initialLessonIndex);
  const [minimized, setMinimized] = useState(false);
  const [completedTasks, setCompletedTasks] = useState({});

  // Define these variables unconditionally for hooks
  let config = {};
  let tasks = [];
  let highlights = [];
  if (module) {
    config = LESSON_CONFIG[moduleId]?.[lessonIndex] || {};
    tasks = config.tasks || [];
    highlights = config.highlight || [];
  }

  // Expose highlights globally so Planning toolbar can read them
  useEffect(() => {
    if (!module) return;
    window.__lessonHighlights__ = highlights;
    return () => { window.__lessonHighlights__ = []; };
  }, [highlights.join(','), module]);

  // Snap map to lesson location
  useEffect(() => {
    if (!module || !config.center || !mapRef?.current) return;
    const [lat, lng] = config.center;
    setTimeout(() => {
      mapRef.current.setView([lat, lng], config.zoom || 12, { animate: true, duration: 0.8 });
    }, 200);
  }, [lessonIndex, module, config.center, config.zoom]);

  // Poll for task completion via global state set by Planning
  useEffect(() => {
    if (!module || !tasks.length) return;
    const poll = setInterval(() => {
      const state = window.__lessonGuideState__;
      if (!state) return;
      const next = { ...completedTasks };
      let changed = false;
      tasks.forEach(t => {
        if (!next[t.id] && state[t.watch] === t.value) { next[t.id] = true; changed = true; }
      });
      if (changed) setCompletedTasks(next);
    }, 300);
    return () => clearInterval(poll);
  }, [tasks, completedTasks, module]);

  // Reset tasks on lesson change
  useEffect(() => { setCompletedTasks({}); }, [lessonIndex]);

  if (!module) return null;

  const lesson = module.lessons[lessonIndex];
  const isLast = lessonIndex === module.lessons.length - 1;
  const colors = COLOR_MAP[module.color] || COLOR_MAP.blue;

  const allTasksDone = tasks.length === 0 || tasks.every(t => completedTasks[t.id]);

  const advance = () => {
    if (isLast) navigate('/learn', { state: { moduleId } });
    else { setLessonIndex(i => i + 1); setCompletedTasks({}); }
  };

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className={cn(
          "absolute bottom-4 left-4 z-[1500] w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-all group hover:scale-110 bg-gradient-to-br",
          `from-${module.color}-600 to-${module.color}-800`
        )}
        title={`${module.title} — Lesson ${lessonIndex + 1}/${module.lessons.length}`}
      >
        <BookOpen className="w-5 h-5 text-white" />
      </button>
    );
  }

  return (
    <div
      className="absolute bottom-4 right-4 z-[1500] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      style={{ width: '340px', maxHeight: 'calc(100vh - 120px)' }}
    >
      {/* Header */}
      <div className={cn('flex items-center gap-2 px-3 py-2.5 border-b border-slate-700 shrink-0', colors.bg)}>
        <BookOpen className={cn('w-3.5 h-3.5 shrink-0', colors.text)} />
        <div className="flex-1 min-w-0">
          <p className={cn('text-[10px] font-semibold uppercase tracking-wider', colors.text)}>{module.title}</p>
          <p className="text-[10px] text-slate-500 truncate">{lesson.title}</p>
        </div>
        <button onClick={() => setMinimized(true)} className="p-0.5 text-slate-500 hover:text-white"><Minimize2 className="w-3 h-3" /></button>
        <button onClick={onClose} className="p-0.5 text-slate-500 hover:text-white"><X className="w-3 h-3" /></button>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1 px-3 pt-2.5 shrink-0">
        {module.lessons.map((_, i) => (
          <button key={i} onClick={() => { setLessonIndex(i); setCompletedTasks({}); }}
            className={cn('h-1 flex-1 rounded-full transition-all', i <= lessonIndex ? 'bg-emerald-500' : 'bg-slate-700')} />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-1 space-y-3">
        <p className="text-sm font-semibold text-white">{lesson.title}</p>
        <div className={cn('rounded-xl border p-3 text-xs leading-relaxed text-slate-300 whitespace-pre-line', colors.bg, colors.border)}>
          {lesson.content}
        </div>

        {/* Highlighted buttons legend */}
        {highlights.length > 0 && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-2.5">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1.5">📍 Look for these buttons</p>
            <div className="flex flex-wrap gap-1.5">
              {highlights.map(h => <HighlightBadge key={h} id={h} />)}
            </div>
          </div>
        )}

        {/* Interactive tasks */}
        {tasks.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider">✅ Complete these steps to continue</p>
            {tasks.map(task => {
              const done = completedTasks[task.id];
              return (
                <div key={task.id} className={cn(
                  'flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs border transition-all',
                  done ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-800/60 border-slate-700 text-slate-400'
                )}>
                  {done
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-600 shrink-0 animate-pulse" />
                  }
                  <span>{task.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2 px-3 pb-3 pt-2 shrink-0 border-t border-slate-800">
        <button
          onClick={() => { if (lessonIndex > 0) { setLessonIndex(i => i - 1); setCompletedTasks({}); } }}
          disabled={lessonIndex === 0}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30 px-2 py-1.5"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button
          onClick={advance}
          disabled={!allTasksDone}
          className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
            allTasksDone ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
          )}
        >
          {isLast ? 'Finish & Return to Learn' : 'Next Lesson'} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}