import React, { useState, useRef, useEffect } from 'react';
import { Folder, FolderOpen, File, Plus, Trash2, Edit2, ChevronRight, ChevronDown, FolderPlus, FilePlus, X, Check, MoveRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'eagleview_file_explorer';

function loadTree() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    id: 'root',
    name: 'My Files',
    type: 'folder',
    children: [
      { id: 'projects', name: 'Projects', type: 'folder', children: [] },
      { id: 'exports', name: 'Exports', type: 'folder', children: [] },
      { id: 'imports', name: 'Imports', type: 'folder', children: [] },
    ],
  };
}

function saveTree(tree) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
}

function genId() {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function findNode(tree, id) {
  if (tree.id === id) return tree;
  for (const child of tree.children || []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

function deleteNodeById(tree, id) {
  if (!tree.children) return tree;
  return {
    ...tree,
    children: tree.children
      .filter(c => c.id !== id)
      .map(c => deleteNodeById(c, id)),
  };
}

function renameNodeById(tree, id, newName) {
  if (tree.id === id) return { ...tree, name: newName };
  if (!tree.children) return tree;
  return { ...tree, children: tree.children.map(c => renameNodeById(c, id, newName)) };
}

function addNodeTo(tree, parentId, node) {
  if (tree.id === parentId) {
    return { ...tree, children: [...(tree.children || []), node] };
  }
  if (!tree.children) return tree;
  return { ...tree, children: tree.children.map(c => addNodeTo(c, parentId, node)) };
}

function TreeNode({ node, depth = 0, onSelect, selectedId, onRename, onDelete, onAddFolder, onAddFile, dragOverId, setDragOverId, onDrop }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(node.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const isFolder = node.type === 'folder';
  const isSelected = selectedId === node.id;
  const isDragOver = dragOverId === node.id;

  React.useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const commitRename = () => {
    if (renameVal.trim()) onRename(node.id, renameVal.trim());
    setRenaming(false);
  };

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer select-none transition-colors",
          isSelected ? "bg-emerald-500/20 text-emerald-300" : "text-slate-300 hover:bg-slate-800 hover:text-white",
          isDragOver && isFolder ? "bg-blue-500/20 border border-blue-500/40" : ""
        )}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => { onSelect(node); if (isFolder) setExpanded(v => !v); }}
        draggable
        onDragStart={(e) => e.dataTransfer.setData('text/plain', node.id)}
        onDragOver={(e) => { if (isFolder) { e.preventDefault(); setDragOverId(node.id); } }}
        onDragLeave={() => setDragOverId(null)}
        onDrop={(e) => { e.preventDefault(); setDragOverId(null); const draggedId = e.dataTransfer.getData('text/plain'); if (draggedId !== node.id) onDrop(draggedId, node.id); }}
      >
        {isFolder && (
          <span className="text-slate-500 w-3 shrink-0">
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
        )}
        {!isFolder && <span className="w-3 shrink-0" />}

        {isFolder
          ? expanded ? <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" /> : <Folder className="w-4 h-4 text-amber-400 shrink-0" />
          : <File className="w-4 h-4 text-slate-400 shrink-0" />
        }

        {renaming ? (
          <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
            <input
              autoFocus
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false); }}
              className="flex-1 bg-slate-700 border border-slate-500 rounded px-1.5 py-0.5 text-xs text-white outline-none"
            />
            <button onClick={commitRename} className="text-emerald-400 hover:text-emerald-300"><Check className="w-3 h-3" /></button>
            <button onClick={() => setRenaming(false)} className="text-slate-500 hover:text-white"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <span className="flex-1 text-xs font-medium truncate">{node.name}</span>
        )}

        {!renaming && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
            {isFolder && (
              <>
                <button onClick={() => { onAddFolder(node.id); setExpanded(true); }} title="New folder" className="p-0.5 rounded hover:bg-slate-600 text-slate-400 hover:text-amber-300">
                  <FolderPlus className="w-3 h-3" />
                </button>
                <button onClick={() => { onAddFile(node.id); setExpanded(true); }} title="New file" className="p-0.5 rounded hover:bg-slate-600 text-slate-400 hover:text-emerald-300">
                  <FilePlus className="w-3 h-3" />
                </button>
              </>
            )}
            <button onClick={() => { setRenaming(true); setRenameVal(node.name); }} title="Rename" className="p-0.5 rounded hover:bg-slate-600 text-slate-400 hover:text-white">
              <Edit2 className="w-3 h-3" />
            </button>
            {node.id !== 'root' && (
              <button onClick={() => onDelete(node.id)} title="Delete" className="p-0.5 rounded hover:bg-slate-600 text-slate-400 hover:text-red-400">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {isFolder && expanded && (node.children || []).map(child => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          onSelect={onSelect}
          selectedId={selectedId}
          onRename={onRename}
          onDelete={onDelete}
          onAddFolder={onAddFolder}
          onAddFile={onAddFile}
          dragOverId={dragOverId}
          setDragOverId={setDragOverId}
          onDrop={onDrop}
        />
      ))}
    </div>
  );
}

