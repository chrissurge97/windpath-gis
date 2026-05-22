import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wind, CheckCircle2, Lock,
  Download, Play, RotateCcw, ExternalLink,
  BookOpen, ArrowRight
} from 'lucide-react';
import { loadProgress, resetProgress, getOverallProgress, ACADEMY_MODULES, ACADEMY_BADGES } from '@/lib/academyProgress';
import { TRAINING_FILES, downloadTrainingFile } from '@/lib/trainingDownloads';
import { saveCheckpoint, buildGlenhavenBlank, buildGlenhavenWithConstraints, buildGlenhavenCableChallenge, buildGlenhavenFinalChallenge } from '@/lib/academyModules';
import AcademyModuleView from '@/components/academy/AcademyModuleView';

const MODULE_ICONS = {
  bootcamp: '🖥️', polygons: '🗺️', importing: '📂',
  turbines: '🌀', cables: '⚡', analysis: '📊', challenge: '🏆'
};

const MODULE_COLORS = {
  bootcamp:  { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    text: 'text-cyan-400' },
  polygons:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  importing: { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400' },
  turbines:  { bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  text: 'text-orange-400' },
  cables:    { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  text: 'text-yellow-400' },
  analysis:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  text: 'text-purple-400' },
  challenge: { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400' },
};

const MODULE_DESCRIPTIONS = {
  bootcamp:  'Learn every control, panel, and mode through a systems check. Control room activation.',
  polygons:  'Map the Glenhaven site boundary, leased land, and hard exclusion zones.',
  importing: 'Download training files and import real GIS data into the planning tool.',
  turbines:  'Place 5–7 turbines, enable setback radii, and verify constraint compliance.',
  cables:    'Design the 33kV collection network — substation, cable strings, load checking.',
  analysis:  'Review AEP, capacity factor, and cable cost. Optimise for your chosen goal.',
  challenge: 'Full wind farm design from blank map to export-ready project. No hand-holding.',
};

const MODULE_SKILLS = {
  bootcamp:  ['Select/Pan/Draw modes', 'Panel navigation', 'Basemap switching', 'File operations'],
  polygons:  ['Drawing polygons', 'Layer management', 'Exclusion zones', 'Visibility control'],
  importing: ['GeoJSON import', 'CSV import', 'Layer classification', 'Data verification'],
  turbines:  ['Turbine placement', 'Wind data', 'Setback radii', 'Layout naming'],
  cables:    ['Substation placement', 'Cable routing', 'Snapping', 'Load checking'],
  analysis:  ['KPI reading', 'Weibull parameters', 'Design optimisation', 'Version saving'],
  challenge: ['Full workflow', 'Constraint compliance', 'Electrical design', 'Project export'],
};

function XPBar({ xp, level }) {
  const xpInLevel = xp % 300;
  const pct = (xpInLevel / 300) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] font-bold text-amber-400">
        {level}
      </div>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-slate-500">{xp} XP</span>
    </div>
  );
}

function BadgeGrid({ earned }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.values(ACADEMY_BADGES).map(b => {
        const isEarned = earned.includes(b.id);
        return (
          <div key={b.id} title={`${b.name}: ${b.desc}`}
            className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all',
              isEarned ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-slate-800/60 border border-slate-700/40 grayscale opacity-30'
            )}>
            {b.icon}
          </div>
        );
      })}
    </div>
  );
}

