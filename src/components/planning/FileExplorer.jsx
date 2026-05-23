/**
 * Full-featured project file explorer — Windows Explorer style.
 * Multi-select, bulk move/delete, Recycle Bin, folders, rename, search, sort.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FolderOpen, Folder, FolderPlus, FileText, Wind, X, Trash2, Edit2,
  AlertTriangle, RefreshCw, Loader2, Check, Search, ChevronRight,
  ChevronDown, Home, ArrowLeft, Move, RotateCcw, Trash
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  listProjects, loadProject, saveProject, deleteProject,
  renameProject, moveProject,
} from '@/lib/projectStorage';
import { buildDemoProject } from '@/lib/demoProject';
import { DEFAULT_TURBINE_TYPES, DEFAULT_CABLE_TYPES } from '@/lib/turbineTypes';

const DEMO_ID = '__demo__';
const RECYCLE_KEY = 'file_explorer_recycle_bin';

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
  return path.split('/').pop();
}

function loadRecycleBin() {
  try { return JSON.parse(localStorage.getItem(RECYCLE_KEY) || '[]'); } catch { return []; }
}
function saveRecycleBin(items) {
  localStorage.setItem(RECYCLE_KEY, JSON.stringify(items));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InlineRename({ value, onConfirm, onCancel }) {
  const [val, setVal] = useState(value);
  const ref = useRef(null);
  useEffect(() => { setTimeout(() => ref.current?.select(), 50); }, []);
  return (
    <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
      onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') onConfirm(val); if (e.key === 'Escape') onCancel(); }}
      onBlur={() => onConfirm(val)} onClick={e => e.stopPropagation()}
      className="flex-1 bg-slate-700 border border-emerald-500 rounded px-1.5 py-0.5 text-xs text-white outline-none min-w-0" autoFocus />
  );
}

function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  const style = { position: 'fixed', left: Math.min(x, window.innerWidth - 200), top: Math.min(y, window.innerHeight - items.length * 32 - 16), zIndex: 99999 };
  return (
    <div ref={ref} style={style} className="bg-slate-800 border border-slate-600 rounded-lg shadow-2xl py-1 min-w-[170px]">
      {items.map((item, i) =>
        item === 'divider' ? <div key={i} className="h-px bg-slate-700 my-1" /> : (
          <button key={i} onClick={() => { item.action(); onClose(); }}
            className={cn('flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left transition-colors',
              item.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-slate-300 hover:bg-slate-700 hover:text-white')}>
            {item.icon && <item.icon className="w-3.5 h-3.5 shrink-0" />}
            {item.label}
          </button>
        )
      )}
    </div>
  );
}

function MoveDialog({ title, folders, currentFolder, onMove, onClose }) {
  const [selected, setSelected] = useState(currentFolder || '');
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-80 p-4">
        <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
        <div className="space-y-1 max-h-48 overflow-y-auto mb-3">
          <button onClick={() => setSelected('')} className={cn('flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs', selected === '' ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}>
            <Home className="w-3 h-3" /> Root (no folder)
          </button>
          {folders.filter(Boolean).map(f => (
            <button key={f} onClick={() => setSelected(f)} className={cn('flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs', selected === f ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}>
              <Folder className="w-3 h-3 text-amber-400" /> {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded hover:bg-slate-800">Cancel</button>
          <button onClick={() => onMove(selected)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded">Move Here</button>
        </div>
      </div>
    </div>
  );
}

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
          <button onClick={() => name.trim() && onConfirm(full)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded">Create</button>
        </div>
      </div>
    </div>
  );
}

function FolderNode({ path, depth, allFolders, expanded, setExpanded, currentFolder, onNavigate }) {
  const label = path === '' ? 'Root' : getFolderLabel(path);
  const isActive = currentFolder === path;
  const children = allFolders.filter(f => {
    if (!f) return false;
    const fParts = f.split('/'), pParts = path ? path.split('/') : [];
    return fParts.length === pParts.length + 1 && fParts.slice(0, pParts.length).join('/') === path;
  });
  const isExpanded = expanded.has(path);
  return (
    <div>
      <div onClick={() => onNavigate(path)}
        className={cn('flex items-center gap-1.5 py-1 rounded cursor-pointer group transition-colors text-xs select-none',
          isActive ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}
        style={{ paddingLeft: 6 + depth * 14, paddingRight: 6 }}>
        {children.length > 0 ? (
          <button onClick={e => { e.stopPropagation(); setExpanded(prev => { const n = new Set(prev); n.has(path) ? n.delete(path) : n.add(path); return n; }); }}
            className="shrink-0 text-slate-600 hover:text-slate-300 p-0.5">
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

// ── Recycle Bin tab ───────────────────────────────────────────────────────────
function RecycleBin({ recycleBin, onRestore, onPermanentDelete, onEmptyBin }) {
  const [checked, setChecked] = useState(new Set());
  const allChecked = recycleBin.length > 0 && checked.size === recycleBin.length;

  const toggle = (id) => setChecked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(recycleBin.map(i => i.id)));

  return (
    <div className="flex flex-col h-full">
      {/* Recycle bin toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 shrink-0">
        <Trash className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-xs text-slate-400 flex-1">{recycleBin.length} item{recycleBin.length !== 1 ? 's' : ''} in Recycle Bin</span>
        {checked.size > 0 && (
          <>
            <button onClick={() => { [...checked].forEach(id => onRestore(id)); setChecked(new Set()); }}
              className="flex items-center gap-1 px-2 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded text-[10px] hover:bg-blue-600/30 transition-colors">
              <RotateCcw className="w-3 h-3" /> Restore ({checked.size})
            </button>
            <button onClick={() => { if (window.confirm(`Permanently delete ${checked.size} item(s)?`)) { [...checked].forEach(id => onPermanentDelete(id)); setChecked(new Set()); } }}
              className="flex items-center gap-1 px-2 py-1 bg-red-600/20 text-red-300 border border-red-500/30 rounded text-[10px] hover:bg-red-600/30 transition-colors">
              <Trash2 className="w-3 h-3" /> Delete ({checked.size})
            </button>
          </>
        )}
        {recycleBin.length > 0 && (
          <button onClick={() => { if (window.confirm(`Permanently delete all ${recycleBin.length} item(s) in Recycle Bin?`)) onEmptyBin(); }}
            className="flex items-center gap-1 px-2 py-1 bg-red-900/30 text-red-400 border border-red-500/30 rounded text-[10px] hover:bg-red-900/50 transition-colors">
            <Trash2 className="w-3 h-3" /> Empty Bin
          </button>
        )}
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-800 shrink-0 text-[9px] text-slate-600 uppercase tracking-wider">
        <button onClick={toggleAll} className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all',
          allChecked ? 'bg-emerald-500 border-emerald-400' : 'border-slate-600 hover:border-slate-400')}>
          {allChecked && <Check className="w-2.5 h-2.5 text-white" />}
        </button>
        <div className="flex-1">Name</div>
        <div className="w-28 text-right shrink-0">Deleted</div>
        <div className="w-16 shrink-0" />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {recycleBin.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-600">
            <Trash className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">Recycle Bin is empty</p>
          </div>
        ) : recycleBin.map(item => {
          const isChecked = checked.has(item.id);
          return (
            <div key={item.id}
              onClick={() => toggle(item.id)}
              className={cn('flex items-center gap-2 px-3 py-2 cursor-pointer transition-all border-b border-slate-800/50 group',
                isChecked ? 'bg-blue-500/10' : 'hover:bg-slate-800/50')}>
              <button onClick={e => { e.stopPropagation(); toggle(item.id); }}
                className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all',
                  isChecked ? 'bg-emerald-500 border-emerald-400' : 'border-slate-700 group-hover:border-slate-500')}>
                {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
              </button>
              <FileText className="w-4 h-4 text-slate-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 truncate">{item.name}</p>
                {item.folder && <p className="text-[9px] text-slate-600">was in: {item.folder}</p>}
              </div>
              <div className="w-28 text-right text-[10px] text-slate-600 shrink-0">{formatDate(item.deletedAt)}</div>
              <div className="w-16 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={e => { e.stopPropagation(); onRestore(item.id); }}
                  className="p-1 text-slate-600 hover:text-blue-400 rounded" title="Restore"><RotateCcw className="w-3 h-3" /></button>
                <button onClick={e => { e.stopPropagation(); if (window.confirm(`Permanently delete "${item.name}"?`)) onPermanentDelete(item.id); }}
                  className="p-1 text-slate-600 hover:text-red-400 rounded" title="Delete permanently"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          );
        })}
      </div>
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
  const [sortBy, setSortBy] = useState('updated');
  const [renamingId, setRenamingId] = useState(null);
  const [busyIds, setBusyIds] = useState(new Set());
  const [contextMenu, setContextMenu] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [currentFolder, setCurrentFolder] = useState('');
  const [expandedFolders, setExpandedFolders] = useState(new Set(['']));
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState('files'); // 'files' | 'recycle'
  const [recycleBin, setRecycleBin] = useState(loadRecycleBin);
  const [bulkMoving, setBulkMoving] = useState(false);

  const overlayRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setProjects(await listProjects()); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const allFolders = buildFolderTree(projects);

  const subFolders = allFolders.filter(f => {
    if (!f) return false;
    const fParts = f.split('/'), pParts = currentFolder ? currentFolder.split('/') : [];
    return fParts.length === pParts.length + 1 && fParts.slice(0, pParts.length).join('/') === currentFolder;
  });

  const visibleProjects = projects
    .filter(p => search ? p.name.toLowerCase().includes(search.toLowerCase()) : (p.folder || '') === currentFolder)
    .sort((a, b) => sortBy === 'name' ? a.name.localeCompare(b.name) : (b.updatedAt || 0) - (a.updatedAt || 0));

  const allVisibleChecked = visibleProjects.length > 0 && visibleProjects.every(p => checkedIds.has(p.id));

  const navigate = (folder) => {
    setCurrentFolder(folder);
    setSearch('');
    setCheckedIds(new Set());
    setExpandedFolders(prev => new Set([...prev, folder]));
  };

  const goUp = () => {
    if (!currentFolder) return;
    const parts = currentFolder.split('/'); parts.pop();
    setCurrentFolder(parts.join('/'));
  };

  const toggleCheck = (id, e) => {
    if (e) e.stopPropagation();
    setCheckedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleCheckAll = () => {
    setCheckedIds(allVisibleChecked ? new Set() : new Set(visibleProjects.map(p => p.id)));
  };

  // ── Recycle Bin helpers ───────────────────────────────────────────────────
  const sendToRecycleBin = (ids) => {
    const items = projects.filter(p => ids.includes(p.id)).map(p => ({
      id: p.id, name: p.name, folder: p.folder || '', deletedAt: Date.now(),
    }));
    const updated = [...recycleBin, ...items];
    setRecycleBin(updated);
    saveRecycleBin(updated);
  };

  const restoreFromBin = async (id) => {
    const item = recycleBin.find(i => i.id === id);
    if (!item) return;
    // Re-add to visible list (it was already on server, just hidden locally)
    setRecycleBin(prev => { const u = prev.filter(i => i.id !== id); saveRecycleBin(u); return u; });
    await load(); // Reload to get it back
  };

  const permanentDelete = async (id) => {
    setRecycleBin(prev => { const u = prev.filter(i => i.id !== id); saveRecycleBin(u); return u; });
    try { await deleteProject(id); } catch (e) { console.error(e); }
  };

  const emptyBin = async () => {
    const ids = recycleBin.map(i => i.id);
    setRecycleBin([]); saveRecycleBin([]);
    await Promise.all(ids.map(id => deleteProject(id).catch(() => {})));
  };

  // ── File actions ──────────────────────────────────────────────────────────
  const handleOpen = async (idToOpen) => {
    const id = idToOpen ?? selectedId;
    if (!id) return;
    if (id === DEMO_ID) {
      const demo = buildDemoProject();
      onOpen(DEMO_ID, { id: DEMO_ID, name: demo.projectName, layers: demo.layers, turbineTypes: DEFAULT_TURBINE_TYPES, cableTypes: DEFAULT_CABLE_TYPES, windParams: demo.windParams });
      onClose(); return;
    }
    setOpening(true);
    try { const proj = await loadProject(id); if (proj) { onOpen(proj.id, proj); onClose(); } } catch (e) { console.error(e); }
    setOpening(false);
  };

  const handleSave = async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      const data = { ...currentData, name: saveName.trim(), folder: currentFolder, is_training: false };
      const id = await saveProject(currentProjectId, data);
      onSaved(saveName.trim(), id); onClose();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  // Single delete → goes to recycle bin
  const handleDelete = (id) => {
    sendToRecycleBin([id]);
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selectedId === id) setSelectedId(null);
    setCheckedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  // Bulk delete → recycle bin
  const handleBulkDelete = () => {
    const ids = [...checkedIds];
    if (!ids.length) return;
    sendToRecycleBin(ids);
    setProjects(prev => prev.filter(p => !ids.includes(p.id)));
    setCheckedIds(new Set());
  };

  const handleRename = async (id, newName) => {
    setRenamingId(null);
    if (!newName.trim()) return;
    setBusyIds(prev => new Set([...prev, id]));
    try { await renameProject(id, newName.trim()); setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName.trim() } : p)); }
    catch (e) { console.error(e); }
    setBusyIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  // Single move
  const handleMove = async (id, newFolder) => {
    setMoveTarget(null);
    setBusyIds(prev => new Set([...prev, id]));
    try { await moveProject(id, newFolder); setProjects(prev => prev.map(p => p.id === id ? { ...p, folder: newFolder } : p)); }
    catch (e) { console.error(e); }
    setBusyIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  // Bulk move
  const handleBulkMove = async (newFolder) => {
    setBulkMoving(false);
    const ids = [...checkedIds];
    setBusyIds(new Set(ids));
    await Promise.all(ids.map(id => moveProject(id, newFolder).catch(() => {})));
    setProjects(prev => prev.map(p => ids.includes(p.id) ? { ...p, folder: newFolder } : p));
    setCheckedIds(new Set());
    setBusyIds(new Set());
  };

  const handleDeleteFolder = async (folder) => {
    if (!window.confirm(`Move all projects in "${folder}" to Root and remove folder?`)) return;
    const ids = projects.filter(p => (p.folder || '') === folder || (p.folder || '').startsWith(folder + '/')).map(p => p.id);
    await Promise.all(ids.map(id => moveProject(id, '').catch(() => {})));
    setProjects(prev => prev.map(p => ids.includes(p.id) ? { ...p, folder: '' } : p));
    if (currentFolder === folder || currentFolder.startsWith(folder + '/')) setCurrentFolder('');
  };

  const handleNewFolder = (fullPath) => {
    setExpandedFolders(prev => new Set([...prev, fullPath]));
    setCurrentFolder(fullPath);
    setShowNewFolder(false);
  };

  const openContextMenu = (e, project) => {
    e.preventDefault(); e.stopPropagation();
    const isMulti = checkedIds.has(project.id) && checkedIds.size > 1;
    setContextMenu({
      x: e.clientX, y: e.clientY,
      items: isMulti ? [
        { label: `Move ${checkedIds.size} items…`, icon: Move, action: () => setBulkMoving(true) },
        'divider',
        { label: `Delete ${checkedIds.size} items`, icon: Trash2, danger: true, action: handleBulkDelete },
      ] : [
        { label: 'Open', icon: FolderOpen, action: () => handleOpen(project.id) },
        { label: 'Rename', icon: Edit2, action: () => setRenamingId(project.id) },
        { label: 'Move to…', icon: Move, action: () => setMoveTarget(project) },
        'divider',
        { label: 'Delete', icon: Trash2, danger: true, action: () => handleDelete(project.id) },
      ],
    });
  };

  const crumbParts = currentFolder ? currentFolder.split('/') : [];
  const breadcrumbs = [{ label: 'Root', path: '' }, ...crumbParts.map((c, i) => ({ label: c, path: crumbParts.slice(0, i + 1).join('/') }))];
  const busy = opening || saving;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 860, maxHeight: '88vh' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white">{mode === 'open' ? 'Open Project' : 'Save Project'}</span>
            </div>
            {/* Tabs */}
            <div className="flex items-center gap-0.5 ml-4">
              <button onClick={() => setActiveTab('files')}
                className={cn('flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors',
                  activeTab === 'files' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800')}>
                <Folder className="w-3 h-3" /> Files
              </button>
              <button onClick={() => setActiveTab('recycle')}
                className={cn('flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors',
                  activeTab === 'recycle' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800')}>
                <Trash className="w-3 h-3" /> Recycle Bin
                {recycleBin.length > 0 && <span className="ml-0.5 text-[9px] bg-red-500/30 text-red-300 px-1 rounded">{recycleBin.length}</span>}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={load} disabled={loading} className="p-1.5 text-slate-500 hover:text-white transition-colors rounded" title="Refresh">
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white transition-colors rounded"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Save name row */}
        {mode === 'save' && activeTab === 'files' && (
          <div className="px-5 py-2.5 border-b border-slate-800 shrink-0 flex items-center gap-3">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider shrink-0">File name</label>
            <input autoFocus value={saveName} onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
              className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
              placeholder="Project name…" />
            <span className="text-[10px] text-slate-600 shrink-0">Folder: <span className="text-slate-400">{currentFolder || 'Root'}</span></span>
          </div>
        )}

        {activeTab === 'recycle' ? (
          <div className="flex-1 min-h-0 overflow-hidden">
            <RecycleBin recycleBin={recycleBin} onRestore={restoreFromBin} onPermanentDelete={permanentDelete} onEmptyBin={emptyBin} />
          </div>
        ) : (
          /* Files view */
          <div className="flex flex-1 min-h-0">
            {/* Sidebar */}
            <div className="w-44 shrink-0 border-r border-slate-800 flex flex-col bg-slate-900/50">
              <div className="flex items-center justify-between px-2 py-2 border-b border-slate-800 shrink-0">
                <span className="text-[9px] text-slate-600 uppercase tracking-wider font-medium">Folders</span>
                <button onClick={() => setShowNewFolder(true)} title="New folder" className="p-0.5 text-slate-600 hover:text-emerald-400 transition-colors">
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-1 px-1 space-y-0.5">
                <FolderNode path="" depth={0} allFolders={allFolders} expanded={expandedFolders} setExpanded={setExpandedFolders}
                  currentFolder={currentFolder} onNavigate={navigate} />
              </div>
            </div>

            {/* Main panel */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Toolbar */}
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-800 shrink-0">
                <button onClick={goUp} disabled={!currentFolder} className="p-1 text-slate-500 hover:text-white disabled:opacity-30 transition-colors rounded">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-0.5 text-[10px] text-slate-500 flex-1 min-w-0 overflow-hidden">
                  {breadcrumbs.map((crumb, i) => (
                    <React.Fragment key={crumb.path}>
                      {i > 0 && <ChevronRight className="w-3 h-3 shrink-0 text-slate-700" />}
                      <button onClick={() => navigate(crumb.path)}
                        className={cn('px-1 py-0.5 rounded transition-colors truncate max-w-[100px]',
                          i === breadcrumbs.length - 1 ? 'text-white font-medium' : 'hover:text-white hover:bg-slate-800')}>
                        {crumb.label}
                      </button>
                    </React.Fragment>
                  ))}
                </div>

                {/* Bulk action bar — only shown when items checked */}
                {checkedIds.size > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-emerald-300 font-medium">{checkedIds.size} selected</span>
                    <button onClick={() => setBulkMoving(true)}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded text-[10px] hover:bg-blue-600/30 transition-colors">
                      <Move className="w-3 h-3" /> Move
                    </button>
                    <button onClick={handleBulkDelete}
                      className="flex items-center gap-1 px-2 py-1 bg-red-600/20 text-red-300 border border-red-500/30 rounded text-[10px] hover:bg-red-600/30 transition-colors">
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                    <button onClick={() => setCheckedIds(new Set())}
                      className="p-1 text-slate-500 hover:text-white rounded transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {checkedIds.size === 0 && (
                  <>
                    <button onClick={() => setShowNewFolder(true)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] text-slate-500 hover:text-emerald-400 rounded hover:bg-slate-800 transition-colors shrink-0">
                      <FolderPlus className="w-3.5 h-3.5" /> New Folder
                    </button>
                    <div className="relative shrink-0">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                        className="bg-slate-800 border border-slate-700 rounded-lg pl-6 pr-2 py-1 text-xs text-white outline-none focus:border-emerald-500 w-28" />
                      {search && <button onClick={() => setSearch('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X className="w-2.5 h-2.5" /></button>}
                    </div>
                    <button onClick={() => setSortBy(s => s === 'updated' ? 'name' : 'updated')}
                      className="px-2 py-1 text-[10px] text-slate-500 hover:text-white rounded hover:bg-slate-800 transition-colors shrink-0">
                      Sort: {sortBy === 'updated' ? 'Date' : 'Name'}
                    </button>
                  </>
                )}
              </div>

              {/* Column headers */}
              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-800 shrink-0 text-[9px] text-slate-600 uppercase tracking-wider">
                <button onClick={toggleCheckAll}
                  className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all',
                    allVisibleChecked ? 'bg-emerald-500 border-emerald-400' : 'border-slate-700 hover:border-slate-500')}>
                  {allVisibleChecked && <Check className="w-2.5 h-2.5 text-white" />}
                </button>
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
                      <div onClick={() => setSelectedId(DEMO_ID)} onDoubleClick={() => handleOpen(DEMO_ID)}
                        className={cn('flex items-center gap-2 px-3 py-2 cursor-pointer group transition-all border-b border-slate-800/50',
                          selectedId === DEMO_ID ? 'bg-emerald-500/10' : 'hover:bg-slate-800/50')}>
                        <div className="w-4 h-4 shrink-0" />
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
                      <div key={folder} onDoubleClick={() => navigate(folder)} onClick={() => navigate(folder)}
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer group transition-all border-b border-slate-800/50 hover:bg-slate-800/50">
                        <div className="w-4 h-4 shrink-0" />
                        <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="flex-1 text-xs text-slate-300 font-medium truncate">{getFolderLabel(folder)}</span>
                        <div className="w-24 shrink-0" />
                        <div className="w-20 flex justify-end shrink-0">
                          <button onClick={e => { e.stopPropagation(); handleDeleteFolder(folder); }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 rounded transition-all" title="Remove folder">
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
                      const isChecked = checkedIds.has(p.id);

                      return (
                        <div key={p.id}
                          onClick={e => {
                            if (!isBusy) {
                              if (e.ctrlKey || e.metaKey) {
                                toggleCheck(p.id);
                              } else {
                                setSelectedId(p.id);
                                if (mode === 'save') setSaveName(p.name);
                              }
                            }
                          }}
                          onDoubleClick={() => { if (!isBusy && mode === 'open') handleOpen(p.id); }}
                          onContextMenu={e => openContextMenu(e, p)}
                          className={cn('flex items-center gap-2 px-3 py-2 cursor-pointer group transition-all border-b border-slate-800/50',
                            isChecked ? 'bg-blue-500/10' : isSelected ? 'bg-emerald-500/10' : 'hover:bg-slate-800/50',
                            isBusy && 'opacity-40 pointer-events-none')}>

                          {/* Checkbox */}
                          <button onClick={e => toggleCheck(p.id, e)}
                            className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all',
                              isChecked ? 'bg-emerald-500 border-emerald-400' : 'border-slate-700 opacity-0 group-hover:opacity-100')}>
                            {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
                          </button>

                          {isBusy ? <Loader2 className="w-4 h-4 animate-spin text-slate-500 shrink-0" />
                            : <FileText className={cn('w-4 h-4 shrink-0', isChecked ? 'text-blue-400' : isSelected ? 'text-emerald-400' : p.is_training ? 'text-orange-400/60' : 'text-slate-500')} />}

                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            {isRenaming ? (
                              <InlineRename value={p.name} onConfirm={name => handleRename(p.id, name)} onCancel={() => setRenamingId(null)} />
                            ) : (
                              <>
                                <p className={cn('text-xs font-medium truncate', isChecked || isSelected ? 'text-white' : 'text-slate-300')}>{p.name}</p>
                                {p.is_training && <span className="text-[8px] text-orange-400/60 border border-orange-500/20 px-1 rounded shrink-0">training</span>}
                              </>
                            )}
                          </div>

                          <div className="w-24 text-right text-[10px] text-slate-600 shrink-0">{formatDate(p.updatedAt)}</div>

                          <div className="w-20 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={e => { e.stopPropagation(); setRenamingId(p.id); }}
                              className="p-1 text-slate-600 hover:text-white rounded transition-colors" title="Rename"><Edit2 className="w-3 h-3" /></button>
                            <button onClick={e => { e.stopPropagation(); setMoveTarget(p); }}
                              className="p-1 text-slate-600 hover:text-white rounded transition-colors" title="Move to…"><Move className="w-3 h-3" /></button>
                            <button onClick={e => { e.stopPropagation(); handleDelete(p.id); }}
                              className="p-1 text-slate-600 hover:text-red-400 rounded transition-colors" title="Delete"><Trash2 className="w-3 h-3" /></button>
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
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-800 shrink-0">
          <span className="text-[10px] text-slate-600">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
            {checkedIds.size > 0 && <span className="ml-2 text-emerald-400">{checkedIds.size} selected</span>}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800">Cancel</button>
            {mode === 'open' ? (
              <button onClick={() => handleOpen(selectedId)} disabled={!selectedId || busy}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors">
                {opening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />} Open
              </button>
            ) : (
              <button onClick={handleSave} disabled={!saveName.trim() || busy}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overlays */}
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />}
      {(moveTarget || bulkMoving) && (
        <MoveDialog
          title={bulkMoving ? `Move ${checkedIds.size} items to…` : `Move "${moveTarget?.name}"`}
          folders={allFolders}
          currentFolder={bulkMoving ? currentFolder : (moveTarget?.folder || '')}
          onMove={folder => bulkMoving ? handleBulkMove(folder) : handleMove(moveTarget.id, folder)}
          onClose={() => { setMoveTarget(null); setBulkMoving(false); }}
        />
      )}
      {showNewFolder && <NewFolderDialog currentFolder={currentFolder} onConfirm={handleNewFolder} onClose={() => setShowNewFolder(false)} />}
    </div>
  );
}