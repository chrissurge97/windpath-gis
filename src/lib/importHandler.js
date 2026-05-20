/**
 * Handles file import logic for GeoJSON, KML, Shapefile, and CSV files.
 */
import { geoJSONToLayer, geoJSONToLayers } from '@/lib/gisUtils';
import { importProjectGeoJSON, importKML } from '@/lib/projectExport';
import { DEFAULT_TURBINE_TYPES, DEFAULT_CABLE_TYPES } from '@/lib/turbineTypes';

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcLineLength(coords) {
  let len = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    len += haversineM(coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
  }
  return +len.toFixed(0);
}

// ── Shapefile off-thread via Web Worker ──────────────────────────────────────
// Vite requires the worker URL to be constructed with import.meta.url so it can
// bundle the worker file correctly. The `type: 'module'` flag is needed for ESM.
function importShapefileOffThread(arrayBuffer, filename) {
  return new Promise((resolve, reject) => {
    let worker;
    try {
      // Vite will resolve this URL and bundle the worker correctly
      worker = new Worker(new URL('./shapefileWorker.js', import.meta.url), { type: 'module' });
    } catch (workerErr) {
      // Fallback: parse synchronously on main thread if Worker creation fails
      console.warn('[importHandler] Worker creation failed, falling back to main thread:', workerErr);
      import('@/lib/shapefileUtils').then(({ importShapefile }) => {
        importShapefile(arrayBuffer, filename).then(resolve).catch(reject);
      }).catch(reject);
      return;
    }

    const timeout = setTimeout(() => {
      console.error('[importHandler] Worker timed out after 60s');
      worker.terminate();
      reject(new Error('Shapefile parsing timed out. The file may be too large.'));
    }, 60000);

    worker.onmessage = (e) => {
      clearTimeout(timeout);
      worker.terminate();
      console.log('[importHandler] Worker responded:', e.data.error ? 'ERROR' : 'OK');
      if (e.data.error) reject(new Error(e.data.error));
      else resolve(e.data.result);
    };

    worker.onerror = (err) => {
      clearTimeout(timeout);
      console.error('[importHandler] Worker onerror:', err);
      worker.terminate();
      // Fallback to main-thread parsing
      console.warn('[importHandler] Falling back to main-thread parsing');
      import('@/lib/shapefileUtils').then(({ importShapefile }) => {
        importShapefile(arrayBuffer, filename).then(resolve).catch(reject);
      }).catch(reject);
    };

    console.log('[importHandler] Posting to worker, bytes:', arrayBuffer.byteLength);
    // Transfer the buffer so it doesn't get copied (zero-copy)
    worker.postMessage({ arrayBuffer, filename }, [arrayBuffer]);
  });
}

