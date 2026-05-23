import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wind, CheckCircle2, Lock,
  Download, Play, RotateCcw, ExternalLink,
  BookOpen, ArrowRight, Trash2, Settings, X
} from 'lucide-react';
import { loadProgress, saveProgress, resetProgress, getOverallProgress, markModuleComplete, ACADEMY_MODULES, ACADEMY_BADGES } from '@/lib/academyProgress';
import confetti from 'canvas-confetti';
import { deleteAllTrainingProjects } from '@/lib/projectStorage';
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

function BadgeGrid({ earned, badgeRefs }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.values(ACADEMY_BADGES).map(b => {
        const isEarned = earned.includes(b.id);
        return (
          <div
            key={b.id}
            ref={el => { if (badgeRefs) badgeRefs.current[b.id] = el; }}
            title={`${b.name}: ${b.desc}`}
            className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all duration-500',
              isEarned ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-slate-800/60 border border-slate-700/40 grayscale opacity-30'
            )}>
            {b.icon}
          </div>
        );
      })}
    </div>
  );
}

// Map badge IDs to completion labels
const BADGE_LABELS = {
  first_steps:    'Module 1: Interface Bootcamp Complete',
  polygon_master: 'Module 2: Polygons & Exclusion Zones Complete',
  data_officer:   'Module 3: Importing Project Data Complete',
  turbine_placer: 'Module 4: Turbines & Setback Zones Complete',
  grid_engineer:  'Module 5: Cables & Electrical Layout Complete',
  analyst:        'Module 6: Analysis & Optimisation Complete',
  site_designer:  'Module 7: Final Design Challenge Complete',
  completionist:  '🎓 Congratulations on completing all modules!',
};

// Flying badge that animates from banner to badge slot
function FlyingBadge({ badge, fromRect, toRect, onDone }) {
  const isGraduate = badge.id === 'completionist';
  // Graduate badge lingers longer in the swell phase
  const swellDuration = isGraduate ? 3200 : 1800;
  const totalDuration = swellDuration + 700;

  const [phase, setPhase] = useState('swell'); // swell -> fly -> done

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fly'), swellDuration);
    const t2 = setTimeout(() => { setPhase('done'); onDone(); }, totalDuration);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === 'done') return null;

  const fromX = fromRect.left + fromRect.width / 2;
  const fromY = fromRect.top + fromRect.height / 2;
  const toX = toRect ? toRect.left + toRect.width / 2 : fromX;
  const toY = toRect ? toRect.top + toRect.height / 2 : fromY;

  const swellStyle = {
    position: 'fixed',
    left: fromX,
    top: fromY,
    transform: 'translate(-50%, -50%)',
    zIndex: 9999,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  };

  const flyStyle = {
    position: 'fixed',
    left: toX,
    top: toY,
    transform: 'translate(-50%, -50%)',
    zIndex: 9999,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'left 0.7s cubic-bezier(0.4,0,0.2,1), top 0.7s cubic-bezier(0.4,0,0.2,1)',
  };

  const label = BADGE_LABELS[badge.id] || badge.name;

  return (
    <div style={phase === 'swell' ? swellStyle : flyStyle}>
      <motion.div
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}
        initial={{ scale: 1, opacity: 1 }}
        animate={{
          scale: phase === 'swell' ? (isGraduate ? 3 : 2.5) : 0.45,
          opacity: phase === 'fly' ? 0.9 : 1,
        }}
        transition={phase === 'swell'
          ? { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }
          : { duration: 0.65, ease: [0.4, 0, 0.2, 1] }
        }
      >
        <span style={{ fontSize: '3.5rem', lineHeight: 1, display: 'block' }}>{badge.icon}</span>
        {phase === 'swell' && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            style={{
              background: isGraduate ? 'linear-gradient(135deg, rgba(245,158,11,0.95), rgba(16,185,129,0.95))' : 'rgba(15,23,42,0.92)',
              border: isGraduate ? '1px solid rgba(245,158,11,0.6)' : '1px solid rgba(100,116,139,0.4)',
              borderRadius: '10px',
              padding: '6px 14px',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{
              fontSize: isGraduate ? '0.55rem' : '0.5rem',
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '0.02em',
              textAlign: 'center',
              display: 'block',
            }}>
              {label}
            </span>
          </motion.div>
        )}
      </motion.div>
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

