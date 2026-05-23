/**
 * Simple, reliable project file explorer.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen, FileText, Wind, X, Trash2, Edit2,
  AlertTriangle, RefreshCw, Loader2, Check, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  listProjects, loadProject, saveProject, deleteProject, renameProject,
} from '@/lib/projectStorage';
import { buildDemoProject } from '@/lib/demoProject';
import { DEFAULT_TURBINE_TYPES, DEFAULT_CABLE_TYPES } from '@/lib/turbineTypes';

const DEMO_ID = '__demo__';

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Inline rename ─────────────────────────────────────────────────────────────
function InlineRename({ value, onConfirm, onCancel }) {
  const [val, setVal] = useState(value);
  const ref = useRef(null);
  useEffect(() => { setTimeout(() => ref.current?.select(), 50); }, []);
  return (
    <input
      ref={ref}
      value={val}
      onChange={e => setVal(e.target.value)}
      onKeyDown={e => {
        e.stopPropagation();
        if (e.key === 'Enter') onConfirm(val);
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={() => onConfirm(val)}
      onClick={e => e.stopPropagation()}
      className="flex-1 bg-slate-700 border border-emerald-500 rounded px-1.5 py-0.5 text-xs text-white outline-none min-w-0"
    />
  );
}

// ── Main FileExplorer ─────────────────────────────────────────────────────────
export default function FileExplorer({
  mode = 'open',
  currentProjectId,
  currentProjectName,
  currentData,
  onClose,
  onOpen,
  onSaved,
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(mode === 'open' ? DEMO_ID : (currentProjectId || null));
  const [saveName, setSaveName] = useState(currentProjectName || '');
  const [search, setSearch] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const overlayRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const ps = await listProjects();
      setProjects(ps);
    } catch (e) {
      console.error('Failed to list projects', e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = projects.filter(p => {
    if (!search) return true;
    return p.name.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const handleOpen = async (idToOpen) => {
    const id = idToOpen ?? selectedId;
    if (!id) return;

    if (id === DEMO_ID) {
      const demo = buildDemoProject();
      onOpen(DEMO_ID, {
        id: DEMO_ID,
        name: demo.projectName,
        layers: demo.layers,
        turbineTypes: DEFAULT_TURBINE_TYPES,
        cableTypes: DEFAULT_CABLE_TYPES,
        windParams: demo.windParams,
      });
      onClose();
      return;
    }

    setOpening(true);
    try {
      const proj = await loadProject(id);
      if (proj) {
        onOpen(proj.id, proj);
        onClose();
      }
    } catch (e) {
      console.error('Failed to open project', e);
    }
    setOpening(false);
  };

  const handleSave = async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      const data = { ...currentData, name: saveName.trim(), is_training: false };
      const id = await saveProject(currentProjectId, data);
      onSaved(saveName.trim(), id);
      onClose();
    } catch (e) {
      console.error('Failed to save project', e);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    setConfirmDeleteId(null);
    setBusyId(id);
    try {
      await deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (e) {
      console.error('Failed to delete project', e);
    }
    setBusyId(null);
  };

  const handleRename = async (id, newName) => {
    setRenamingId(null);
    if (!newName.trim()) return;
    setBusyId(id);
    try {
      await renameProject(id, newName.trim());
      setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName.trim() } : p));
    } catch (e) {
      console.error('Failed to rename project', e);
    }
    setBusyId(null);
  };

  const isLoading = loading || opening || saving;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden w-[520px]"
        style={{ maxHeight: '80vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">
              {mode === 'open' ? 'Open Project' : 'Save Project'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={loading} className="p-1 text-slate-500 hover:text-white transition-colors" title="Refresh">
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            </button>
            <button onClick={onClose} className="p-1 text-slate-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Save name (save mode) */}
        {mode === 'save' && (
          <div className="px-5 py-2.5 border-b border-slate-800 shrink-0">
            <input
              autoFocus
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
              placeholder="Project name…"
            />
          </div>
        )}

        {/* Search */}
        <div className="px-4 py-2 border-b border-slate-800 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
            </div>
          ) : (
            <div className="space-y-0.5">
              {/* Demo entry */}
              {mode === 'open' && !search && (
                <div
                  onClick={() => setSelectedId(DEMO_ID)}
                  onDoubleClick={() => handleOpen(DEMO_ID)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer group transition-all border',
                    selectedId === DEMO_ID
                      ? 'bg-emerald-500/15 border-emerald-500/30'
                      : 'hover:bg-slate-800 border-transparent'
                  )}
                >
                  <Wind className={cn('w-4 h-4 shrink-0', selectedId === DEMO_ID ? 'text-emerald-400' : 'text-slate-500')} />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-medium truncate', selectedId === DEMO_ID ? 'text-white' : 'text-slate-300')}>
                      Ballycraggan Wind Farm — Demo
                    </p>
                    <p className="text-[10px] text-slate-600">Co. Galway · 12 turbines · read-only</p>
                  </div>
                  <span className="text-[9px] bg-emerald-900/50 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-700/30 shrink-0">DEMO</span>
                </div>
              )}

              {/* User projects */}
              {filtered.map(p => {
                const isSelected = selectedId === p.id;
                const isBusy = busyId === p.id;
                const isRenaming = renamingId === p.id;

                return (
                  <div
                    key={p.id}
                    onClick={() => { if (!isBusy) { setSelectedId(p.id); if (mode === 'save') setSaveName(p.name); } }}
                    onDoubleClick={() => { if (!isBusy && mode === 'open') handleOpen(p.id); }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer group transition-all border',
                      isSelected ? 'bg-emerald-500/15 border-emerald-500/30' : 'hover:bg-slate-800 border-transparent',
                      isBusy && 'opacity-40 pointer-events-none'
                    )}
                  >
                    {isBusy
                      ? <Loader2 className="w-4 h-4 animate-spin text-slate-500 shrink-0" />
                      : <FileText className={cn('w-4 h-4 shrink-0', isSelected ? 'text-emerald-400' : p.is_training ? 'text-orange-400/60' : 'text-slate-500')} />
                    }

                    <div className="flex-1 min-w-0">
                      {isRenaming ? (
                        <InlineRename
                          value={p.name}
                          onConfirm={name => handleRename(p.id, name)}
                          onCancel={() => setRenamingId(null)}
                        />
                      ) : (
                        <p className={cn('text-xs font-medium truncate', isSelected ? 'text-white' : 'text-slate-300')}>
                          {p.name}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-600">{formatDate(p.updatedAt)}</span>
                        {p.is_training && <span className="text-[8px] text-orange-400/70 border border-orange-500/20 px-1 rounded">training</span>}
                      </div>
                    </div>

                    {/* Hover actions */}
                    {!isRenaming && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); setRenamingId(p.id); }}
                          className="p-1 text-slate-600 hover:text-white rounded transition-colors"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDeleteId(p.id); }}
                          className="p-1 text-slate-600 hover:text-red-400 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {!loading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                  <FileText className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm">{search ? 'No results found' : 'No saved projects yet'}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-800 shrink-0">
          <span className="text-[10px] text-slate-600">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800">
              Cancel
            </button>
            {mode === 'open' ? (
              <button
                onClick={() => handleOpen(selectedId)}
                disabled={!selectedId || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {opening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
                Open
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!saveName.trim() || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70">
          <div className="bg-slate-900 border border-red-500/40 rounded-xl shadow-2xl p-5 max-w-sm w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white mb-1">Delete project?</p>
                <p className="text-xs text-slate-400">
                  "{projects.find(p => p.id === confirmDeleteId)?.name}" will be permanently deleted.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded hover:bg-slate-800">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDeleteId)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}