function moveNode(tree, nodeId, targetFolderId) {
  const nodeToMove = findNode(tree, nodeId);
  if (!nodeToMove) return tree;
  const withoutNode = deleteNodeById(tree, nodeId);
  return addNodeTo(withoutNode, targetFolderId, nodeToMove);
}

export default function FileExplorer() {
  const [tree, setTree] = useState(loadTree);
  const [selectedNode, setSelectedNode] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const persist = (newTree) => { setTree(newTree); saveTree(newTree); };

  const handleAddFolder = (parentId) => {
    const name = window.prompt('Folder name:', 'New Folder');
    if (!name?.trim()) return;
    persist(addNodeTo(tree, parentId, { id: genId(), name: name.trim(), type: 'folder', children: [] }));
  };

  const handleAddFile = (parentId) => {
    const name = window.prompt('File name:', 'New File');
    if (!name?.trim()) return;
    persist(addNodeTo(tree, parentId, { id: genId(), name: name.trim(), type: 'file', notes: '' }));
  };

  const handleRename = (id, newName) => {
    persist(renameNodeById(tree, id, newName));
  };

  const handleDelete = (id) => {
    const node = findNode(tree, id);
    if (!window.confirm(`Delete "${node?.name}"?${node?.type === 'folder' ? ' This will delete all contents.' : ''}`)) return;
    persist(deleteNodeById(tree, id));
    if (selectedNode?.id === id) setSelectedNode(null);
  };

  const handleDrop = (nodeId, targetFolderId) => {
    // Prevent dropping folder into its own descendant
    const targetNode = findNode(tree, targetFolderId);
    if (!targetNode || targetNode.type !== 'folder') return;
    persist(moveNode(tree, nodeId, targetFolderId));
  };

  const selectedFull = selectedNode ? findNode(tree, selectedNode.id) : null;

  return (
    <div className="flex h-full bg-slate-950 text-slate-100">
      {/* Tree panel */}
      <div className="w-72 shrink-0 border-r border-slate-800 flex flex-col bg-slate-900">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">File Explorer</h2>
            <p className="text-[10px] text-slate-500">Drag to move • Click to select</p>
          </div>
          <div className="flex gap-1">
            <button onClick={() => handleAddFolder('root')} title="New root folder" className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-300">
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => handleAddFile('root')} title="New root file" className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-emerald-300">
              <FilePlus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-1">
          <TreeNode
            node={tree}
            depth={0}
            onSelect={setSelectedNode}
            selectedId={selectedNode?.id}
            onRename={handleRename}
            onDelete={handleDelete}
            onAddFolder={handleAddFolder}
            onAddFile={handleAddFile}
            dragOverId={dragOverId}
            setDragOverId={setDragOverId}
            onDrop={handleDrop}
          />
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 p-6 overflow-auto">
        {!selectedFull ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Folder className="w-16 h-16 text-slate-700 mb-4" />
            <p className="text-slate-500 text-sm">Select a file or folder to view details</p>
          </div>
        ) : (
          <div className="max-w-lg">
            <div className="flex items-center gap-3 mb-6">
              {selectedFull.type === 'folder'
                ? <FolderOpen className="w-8 h-8 text-amber-400" />
                : <File className="w-8 h-8 text-slate-400" />
              }
              <div>
                <h1 className="text-xl font-bold text-white">{selectedFull.name}</h1>
                <p className="text-xs text-slate-500">{selectedFull.type === 'folder' ? `${(selectedFull.children || []).length} item(s)` : 'File'}</p>
              </div>
            </div>

            {selectedFull.type === 'folder' && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Contents</h3>
                {(selectedFull.children || []).length === 0 ? (
                  <p className="text-slate-600 text-sm italic">Empty folder</p>
                ) : (
                  (selectedFull.children || []).map(child => (
                    <div key={child.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 cursor-pointer transition-colors"
                      onClick={() => setSelectedNode(child)}>
                      {child.type === 'folder'
                        ? <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                        : <File className="w-4 h-4 text-slate-400 shrink-0" />
                      }
                      <span className="text-sm text-slate-200">{child.name}</span>
                      <span className="ml-auto text-xs text-slate-600">{child.type === 'folder' ? `${(child.children || []).length} items` : 'File'}</span>
                    </div>
                  ))
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleAddFolder(selectedFull.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 text-xs font-medium transition-colors">
                    <FolderPlus className="w-3.5 h-3.5" /> New Subfolder
                  </button>
                  <button
                    onClick={() => handleAddFile(selectedFull.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 text-xs font-medium transition-colors">
                    <FilePlus className="w-3.5 h-3.5" /> New File
                  </button>
                </div>
              </div>
            )}

            {selectedFull.type === 'file' && (
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Notes</label>
                <textarea
                  defaultValue={selectedFull.notes || ''}
                  onBlur={(e) => {
                    const updated = { ...selectedFull, notes: e.target.value };
                    const updateNotes = (t) => {
                      if (t.id === updated.id) return updated;
                      if (!t.children) return t;
                      return { ...t, children: t.children.map(updateNotes) };
                    };
                    persist(updateNotes(tree));
                  }}
                  rows={6}
                  placeholder="Add notes for this file..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}