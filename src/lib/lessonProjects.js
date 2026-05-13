/**
 * Lesson Projects — sandboxed project files loaded into the Planning tool
 * when a user clicks "Open in Planner Tool" from a lesson.
 *
 * Each entry is keyed by `${moduleId}_${lessonIndex}`.
 * Returns a project data object compatible with saveProject / loadProject.
 */

import { createLayer, createFeature } from '@/lib/gisUtils';
import { DEFAULT_TURBINE_TYPES, DEFAULT_CABLE_TYPES } from '@/lib/turbineTypes';

const BASE_CENTER = { lat: 53.72, lng: -8.45 }; // Co. Galway upland

function emptyLayers() {
  return [
    createLayer({ name: 'Site Boundary', type: 'polygon', color: '#06b6d4', fillOpacity: 0.1 }),
    createLayer({ name: 'Turbines', type: 'turbine', color: '#10b981', fillOpacity: 0.8 }),
    createLayer({ name: 'Cables', type: 'cable', color: '#f97316', fillOpacity: 0.8 }),
    createLayer({ name: 'Substations', type: 'substation', color: '#facc15', fillOpacity: 1 }),
  ];
}

// A simple hexagonal site boundary polygon around the center
function makeBoundary(layerId, centerLat, centerLng, radiusDeg = 0.04) {
  const pts = Array.from({ length: 7 }, (_, i) => {
    const angle = (i / 6) * 2 * Math.PI;
    return [centerLng + radiusDeg * Math.cos(angle), centerLat + radiusDeg * Math.sin(angle)];
  });
  pts.push(pts[0]); // close ring
  return createFeature(layerId,
    { type: 'Polygon', coordinates: [pts] },
    { name: 'Sample Site Boundary', notes: 'Pre-drawn for this lesson. Edit or replace as needed.' }
  );
}

function makeConstraint(layerId, lat, lng, r = 0.015, name, notes, color) {
  const pts = Array.from({ length: 9 }, (_, i) => {
    const angle = (i / 8) * 2 * Math.PI;
    return [lng + r * Math.cos(angle), lat + r * Math.sin(angle)];
  });
  pts.push(pts[0]);
  return createFeature(layerId,
    { type: 'Polygon', coordinates: [pts] },
    { name, notes }
  );
}

/**
 * Build a lesson project. Returns { id, name, layers, turbineTypes, cableTypes, windParams, center, zoom }
 */
