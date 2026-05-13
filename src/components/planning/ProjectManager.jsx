import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Trash2, Save, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createLayer } from '@/lib/gisUtils';
import { DEFAULT_TURBINE_TYPES, DEFAULT_CABLE_TYPES } from '@/lib/turbineTypes';

const PROJECTS_INDEX_KEY = 'planning_projects_index';
const PROJECT_PREFIX = 'planning_project_';

function emptyProject(name = 'New Project') {
  return {
    name,
    layers: [
      createLayer({ name: 'Site Boundary', type: 'polygon', color: '#06b6d4', fillOpacity: 0.1 }),
      createLayer({ name: 'Turbines', type: 'turbine', color: '#10b981', fillOpacity: 0.8 }),
      createLayer({ name: 'Cables', type: 'cable', color: '#f97316', fillOpacity: 0.8 }),
      createLayer({ name: 'Substations', type: 'substation', color: '#facc15', fillOpacity: 1 }),
    ],
    turbineTypes: DEFAULT_TURBINE_TYPES,
    cableTypes: DEFAULT_CABLE_TYPES,
    windParams: { k: 2.0, lambda: 7.0 },
  };
}

export function loadProjectIndex() {
  try { return JSON.parse(localStorage.getItem(PROJECTS_INDEX_KEY) || '[]'); } catch { return []; }
}

function saveProjectIndex(index) {
  localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(index));
}

export function loadProject(id) {
  try { return JSON.parse(localStorage.getItem(PROJECT_PREFIX + id)); } catch { return null; }
}

export function saveProject(id, data) {
  localStorage.setItem(PROJECT_PREFIX + id, JSON.stringify(data));
  const index = loadProjectIndex();
  const existing = index.find(p => p.id === id);
  if (existing) {
    existing.name = data.name;
    existing.updatedAt = Date.now();
  } else {
    index.push({ id, name: data.name, createdAt: Date.now(), updatedAt: Date.now() });
  }
  saveProjectIndex(index);
}

export function deleteProject(id) {
  localStorage.removeItem(PROJECT_PREFIX + id);
  const index = loadProjectIndex().filter(p => p.id !== id);
  saveProjectIndex(index);
  return index;
}

export function createNewProject(name) {
  const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const data = emptyProject(name);
  data.id = id;
  saveProject(id, data);
  return { id, data };
}

export default function ProjectManager({ currentProjectId, currentProjectName, onSwitchProject, onNewProject, onClose }) {
  const [projects, setProjects] = useState(loadProjectIndex());
  const [newName, setNewName] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) setProjects(loadProjectIndex());
  }, [open]);

  const handleNew = () => {
    if (!newName.trim()) return;
    const { id, data } = createNewProject(newName.trim());
    setProjects(loadProjectIndex());
    setNewName('');
    setShowNew(false);
    onNewProject(id, data);
    setOpen(false);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (projects.length <= 1) return alert('Cannot delete the only project.');
    if (!window.confirm('Delete this project permanently?')) return;
    const updated = deleteProject(id);
    setProjects(updated);
    if (id === currentProjectId && updated.length > 0) {
      const proj = loadProject(updated[0].id);
      if (proj) onSwitchProject(updated[0].id, proj);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all"
      >
        <FolderOpen className="w-3 h-3" />
        <span className="max-w-[120px] truncate">{currentProjectName}</span>
        <ChevronDown className={cn('w-3 h-3 text-slate-500 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-[2000] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-64 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-300">Projects</span>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto">
            {projects.length === 0 && (
              <p className="text-[10px] text-slate-600 px-3 py-3">No saved projects yet.</p>
            )}
            {projects.map(p => (
              <div
                key={p.id}
                onClick={() => {
                  const proj = loadProject(p.id);
                  if (proj) { onSwitchProject(p.id, proj); setOpen(false); }
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-slate-800',
                  p.id === currentProjectId && 'bg-emerald-500/10 border-l-2 border-emerald-500'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{p.name}</p>
                  <p className="text-[9px] text-slate-600">{new Date(p.updatedAt).toLocaleDateString()}</p>
                </div>
                {p.id !== currentProjectId && (
                  <button onClick={e => handleDelete(e, p.id)} className="p-0.5 text-slate-600 hover:text-red-400 shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 p-2">
            {showNew ? (
              <div className="flex gap-1.5">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleNew(); if (e.key === 'Escape') setShowNew(false); }}
                  className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none"
                  placeholder="Project name…"
                />
                <button onClick={handleNew} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded">
                  <Save className="w-3 h-3" />
                </button>
                <button onClick={() => setShowNew(false)} className="px-2 py-1 bg-slate-700 text-slate-400 text-xs rounded">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNew(true)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
              >
                <Plus className="w-3 h-3" /> New Project
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}