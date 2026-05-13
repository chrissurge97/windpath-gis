import React, { useState, useRef } from 'react';
import { FolderOpen, Plus, Trash2, Save, X, FileText, Clock, ChevronRight, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createLayer } from '@/lib/gisUtils';
import { DEFAULT_TURBINE_TYPES, DEFAULT_CABLE_TYPES } from '@/lib/turbineTypes';
import { buildDemoProject } from '@/lib/demoProject';

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

function formatDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });
}

const DEMO_ID = '__demo__';

function FileExplorerModal({ mode, currentProjectId, currentProjectName, currentData, onClose, onOpen, onSaved }) {
  const [projects, setProjects] = useState(loadProjectIndex());
  const [selected, setSelected] = useState(mode === 'open' ? DEMO_ID : currentProjectId);
  const [saveName, setSaveName] = useState(currentProjectName);
  const overlayRef = useRef(null);

  const refresh = () => setProjects(loadProjectIndex());

  const handleOpen = () => {
    if (selected === DEMO_ID) {
      const demo = buildDemoProject();
      const demoData = {
        id: DEMO_ID,
        name: demo.projectName,
        layers: demo.layers,
        turbineTypes: DEFAULT_TURBINE_TYPES,
        cableTypes: DEFAULT_CABLE_TYPES,
        windParams: demo.windParams,
      };
      onOpen(DEMO_ID, demoData);
      onClose();
      return;
    }
    const proj = loadProject(selected);
    if (proj) { onOpen(selected, proj); onClose(); }
  };

  const handleSave = () => {
    if (!saveName.trim()) return;
    const data = { ...currentData, name: saveName.trim() };
    saveProject(currentProjectId, data);
    onSaved(saveName.trim());
    refresh();
    onClose();
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this project permanently?')) return;
    const updated = deleteProject(id);
    setProjects(updated);
    if (selected === id) setSelected(updated[0]?.id || DEMO_ID);
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[520px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            {mode === 'open' ? <FolderOpen className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4 text-emerald-400" />}
            <span className="text-sm font-semibold text-white">
              {mode === 'open' ? 'Open Project' : 'Save Project'}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Save-as name input */}
        {mode === 'save' && (
          <div className="px-5 py-3 border-b border-slate-800 shrink-0">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">Project Name</label>
            <input
              autoFocus
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              placeholder="Enter project name…"
            />
          </div>
        )}

        {/* File list */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="space-y-1">
            {/* Demo project — always first */}
            {mode === 'open' && (
              <div
                onClick={() => setSelected(DEMO_ID)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all group',
                  selected === DEMO_ID ? 'bg-emerald-500/15 border border-emerald-500/30' : 'hover:bg-slate-800 border border-transparent'
                )}
              >
                <Wind className={cn('w-4 h-4 shrink-0', selected === DEMO_ID ? 'text-emerald-400' : 'text-slate-500')} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-sm font-medium truncate', selected === DEMO_ID ? 'text-white' : 'text-slate-300')}>
                      Ballycraggan Wind Farm — Demo
                    </p>
                    <span className="text-[9px] bg-emerald-900/60 text-emerald-400 px-1.5 py-0.5 rounded font-semibold shrink-0 border border-emerald-700/40">DEMO</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-0.5">Co. Galway · 12 turbines · 50.4 MW</p>
                </div>
                {selected === DEMO_ID && <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
              </div>
            )}

            {projects.length === 0 && mode === 'open' ? null : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                <FileText className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">No saved projects yet</p>
              </div>
            ) : (
              projects.map(p => {
                const isActive = p.id === selected;
                const isCurrent = p.id === currentProjectId;
                return (
                  <div
                    key={p.id}
                    onClick={() => { setSelected(p.id); if (mode === 'save') setSaveName(p.name); }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all group',
                      isActive ? 'bg-emerald-500/15 border border-emerald-500/30' : 'hover:bg-slate-800 border border-transparent'
                    )}
                  >
                    <FileText className={cn('w-4 h-4 shrink-0', isActive ? 'text-emerald-400' : 'text-slate-500')} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn('text-sm font-medium truncate', isActive ? 'text-white' : 'text-slate-300')}>{p.name}</p>
                        {isCurrent && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-semibold shrink-0">OPEN</span>}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="w-2.5 h-2.5 text-slate-600" />
                        <p className="text-[10px] text-slate-600">{formatDate(p.updatedAt)}</p>
                      </div>
                    </div>
                    {mode === 'open' && isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    <button
                      onClick={e => handleDelete(e, p.id)}
                      className="p-1 text-slate-700 hover:text-red-400 shrink-0 opacity-0 group-hover:opacity-100 transition-all rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-800 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800">
            Cancel
          </button>
          {mode === 'open' ? (
            <button onClick={handleOpen} disabled={!selected}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors">
              <FolderOpen className="w-3.5 h-3.5" /> Open
            </button>
          ) : (
            <button onClick={handleSave} disabled={!saveName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors">
              <Save className="w-3.5 h-3.5" /> Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectFileButtons({ currentProjectId, currentProjectName, currentData, onNewProject, onSwitchProject, onSaved }) {
  const [modal, setModal] = useState(null);

  const handleNew = () => {
    if (!window.confirm('Create a new empty project? Unsaved changes will be lost.')) return;
    const name = window.prompt('New project name:', 'New Wind Farm Project');
    if (!name?.trim()) return;
    const { id, data } = createNewProject(name.trim());
    onNewProject(id, data);
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <button onClick={handleNew}
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all"
          title="New Project">
          <Plus className="w-3 h-3" /> New
        </button>
        <button onClick={() => setModal('save')}
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all"
          title="Save Project">
          <Save className="w-3 h-3" /> Save
        </button>
        <button onClick={() => setModal('open')}
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all"
          title="Open Project">
          <FolderOpen className="w-3 h-3" /> Open
        </button>
      </div>

      {modal && (
        <FileExplorerModal
          mode={modal}
          currentProjectId={currentProjectId}
          currentProjectName={currentProjectName}
          currentData={currentData}
          onClose={() => setModal(null)}
          onOpen={(id, proj) => onSwitchProject(id, proj)}
          onSaved={name => onSaved(name)}
        />
      )}
    </>
  );
}