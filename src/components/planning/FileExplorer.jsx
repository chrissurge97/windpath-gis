/**
 * Full-featured project file explorer — Windows Explorer style.
 * Supports folders, rename, move, delete, new folder, search, sort.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FolderOpen, Folder, FolderPlus, FileText, Wind, X, Trash2, Edit2,
  AlertTriangle, RefreshCw, Loader2, Check, Search, ChevronRight,
  ChevronDown, Home, ArrowLeft, MoreVertical, Move
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  listProjects, loadProject, saveProject, deleteProject,
  renameProject, moveProject,
} from '@/lib/projectStorage';
import { buildDemoProject } from '@/lib/demoProject';
import { DEFAULT_TURBINE_TYPES, DEFAULT_CABLE_TYPES } from '@/lib/turbineTypes';

const DEMO_ID = '__demo__';

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function buildFolderTree(projects) {
  const set = new Set(['']);
  for (const p of projects) {
    if (p.folder) {
      const parts = p.folder.split('/');
      let acc = '';
      for (const part of parts) {
        acc = acc ? acc + '/' + part : part;
        set.add(acc);
      }
    }
  }
  return [...set].sort();
}

function getFolderLabel(path) {
  if (!path) return 'Root';
  const parts = path.split('/');
  return parts[parts.length - 1];
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
      autoFocus
    />
  );
}

// ── Context Menu ──────────────────────────────────────────────────────────────
function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  // Clamp to viewport
  const style = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 180),
    top: Math.min(y, window.innerHeight - items.length * 32 - 16),
    zIndex: 99999,
  };

  return (
    <div ref={ref} style={style} className="bg-slate-800 border border-slate-600 rounded-lg shadow-2xl py-1 min-w-[160px]">
      {items.map((item, i) =>
        item === 'divider'
          ? <div key={i} className="h-px bg-slate-700 my-1" />
          : (
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

// ── Move-to-folder Dialog ─────────────────────────────────────────────────────
function MoveDialog({ projectName, folders, currentFolder, onMove, onClose }) {
  const [selected, setSelected] = useState(currentFolder || '');
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-80 p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Move "{projectName}"</h3>
        <div className="space-y-1 max-h-48 overflow-y-auto mb-3">
          <button onClick={() => setSelected('')}
            className={cn('flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs', selected === '' ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}>
            <Home className="w-3 h-3" /> Root (no folder)
          </button>
          {folders.filter(Boolean).map(f => (
            <button key={f} onClick={() => setSelected(f)}
              className={cn('flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs', selected === f ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}>
              <Folder className="w-3 h-3 text-amber-400" /> {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded hover:bg-slate-800">Cancel</button>
          <button onClick={() => onMove(selected)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded">Move Here</button>
        </div>
      </div>
    </div>
  );
}

// ── New Folder Dialog ─────────────────────────────────────────────────────────
function NewFolderDialog({ currentFolder, onConfirm, onClose }) {
  const [name, setName] = useState('');
  const ref = useRef(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 50); }, []);
  const full = currentFolder ? `${currentFolder}/${name.trim()}` : name.trim();
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-72 p-4">
        <h3 className="text-sm font-semibold text-white mb-1">New Folder</h3>
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

// ── Sidebar FolderNode ────────────────────────────────────────────────────────
function FolderNode({ path, depth, allFolders, expanded, setExpanded, currentFolder, onNavigate }) {
  const label = path === '' ? 'Root' : getFolderLabel(path);
  const isActive = currentFolder === path;
  const children = allFolders.filter(f => {
    if (!f) return false;
    const fParts = f.split('/');
    const pParts = path ? path.split('/') : [];
    return fParts.length === pParts.length + 1 && fParts.slice(0, pParts.length).join('/') === path;
  });
  const isExpanded = expanded.has(path);

  return (
    <div>
      <div
        onClick={() => onNavigate(path)}
        className={cn('flex items-center gap-1.5 py-1 rounded cursor-pointer group transition-colors text-xs select-none',
          isActive ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        )}
        style={{ paddingLeft: 6 + depth * 14, paddingRight: 6 }}
      >
        {children.length > 0 ? (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(prev => { const n = new Set(prev); n.has(path) ? n.delete(path) : n.add(path); return n; }); }}
            className="shrink-0 text-slate-600 hover:text-slate-300 p-0.5"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : <span className="w-4 shrink-0" />}
        {path === '' ? <Home className="w-3 h-3 shrink-0" /> : <Folder className="w-3 h-3 shrink-0 text-amber-400" />}
        <span className="flex-1 truncate">{label}</span>
      </div>
      {isExpanded && children.map(child => (
        <FolderNode key={child} path={child} depth={depth + 1}
          allFolders={allFolders} expanded={expanded} setExpanded={setExpanded}
          currentFolder={currentFolder} onNavigate={onNavigate} />
      ))}
    </div>
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
  const [sortBy, setSortBy] = useState('updated'); // 'name' | 'updated'
  const [renamingId, setRenamingId] = useState(null);
  const [busyIds, setBusyIds] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }
  const [contextMenu, setContextMenu] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null); // project
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [currentFolder, setCurrentFolder] = useState('');
  const [expandedFolders, setExpandedFolders] = useState(new Set(['']));

  const overlayRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ps = await listProjects();
      setProjects(ps);
    } catch (e) {
      console.error('Failed to list projects', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const h = () => setContextMenu(null);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [contextMenu]);

  const allFolders = buildFolderTree(projects);

  const subFolders = allFolders.filter(f => {
    if (!f) return false;
    const fParts = f.split('/');
    const pParts = currentFolder ? currentFolder.split('/') : [];
    return fParts.length === pParts.length + 1 && fParts.slice(0, pParts.length).join('/') === currentFolder;
  });

  const visibleProjects = projects
    .filter(p => {
      if (search) return p.name.toLowerCase().includes(search.toLowerCase());
      return (p.folder || '') === currentFolder;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

  const navigate = (folder) => {
    setCurrentFolder(folder);
    setSearch('');
    setExpandedFolders(prev => new Set([...prev, folder]));
  };

  const goUp = () => {
    if (!currentFolder) return;
    const parts = currentFolder.split('/');
    parts.pop();
    setCurrentFolder(parts.join('/'));
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleOpen = async (idToOpen) => {
    const id = idToOpen ?? selectedId;
    if (!id) return;
    if (id === DEMO_ID) {
      const demo = buildDemoProject();
      onOpen(DEMO_ID, { id: DEMO_ID, name: demo.projectName, layers: demo.layers, turbineTypes: DEFAULT_TURBINE_TYPES, cableTypes: DEFAULT_CABLE_TYPES, windParams: demo.windParams });
      onClose();
      return;
    }
    setOpening(true);
    try {
      const proj = await loadProject(id);
      if (proj) { onOpen(proj.id, proj); onClose(); }
    } catch (e) { console.error('Failed to open project', e); }
    setOpening(false);
  };

  const handleSave = async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      const data = { ...currentData, name: saveName.trim(), folder: currentFolder, is_training: false };
      const id = await saveProject(currentProjectId, data);
      onSaved(saveName.trim(), id);
      onClose();
    } catch (e) { console.error('Failed to save', e); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    setConfirmDelete(null);
    setBusyIds(prev => new Set([...prev, id]));
    try {
      await deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (e) { console.error('Failed to delete', e); }
    setBusyIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleRename = async (id, newName) => {
    setRenamingId(null);
    if (!newName.trim()) return;
    setBusyIds(prev => new Set([...prev, id]));
    try {
      await renameProject(id, newName.trim());
      setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName.trim() } : p));
    } catch (e) { console.error('Failed to rename', e); }
    setBusyIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleMove = async (id, newFolder) => {
    setMoveTarget(null);
    setBusyIds(prev => new Set([...prev, id]));
    try {
      await moveProject(id, newFolder);
      setProjects(prev => prev.map(p => p.id === id ? { ...p, folder: newFolder } : p));
    } catch (e) { console.error('Failed to move', e); }
    setBusyIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleDeleteFolder = async (folder) => {
    if (!window.confirm(`Move all projects in "${folder}" to Root and remove folder?`)) return;
    const ids = projects.filter(p => (p.folder || '') === folder || (p.folder || '').startsWith(folder + '/')).map(p => p.id);
    await Promise.all(ids.map(id => moveProject(id, '')));
    setProjects(prev => prev.map(p => ids.includes(p.id) ? { ...p, folder: '' } : p));
    if (currentFolder === folder || currentFolder.startsWith(folder + '/')) setCurrentFolder('');
  };

  const handleNewFolder = (fullPath) => {
    setExpandedFolders(prev => new Set([...prev, fullPath]));
    setCurrentFolder(fullPath);
    setShowNewFolder(false);
  };

  const openContextMenu = (e, project) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { label: 'Open', icon: FolderOpen, action: () => handleOpen(project.id) },
        { label: 'Rename', icon: Edit2, action: () => setRenamingId(project.id) },
        { label: 'Move to…', icon: Move, action: () => setMoveTarget(project) },
        'divider',
        { label: 'Delete', icon: Trash2, danger: true, action: () => setConfirmDelete({ id: project.id, name: project.name }) },
      ],
    });
  };

  // Breadcrumbs
  const crumbParts = currentFolder ? currentFolder.split('/') : [];
  const breadcrumbs = [{ label: 'Root', path: '' }, ...crumbParts.map((c, i) => ({ label: c, path: crumbParts.slice(0, i + 1).join('/') }))];

  const busy = opening || saving;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 800, maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">
              {mode === 'open' ? 'Open Project' : 'Save Project'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={load} disabled={loading} className="p-1.5 text-slate-500 hover:text-white transition-colors rounded" title="Refresh">
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white transition-colors rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Save name row */}
        {mode === 'save' && (
          <div className="px-5 py-2.5 border-b border-slate-800 shrink-0 flex items-center gap-3">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider shrink-0">File name</label>
            <input
              autoFocus
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
              className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
              placeholder="Project name…"
            />
            <span className="text-[10px] text-slate-600 shrink-0">
              Folder: <span className="text-slate-400">{currentFolder || 'Root'}</span>
            </span>
          </div>
        )}

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-44 shrink-0 border-r border-slate-800 flex flex-col bg-slate-900/50">
            <div className="flex items-center justify-between px-2 py-2 border-b border-slate-800 shrink-0">
              <span className="text-[9px] text-slate-600 uppercase tracking-wider font-medium">Folders</span>
              <button onClick={() => setShowNewFolder(true)} title="New folder"
                className="p-0.5 text-slate-600 hover:text-emerald-400 transition-colors">
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-1 px-1 space-y-0.5">
              <FolderNode path="" depth={0}
                allFolders={allFolders} expanded={expandedFolders} setExpanded={setExpandedFolders}
                currentFolder={currentFolder} onNavigate={navigate} />
            </div>
          </div>

          {/* Main panel */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Toolbar */}
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-800 shrink-0">
              {/* Back button */}
              <button onClick={goUp} disabled={!currentFolder}
                className="p-1 text-slate-500 hover:text-white disabled:opacity-30 transition-colors rounded">
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>

              {/* Breadcrumbs */}
              <div className="flex items-center gap-0.5 text-[10px] text-slate-500 flex-1 min-w-0 overflow-hidden">
                {breadcrumbs.map((crumb, i) => (
                  <React.Fragment key={crumb.path}>
                    {i > 0 && <ChevronRight className="w-3 h-3 shrink-0 text-slate-700" />}
                    <button
                      onClick={() => navigate(crumb.path)}
                      className={cn('px-1 py-0.5 rounded transition-colors truncate max-w-[100px]',
                        i === breadcrumbs.length - 1 ? 'text-white font-medium' : 'hover:text-white hover:bg-slate-800'
                      )}
                    >
                      {crumb.label}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* New folder button */}
              <button onClick={() => setShowNewFolder(true)} title="New folder"
                className="flex items-center gap-1 px-2 py-1 text-[10px] text-slate-500 hover:text-emerald-400 rounded hover:bg-slate-800 transition-colors shrink-0">
                <FolderPlus className="w-3.5 h-3.5" /> New Folder
              </button>

              {/* Search */}
              <div className="relative shrink-0">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="bg-slate-800 border border-slate-700 rounded-lg pl-6 pr-2 py-1 text-xs text-white outline-none focus:border-emerald-500 w-28"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              {/* Sort toggle */}
              <button
                onClick={() => setSortBy(s => s === 'updated' ? 'name' : 'updated')}
                className="px-2 py-1 text-[10px] text-slate-500 hover:text-white rounded hover:bg-slate-800 transition-colors shrink-0"
              >
                Sort: {sortBy === 'updated' ? 'Date' : 'Name'}
              </button>
            </div>

            {/* Column headers */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-800 shrink-0 text-[9px] text-slate-600 uppercase tracking-wider">
              <div className="w-5 shrink-0" />
              <div className="flex-1">Name</div>
              <div className="w-24 text-right shrink-0">Modified</div>
              <div className="w-20 shrink-0" />
            </div>

            {/* File list */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
                </div>
              ) : (
                <div>
                  {/* Demo */}
                  {mode === 'open' && !search && currentFolder === '' && (
                    <div
                      onClick={() => setSelectedId(DEMO_ID)}
                      onDoubleClick={() => handleOpen(DEMO_ID)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 cursor-pointer group transition-all border-b border-slate-800/50',
                        selectedId === DEMO_ID ? 'bg-emerald-500/10' : 'hover:bg-slate-800/50'
                      )}
                    >
                      <Wind className={cn('w-4 h-4 shrink-0', selectedId === DEMO_ID ? 'text-emerald-400' : 'text-slate-500')} />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-xs font-medium truncate', selectedId === DEMO_ID ? 'text-white' : 'text-slate-300')}>
                          Ballycraggan Wind Farm — Demo
                        </p>
                      </div>
                      <div className="w-24 text-right text-[10px] text-slate-600 shrink-0">read-only</div>
                      <div className="w-20 shrink-0" />
                    </div>
                  )}

                  {/* Subfolders */}
                  {!search && subFolders.map(folder => (
                    <div
                      key={folder}
                      onDoubleClick={() => navigate(folder)}
                      onClick={() => navigate(folder)}
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer group transition-all border-b border-slate-800/50 hover:bg-slate-800/50"
                    >
                      <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="flex-1 text-xs text-slate-300 font-medium truncate">{getFolderLabel(folder)}</span>
                      <div className="w-24 shrink-0" />
                      <div className="w-20 flex justify-end shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteFolder(folder); }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 rounded transition-all"
                          title="Remove folder"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Projects */}
                  {visibleProjects.map(p => {
                    const isSelected = selectedId === p.id;
                    const isBusy = busyIds.has(p.id);
                    const isRenaming = renamingId === p.id;

                    return (
                      <div
                        key={p.id}
                        onClick={() => { if (!isBusy) { setSelectedId(p.id); if (mode === 'save') setSaveName(p.name); } }}
                        onDoubleClick={() => { if (!isBusy && mode === 'open') handleOpen(p.id); }}
                        onContextMenu={e => openContextMenu(e, p)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 cursor-pointer group transition-all border-b border-slate-800/50',
                          isSelected ? 'bg-emerald-500/10' : 'hover:bg-slate-800/50',
                          isBusy && 'opacity-40 pointer-events-none'
                        )}
                      >
                        {isBusy
                          ? <Loader2 className="w-4 h-4 animate-spin text-slate-500 shrink-0" />
                          : <FileText className={cn('w-4 h-4 shrink-0', isSelected ? 'text-emerald-400' : p.is_training ? 'text-orange-400/60' : 'text-slate-500')} />
                        }

                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          {isRenaming ? (
                            <InlineRename
                              value={p.name}
                              onConfirm={name => handleRename(p.id, name)}
                              onCancel={() => setRenamingId(null)}
                            />
                          ) : (
                            <>
                              <p className={cn('text-xs font-medium truncate', isSelected ? 'text-white' : 'text-slate-300')}>
                                {p.name}
                              </p>
                              {p.is_training && <span className="text-[8px] text-orange-400/60 border border-orange-500/20 px-1 rounded shrink-0">training</span>}
                            </>
                          )}
                        </div>

                        <div className="w-24 text-right text-[10px] text-slate-600 shrink-0">{formatDate(p.updatedAt)}</div>

                        {/* Row actions (hover) */}
                        <div className="w-20 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={e => { e.stopPropagation(); setRenamingId(p.id); }}
                            className="p-1 text-slate-600 hover:text-white rounded transition-colors" title="Rename">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setMoveTarget(p); }}
                            className="p-1 text-slate-600 hover:text-white rounded transition-colors" title="Move to…">
                            <Move className="w-3 h-3" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setConfirmDelete({ id: p.id, name: p.name }); }}
                            className="p-1 text-slate-600 hover:text-red-400 rounded transition-colors" title="Delete">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {!loading && visibleProjects.length === 0 && subFolders.length === 0 && !(mode === 'open' && !search && currentFolder === '') && (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                      <FileText className="w-10 h-10 mb-3 opacity-20" />
                      <p className="text-sm">{search ? 'No results found' : 'No projects in this folder'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
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
                disabled={!selectedId || busy}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {opening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
                Open
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!saveName.trim() || busy}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />
      )}

      {/* Move dialog */}
      {moveTarget && (
        <MoveDialog
          projectName={moveTarget.name}
          folders={allFolders}
          currentFolder={moveTarget.folder || ''}
          onMove={folder => handleMove(moveTarget.id, folder)}
          onClose={() => setMoveTarget(null)}
        />
      )}

      {/* New folder dialog */}
      {showNewFolder && (
        <NewFolderDialog currentFolder={currentFolder} onConfirm={handleNewFolder} onClose={() => setShowNewFolder(false)} />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70">
          <div className="bg-slate-900 border border-red-500/40 rounded-xl shadow-2xl p-5 max-w-sm w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white mb-1">Delete project?</p>
                <p className="text-xs text-slate-400">"{confirmDelete.name}" will be permanently deleted from the server.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded hover:bg-slate-800">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.id)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}