// ── Auto-classify shapefile GeoJSON into typed project layers ─────────────────
// Points → turbine layer, Lines → cable layer, Polygons → polygon layer
// Applies proper properties so features work correctly in the planning tool.
function autoClassifyGeojson(geojson, baseName, defaultTurbineType, defaultCableTypeId) {
  const points = [], lines = [], polygons = [];
  let idx = 0;

  for (const f of geojson.features || []) {
    const t = f.geometry?.type;
    const id = f.id || `imp_${idx++}`;
    const base = { ...f, id };
    if (t === 'Point') points.push(base);
    else if (t === 'LineString') lines.push(base);
    else if (t === 'MultiLineString') {
      // Flatten multi to individual lines
      for (const coords of f.geometry.coordinates) {
        lines.push({ ...base, id: `imp_${idx++}`, geometry: { type: 'LineString', coordinates: coords } });
      }
    }
    else if (t === 'Polygon' || t === 'MultiPolygon') polygons.push(base);
  }

  const layers = [];
  const layerId = () => `lyr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tt = defaultTurbineType || DEFAULT_TURBINE_TYPES[0];
  const ctId = defaultCableTypeId;

  if (points.length) {
    const turbineFeatures = points.map((f, i) => ({
      ...f,
      properties: {
        name: f.properties?.Name || f.properties?.name || `T${i + 1}`,
        turbine_type_id: tt?.id,
        hub_height: tt?.hub_height_m || 100,
        rotor_diameter: tt?.rotor_diameter_m || 120,
        rated_power_mw: tt?.rated_power_mw || 3.5,
        ...Object.fromEntries(Object.entries(f.properties || {}).filter(([k]) => !['name', 'Name', 'turbine_type_id'].includes(k))),
      },
    }));
    layers.push({
      id: layerId(), name: `${baseName} (Turbines)`,
      type: 'turbine', visible: true,
      color: tt?.color || '#10b981', fillOpacity: 0.8, strokeWeight: 2, strokeOpacity: 0.9,
      no_turbines: false, features: turbineFeatures,
    });
  }

  if (lines.length) {
    const cableFeatures = lines.map((f, i) => ({
      ...f,
      properties: {
        name: f.properties?.Name || f.properties?.name || `Cable ${i + 1}`,
        cable_type_id: ctId,
        length_m: calcLineLength(f.geometry.coordinates),
        start_node: null,
        end_node: null,
        ...Object.fromEntries(Object.entries(f.properties || {}).filter(([k]) => !['name', 'Name', 'cable_type_id', 'length_m'].includes(k))),
      },
    }));
    layers.push({
      id: layerId(), name: `${baseName} (Cables)`,
      type: 'cable', visible: true,
      color: '#f97316', fillOpacity: 0.8, strokeWeight: 2, strokeOpacity: 0.9,
      no_turbines: false, features: cableFeatures,
    });
  }

  if (polygons.length) {
    const polyFeatures = polygons.map((f, i) => ({
      ...f,
      properties: {
        name: f.properties?.Name || f.properties?.name || `${baseName} ${i + 1}`,
        ...f.properties,
      },
    }));
    layers.push({
      id: layerId(), name: `${baseName} (Polygons)`,
      type: 'polygon', visible: true,
      color: '#06b6d4', fillOpacity: 0.15, strokeWeight: 2, strokeOpacity: 0.9,
      no_turbines: false, features: polyFeatures,
    });
  }

  return layers;
}

// ── Partition typed vs plain layers ─────────────────────────────────────────
export function partitionImportedLayers(importedLayers) {
  const TYPED = ['turbine', 'cable', 'substation'];
  return {
    typed: importedLayers.filter(l => TYPED.includes(l.type)),
    plain: importedLayers.filter(l => !TYPED.includes(l.type)),
  };
}

// ── Main import entry point ──────────────────────────────────────────────────
export function openImportFilePicker({ onLayers, onProject, onTypesUpdate, onLoading, defaultTurbineType, defaultCableTypeId }) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.geojson,.shp,.zip,.csv,.kml,.kmz';
  input.multiple = true;

  input.onchange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (onLoading) onLoading(true);
    const allImported = [];

    for (const file of files) {
      const fname = file.name.toLowerCase();
      const baseName = file.name.replace(/\.[^.]+$/, '');
      try {
        if (fname.endsWith('.kml') || fname.endsWith('.kmz')) {
          const text = await file.text();
          const project = importKML(text);
          if (!project.turbineTypes?.length) project.turbineTypes = DEFAULT_TURBINE_TYPES;
          if (!project.cableTypes?.length) project.cableTypes = DEFAULT_CABLE_TYPES;
          if (onTypesUpdate) onTypesUpdate({ turbineTypes: project.turbineTypes, cableTypes: project.cableTypes });
          if (onLoading) onLoading(false);
          if (onProject) { onProject(project); return; }
          if (project.layers?.length) allImported.push(...project.layers);

        } else if (fname.endsWith('.shp') || fname.endsWith('.zip')) {
          console.log('[importHandler] Reading arrayBuffer for', file.name, 'size:', file.size);
          const buf = await file.arrayBuffer();
          console.log('[importHandler] Sending to worker...');
          const result = await importShapefileOffThread(buf, file.name);
          console.log('[importHandler] Worker returned result');
          const toProcess = Array.isArray(result) ? result : [result];
          for (const geojson of toProcess) {
            const hasLayerMeta = geojson.features?.some(f => f.properties?._layerId);
            if (hasLayerMeta) {
              geoJSONToLayers(geojson).forEach(l => allImported.push(l));
            } else {
              autoClassifyGeojson(geojson, geojson._layerName || baseName, defaultTurbineType, defaultCableTypeId)
                .forEach(l => allImported.push(l));
            }
          }

        } else if (fname.endsWith('.json') || fname.endsWith('.geojson')) {
          const text = await file.text();
          const data = JSON.parse(text);
          const isProjectExport = data.properties?.format === 'eagleview-wind-farm-project' ||
                                  data.properties?.format === 'base44-wind-farm-project';
          if (isProjectExport) {
            const project = importProjectGeoJSON(data);
            if (!project.turbineTypes?.length) project.turbineTypes = DEFAULT_TURBINE_TYPES;
            if (!project.cableTypes?.length) project.cableTypes = DEFAULT_CABLE_TYPES;
            if (onLoading) onLoading(false);
            if (onProject) onProject(project);
            return;
          }
          const hasLayerMeta = data.features?.some(f => f.properties?._layerId);
          if (hasLayerMeta) {
            geoJSONToLayers(data).forEach(l => allImported.push(l));
          } else {
            allImported.push(geoJSONToLayer(data, baseName));
          }

        } else if (fname.endsWith('.csv')) {
          const text = await file.text();
          const lines = text.split('\n').filter(Boolean);
          const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
          const csvFeatures = [];
          for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].match(/("(?:[^"]|"")*"|[^,]*)/g)?.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"')) || [];
            const row = Object.fromEntries(headers.map((h, j) => [h, vals[j] || '']));
            if (!row.lat || !row.lng) continue;
            const lat = parseFloat(row.lat), lng = parseFloat(row.lng);
            if (isNaN(lat) || isNaN(lng)) continue;
            csvFeatures.push({
              id: `csv_${i}`, layerId: baseName,
              geometry: { type: 'Point', coordinates: [lng, lat] },
              properties: { name: row.name || `Feature ${i}`, notes: row.notes || '' }
            });
          }
          if (csvFeatures.length > 0) {
            allImported.push({
              id: `lyr_csv_${Date.now()}`, name: baseName, type: 'polygon',
              visible: true, color: '#8b5cf6', fillOpacity: 0.2,
              strokeOpacity: 0.8, strokeWeight: 2, no_turbines: false, features: csvFeatures
            });
          }
        }
      } catch (err) {
        console.error('[importHandler] Import error for', file.name, err);
        if (onLoading) onLoading(false);
        alert(`Could not import ${file.name}: ${err.message}`);
      }
    }

    if (onLoading) onLoading(false);

    if (allImported.length > 0 && onLayers) {
      // Defer the state update by one frame so the UI can repaint the loading indicator first
      setTimeout(() => onLayers(allImported), 0);
    }
  };

  input.click();
  return input;
}