function DevConfigPanel({ progress, onClose, onRefresh }) {
  const handleToggle = (modId) => {
    const p = loadProgress();
    const current = p.modules[modId]?.status;
    if (current === 'complete') {
      p.modules[modId].status = 'not_started';
      delete p.modules[modId].completedAt;
      saveProgress(p);
    } else {
      markModuleComplete(modId, 100);
    }
    onRefresh();
  };

  const handleUnlockChallenge = () => {
    // Mark all prerequisite modules complete
    ['bootcamp','polygons','importing','turbines','cables','analysis'].forEach(id => {
      const p = loadProgress();
      if (p.modules[id]?.status !== 'complete') markModuleComplete(id, 100);
    });
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-96 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white">Dev Config — Progress Override</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">Mark modules complete / incomplete for testing</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-1.5 mb-4">
          {ACADEMY_MODULES.map(mod => {
            const isComplete = progress.modules[mod.id]?.status === 'complete';
            return (
              <div key={mod.id} className="flex items-center justify-between px-3 py-2 bg-slate-800/60 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-base">{MODULE_ICONS[mod.id]}</span>
                  <span className="text-xs text-slate-300 font-medium">{mod.title}</span>
                </div>
                <button
                  onClick={() => handleToggle(mod.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all',
                    isComplete
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-300'
                      : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-300'
                  )}>
                  {isComplete ? <><CheckCircle2 className="w-3 h-3" /> Complete</> : <>Mark Done</>}
                </button>
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-800 pt-3 space-y-2">
          <button onClick={handleUnlockChallenge}
            className="w-full py-2 px-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold rounded-lg hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-2">
            🏆 Unlock Final Challenge (mark 6 modules complete)
          </button>
          <button onClick={onClose}
            className="w-full py-2 px-3 bg-slate-800 border border-slate-700 text-slate-400 text-xs rounded-lg hover:text-white transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function CurrentModuleBanner({ progress, onStart, onContinue, onNavigatePlanner }) {
  // Find the current active module: first in_progress, else first not_started, else null (all done)
  const currentMod = ACADEMY_MODULES.find(m => progress.modules[m.id]?.status === 'in_progress')
    || ACADEMY_MODULES.find(m => !progress.modules[m.id] || progress.modules[m.id]?.status === 'not_started')
    || null;

  const [justCompleted, setJustCompleted] = useState(null); // modId that just got completed
  const [visible, setVisible] = useState(true);
  const prevProgressRef = useRef(progress);

  // Detect when currentMod changes to 'complete' — show tick then fade
  useEffect(() => {
    const prev = prevProgressRef.current;
    prevProgressRef.current = progress;
    if (!currentMod) return;
    const wasNotComplete = prev.modules[currentMod.id]?.status !== 'complete';
    const isNowComplete = progress.modules[currentMod.id]?.status === 'complete';
    if (wasNotComplete && isNowComplete) {
      setJustCompleted(currentMod.id);
      setVisible(true);
      // After showing tick for 1.5s, fade out
      setTimeout(() => setVisible(false), 1500);
      // Re-show for next module
      setTimeout(() => { setJustCompleted(null); setVisible(true); }, 2200);
    }
  }, [progress, currentMod]);

  if (!currentMod) {
    // All done
    return (
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-4">
          <div className="text-3xl">🏆</div>
          <div className="flex-1">
            <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-medium mb-1">All Modules Complete</p>
            <h2 className="text-base font-bold text-white mb-1">Glenhaven Wind Farm</h2>
            <p className="text-xs text-slate-400">You've completed the full design scenario. Outstanding work!</p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
        </div>
      </div>
    );
  }

  const colors = MODULE_COLORS[currentMod.id] || MODULE_COLORS.bootcamp;
  const icon = MODULE_ICONS[currentMod.id] || '📘';
  const modStatus = progress.modules[currentMod.id]?.status || 'not_started';
  const totalSteps = currentMod.steps?.length || 1;
  // Estimate completion: count completed steps stored, fallback to 0
  const completedSteps = progress.modules[currentMod.id]?.completedSteps || 0;
  const pct = modStatus === 'complete' ? 100 : Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className="px-6 py-5 border-b border-slate-800">
      <AnimatePresence mode="wait">
        {visible && (
          <motion.div
            key={currentMod.id + (justCompleted ? '_done' : '')}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
            className={cn('border rounded-xl p-4 flex items-center gap-4', colors.bg, colors.border)}
          >
            <div className="text-3xl shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-[10px] uppercase tracking-wider font-medium mb-0.5', colors.text)}>
                {modStatus === 'in_progress' ? 'Current Module' : 'Up Next'}
              </p>
              <h2 className="text-sm font-bold text-white truncate">{currentMod.title}</h2>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{MODULE_DESCRIPTIONS[currentMod.id]}</p>
              {modStatus === 'in_progress' && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[9px] text-slate-500 shrink-0">{pct}%</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {justCompleted === currentMod.id ? (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                >
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </motion.div>
              ) : modStatus === 'in_progress' ? (
                <button onClick={() => onContinue(currentMod.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-semibold text-white transition-colors">
                  <Play className="w-3 h-3" /> Continue
                </button>
              ) : (
                <button onClick={() => onStart(currentMod.id)}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors', colors.bg, colors.border, colors.text, 'hover:brightness-125')}>
                  <Play className="w-3 h-3" /> Start
                </button>
              )}
              <button onClick={onNavigatePlanner}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors">
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Learn() {
  const location = useLocation();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(loadProgress());
  const [view, setView] = useState('hub');
  const [showDownloads, setShowDownloads] = useState(false);
  const [cleaningServer, setCleaningServer] = useState(false);
  const [showDevConfig, setShowDevConfig] = useState(false);
  const [autoCompleting, setAutoCompleting] = useState(false);
  const [flyingBadges, setFlyingBadges] = useState([]); // [{id, badge, fromRect, toRect}]
  const confettiIntervalRef = useRef(null);
  const badgeRefs = useRef({});
  const bannerRef = useRef(null);
  const prevBadgesRef = useRef(progress.badges);

  // Detect newly earned badges and launch flying animation
  useEffect(() => {
    const prev = prevBadgesRef.current;
    const curr = progress.badges;
    const newBadges = curr.filter(b => !prev.includes(b));
    prevBadgesRef.current = curr;

    if (newBadges.length === 0) return;

    // Get source rect from banner
    const fromEl = bannerRef.current;
    if (!fromEl) return;
    const fromRect = fromEl.getBoundingClientRect();

    // If completionist badge arrives alongside another badge, delay it by 5s
    const nonGraduate = newBadges.filter(b => b !== 'completionist');
    const hasGraduate = newBadges.includes('completionist');

    nonGraduate.forEach((badgeId, i) => {
      const badge = ACADEMY_BADGES[badgeId];
      if (!badge) return;
      setTimeout(() => {
        const toEl = badgeRefs.current[badgeId];
        const toRect = toEl ? toEl.getBoundingClientRect() : null;
        const uid = `${badgeId}_${Date.now()}_${i}`;
        setFlyingBadges(prev => [...prev, { uid, badge, fromRect, toRect }]);
      }, i * 200);
    });

    if (hasGraduate) {
      const badge = ACADEMY_BADGES['completionist'];
      // Delay 5s after the last non-graduate badge (or 5s if none)
      const baseDelay = nonGraduate.length > 0 ? 5000 : 0;
      setTimeout(() => {
        const toEl = badgeRefs.current['completionist'];
        const toRect = toEl ? toEl.getBoundingClientRect() : null;
        const uid = `completionist_${Date.now()}`;
        setFlyingBadges(prev => [...prev, { uid, badge, fromRect, toRect }]);
      }, baseDelay);
    }
  }, [progress.badges]);

  const handleAutoComplete = () => {
    if (autoCompleting) return;
    setAutoCompleting(true);

    // Start continuous confetti
    confettiIntervalRef.current = setInterval(() => {
      confetti({
        particleCount: 18,
        spread: 70,
        origin: { x: Math.random(), y: Math.random() * 0.6 + 0.1 },
        colors: ['#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', '#f97316'],
        gravity: 0.8,
        scalar: 0.9,
        ticks: 120,
      });
    }, 400);

    const modules = ACADEMY_MODULES.map(m => m.id);
    modules.forEach((modId, i) => {
      setTimeout(() => {
        markModuleComplete(modId, 100);
        setProgress(loadProgress());
        // Big burst on each module
        confetti({ particleCount: 80, spread: 100, origin: { x: 0.5, y: 0.4 }, colors: ['#10b981', '#facc15', '#38bdf8'] });
        if (i === modules.length - 1) {
          // Final burst + stop
          setTimeout(() => {
            confetti({ particleCount: 200, spread: 160, origin: { x: 0.5, y: 0.3 } });
            clearInterval(confettiIntervalRef.current);
            setAutoCompleting(false);
          }, 800);
        }
      }, i * 3000);
    });
  };

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
      challenge: buildGlenhavenBlank,
    };
    const builder = checkpointMap[moduleId];
    // saveCheckpoint stores to localStorage only — no server save
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

  const handleDeleteTrainingFiles = async () => {
    if (!window.confirm('Delete all training project files from the server? This frees up storage — your progress records are kept.')) return;
    setCleaningServer(true);
    try {
      const n = await deleteAllTrainingProjects();
      window.alert(`Deleted ${n} training project${n !== 1 ? 's' : ''} from the server.`);
    } catch (e) {
      window.alert('Failed to clean server: ' + e.message);
    }
    setCleaningServer(false);
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
    <>
    {showDevConfig && (
      <DevConfigPanel
        progress={progress}
        onClose={() => setShowDevConfig(false)}
        onRefresh={() => setProgress(loadProgress())}
      />
    )}
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
            <button onClick={handleDeleteTrainingFiles} disabled={cleaningServer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-500 hover:text-orange-400 transition-colors disabled:opacity-50"
              title="Remove training project files from server storage">
              {cleaningServer
                ? <><svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Cleaning…</>
                : <><Trash2 className="w-3 h-3" /> Clean Server</>
              }
            </button>
            <button onClick={() => setShowDevConfig(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-500 hover:text-purple-400 transition-colors"
              title="Dev: override module progress">
              <Settings className="w-3 h-3" /> Dev Config
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
            <BadgeGrid earned={progress.badges} badgeRefs={badgeRefs} />
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

        <div ref={bannerRef}>
          <CurrentModuleBanner progress={progress} onStart={handleStartModule} onContinue={(id) => setView(id)} onNavigatePlanner={() => navigate('/planning')} />
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
      {/* Flying badge animations */}
      {flyingBadges.map(fb => (
        <FlyingBadge
          key={fb.uid}
          badge={fb.badge}
          fromRect={fb.fromRect}
          toRect={fb.toRect}
          onDone={() => setFlyingBadges(prev => prev.filter(x => x.uid !== fb.uid))}
        />
      ))}

      {/* Hidden auto-complete button — bottom left */}
      <button
        onClick={handleAutoComplete}
        disabled={autoCompleting}
        title=""
        className="fixed bottom-3 left-3 z-50 w-4 h-4 rounded-full opacity-0 hover:opacity-10 bg-white transition-opacity cursor-default"
      />
    </>
  );
}