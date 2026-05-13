import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Minimize2, Maximize2, BookOpen, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
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

export default function LessonGuide({ moduleId, initialLessonIndex = 0, onClose }) {
  const navigate = useNavigate();
  const module = MODULES.find(m => m.id === moduleId);
  const [lessonIndex, setLessonIndex] = useState(initialLessonIndex);
  const [minimized, setMinimized] = useState(false);

  if (!module) return null;

  const lesson = module.lessons[lessonIndex];
  const isLast = lessonIndex === module.lessons.length - 1;
  const colors = COLOR_MAP[module.color] || COLOR_MAP.blue;

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="absolute bottom-20 right-4 z-[1500] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl px-3 py-2.5 flex items-center gap-2 hover:bg-slate-800 transition-all group"
      >
        <BookOpen className={cn('w-4 h-4 shrink-0', colors.text)} />
        <div className="flex flex-col items-start">
          <span className="text-xs text-white font-semibold leading-tight">{module.title}</span>
          <span className="text-[10px] text-slate-400">Lesson {lessonIndex + 1}/{module.lessons.length}</span>
        </div>
        <Maximize2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-white ml-1 transition-colors" />
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
        <button onClick={() => setMinimized(true)} className="p-0.5 text-slate-500 hover:text-white">
          <Minimize2 className="w-3 h-3" />
        </button>
        <button onClick={onClose} className="p-0.5 text-slate-500 hover:text-white">
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Lesson progress dots */}
      <div className="flex gap-1 px-3 pt-2.5 shrink-0">
        {module.lessons.map((_, i) => (
          <button
            key={i}
            onClick={() => setLessonIndex(i)}
            className={cn(
              'h-1 flex-1 rounded-full transition-all',
              i <= lessonIndex ? 'bg-emerald-500' : 'bg-slate-700'
            )}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-1">
        <p className="text-sm font-semibold text-white mb-2">{lesson.title}</p>
        <div className={cn('rounded-xl border p-3 text-xs leading-relaxed text-slate-300 whitespace-pre-line', colors.bg, colors.border)}>
          {lesson.content}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2 px-3 pb-3 pt-2 shrink-0 border-t border-slate-800">
        <button
          onClick={() => { if (lessonIndex > 0) setLessonIndex(i => i - 1); }}
          disabled={lessonIndex === 0}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors px-2 py-1.5"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        {isLast ? (
          <button
            onClick={() => navigate('/learn', { state: { moduleId } })}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all bg-emerald-600 hover:bg-emerald-500 text-white')}
          >
            Back to Learn <ExternalLink className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={() => setLessonIndex(i => i + 1)}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all bg-slate-700 hover:bg-slate-600 text-white')}
          >
            Next Lesson <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}