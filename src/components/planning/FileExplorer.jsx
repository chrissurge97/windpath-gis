/**
 * Full-featured project file explorer with folders, search, filter,
 * rename, move, delete, cut/copy/paste, and bulk delete options.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FolderOpen, Folder, FolderPlus, FileText, Search, Trash2, Edit2, Move,
  Copy, Scissors, ClipboardPaste, ChevronRight, ChevronDown, Wind, X,
  MoreHorizontal, SortAsc, SortDesc, Calendar, Clock, Filter, Check,
  AlertTriangle, RefreshCw, Loader2, Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  listProjects, deleteProject, moveProject, renameProject,
  deleteAllTrainingProjects
} from '@/lib/projectStorage';
import { buildDemoProject } from '@/lib/demoProject';
import { DEFAULT_TURBINE_TYPES, DEFAULT_CABLE_TYPES } from '@/lib/turbineTypes';

const DEMO_ID = '__demo__';

function formatDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Collect all unique folder paths from project list
function buildFolderTree(projects) {
  const folders = new Set(['']);
  for (const p of projects) {
    if (p.folder) {
      const parts = p.folder.split('/');
      let acc = '';
      for (const part of parts) {
        acc = acc ? acc + '/' + part : part;
        folders.add(acc);
      }
    }
  }
  return [...folders].sort();
}

function getFolderLabel(path) {
  if (!path) return 'All Projects';
  const parts = path.split('/');
  return parts[parts.length - 1];
}

function getFolderDepth(path) {
  if (!path) return 0;
  return path.split('/').length;
}

// ── Context menu ─────────────────────────────────────────────────────────────
function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="fixed z-[9999] bg-slate-800 border border-slate-600 rounded-lg shadow-2xl py-1 min-w-[160px]"
      style={{ left: x, top: y }}>
      {items.map((item, i) =>
        item === 'divider' ? (
          <div key={i} className="h-px bg-slate-700 my-1" />
        ) : (
          <button key={i} onClick={() => { item.action(); onClose(); }}
            className={cn('flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left transition-colors',
              item.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            )}>
            {item.icon && <item.icon className="w-3.5 h-3.5 shrink-0" />}
            {item.label}
          </button>
        )
      )}
    </div>
  );
}

// ── Inline rename input ───────────────────────────────────────────────────────
function InlineRename({ value, onConfirm, onCancel }) {
  const [val, setVal] = useState(value);
  const ref = useRef(null);
  useEffect(() => { ref.current?.select(); }, []);
  return (
    <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') onConfirm(val); if (e.key === 'Escape') onCancel(); }}
      onBlur={() => onConfirm(val)}
      className="flex-1 bg-slate-700 border border-emerald-500 rounded px-1.5 py-0.5 text-xs text-white outline-none min-w-0"
      onClick={e => e.stopPropagation()}
    />
  );
}

// ── Move-to-folder dialog ─────────────────────────────────────────────────────
function MoveDialog({ project, folders, onMove, onClose }) {
  const [selected, setSelected] = useState(project.folder || '');
  const [newFolder, setNewFolder] = useState('');
  const allFolders = [...new Set([...folders, newFolder.trim()].filter(Boolean))].sort();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-80 p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Move "{project.name}"</h3>
        <div className="space-y-1 max-h-48 overflow-y-auto mb-3">
          <button onClick={() => setSelected('')}
            className={cn('flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs', selected === '' ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}>
            <Home className="w-3 h-3" /> Root (no folder)
          </button>
          {allFolders.map(f => (
            <button key={f} onClick={() => setSelected(f)}
              className={cn('flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs', selected === f ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}>
              <Folder className="w-3 h-3" /> {f}
            </button>
          ))}
        </div>
        <div className="flex gap-1 mb-3">
          <input value={newFolder} onChange={e => setNewFolder(e.target.value)}
            placeholder="Or type new folder path…"
            onKeyDown={e => { if (e.key === 'Enter' && newFolder.trim()) setSelected(newFolder.trim()); }}
            className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-500" />
          {newFolder.trim() && (
            <button onClick={() => setSelected(newFolder.trim())}
              className="px-2 py-1.5 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-500">Set</button>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded hover:bg-slate-800">Cancel</button>
          <button onClick={() => onMove(selected)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded">Move</button>
        </div>
      </div>
    </div>
  );
}

// ── New folder dialog ─────────────────────────────────────────────────────────
function NewFolderDialog({ currentFolder, onConfirm, onClose }) {
  const [name, setName] = useState('');
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const full = currentFolder ? currentFolder + '/' + name.trim() : name.trim();
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-72 p-4">
        <h3 className="text-sm font-semibold text-white mb-3">New Folder</h3>
        {currentFolder && <p className="text-[10px] text-slate-500 mb-2">Inside: {currentFolder}</p>}
        <input ref={ref} value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onConfirm(full); if (e.key === 'Escape') onClose(); }}
          placeholder="Folder name…"
          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-white outline-none focus:border-emerald-500 mb-3" />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded hover:bg-slate-800">Cancel</button>
          <button onClick={() => name.trim() && onConfirm(full)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded">Create</button>
        </div>
      </div>
    </div>
  );
}

// ── Main FileExplorer ─────────────────────────────────────────────────────────
export default function FileExplorer({
  mode = 'open', // 'open' | 'save'
  currentProjectId,
  currentProjectName,
  currentData,
  onClose,
  onOpen,
  onSaved,
}) {
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveName, setSaveName] = useState(currentProjectName || '');
  const [selectedId, setSelectedId] = useState(mode === 'open' ? DEMO_ID : currentProjectId);
  const [saving, setSaving] = useState(false);

  // Navigation
  const [currentFolder, setCurrentFolder] = useState('');
  const [expandedFolders, setExpandedFolders] = useState(new Set(['']));

  // Search & filter
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('updated'); // 'name' | 'updated' | 'created'
  const [sortDir, setSortDir] = useState('desc');
  const [filterTraining, setFilterTraining] = useState(null); // null=all, true=training, false=user

  // Selection & clipboard
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [clipboard, setClipboard] = useState(null); // { ids, op: 'copy'|'cut' }

  // UI state
  const [renamingId, setRenamingId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [busyIds, setBusyIds] = useState(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(null); // 'training' | 'all' | 'selected'
  const overlayRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    const ps = await listProjects();
    setAllProjects(ps);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const folders = buildFolderTree(allProjects);

  // ── Filtered & sorted project list ─────────────────────────────────────────
  const visibleProjects = allProjects
    .filter(p => {
      if (search) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.folder || '').toLowerCase().includes(q);
      }
      if (filterTraining === true) return p.is_training;
      if (filterTraining === false) return !p.is_training;
      // Folder view — show projects in current folder (not subfolders)
      return (p.folder || '') === currentFolder;
    })
    .sort((a, b) => {
      let va, vb;
      if (sortBy === 'name') { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (sortBy === 'created') { va = a.createdAt || 0; vb = b.createdAt || 0; }
      else { va = a.updatedAt || 0; vb = b.updatedAt || 0; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  // Sub-folders of currentFolder
  const subFolders = folders.filter(f => {
    if (!f) return false;
    const parts = f.split('/');
    const parentParts = currentFolder ? currentFolder.split('/') : [];
    if (parts.length !== parentParts.length + 1) return false;
    return parts.slice(0, parentParts.length).join('/') === currentFolder;
  });

  const countInFolder = (folder) => allProjects.filter(p => (p.folder || '') === folder).length;
  const countInFolderDeep = (folder) => allProjects.filter(p => (p.folder || '') === folder || (p.folder || '').startsWith(folder + '/')).length;

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleOpen = async () => {
    if (selectedId === DEMO_ID) {
      const demo = buildDemoProject();
      onOpen(DEMO_ID, { id: DEMO_ID, name: demo.projectName, layers: demo.layers, turbineTypes: DEFAULT_TURBINE_TYPES, cableTypes: DEFAULT_CABLE_TYPES, windParams: demo.windParams });
      onClose();
      return;
    }
    if (!selectedId) return;
    setLoading(true);
    const { loadProject } = await import('@/lib/projectStorage');
    const proj = await loadProject(selectedId);
    setLoading(false);
    if (proj) { onOpen(proj.id, proj); onClose(); }
  };

  const handleSave = async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    const { saveProject } = await import('@/lib/projectStorage');
    const data = { ...currentData, name: saveName.trim(), folder: currentFolder, is_training: false };
    const id = await saveProject(currentProjectId, data);
    setSaving(false);
    onSaved(saveName.trim(), id);
    onClose();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project permanently?')) return;
    setBusyIds(prev => new Set([...prev, id]));
    await deleteProject(id);
    setAllProjects(prev => prev.filter(p => p.id !== id));
    if (selectedId === id) setSelectedId(null);
    setCheckedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    setBusyIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleRename = async (id, newName) => {
    if (!newName.trim()) { setRenamingId(null); return; }
    setBusyIds(prev => new Set([...prev, id]));
    await renameProject(id, newName.trim());
    setAllProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName.trim() } : p));
    setRenamingId(null);
    setBusyIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleMove = async (id, newFolder) => {
    setBusyIds(prev => new Set([...prev, id]));
    await moveProject(id, newFolder);
    setAllProjects(prev => prev.map(p => p.id === id ? { ...p, folder: newFolder } : p));
    setMoveTarget(null);
    setBusyIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleBulkDelete = async () => {
    const ids = confirmBulkDelete === 'selected'
      ? [...checkedIds]
      : confirmBulkDelete === 'training'
        ? allProjects.filter(p => p.is_training).map(p => p.id)
        : allProjects.map(p => p.id);

    setConfirmBulkDelete(null);
    setBusyIds(new Set(ids));
    await Promise.all(ids.map(id => deleteProject(id)));
    setAllProjects(prev => prev.filter(p => !ids.includes(p.id)));
    setCheckedIds(new Set());
    setBusyIds(new Set());
  };

  const handlePaste = async () => {
    if (!clipboard) return;
    const targetFolder = currentFolder;
    await Promise.all(clipboard.ids.map(id => moveProject(id, targetFolder)));
    setAllProjects(prev => prev.map(p => clipboard.ids.includes(p.id) ? { ...p, folder: targetFolder } : p));
    if (clipboard.op === 'cut') setClipboard(null);
  };

  const handleNewFolder = (fullPath) => {
    // Folders are virtual — just set it as a known folder by creating a fake entry
    // We record it in local state so it shows, and projects moved here will persist
    setExpandedFolders(prev => new Set([...prev, fullPath]));
    setCurrentFolder(fullPath);
    setShowNewFolder(false);
  };

  const handleDeleteFolder = (folder) => {
    if (!window.confirm(`Move all projects in "${folder}" to root and remove the folder?`)) return;
    const ids = allProjects.filter(p => (p.folder || '').startsWith(folder)).map(p => p.id);
    Promise.all(ids.map(id => moveProject(id, ''))).then(() => {
      setAllProjects(prev => prev.map(p => ids.includes(p.id) ? { ...p, folder: '' } : p));
      if (currentFolder === folder || currentFolder.startsWith(folder + '/')) setCurrentFolder('');
    });
  };

  const openContextMenu = (e, project) => {
    e.preventDefault();
    e.stopPropagation();
    const items = [
      { label: 'Open', icon: FolderOpen, action: () => { setSelectedId(project.id); } },
      { label: 'Rename', icon: Edit2, action: () => setRenamingId(project.id) },
      { label: 'Move to Folder…', icon: Move, action: () => setMoveTarget(project) },
      'divider',
      { label: 'Copy', icon: Copy, action: () => setClipboard({ ids: [project.id], op: 'copy' }) },
      { label: 'Cut', icon: Scissors, action: () => setClipboard({ ids: [project.id], op: 'cut' }) },
      'divider',
      { label: 'Delete', icon: Trash2, danger: true, action: () => handleDelete(project.id) },
    ];
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const toggleCheck = (id) => {
    setCheckedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const breadcrumbs = currentFolder ? ['', ...currentFolder.split('/')] : [''];

  // ── Sidebar folder tree ────────────────────────────────────────────────────
  function FolderNode({ path, depth }) {
    const label = getFolderLabel(path);
    const isActive = currentFolder === path;
    const children = folders.filter(f => {
      const fParts = f.split('/');
      const pathParts = path ? path.split('/') : [];
      return fParts.length === pathParts.length + 1 && fParts.slice(0, pathParts.length).join('/') === path;
    });
    const isExpanded = expandedFolders.has(path);
    const count = countInFolder(path);

    return (
      <div>
        <div onClick={() => { setCurrentFolder(path); setSearch(''); setFilterTraining(null); }}
          className={cn('flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer group transition-colors text-xs',
            isActive ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          )}
          style={{ paddingLeft: 8 + depth * 14 }}>
          {children.length > 0 ? (
            <button onClick={e => { e.stopPropagation(); setExpandedFolders(prev => { const n = new Set(prev); n.has(path) ? n.delete(path) : n.add(path); return n; }); }}
              className="shrink-0 text-slate-600 hover:text-slate-300">
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          ) : <div className="w-3 shrink-0" />}
          {path === '' ? <Home className="w-3 h-3 shrink-0" /> : <Folder className="w-3 h-3 shrink-0" />}
          <span className="flex-1 truncate">{path === '' ? 'Root' : label}</span>
          {count > 0 && <span className="text-[9px] text-slate-600">{count}</span>}
          {path !== '' && (
            <button onClick={e => { e.stopPropagation(); handleDeleteFolder(path); }}
              className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all">
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
        {isExpanded && children.map(child => <FolderNode key={child} path={child} depth={depth + 1} />)}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div ref={overlayRef} className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 780, maxHeight: '88vh' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">
              {mode === 'open' ? 'Open Project' : 'Save Project'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Bulk-delete menu */}
            <div className="relative group">
              <button className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-slate-500 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-all">
                <Trash2 className="w-3 h-3" /> Clean up
              </button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 min-w-[200px] py-1">
                <button onClick={() => setConfirmBulkDelete('training')}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-orange-400 hover:bg-slate-700 text-left">
                  <Trash2 className="w-3 h-3" /> Delete all training projects
                </button>
                {checkedIds.size > 0 && (
                  <button onClick={() => setConfirmBulkDelete('selected')}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-slate-700 text-left">
                    <Trash2 className="w-3 h-3" /> Delete selected ({checkedIds.size})
                  </button>
                )}
                <div className="h-px bg-slate-700 my-1" />
                <button onClick={() => setConfirmBulkDelete('all')}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-500 hover:bg-slate-700 text-left">
                  <AlertTriangle className="w-3 h-3" /> Delete ALL projects
                </button>
              </div>
            </div>
            <button onClick={load} className="p-1 text-slate-500 hover:text-white transition-colors" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={onClose} className="p-1 text-slate-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Save name row (save mode) ── */}
        {mode === 'save' && (
          <div className="px-5 py-2.5 border-b border-slate-800 shrink-0 flex items-center gap-3">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider shrink-0">Save as</label>
            <input autoFocus value={saveName} onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
              className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
              placeholder="Project name…" />
            <span className="text-[10px] text-slate-600">
              Folder: <span className="text-slate-400">{currentFolder || 'Root'}</span>
            </span>
          </div>
        )}

        {/* ── Body: sidebar + main ── */}
        <div className="flex flex-1 min-h-0">

          {/* Sidebar */}
          <div className="w-44 shrink-0 border-r border-slate-800 flex flex-col bg-slate-900/50 overflow-hidden">
            <div className="flex items-center justify-between px-2 py-2 border-b border-slate-800 shrink-0">
              <span className="text-[9px] text-slate-600 uppercase tracking-wider">Folders</span>
              <button onClick={() => setShowNewFolder(true)} title="New folder"
                className="p-0.5 text-slate-600 hover:text-emerald-400 transition-colors">
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-1 px-1 space-y-0.5">
              {/* All projects shortcut */}
              <button onClick={() => { setSearch(''); setCurrentFolder(''); setFilterTraining(null); }}
                className={cn('flex items-center gap-1.5 w-full px-2 py-1 rounded text-xs transition-colors',
                  !search && filterTraining === null && currentFolder === '' ? 'bg-emerald-500/10 text-emerald-300' : 'text-slate-500 hover:text-white hover:bg-slate-800'
                )}>
                <Home className="w-3 h-3" /> All Files
              </button>
              <button onClick={() => { setFilterTraining(false); setSearch(''); }}
                className={cn('flex items-center gap-1.5 w-full px-2 py-1 rounded text-xs transition-colors',
                  filterTraining === false ? 'bg-blue-500/10 text-blue-300' : 'text-slate-500 hover:text-white hover:bg-slate-800'
                )}>
                <FileText className="w-3 h-3" /> My Projects
              </button>
              <button onClick={() => { setFilterTraining(true); setSearch(''); }}
                className={cn('flex items-center gap-1.5 w-full px-2 py-1 rounded text-xs transition-colors',
                  filterTraining === true ? 'bg-orange-500/10 text-orange-300' : 'text-slate-500 hover:text-white hover:bg-slate-800'
                )}>
                <Wind className="w-3 h-3" /> Training Files
              </button>
              <div className="h-px bg-slate-800 my-1" />
              <FolderNode path="" depth={0} />
            </div>
          </div>

          {/* Main panel */}
          <div className="flex-1 flex flex-col min-w-0">

            {/* Toolbar: breadcrumb + search + sort */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 shrink-0">
              {/* Breadcrumb */}
              {!search && filterTraining === null && (
                <div className="flex items-center gap-0.5 text-[10px] text-slate-500 flex-1 min-w-0">
                  {breadcrumbs.map((crumb, i) => {
                    const path = breadcrumbs.slice(1, i + 1).join('/');
                    const isLast = i === breadcrumbs.length - 1;
                    return (
                      <React.Fragment key={i}>
                        {i > 0 && <ChevronRight className="w-3 h-3 shrink-0" />}
                        <button onClick={() => { setCurrentFolder(path); }}
                          className={cn('px-1 py-0.5 rounded transition-colors truncate max-w-[100px]',
                            isLast ? 'text-white' : 'hover:text-white hover:bg-slate-800'
                          )}>
                          {crumb === '' ? 'Root' : crumb}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
              {(search || filterTraining !== null) && (
                <div className="flex-1 text-[10px] text-slate-500 flex items-center gap-1.5">
                  {filterTraining !== null && <span className="text-blue-400">{filterTraining ? 'Training Files' : 'My Projects'}</span>}
                  {search && <span>Search: "<span className="text-white">{search}</span>"</span>}
                  <button onClick={() => { setSearch(''); setFilterTraining(null); }} className="text-slate-600 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Search */}
              <div className="relative shrink-0">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="bg-slate-800 border border-slate-700 rounded-lg pl-6 pr-2 py-1 text-xs text-white outline-none focus:border-emerald-500 w-32" />
              </div>

              {/* Sort */}
              <div className="flex items-center gap-0.5 shrink-0">
                {[['name', 'Name'], ['updated', 'Modified'], ['created', 'Created']].map(([field, label]) => (
                  <button key={field} onClick={() => toggleSort(field)}
                    className={cn('flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] transition-colors',
                      sortBy === field ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-white'
                    )}>
                    {label}
                    {sortBy === field && (sortDir === 'asc' ? <SortAsc className="w-2.5 h-2.5" /> : <SortDesc className="w-2.5 h-2.5" />)}
                  </button>
                ))}
              </div>

              {/* New folder */}
              <button onClick={() => setShowNewFolder(true)} title="New folder"
                className="p-1 text-slate-600 hover:text-emerald-400 transition-colors shrink-0">
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Clipboard bar */}
            {clipboard && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 border-b border-slate-700 shrink-0 text-xs">
                {clipboard.op === 'cut' ? <Scissors className="w-3 h-3 text-amber-400" /> : <Copy className="w-3 h-3 text-blue-400" />}
                <span className="text-slate-400 flex-1">{clipboard.ids.length} item{clipboard.ids.length !== 1 ? 's' : ''} {clipboard.op === 'cut' ? 'cut' : 'copied'}</span>
                <button onClick={handlePaste}
                  className="flex items-center gap-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px]">
                  <ClipboardPaste className="w-3 h-3" /> Paste here
                </button>
                <button onClick={() => setClipboard(null)} className="text-slate-600 hover:text-white"><X className="w-3 h-3" /></button>
              </div>
            )}

            {/* File list */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
                </div>
              ) : (
                <div className="space-y-0.5">
                  {/* Demo entry (open mode) */}
                  {mode === 'open' && !search && filterTraining === null && currentFolder === '' && (
                    <div onDoubleClick={handleOpen} onClick={() => setSelectedId(DEMO_ID)}
                      className={cn('flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer group transition-all',
                        selectedId === DEMO_ID ? 'bg-emerald-500/15 border border-emerald-500/30' : 'hover:bg-slate-800 border border-transparent'
                      )}>
                      <div className="w-4 h-4 shrink-0" />
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

                  {/* Sub-folders */}
                  {!search && filterTraining === null && subFolders.map(folder => (
                    <div key={folder} onDoubleClick={() => setCurrentFolder(folder)}
                      onClick={() => setCurrentFolder(folder)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-slate-800 border border-transparent group transition-all">
                      <div className="w-4 h-4 shrink-0" />
                      <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="flex-1 text-xs text-slate-300 font-medium truncate">{getFolderLabel(folder)}</span>
                      <span className="text-[9px] text-slate-600">{countInFolderDeep(folder)} files</span>
                      <button onClick={e => { e.stopPropagation(); handleDeleteFolder(folder); }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* Project files */}
                  {visibleProjects.map(p => {
                    const isSelected = selectedId === p.id;
                    const isChecked = checkedIds.has(p.id);
                    const isRenaming = renamingId === p.id;
                    const isBusy = busyIds.has(p.id);
                    const isClipboard = clipboard?.ids.includes(p.id);

                    return (
                      <div key={p.id}
                        onClick={() => { setSelectedId(p.id); if (mode === 'save') setSaveName(p.name); }}
                        onDoubleClick={() => { if (mode === 'open') handleOpen(); }}
                        onContextMenu={e => openContextMenu(e, p)}
                        className={cn('flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer group transition-all',
                          isSelected ? 'bg-emerald-500/15 border border-emerald-500/30' : 'hover:bg-slate-800 border border-transparent',
                          isClipboard && clipboard.op === 'cut' ? 'opacity-50' : '',
                          isBusy ? 'pointer-events-none opacity-40' : ''
                        )}>

                        {/* Checkbox */}
                        <button onClick={e => { e.stopPropagation(); toggleCheck(p.id); }}
                          className={cn('w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-all',
                            isChecked ? 'bg-emerald-500 border-emerald-400' : 'border-slate-700 opacity-0 group-hover:opacity-100'
                          )}>
                          {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
                        </button>

                        {isBusy ? <Loader2 className="w-4 h-4 animate-spin text-slate-500 shrink-0" /> :
                          <FileText className={cn('w-4 h-4 shrink-0', isSelected ? 'text-emerald-400' : p.is_training ? 'text-orange-400/60' : 'text-slate-500')} />}

                        <div className="flex-1 min-w-0">
                          {isRenaming ? (
                            <InlineRename value={p.name}
                              onConfirm={name => handleRename(p.id, name)}
                              onCancel={() => setRenamingId(null)} />
                          ) : (
                            <p className={cn('text-xs font-medium truncate', isSelected ? 'text-white' : 'text-slate-300')}>
                              {p.name}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-slate-600 truncate">{formatDateShort(p.updatedAt)}</p>
                            {p.is_training && <span className="text-[8px] text-orange-400/70 border border-orange-500/20 px-1 rounded">training</span>}
                            {p.folder && <span className="text-[8px] text-slate-700 truncate max-w-[80px]">{p.folder}</span>}
                          </div>
                        </div>

                        {/* Actions (hover) */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={e => { e.stopPropagation(); setRenamingId(p.id); }} title="Rename"
                            className="p-1 text-slate-600 hover:text-white rounded transition-colors">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setMoveTarget(p); }} title="Move"
                            className="p-1 text-slate-600 hover:text-white rounded transition-colors">
                            <Move className="w-3 h-3" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setClipboard({ ids: [p.id], op: 'cut' }); }} title="Cut"
                            className="p-1 text-slate-600 hover:text-amber-400 rounded transition-colors">
                            <Scissors className="w-3 h-3" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setClipboard({ ids: [p.id], op: 'copy' }); }} title="Copy"
                            className="p-1 text-slate-600 hover:text-blue-400 rounded transition-colors">
                            <Copy className="w-3 h-3" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(p.id); }} title="Delete"
                            className="p-1 text-slate-600 hover:text-red-400 rounded transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {!loading && visibleProjects.length === 0 && subFolders.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                      <FileText className="w-10 h-10 mb-3 opacity-20" />
                      <p className="text-sm">{search ? 'No results found' : 'No projects here'}</p>
                      {!search && currentFolder && (
                        <p className="text-[10px] mt-1">Move projects here using the move tool or cut/paste</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-800 shrink-0">
          <div className="text-[10px] text-slate-600">
            {allProjects.length} project{allProjects.length !== 1 ? 's' : ''} total
            {checkedIds.size > 0 && <span className="ml-2 text-emerald-400">{checkedIds.size} selected</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800">
              Cancel
            </button>
            {mode === 'open' ? (
              <button onClick={handleOpen} disabled={!selectedId || loading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />} Open
              </button>
            ) : (
              <button onClick={handleSave} disabled={!saveName.trim() || saving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Save
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />}
      {moveTarget && (
        <MoveDialog project={moveTarget} folders={folders.filter(Boolean)}
          onMove={folder => handleMove(moveTarget.id, folder)} onClose={() => setMoveTarget(null)} />
      )}
      {showNewFolder && (
        <NewFolderDialog currentFolder={currentFolder} onConfirm={handleNewFolder} onClose={() => setShowNewFolder(false)} />
      )}

      {/* Bulk delete confirmation */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70">
          <div className="bg-slate-900 border border-red-500/40 rounded-xl shadow-2xl p-5 max-w-sm w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white mb-1">
                  {confirmBulkDelete === 'training' ? 'Delete all training projects?' :
                   confirmBulkDelete === 'selected' ? `Delete ${checkedIds.size} selected projects?` :
                   'Delete ALL projects?'}
                </p>
                <p className="text-xs text-slate-400">This cannot be undone. Projects will be permanently removed from the server.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmBulkDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded hover:bg-slate-800">Cancel</button>
              <button onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded">
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}