/**
 * Server-side project storage using Base44 entities.
 * Large project blobs are uploaded as files; the entity stores only the URL.
 */
import { base44 } from '@/api/base44Client';

const ENTITY = base44.entities.WindFarmProject;

// ── Serialize / deserialize ──────────────────────────────────────────────────

function buildBlob(projectData) {
  return JSON.stringify({
    layers: projectData.layers || [],
    turbineTypes: projectData.turbineTypes || [],
    cableTypes: projectData.cableTypes || [],
    windParams: projectData.windParams || { k: 2.0, lambda: 7.0 },
    globalRadii: projectData.globalRadii || null,
  });
}

async function uploadBlob(jsonString) {
  const file = new File([jsonString], 'project.json', { type: 'application/json' });
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return file_url;
}

async function fetchBlob(url) {
  const res = await fetch(url);
  return res.json();
}

function deserialize(record, extra) {
  return {
    id: record.id,
    name: record.name,
    folder: record.folder || '',
    is_training: record.is_training || false,
    layers: extra.layers || [],
    turbineTypes: extra.turbineTypes || [],
    cableTypes: extra.cableTypes || [],
    windParams: extra.windParams || { k: 2.0, lambda: 7.0 },
    globalRadii: extra.globalRadii || null,
    _serverId: record.id,
    _updatedAt: record.updated_date,
    _createdAt: record.created_date,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function listProjects() {
  const records = await ENTITY.list('-updated_date', 200);
  return records.map(r => ({
    id: r.id,
    name: r.name,
    folder: r.folder || '',
    is_training: r.is_training || false,
    updatedAt: r.updated_date,
    createdAt: r.created_date,
  }));
}

export async function loadProject(id) {
  if (!id || id === '__demo__') return null;

  // Check localStorage first (used by academy checkpoints)
  const localRaw = localStorage.getItem(`planning_project_${id}`);
  if (localRaw) {
    try {
      const local = JSON.parse(localRaw);
      return { ...local, id };
    } catch {}
  }

  const records = await ENTITY.filter({ id });
  if (!records || records.length === 0) return null;
  const record = records[0];

  let extra = {};
  if (record.description) {
    if (record.description.startsWith('http')) {
      extra = await fetchBlob(record.description);
    } else {
      try { extra = JSON.parse(record.description); } catch {}
    }
  }
  return deserialize(record, extra);
}

export async function saveProject(id, projectData) {
  const jsonString = buildBlob(projectData);
  const fileUrl = await uploadBlob(jsonString);
  const payload = {
    name: projectData.name || 'Unnamed Project',
    description: fileUrl,
    folder: projectData.folder || '',
    is_training: projectData.is_training || false,
  };

  if (id && id !== '__new__') {
    try {
      await ENTITY.update(id, payload);
      return id;
    } catch {
      // Record may not exist yet — fall through to create
    }
  }
  const created = await ENTITY.create(payload);
  return created.id;
}

export async function moveProject(id, newFolder) {
  await ENTITY.update(id, { folder: newFolder });
}

export async function renameProject(id, newName) {
  await ENTITY.update(id, { name: newName });
}

export async function deleteProject(id) {
  await ENTITY.delete(id);
}

/** Delete all non-training, non-demo projects */
export async function deleteAllUserProjects() {
  const records = await ENTITY.list('-updated_date', 200);
  const toDelete = records.filter(r => !r.is_training);
  await Promise.all(toDelete.map(r => ENTITY.delete(r.id)));
  return toDelete.length;
}

/** Delete all projects flagged as training */
export async function deleteAllTrainingProjects() {
  const records = await ENTITY.list('-updated_date', 200);
  const toDelete = records.filter(r => r.is_training);
  await Promise.all(toDelete.map(r => ENTITY.delete(r.id)));
  return toDelete.length;
}

export async function createNewProject(name) {
  const jsonString = buildBlob({ layers: [], turbineTypes: [], cableTypes: [], windParams: { k: 2.0, lambda: 7.0 } });
  const fileUrl = await uploadBlob(jsonString);
  const created = await ENTITY.create({ name: name || 'New Wind Farm Project', description: fileUrl, folder: '', is_training: false });
  return created.id;
}