function ModuleCard({ mod, status, score, isLocked, onStart, onContinue, onReview, onOpenInPlanner }) {
  const colors = MODULE_COLORS[mod.id] || MODULE_COLORS.bootcamp;
  const icon = MODULE_ICONS[mod.id] || '📘';
  const isChallenge = mod.id === 'challenge';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'border rounded-xl overflow-hidden transition-all',
        isChallenge ? 'border-amber-500/30 bg-amber-500/5' : colors.border,
        isLocked ? 'opacity-60' : 'hover:brightness-110',
        status === 'complete' ? 'ring-1 ring-emerald-500/20' : ''
      )}
    >
      <div className={cn('px-4 py-3 flex items-center gap-3', colors.bg)}>
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-white truncate">{mod.title}</p>
            {isLocked && <Lock className="w-3 h-3 text-slate-500 shrink-0" />}
            {status === 'complete' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
            {status === 'in_progress' && <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />}
          </div>
          <p className="text-[10px] text-slate-500">{mod.estMin} min · {mod.xp} XP</p>
        </div>
        {status === 'complete' && score && (
          <div className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', colors.bg, colors.text, colors.border)}>
            {score}%
          </div>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        <p className="text-xs text-slate-400 leading-relaxed">{MODULE_DESCRIPTIONS[mod.id]}</p>
        <div className="flex flex-wrap gap-1">
          {(MODULE_SKILLS[mod.id] || []).map(skill => (
            <span key={skill} className={cn('text-[9px] px-1.5 py-0.5 rounded border', colors.bg, colors.border, colors.text)}>{skill}</span>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          {isLocked ? (
            <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-700/50 text-slate-500 text-xs rounded-lg border border-slate-700">
              <Lock className="w-3 h-3" /> Locked
            </button>
          ) : status === 'complete' ? (
            <>
              <button onClick={onReview} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition-colors">
                <BookOpen className="w-3 h-3" /> Review
              </button>
              <button onClick={onOpenInPlanner} className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg border transition-colors', colors.bg, colors.border, colors.text, 'hover:brightness-125')}>
                <ExternalLink className="w-3 h-3" /> Open in Planner
              </button>
            </>
          ) : status === 'in_progress' ? (
            <button onClick={onContinue} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors">
              <Play className="w-3 h-3" /> Continue
            </button>
          ) : (
            <button onClick={onStart} className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors', isChallenge ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500' : `${colors.bg} ${colors.border} ${colors.text} hover:brightness-125`)}>
              <Play className="w-3 h-3" /> {isChallenge ? 'Start Challenge' : 'Start Module'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function DownloadsPanel() {
  const [downloaded, setDownloaded] = useState({});
  return (
    <div className="space-y-2">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Training Data Files</p>
      {TRAINING_FILES.map(file => (
        <div key={file.id} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all', downloaded[file.id] ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-700 bg-slate-800/50')}>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{file.label}</p>
            <p className="text-[10px] text-slate-500 truncate">{file.description}</p>
          </div>
          <button
            onClick={() => { downloadTrainingFile(file.id); setDownloaded(prev => ({ ...prev, [file.id]: true })); }}
            className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border',
              downloaded[file.id] ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-700 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-600'
            )}>
            {downloaded[file.id] ? <CheckCircle2 className="w-3 h-3" /> : <Download className="w-3 h-3" />}
            {downloaded[file.id] ? 'Downloaded' : 'Download'}
          </button>
        </div>
      ))}
    </div>
  );
}

export default function Learn() {
  const location = useLocation();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(loadProgress());
  const [view, setView] = useState('hub');
  const [showDownloads, setShowDownloads] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
    if (location.state?.moduleId) {
      setView(location.state.moduleId);
    }
  }, [location.state]);

  const overallProgress = getOverallProgress();
  const lastActive = progress.lastActiveModule;

  const handleStartModule = (moduleId) => {
    const checkpointMap = {
      bootcamp: buildGlenhavenBlank, polygons: buildGlenhavenBlank,
      importing: buildGlenhavenBlank, turbines: buildGlenhavenWithConstraints,
      cables: buildGlenhavenCableChallenge, analysis: buildGlenhavenCableChallenge,
      challenge: buildGlenhavenFinalChallenge,
    };
    const builder = checkpointMap[moduleId];
    if (builder) saveCheckpoint(moduleId, builder());
    setView(moduleId);
  };

  const handleOpenInPlanner = (moduleId) => {
    const id = `academy_checkpoint_${moduleId}`;
    navigate('/planning', { state: { lessonProjectId: id, moduleId, lessonIndex: 0 } });
  };

  const handleReset = () => {
    if (!window.confirm('Reset all WindPath Academy progress? This cannot be undone.')) return;
    resetProgress();
    setProgress(loadProgress());
  };

  const isModuleLocked = (modId) => {
    if (modId === 'challenge') {
      const prevDone = ['bootcamp','polygons','importing','turbines','cables','analysis'];
      return prevDone.filter(id => progress.modules[id]?.status === 'complete').length < 4;
    }
    return false;
  };

  if (view !== 'hub') {
    return (
      <AcademyModuleView
        moduleId={view}
        onBack={() => { setProgress(loadProgress()); setView('hub'); }}
        onOpenInPlanner={handleOpenInPlanner}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-950">
      <div className="shrink-0 px-6 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Wind className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">WindPath Academy</h1>
            <p className="text-xs text-slate-400">Glenhaven Wind Farm — Guided Design Scenario</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setShowDownloads(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors">
              <Download className="w-3 h-3" /> Training Files
            </button>
            <button onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-500 hover:text-red-400 transition-colors">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Overall Progress</span>
              <span className="text-[10px] text-slate-400">{overallProgress.done}/{overallProgress.total} modules</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${overallProgress.percent}%` }} />
            </div>
          </div>
          <div className="w-48">
            <XPBar xp={progress.totalXP} level={progress.level} />
          </div>
        </div>
        {progress.badges.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] text-slate-600">Badges:</span>
            <BadgeGrid earned={progress.badges} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {showDownloads && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-slate-800">
              <div className="px-6 py-4 bg-slate-900/50">
                <DownloadsPanel />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-6 py-5 border-b border-slate-800">
          <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/5 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🏔️</div>
              <div className="flex-1">
                <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-medium mb-1">Guided Design Scenario</p>
                <h2 className="text-base font-bold text-white mb-1">Glenhaven Wind Farm</h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  You are a junior wind development analyst at GreenVolt Energy. Over the next 7 modules, you'll design an early-stage layout for the Glenhaven Wind Farm — from blank site to final export.
                </p>
                <div className="flex gap-3">
                  {lastActive && progress.modules[lastActive]?.status === 'in_progress' ? (
                    <button onClick={() => setView(lastActive)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-semibold text-white transition-colors">
                      <Play className="w-3.5 h-3.5" /> Continue: {ACADEMY_MODULES.find(m => m.id === lastActive)?.title}
                    </button>
                  ) : (
                    <button onClick={() => handleStartModule('bootcamp')}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-semibold text-white transition-colors">
                      <Play className="w-3.5 h-3.5" /> Start Full Scenario
                    </button>
                  )}
                  <button onClick={() => navigate('/planning')}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 border border-slate-700 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /> Open Planning Tool
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-4">Course Modules</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {ACADEMY_MODULES.map((mod) => {
              const mp = progress.modules[mod.id] || {};
              const status = mp.status || 'not_started';
              const locked = isModuleLocked(mod.id);
              return (
                <ModuleCard
                  key={mod.id}
                  mod={mod}
                  status={status}
                  score={mp.score}
                  isLocked={locked}
                  onStart={() => handleStartModule(mod.id)}
                  onContinue={() => setView(mod.id)}
                  onReview={() => setView(mod.id)}
                  onOpenInPlanner={() => handleOpenInPlanner(mod.id)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}