export function buildLessonProject(moduleId, lessonIndex) {
  const key = `${moduleId}_${lessonIndex}`;
  const id = `lesson_${key}`;

  const base = {
    id,
    turbineTypes: DEFAULT_TURBINE_TYPES,
    cableTypes: DEFAULT_CABLE_TYPES,
    windParams: { k: 2.1, lambda: 8.2 },
    center: [BASE_CENTER.lat, BASE_CENTER.lng],
    zoom: 12,
    isLessonProject: true,
  };

  // ── Interface & Toolbar module ─────────────────────────────────────────────
  if (moduleId === 'land_acquisition') {
    const layers = emptyLayers();
    const boundaryLayer = layers[0];
    boundaryLayer.features.push(makeBoundary(boundaryLayer.id, BASE_CENTER.lat, BASE_CENTER.lng));
    return { ...base, name: `Lesson: ${lessonIndex + 1} — Interface & Toolbar`, layers };
  }

  // ── Polygons module ────────────────────────────────────────────────────────
  if (moduleId === 'turbine_placement') {
    const layers = emptyLayers();
    if (lessonIndex >= 1) {
      // Lessons 2+ — pre-draw a boundary polygon to edit
      const bl = layers[0];
      bl.features.push(makeBoundary(bl.id, BASE_CENTER.lat, BASE_CENTER.lng, 0.05));
    }
    if (lessonIndex >= 3) {
      // Lesson 4+ — add extra named layers
      layers.push(createLayer({ name: 'Leased Land', type: 'polygon', color: '#10b981', fillOpacity: 0.15 }));
      layers.push(createLayer({ name: 'Hard Constraints', type: 'polygon', color: '#ef4444', fillOpacity: 0.2 }));
    }
    return { ...base, name: `Lesson: ${lessonIndex + 1} — Polygons`, layers };
  }

  // ── Turbines module ────────────────────────────────────────────────────────
  if (moduleId === 'cable_routing') {
    const layers = emptyLayers();
    const bl = layers[0];
    bl.features.push(makeBoundary(bl.id, BASE_CENTER.lat, BASE_CENTER.lng, 0.055));
    if (lessonIndex >= 2) {
      // Lesson 3+ — add some pre-placed turbines to work with setbacks
      const tl = layers.find(l => l.type === 'turbine');
      const offsets = [[-0.02, -0.01], [-0.01, 0.02], [0.015, 0.01], [0.025, -0.015], [0, -0.03]];
      offsets.forEach(([dlat, dlng], i) => {
        tl.features.push(createFeature(tl.id,
          { type: 'Point', coordinates: [BASE_CENTER.lng + dlng, BASE_CENTER.lat + dlat] },
          { name: `T0${i + 1}`, turbine_type_id: DEFAULT_TURBINE_TYPES[0].id, rated_power_mw: 4.5, hub_height: 105, rotor_diameter: 150 }
        ));
      });
    }
    return { ...base, name: `Lesson: ${lessonIndex + 1} — Turbines & Setbacks`, layers };
  }

  // ── Cables & Substations module ────────────────────────────────────────────
  if (moduleId === 'wind_resource') {
    const layers = emptyLayers();
    const bl = layers[0];
    bl.features.push(makeBoundary(bl.id, BASE_CENTER.lat, BASE_CENTER.lng, 0.055));
    // Pre-place turbines for all cable lessons
    const tl = layers.find(l => l.type === 'turbine');
    const offsets = [
      [-0.03, -0.02], [-0.02, 0.0], [-0.01, 0.02],
      [0.01, 0.025], [0.025, 0.01], [0.03, -0.015],
    ];
    offsets.forEach(([dlat, dlng], i) => {
      tl.features.push(createFeature(tl.id,
        { type: 'Point', coordinates: [BASE_CENTER.lng + dlng, BASE_CENTER.lat + dlat] },
        { name: `T0${i + 1}`, turbine_type_id: DEFAULT_TURBINE_TYPES[0].id, rated_power_mw: 4.5, hub_height: 105, rotor_diameter: 150 }
      ));
    });
    return { ...base, name: `Lesson: ${lessonIndex + 1} — Cables & Substations`, layers };
  }

  // ── Site Constraints module ────────────────────────────────────────────────
  if (moduleId === 'layer_data') {
    const layers = emptyLayers();
    const bl = layers[0];
    bl.features.push(makeBoundary(bl.id, BASE_CENTER.lat, BASE_CENTER.lng, 0.06));
    if (lessonIndex >= 1) {
      const constraintLayer = createLayer({ name: 'Hard Constraints', type: 'polygon', color: '#ef4444', fillOpacity: 0.2 });
      constraintLayer.features.push(makeConstraint(
        constraintLayer.id,
        BASE_CENTER.lat - 0.035, BASE_CENTER.lng - 0.03,
        0.018,
        '500m Residential Buffer — Sample',
        'Nearest dwelling ~320m. ETSU-R-97 noise assessment required.'
      ));
      layers.push(constraintLayer);
    }
    return { ...base, name: `Lesson: ${lessonIndex + 1} — Constraints & Layers`, layers };
  }

  // ── Full Wind Farm Design module ───────────────────────────────────────────
  if (moduleId === 'site_constraints') {
    const layers = emptyLayers();
    // Step-by-step: each lesson adds more content
    const bl = layers[0];
    if (lessonIndex >= 0) {
      bl.features.push(makeBoundary(bl.id, BASE_CENTER.lat, BASE_CENTER.lng, 0.07));
    }
    if (lessonIndex >= 1) {
      const hardLayer = createLayer({ name: 'Hard Constraints', type: 'polygon', color: '#ef4444', fillOpacity: 0.2 });
      hardLayer.features.push(makeConstraint(hardLayer.id, BASE_CENTER.lat - 0.04, BASE_CENTER.lng - 0.035, 0.02, 'Knockroe Village — 500m Buffer', 'Nearest dwelling 380m. ETSU-R-97 required.'));
      hardLayer.features.push(makeConstraint(hardLayer.id, BASE_CENTER.lat + 0.045, BASE_CENTER.lng + 0.04, 0.025, 'Blanket Bog SSSI', 'Natura 2000 SPA. No turbines within 500m.'));
      layers.push(hardLayer);
      const softLayer = createLayer({ name: 'Soft Constraints', type: 'polygon', color: '#f97316', fillOpacity: 0.15 });
      layers.push(softLayer);
    }
    if (lessonIndex >= 2) {
      // Add pre-placed turbines for layout steps
      const tl = layers.find(l => l.type === 'turbine');
      const offsets = [[-0.04,-0.02],[-0.03,0],[-0.02,0.025],[-0.01,0.04],[0.01,0.045],[0.025,0.03],[0.04,0.01],[0.045,-0.015],[0.03,-0.04],[0.01,-0.05]];
      offsets.forEach(([dlat, dlng], i) => {
        tl.features.push(createFeature(tl.id,
          { type: 'Point', coordinates: [BASE_CENTER.lng + dlng, BASE_CENTER.lat + dlat] },
          { name: `T${String(i + 1).padStart(2, '0')}`, turbine_type_id: DEFAULT_TURBINE_TYPES[0].id, rated_power_mw: 4.5, hub_height: 105, rotor_diameter: 150 }
        ));
      });
    }
    return { ...base, name: `Step ${lessonIndex + 1} — Full Wind Farm Design`, layers };
  }

  // Fallback
  return { ...base, name: `Lesson Project`, layers: emptyLayers() };
}

const LESSON_PROJECT_PREFIX = 'planning_project_lesson_';

export function saveLessonProject(moduleId, lessonIndex) {
  const project = buildLessonProject(moduleId, lessonIndex);
  localStorage.setItem(LESSON_PROJECT_PREFIX + `${moduleId}_${lessonIndex}`, JSON.stringify(project));
  // Also register in the project index so loadProject works
  const indexKey = 'planning_projects_index';
  let index = [];
  try { index = JSON.parse(localStorage.getItem(indexKey) || '[]'); } catch {}
  const existing = index.find(p => p.id === project.id);
  if (!existing) {
    index.push({ id: project.id, name: project.name, createdAt: Date.now(), updatedAt: Date.now() });
    localStorage.setItem(indexKey, JSON.stringify(index));
  }
  localStorage.setItem(`planning_project_${project.id}`, JSON.stringify(project));
  return project;
}