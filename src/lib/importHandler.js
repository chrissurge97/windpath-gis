/**
 * Handles file import logic for GeoJSON, KML, Shapefile, and CSV files.
 */
import { geoJSONToLayer, geoJSONToLayers } from '@/lib/gisUtils';
import { importProjectGeoJSON, importKML } from '@/lib/projectExport';
import { DEFAULT_TURBINE_TYPES, DEFAULT_CABLE_TYPES } from '@/lib/turbineTypes';

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

// ── Split a flat GeoJSON into per-geometry-type layers ───────────────────────
function splitByGeometryType(geojson, baseName) {
  const groups = { polygon: [], line: [], point: [] };
  let idx = 0;

  for (const f of geojson.features || []) {
    const t = f.geometry?.type;
    // Reuse IDs that were assigned inside the worker (already unique strings)
    const id = f.id || `imp_${idx++}`;
    const stamped = { ...f, id, properties: { ...f.properties, _importGeomType: t } };
    if (t === 'Polygon' || t === 'MultiPolygon') groups.polygon.push(stamped);
    else if (t === 'LineString' || t === 'MultiLineString') groups.line.push(stamped);
    else if (t === 'Point' || t === 'MultiPoint') groups.point.push(stamped);
  }

  const layers = [];
  const layerId = () => `lyr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  if (groups.polygon.length) {
    layers.push({
      id: layerId(), name: `${baseName} (Polygons)`,
      type: 'polygon', visible: true,
      color: '#06b6d4', fillOpacity: 0.15, strokeWeight: 2, strokeOpacity: 0.9,
      no_turbines: false, features: groups.polygon,
    });
  }
  if (groups.line.length) {
    layers.push({
      id: layerId(), name: `${baseName} (Lines)`,
      type: 'cable', visible: true,
      color: '#f97316', fillOpacity: 0.8, strokeWeight: 2, strokeOpacity: 0.9,
      no_turbines: false, features: groups.line,
    });
  }
  if (groups.point.length) {
    layers.push({
      id: layerId(), name: `${baseName} (Points)`,
      type: 'turbine', visible: true,
      color: '#10b981', fillOpacity: 0.8, strokeWeight: 2, strokeOpacity: 0.9,
      no_turbines: false, features: groups.point,
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
export function openImportFilePicker({ onLayers, onProject, onTypesUpdate, onLoading }) {
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
              splitByGeometryType(geojson, geojson._layerName || baseName).forEach(l => allImported.push(l));
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