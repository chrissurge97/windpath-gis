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

// Deserialize JSON-stringified object props (start_node, end_node, custom_fields, etc.)
function deserializeProps(props) {
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
      try { out[k] = JSON.parse(v); continue; } catch {}
    }
    out[k] = v;
  }
  return out;
}

function calcLineLength(coords) {
  let len = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    len += haversineM(coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
  }
  return +len.toFixed(0);
}

// ── Main-thread shapefile parsing (always reliable) ─────────────────────────
async function importShapefileMainThread(arrayBuffer, filename, onLog) {
  const log = (msg, level = 'info') => {
    console.log('[importHandler]', msg);
    if (onLog) onLog(msg, level);
  };
  log(`Parsing on main thread — ${(arrayBuffer.byteLength / 1024).toFixed(1)} KB`);
  const { importShapefile } = await import('@/lib/shapefileUtils');
  const result = await importShapefile(arrayBuffer, filename);
  const count = Array.isArray(result)
    ? result.reduce((s, r) => s + (r.features?.length || 0), 0)
    : (result?.features?.length || 0);
  log(`Parse OK — ${count} features`, 'success');
  return result;
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
      log(`Worker unavailable (${workerErr.message}) — using main thread`, 'warn');
      importShapefileMainThread(arrayBuffer, filename, onLog).then(resolve).catch(reject);
      return;
    }

    // If worker doesn't respond within 5s of creation, assume it failed to load
    const startupTimeout = setTimeout(() => {
      log('Worker failed to start — using main thread', 'warn');
      worker.terminate();
      importShapefileMainThread(arrayBuffer, filename, onLog).then(resolve).catch(reject);
    }, 5000);
    let workerStarted = false;

    const parseTimeout = setTimeout(() => {
      log('Worker timed out after 60s', 'error');
      worker.terminate();
      reject(new Error('Shapefile parsing timed out. The file may be too large.'));
    }, 65000);

    worker.addEventListener('message', (e) => {
      if (!workerStarted) {
        workerStarted = true;
        clearTimeout(startupTimeout);
      }
      if (e.data?.log) {
        log(`[worker] ${e.data.log}`, e.data.level || 'info');
        return;
      }
      clearTimeout(parseTimeout);
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
      clearTimeout(startupTimeout);
      clearTimeout(parseTimeout);
      log(`Worker error (${err.message || err}) — using main thread`, 'warn');
      worker.terminate();
      importShapefileMainThread(arrayBuffer, filename, onLog).then(resolve).catch(reject);
    };

    log(`Sending to worker — ${(arrayBuffer.byteLength / 1024).toFixed(1)} KB`);
    worker.postMessage({ arrayBuffer, filename }, [arrayBuffer]);
  });
}

