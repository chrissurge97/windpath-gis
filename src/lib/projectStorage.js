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
    layers: extra.layers || [],
    turbineTypes: extra.turbineTypes || [],
    cableTypes: extra.cableTypes || [],
    windParams: extra.windParams || { k: 2.0, lambda: 7.0 },
    globalRadii: extra.globalRadii || null,
    _serverId: record.id,
    _updatedAt: record.updated_date,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function listProjects() {
  const records = await ENTITY.list('-updated_date', 100);
  return records.map(r => ({
    id: r.id,
    name: r.name,
    updatedAt: r.updated_date,
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

  // Support both old (inline JSON in description) and new (file URL) formats
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
  const payload = { name: projectData.name || 'Unnamed Project', description: fileUrl };

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

export async function deleteProject(id) {
  await ENTITY.delete(id);
}

export async function createNewProject(name) {
  const jsonString = buildBlob({ layers: [], turbineTypes: [], cableTypes: [], windParams: { k: 2.0, lambda: 7.0 } });
  const fileUrl = await uploadBlob(jsonString);
  const created = await ENTITY.create({ name: name || 'New Wind Farm Project', description: fileUrl });
  return created.id;
}