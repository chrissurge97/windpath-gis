/**
 * Server-side project storage using Base44 entities.
 * Projects are stored in the WindFarmProject entity as full JSON blobs.
 * Falls back to localStorage for the demo project.
 */
import { base44 } from '@/api/base44Client';

const ENTITY = base44.entities.WindFarmProject;

// ── Serialize / deserialize ──────────────────────────────────────────────────
// The entity stores layers, turbineTypes, cableTypes, windParams as JSON strings
// in specific fields. We use `description` to store the full project blob.

function serialize(projectData) {
  return {
    name: projectData.name || 'Unnamed Project',
    description: JSON.stringify({
      layers: projectData.layers || [],
      turbineTypes: projectData.turbineTypes || [],
      cableTypes: projectData.cableTypes || [],
      windParams: projectData.windParams || { k: 2.0, lambda: 7.0 },
      globalRadii: projectData.globalRadii || null,
    }),
  };
}

function deserialize(record) {
  let extra = {};
  try {
    extra = JSON.parse(record.description || '{}');
  } catch {}
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
  // Base44 SDK: filter by built-in id field
  const records = await ENTITY.filter({ id });
  if (!records || records.length === 0) return null;
  return deserialize(records[0]);
}

export async function saveProject(id, projectData) {
  const payload = serialize(projectData);
  if (id && id !== '__new__') {
    // Update existing
    try {
      await ENTITY.update(id, payload);
      return id;
    } catch {
      // Record may not exist yet — fall through to create
    }
  }
  // Create new
  const created = await ENTITY.create(payload);
  return created.id;
}

export async function deleteProject(id) {
  await ENTITY.delete(id);
}

export async function createNewProject(name) {
  const defaultLayers = null; // Planning.jsx will supply defaults
  const created = await ENTITY.create({
    name: name || 'New Wind Farm Project',
    description: JSON.stringify({
      layers: [],
      turbineTypes: [],
      cableTypes: [],
      windParams: { k: 2.0, lambda: 7.0 },
    }),
  });
  return created.id;
}