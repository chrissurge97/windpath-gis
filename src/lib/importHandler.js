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
function importShapefileOffThread(arrayBuffer, filename, onLog) {
  const log = (msg, level = 'info') => {
    console.log('[importHandler]', msg);
    if (onLog) onLog(msg, level);
  };

  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker(new URL('./shapefileWorker.js', import.meta.url), { type: 'module' });
    } catch (workerErr) {
      log(`Worker creation failed: ${workerErr.message} — falling back to main thread`, 'warn');
      import('@/lib/shapefileUtils').then(({ importShapefile }) => {
        log('Main-thread parse started…');
        importShapefile(arrayBuffer, filename).then(r => { log('Main-thread parse OK'); resolve(r); }).catch(e => { log(`Main-thread parse error: ${e.message}`, 'error'); reject(e); });
      }).catch(reject);
      return;
    }

    const timeout = setTimeout(() => {
      log('Worker timed out after 60s', 'error');
      worker.terminate();
      reject(new Error('Shapefile parsing timed out. The file may be too large.'));
    }, 60000);

    // Single message handler — distinguishes log forwarding from result/error
    worker.addEventListener('message', (e) => {
      if (e.data?.log) {
        // Log-forwarding message from worker's console.log override — just display it
        log(`[worker] ${e.data.log}`, e.data.level || 'info');
        return;
      }
      // Final result or error
      clearTimeout(timeout);
      worker.terminate();
      if (e.data.error) {
        log(`Worker error: ${e.data.error}`, 'error');
        reject(new Error(e.data.error));
      } else {
        const result = e.data.result;
        const count = Array.isArray(result)
          ? result.reduce((s, r) => s + (r.features?.length || 0), 0)
          : (result?.features?.length || 0);
        log(`Worker OK — ${count} features parsed`, 'success');
        resolve(result);
      }
    });

    worker.onerror = (err) => {
      clearTimeout(timeout);
      log(`Worker onerror: ${err.message || err} — falling back to main thread`, 'warn');
      worker.terminate();
      import('@/lib/shapefileUtils').then(({ importShapefile }) => {
        log('Main-thread parse started (fallback)…');
        importShapefile(arrayBuffer, filename).then(r => { log('Main-thread parse OK'); resolve(r); }).catch(e => { log(`Main-thread parse error: ${e.message}`, 'error'); reject(e); });
      }).catch(reject);
    };

    log(`Sending to worker — ${(arrayBuffer.byteLength / 1024).toFixed(1)} KB`);
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
export function openImportFilePicker({ onLayers, onProject, onTypesUpdate, onLoading, onLog, defaultTurbineType, defaultCableTypeId }) {
  const log = (msg, level = 'info') => { console.log('[import]', msg); if (onLog) onLog(msg, level); };
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
          log(`Parsing KML/KMZ: ${file.name}`);
          const text = await file.text();
          const project = importKML(text);
          if (!project.turbineTypes?.length) project.turbineTypes = DEFAULT_TURBINE_TYPES;
          if (!project.cableTypes?.length) project.cableTypes = DEFAULT_CABLE_TYPES;
          if (onTypesUpdate) onTypesUpdate({ turbineTypes: project.turbineTypes, cableTypes: project.cableTypes });
          log(`KML parsed — ${project.layers?.length || 0} layers`, 'success');
          if (onLoading) onLoading(false);
          if (onProject) { onProject(project); return; }
          if (project.layers?.length) allImported.push(...project.layers);

        } else if (fname.endsWith('.shp') || fname.endsWith('.zip')) {
          log(`Reading file buffer — ${(file.size / 1024).toFixed(1)} KB`);
          const buf = await file.arrayBuffer();
          log(`Buffer ready — sending to worker…`);
          const result = await importShapefileOffThread(buf, file.name, onLog);
          const toProcess = (Array.isArray(result) ? result : [result]).filter(Boolean);
          log(`Processing ${toProcess.length} shapefile layer(s)…`);
          for (const geojson of toProcess) {
            if (!geojson || !Array.isArray(geojson.features)) {
              log(`Skipping layer with no features array (type: ${geojson?.type})`, 'warn');
              continue;
            }
            const hasLayerMeta = geojson.features?.some(f => f.properties?._layerId);
            if (hasLayerMeta) {
              const lys = geoJSONToLayers(geojson);
              log(`Layer-meta mode: ${lys.length} layers extracted`);
              lys.forEach(l => allImported.push(l));
            } else {
              const lys = autoClassifyGeojson(geojson, geojson._layerName || baseName, defaultTurbineType, defaultCableTypeId);
              log(`Auto-classify: ${lys.length} typed layers from ${geojson.features?.length || 0} features`, 'success');
              lys.forEach(l => allImported.push(l));
            }
          }

        } else if (fname.endsWith('.json') || fname.endsWith('.geojson')) {
          log(`Parsing GeoJSON: ${file.name}`);
          const text = await file.text();
          const data = JSON.parse(text);
          const isProjectExport = data.properties?.format === 'eagleview-wind-farm-project' ||
                                  data.properties?.format === 'base44-wind-farm-project';
          if (isProjectExport) {
            log('Detected project export format', 'success');
            const project = importProjectGeoJSON(data);
            if (!project.turbineTypes?.length) project.turbineTypes = DEFAULT_TURBINE_TYPES;
            if (!project.cableTypes?.length) project.cableTypes = DEFAULT_CABLE_TYPES;
            if (onLoading) onLoading(false);
            if (onProject) onProject(project);
            return;
          }
          const hasLayerMeta = data.features?.some(f => f.properties?._layerId);
          if (hasLayerMeta) {
            const lys = geoJSONToLayers(data);
            log(`Layer-meta GeoJSON: ${lys.length} layers`, 'success');
            lys.forEach(l => allImported.push(l));
          } else {
            log(`Plain GeoJSON: ${data.features?.length || 0} features → 1 layer`, 'success');
            allImported.push(geoJSONToLayer(data, baseName));
          }

        } else if (fname.endsWith('.csv')) {
          log(`Parsing CSV: ${file.name}`);
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
            log(`CSV: ${csvFeatures.length} point features`, 'success');
            allImported.push({
              id: `lyr_csv_${Date.now()}`, name: baseName, type: 'polygon',
              visible: true, color: '#8b5cf6', fillOpacity: 0.2,
              strokeOpacity: 0.8, strokeWeight: 2, no_turbines: false, features: csvFeatures
            });
          } else {
            log('CSV: no valid lat/lng rows found', 'warn');
          }
        }
      } catch (err) {
        log(`ERROR for ${file.name}: ${err.message}`, 'error');
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