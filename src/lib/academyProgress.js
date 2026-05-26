/**
 * WindPath Academy — Training Progress & Event System
 * localStorage-backed, event-driven training state management
 */

const PROGRESS_KEY = 'windpath_academy_progress';
const EVENTS_KEY = 'windpath_academy_events';
const MAX_EVENTS = 200;

export const ACADEMY_MODULES = [
  { id: 'bootcamp',    title: 'Interface Bootcamp',           xp: 100, estMin: 10 },
  { id: 'polygons',    title: 'Polygons & Exclusion Zones',   xp: 150, estMin: 15 },
  { id: 'importing',   title: 'Importing Project Data',       xp: 150, estMin: 15 },
  { id: 'turbines',    title: 'Turbines & Setback Zones',     xp: 200, estMin: 20 },
  { id: 'cables',      title: 'Cables & Electrical Layout',   xp: 200, estMin: 20 },
  { id: 'analysis',    title: 'Analysis & Optimisation',      xp: 150, estMin: 15 },
  { id: 'challenge',   title: 'Final Design Challenge',       xp: 300, estMin: 30 },
];

export const ACADEMY_BADGES = {
  first_steps:      { id: 'first_steps',      name: 'Mission Control Online',   icon: '🖥️', desc: 'Complete Module 1' },
  polygon_master:   { id: 'polygon_master',    name: 'Zone Mapper',              icon: '🗺️', desc: 'Complete Module 2' },
  data_officer:     { id: 'data_officer',      name: 'Data Room Cleared',        icon: '📂', desc: 'Complete Module 3' },
  turbine_placer:   { id: 'turbine_placer',    name: 'Turbine Engineer',         icon: '🌀', desc: 'Complete Module 4' },
  grid_engineer:    { id: 'grid_engineer',     name: 'Grid Engineer',            icon: '⚡', desc: 'Complete Module 5' },
  analyst:          { id: 'analyst',           name: 'Energy Analyst',           icon: '📊', desc: 'Complete Module 6' },
  site_designer:    { id: 'site_designer',     name: 'Glenhaven Site Designer',  icon: '🏆', desc: 'Complete the Final Challenge' },
  completionist:    { id: 'completionist',     name: 'WindPath Graduate',        icon: '🎓', desc: 'Complete all modules' },
};

// ── Progress helpers ─────────────────────────────────────────────────────────

export function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return defaultProgress();
    return { ...defaultProgress(), ...JSON.parse(raw) };
  } catch { return defaultProgress(); }
}

export function saveProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function resetProgress() {
  localStorage.removeItem(PROGRESS_KEY);
  localStorage.removeItem(EVENTS_KEY);
}

function defaultProgress() {
  return {
    version: 1,
    totalXP: 0,
    level: 1,
    badges: [],
    modules: {},   // { [moduleId]: { status, score, completedSteps, startedAt, completedAt } }
    challengeScore: null,
    lastActiveModule: null,
    downloadsClicked: [],
    importCount: 0,
    exportCount: 0,
  };
}

export function getModuleProgress(moduleId) {
  const progress = loadProgress();
  return progress.modules[moduleId] || { status: 'not_started', score: 0, completedSteps: [] };
}

export function setModuleProgress(moduleId, data) {
  const progress = loadProgress();
  progress.modules[moduleId] = { ...(progress.modules[moduleId] || {}), ...data };
  saveProgress(progress);
}

export function markStepComplete(moduleId, stepId) {
  const progress = loadProgress();
  if (!progress.modules[moduleId]) progress.modules[moduleId] = { status: 'in_progress', completedSteps: [], startedAt: Date.now() };
  const mp = progress.modules[moduleId];
  if (!mp.completedSteps) mp.completedSteps = [];
  if (!mp.completedSteps.includes(stepId)) {
    mp.completedSteps = [...(mp.completedSteps || []), stepId];
  }
  if (mp.status === 'not_started') mp.status = 'in_progress';
  progress.lastActiveModule = moduleId;
  saveProgress(progress);
  return progress;
}

export function markModuleComplete(moduleId, score = 100) {
  const progress = loadProgress();
  const mod = ACADEMY_MODULES.find(m => m.id === moduleId);
  if (!progress.modules[moduleId]) progress.modules[moduleId] = { completedSteps: [] };
  progress.modules[moduleId].status = 'complete';
  progress.modules[moduleId].score = score;
  progress.modules[moduleId].completedAt = Date.now();
  
  // Award XP
  const xp = mod ? Math.round(mod.xp * (score / 100)) : 100;
  progress.totalXP = (progress.totalXP || 0) + xp;
  progress.level = Math.floor(progress.totalXP / 300) + 1;
  
  // Award badge
  const badgeMap = {
    bootcamp: 'first_steps', polygons: 'polygon_master', importing: 'data_officer',
    turbines: 'turbine_placer', cables: 'grid_engineer', analysis: 'analyst', challenge: 'site_designer',
  };
  const badge = badgeMap[moduleId];
  if (badge && !progress.badges.includes(badge)) progress.badges.push(badge);
  
  // Completionist
  const allDone = ACADEMY_MODULES.every(m => progress.modules[m.id]?.status === 'complete');
  if (allDone && !progress.badges.includes('completionist')) progress.badges.push('completionist');
  
  saveProgress(progress);
  return { xp, badge };
}

export function getOverallProgress() {
  const progress = loadProgress();
  const total = ACADEMY_MODULES.length;
  const done = ACADEMY_MODULES.filter(m => progress.modules[m.id]?.status === 'complete').length;
  return { percent: Math.round((done / total) * 100), done, total };
}

// ── Event system ─────────────────────────────────────────────────────────────

export function logTrainingEvent(type, payload = {}) {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    let events = [];
    try { events = JSON.parse(raw || '[]'); } catch {}
    events.push({ type, payload, ts: Date.now() });
    if (events.length > MAX_EVENTS) events = events.slice(-MAX_EVENTS);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    // Broadcast to global listener
    window.__trainingEvent__ = { type, payload, ts: Date.now() };
  } catch {}
}

export function getTrainingEvents(type) {
  try {
    const events = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
    return type ? events.filter(e => e.type === type) : events;
  } catch { return []; }
}

export function countEvents(type) {
  return getTrainingEvents(type).length;
}

export function hasEvent(type, since = 0) {
  return getTrainingEvents(type).some(e => e.ts > since);
}