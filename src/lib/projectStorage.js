/**
 * Project storage using localStorage only.
 * Keeps the same public API as the previous server-backed version.
 */

const INDEX_KEY = 'planning_projects_index';
const PROJECT_PREFIX = 'planning_project_';

function getIndex() {
  try { return JSON.parse(localStorage.getItem(INDEX_KEY) || '[]'); } catch { return []; }
}

function saveIndex(index) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

function projectKey(id) {
  return `${PROJECT_PREFIX}${id}`;
}

function makeId() {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function listProjects() {
  return getIndex().map(r => ({
    id: r.id,
    name: r.name,
    folder: r.folder || '',
    is_training: r.is_training || false,
    updatedAt: r.updatedAt || r.createdAt,
    createdAt: r.createdAt,
  }));
}

export async function loadProject(id) {
  if (!id || id === '__demo__') return null;
  const raw = localStorage.getItem(projectKey(id));
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return { ...data, id };
  } catch { return null; }
}

export async function saveProject(id, projectData) {
  const now = Date.now();
  const resolvedId = (id && id !== '__new__') ? id : makeId();
  // Strip display-only layers (e.g. baked developable area) before saving — they can be huge
  const layersToSave = (projectData.layers || []).filter(l => !l._isDevelopableArea);

  const blob = {
    id: resolvedId,
    name: projectData.name || 'Unnamed Project',
    folder: projectData.folder || '',
    is_training: projectData.is_training || false,
    layers: layersToSave,
    turbineTypes: projectData.turbineTypes || [],
    cableTypes: projectData.cableTypes || [],
    windParams: projectData.windParams || { k: 2.0, lambda: 7.0 },
    globalRadii: projectData.globalRadii || null,
  };
  localStorage.setItem(projectKey(resolvedId), JSON.stringify(blob));

  const index = getIndex();
  const existing = index.find(r => r.id === resolvedId);
  if (existing) {
    existing.name = blob.name;
    existing.folder = blob.folder;
    existing.is_training = blob.is_training;
    existing.updatedAt = now;
  } else {
    index.push({ id: resolvedId, name: blob.name, folder: blob.folder, is_training: blob.is_training, createdAt: now, updatedAt: now });
  }
  saveIndex(index);
  return resolvedId;
}

export async function moveProject(id, newFolder) {
  const raw = localStorage.getItem(projectKey(id));
  if (raw) {
    const data = JSON.parse(raw);
    data.folder = newFolder;
    localStorage.setItem(projectKey(id), JSON.stringify(data));
  }
  const index = getIndex();
  const entry = index.find(r => r.id === id);
  if (entry) { entry.folder = newFolder; saveIndex(index); }
}

export async function renameProject(id, newName) {
  const raw = localStorage.getItem(projectKey(id));
  if (raw) {
    const data = JSON.parse(raw);
    data.name = newName;
    localStorage.setItem(projectKey(id), JSON.stringify(data));
  }
  const index = getIndex();
  const entry = index.find(r => r.id === id);
  if (entry) { entry.name = newName; saveIndex(index); }
}

export async function deleteProject(id) {
  localStorage.removeItem(projectKey(id));
  const index = getIndex().filter(r => r.id !== id);
  saveIndex(index);
}

export async function deleteAllUserProjects() {
  const index = getIndex();
  const toDelete = index.filter(r => !r.is_training);
  toDelete.forEach(r => localStorage.removeItem(projectKey(r.id)));
  saveIndex(index.filter(r => r.is_training));
  return toDelete.length;
}

export async function deleteAllTrainingProjects() {
  const index = getIndex();
  const toDelete = index.filter(r => r.is_training);
  toDelete.forEach(r => localStorage.removeItem(projectKey(r.id)));
  saveIndex(index.filter(r => !r.is_training));
  return toDelete.length;
}

export async function createNewProject(name) {
  const id = makeId();
  const now = Date.now();
  const blob = {
    id,
    name: name || 'New Wind Farm Project',
    folder: '',
    is_training: false,
    layers: [],
    turbineTypes: [],
    cableTypes: [],
    windParams: { k: 2.0, lambda: 7.0 },
    globalRadii: null,
  };
  localStorage.setItem(projectKey(id), JSON.stringify(blob));
  const index = getIndex();
  index.push({ id, name: blob.name, folder: '', is_training: false, createdAt: now, updatedAt: now });
  saveIndex(index);
  return id;
}