// ── Auto-classify a single layer based on geometry ──────────────────────────
function autoClassify(layer) {
  if (layer.type === 'turbine' || layer.type === 'cable' || layer.type === 'substation') {
    return layer.type;
  }
  const features = layer.features || [];
  if (features.length === 0) return 'keep';
  const firstType = features[0].geometry?.type;
  if (firstType === 'Point') return 'turbine';
  if (firstType === 'LineString' || firstType === 'MultiLineString') return 'cable';
  if (firstType === 'Polygon' || firstType === 'MultiPolygon') return 'polygon';
  return 'keep';
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
export function openImportFilePicker({ onLayers, onProject, onTypesUpdate, onLoading, onLog, onClassify, onClassifyMode, defaultTurbineType, defaultCableTypeId }) {
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
          log(`Parsing shapefile…`);
          const result = await importShapefileMainThread(buf, file.name, onLog);
          const toProcess = (Array.isArray(result) ? result : [result]).filter(Boolean);
          log(`Parsed ${toProcess.length} shapefile layer(s)`, 'success');

          // Build raw layers for classify modal.
          // Each .shp in the ZIP becomes its own layer, preserving the shapefile's
          // layer name from _layerName. This mirrors the GeoJSON import behaviour.
          const rawLayers = [];
          for (const geojson of toProcess) {
            if (!geojson || !Array.isArray(geojson.features)) {
              log(`Skipping layer with no features array`, 'warn');
              continue;
            }
            // If layer-metadata was embedded (e.g. a project re-export), reconstruct layers
            const hasLayerMeta = geojson.features?.some(f => f.properties?._layerId);
            if (hasLayerMeta) {
              geoJSONToLayers(geojson).forEach(l => rawLayers.push(l));
            } else {
              // One shapefile = one layer, keeping its original name.
              // Read back ev_* metadata fields written by exportShapefile (if present).
              const sample = geojson.features?.[0]?.properties || {};
              const evType    = sample.ev_type    || 'polygon';
              const evColor   = sample.ev_color   || '#06b6d4';
              const evOpacity = sample.ev_opacity != null ? parseFloat(sample.ev_opacity) : 0.15;
              const evStroke  = sample.ev_stroke  != null ? parseFloat(sample.ev_stroke)  : 2;
              const evSopac   = sample.ev_sopac   != null ? parseFloat(sample.ev_sopac)   : 0.9;
              const evVisible = sample.ev_visible !== 'false';
              const evNoturb  = sample.ev_noturb  === 'true';

              // Strip ev_* meta and deserialize any JSON-stringified object props (e.g. start_node/end_node)
              const cleanFeatures = geojson.features.map(f => {
                const stripped = Object.fromEntries(
                  Object.entries(f.properties || {}).filter(([k]) => !k.startsWith('ev_'))
                );
                return { ...f, properties: deserializeProps(stripped) };
              });

              const hasEvMeta = !!sample.ev_type; // true = came from EagleView export
              const layerId = `lyr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              rawLayers.push({
                id: layerId,
                name: geojson._layerName || baseName,
                type: evType,
                visible: evVisible,
                color: evColor,
                fillOpacity: evOpacity,
                strokeWeight: evStroke,
                strokeOpacity: evSopac,
                no_turbines: evNoturb,
                features: cleanFeatures,
                _hadEvMeta: hasEvMeta,
              });
            }
          }
          if (rawLayers.length > 0 && onLoading) onLoading(false);

          // If ALL raw layers came from an EagleView export (have ev_* metadata),
          // we can auto-import without the classify wizard.
          const allHaveEvMeta = rawLayers.every(l =>
            l._hadEvMeta === true
          );

          if (rawLayers.length > 0 && !allHaveEvMeta) {
            if (onClassifyMode) {
              log(`Asking for classification mode`, 'info');
              onClassifyMode(rawLayers);
              return;
            }
            // If no onClassifyMode handler, proceed with auto-classification path
            log(`Auto-importing with geometry-based classification`, 'info');
            allImported.push(...rawLayers);
          }

          // All layers have ev_* metadata — ask user: auto-import or manual classify?
          if (rawLayers.length > 0 && allHaveEvMeta) {
            const choice = window.confirm(
              `Shapefile contains ${rawLayers.length} layer(s) with restored metadata.\n\n` +
              `Auto-import with saved styles, or manually reclassify?` +
              `\n\nOK = Auto-import  |  Cancel = Manual Classify`
            );
            if (!choice && onClassify) {
              log(`Opening classify wizard for manual reclassification`, 'info');
              onClassify(rawLayers);
              return;
            }
            // Auto-import path
            log(`Auto-importing ${rawLayers.length} layer(s) with restored styles`, 'success');
            rawLayers.forEach(l => allImported.push(l));
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
            const rawLayer = geoJSONToLayer(data, baseName);
            if (onLoading) onLoading(false);
            // Trigger manual classification if handler provided
            if (onClassifyMode) {
              log(`Asking for classification mode`, 'info');
              onClassifyMode([rawLayer]);
              return;
            }
            allImported.push(rawLayer);
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
      // Strip internal flags before handing off, defer to let UI repaint
      const cleanLayers = allImported.map(({ _hadEvMeta, ...l }) => l);
      setTimeout(() => onLayers(cleanLayers), 0);
    }
  };

  input.click();
  return input;
}