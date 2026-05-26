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
  if (layer.type === 'turbine' || layer.type === 'cable' || layer.type === 'substation' || layer.type === 'point') {
    return layer.type;
  }
  const features = layer.features || [];
  if (features.length === 0) return 'keep';
  const firstType = features[0].geometry?.type;
  if (firstType === 'Point') return 'point';
  if (firstType === 'LineString' || firstType === 'MultiLineString') return 'cable';
  if (firstType === 'Polygon' || firstType === 'MultiPolygon') return 'polygon';
  return 'keep';
}

// ── Auto-classify shapefile GeoJSON into typed project layers ─────────────────
// Points → turbine layer, Lines → cable layer, Polygons → polygon layer
// Applies proper properties so features work correctly in the planning tool.
// Returns { layers, turbines, cableLayer } for post-processing
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

  let turbineFeatures = [];
  let substationFeatures = [];
  let cableLayer = null;

  // Check if source GeoJSON is already typed as a 'point' layer (e.g. round-trip from export)
  const sourceLayerType = geojson.features?.[0]?.properties?._layerType;
  const isPointLayer = sourceLayerType === 'point';

  if (points.length) {
    let pointLayerFeatures = [];
    points.forEach((f, i) => {
      const baseProps = Object.fromEntries(Object.entries(f.properties || {}).filter(([k]) => !['name', 'Name', 'turbine_type_id'].includes(k)));
      // Check if this point has substation capacity fields
      const isSubstationType = baseProps.transformer_mva != null || baseProps.capacity_generation_mw != null || baseProps.capacity_demand_mw != null;

      if (isPointLayer) {
        // Preserve as generic point layer feature
        pointLayerFeatures.push({
          ...f,
          properties: {
            name: f.properties?.Name || f.properties?.name || `Point ${i + 1}`,
            ...baseProps,
          },
        });
      } else if (isSubstationType) {
        substationFeatures.push({
          ...f,
          properties: {
            name: f.properties?.Name || f.properties?.name || `Substation ${substationFeatures.length + 1}`,
            transformer_mva: baseProps.transformer_mva || 60,
            capacity_generation_mw: baseProps.capacity_generation_mw || 30,
            capacity_demand_mw: baseProps.capacity_demand_mw || 30,
            notes: baseProps.notes || '',
            ...Object.fromEntries(Object.entries(baseProps).filter(([k]) => !['transformer_mva', 'capacity_generation_mw', 'capacity_demand_mw', 'notes'].includes(k)))
          }
        });
      } else {
        turbineFeatures.push({
          ...f,
          properties: {
            name: f.properties?.Name || f.properties?.name || `T${i + 1}`,
            turbine_type_id: tt?.id,
            hub_height: tt?.hub_height_m || 100,
            rotor_diameter: tt?.rotor_diameter_m || 120,
            rated_power_mw: tt?.rated_power_mw || 3.5,
            ...baseProps,
          },
        });
      }
    });

    if (pointLayerFeatures.length > 0) {
      layers.push({
        id: layerId(), name: baseName,
        type: 'point', visible: true,
        color: geojson.features?.[0]?.properties?._layerColor || '#8b5cf6',
        fillOpacity: 1, strokeWeight: 2, strokeOpacity: 0.9,
        no_turbines: false, features: pointLayerFeatures,
      });
    }

    if (turbineFeatures.length > 0) {
      layers.push({
        id: layerId(), name: `${baseName} (Turbines)`,
        type: 'turbine', visible: true,
        color: tt?.color || '#10b981', fillOpacity: 0.8, strokeWeight: 2, strokeOpacity: 0.9,
        no_turbines: false, features: turbineFeatures,
      });
    }

    if (substationFeatures.length > 0) {
      layers.push({
        id: layerId(), name: `${baseName} (Substations)`,
        type: 'substation', visible: true,
        color: '#facc15', fillOpacity: 1, strokeWeight: 2, strokeOpacity: 0.9,
        no_turbines: false, features: substationFeatures,
      });
    }
  }

  if (lines.length) {
    const cableFeatures = lines.map((f, i) => {
      // Preserve cable_type_id from import if present, otherwise use default
      const importedCableTypeId = f.properties?.cable_type_id || ctId;
      return {
        ...f,
        properties: {
          name: f.properties?.Name || f.properties?.name || `Cable ${i + 1}`,
          cable_type_id: importedCableTypeId,
          length_m: calcLineLength(f.geometry.coordinates),
          start_node: f.properties?.start_node || null,
          end_node: f.properties?.end_node || null,
          ...Object.fromEntries(Object.entries(f.properties || {}).filter(([k]) => !['name', 'Name', 'cable_type_id', 'length_m', 'start_node', 'end_node'].includes(k))),
        },
      };
    });
    cableLayer = {
      id: layerId(), name: `${baseName} (Cables)`,
      type: 'cable', visible: true,
      color: '#f97316', fillOpacity: 0.8, strokeWeight: 2, strokeOpacity: 0.9,
      no_turbines: false, features: cableFeatures,
    };
    layers.push(cableLayer);
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

  return { layers, turbineFeatures, cableLayer };
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
export function openImportFilePicker({ onLayers, onProject, onTypesUpdate, onLoading, onLog, onClassify, onClassifyMode, onCableTopology, onCSVMap, defaultTurbineType, defaultCableTypeId }) {
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
          
          // Check if there are cables that need topology assignment
          const cableLayer = project.layers?.find(l => l.type === 'cable');
          const turbineLayer = project.layers?.find(l => l.type === 'turbine');
          const substationLayer = project.layers?.find(l => l.type === 'substation');
          
          if (onLoading) onLoading(false);
          if (onProject) { 
            // DISABLED FOR TESTING: Skip topology modal
            // if (cableLayer && cableLayer.features?.length && onCableTopology) {
            //   onCableTopology(cableLayer.features, turbineLayer?.features || [], substationLayer?.features || [], project);
            // } else {
            onProject(project);
            // }
            return; 
          }
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
              let cleanFeatures = geojson.features.map(f => {
                const stripped = Object.fromEntries(
                  Object.entries(f.properties || {}).filter(([k]) => !k.startsWith('ev_'))
                );
                const deserialized = deserializeProps(stripped);
                // Ensure start_node/end_node are preserved as objects, not strings
                if (typeof deserialized.start_node === 'string') {
                  try { deserialized.start_node = JSON.parse(deserialized.start_node); } catch {}
                }
                if (typeof deserialized.end_node === 'string') {
                  try { deserialized.end_node = JSON.parse(deserialized.end_node); } catch {}
                }
                return { ...f, properties: deserialized };
              });

              // For cable layers: expand MultiLineStrings to individual LineString features
              // (common when shapefile parser combines geometry)
              if (evType === 'cable') {
                const expanded = [];
                for (const f of cleanFeatures) {
                  if (f.geometry?.type === 'MultiLineString') {
                    // Create a separate feature for each line segment
                    for (let i = 0; i < f.geometry.coordinates.length; i++) {
                      const coords = f.geometry.coordinates[i];
                      expanded.push({
                        ...f,
                        id: `${f.id}_seg${i}`,
                        geometry: { type: 'LineString', coordinates: coords },
                        properties: { ...f.properties } // Preserve all properties on each segment
                      });
                    }
                  } else {
                    expanded.push(f);
                  }
                }
                cleanFeatures = expanded;
              }

              // Prefer restored _layer* metadata from deserialized features, fall back to ev_*
              const hasEvMeta = !!sample.ev_type;
              const restoredVisible = sample._layerVisible != null ? sample._layerVisible !== 'false' : evVisible;
              const restoredNoTurbines = sample._layerNoTurbines != null ? sample._layerNoTurbines === 'true' : evNoturb;
              
              const layerId = `lyr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              rawLayers.push({
                id: layerId,
                name: geojson._layerName || baseName,
                type: sample._layerType || evType,
                visible: restoredVisible,
                color: sample._layerColor || evColor,
                fillOpacity: sample._layerFillOpacity != null ? parseFloat(sample._layerFillOpacity) : evOpacity,
                strokeWeight: sample._layerStrokeWeight != null ? parseFloat(sample._layerStrokeWeight) : evStroke,
                strokeOpacity: sample._layerStrokeOpacity != null ? parseFloat(sample._layerStrokeOpacity) : evSopac,
                no_turbines: restoredNoTurbines,
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
            // Show classify modal for manual classification
            if (onClassify) {
              log(`Opening classify wizard`, 'info');
              if (onLoading) onLoading(false);
              onClassify(rawLayers);
              return;
            }

            // Fallback: auto-import if no classify handler provided
            log(`Auto-importing with geometry-based classification`, 'info');

            // Auto-snap cable endpoints to turbines/substations from same import batch
            const turbineLayer = rawLayers.find(l => l.type === 'turbine');
            const substationLayer = rawLayers.find(l => l.type === 'substation');
            const cableLayer = rawLayers.find(l => l.type === 'cable');

            if (cableLayer && (turbineLayer || substationLayer)) {
              const nodes = [
                ...(turbineLayer?.features || []).map(f => ({
                  id: f.id,
                  type: 'turbine',
                  coords: f.geometry.coordinates
                })),
                ...(substationLayer?.features || []).map(f => ({
                  id: f.id,
                  type: 'substation',
                  coords: f.geometry.coordinates
                }))
              ];

              const SNAP_THRESHOLD = 0.0005;
              cableLayer.features = cableLayer.features.map(cable => {
                if (!cable.geometry.coordinates?.length) return cable;
                const coords = cable.geometry.coordinates;
                const startCoord = coords[0];
                const endCoord = coords[coords.length - 1];

                const findNearestNode = (coord) => {
                  let nearest = null;
                  let minDist = SNAP_THRESHOLD;
                  for (const node of nodes) {
                    const [nx, ny] = node.coords;
                    const [cx, cy] = coord;
                    const dist = Math.hypot(nx - cx, ny - cy);
                    if (dist < minDist) {
                      minDist = dist;
                      nearest = node;
                    }
                  }
                  return nearest;
                };

                const startNode = findNearestNode(startCoord);
                const endNode = findNearestNode(endCoord);

                return {
                  ...cable,
                  properties: {
                    ...cable.properties,
                    start_node: startNode ? { type: startNode.type, id: startNode.id } : null,
                    end_node: endNode ? { type: endNode.type, id: endNode.id } : null
                  }
                };
              });
            }

            allImported.push(...rawLayers);
          }

          // All layers have ev_* metadata — ask user: auto-import or manual classify?
          if (rawLayers.length > 0 && allHaveEvMeta) {
            // Always auto-import with restored metadata — no prompt
            log(`Auto-importing ${rawLayers.length} layer(s) with restored styles`, 'success');

             // For cable layers with ev_* metadata, preserve existing start/end nodes (don't re-snap)
             for (const layer of rawLayers) {
               if (layer.type === 'cable' && layer._hadEvMeta) {
                 log(`Preserving cable node assignments for ${layer.features?.length || 0} cables`, 'info');
               }
               allImported.push(layer);
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
          if (onLoading) onLoading(false);
          // Hand off raw CSV text to the column mapper UI — it will call back with a ready layer
          if (onCSVMap) {
            onCSVMap(text, file.name);
            return;
          }
          // Fallback: auto-detect lat/lng (legacy behaviour)
          const parseCSVRow = (line) => {
            const result = []; let cur = '', inQuote = false;
            for (let i = 0; i < line.length; i++) {
              const ch = line[i];
              if (ch === '"') { if (inQuote && line[i+1]==='"'){cur+='"';i++;}else{inQuote=!inQuote;} }
              else if (ch===',' && !inQuote){result.push(cur.trim());cur='';}
              else{cur+=ch;}
            }
            result.push(cur.trim()); return result;
          };
          const csvLines = text.split('\n').filter(l => l.trim());
          const headers = parseCSVRow(csvLines[0]);
          const latCol = headers.find(h => /^(lat|latitude|y)$/i.test(h));
          const lngCol = headers.find(h => /^(lng|lon|long|longitude|x)$/i.test(h));
          if (!latCol || !lngCol) {
            log(`CSV: no lat/lng columns. Found: ${headers.join(', ')}`, 'warn');
            alert(`CSV import failed: could not find lat/lng columns.\nFound: ${headers.join(', ')}`);
          } else {
            const csvFeatures = [];
            for (let i = 1; i < csvLines.length; i++) {
              const vals = parseCSVRow(csvLines[i]);
              const row = Object.fromEntries(headers.map((h,j)=>[h,vals[j]??'']));
              const lat = parseFloat(row[latCol]), lng = parseFloat(row[lngCol]);
              if (isNaN(lat)||isNaN(lng)) continue;
              const props = { name: row.name||row.Name||row.NAME||row.id||row.ID||`Feature ${i}` };
              for (const h of headers) { if(h===latCol||h===lngCol) continue; props[h]=row[h]; }
              csvFeatures.push({ id:`csv_${i}`, geometry:{type:'Point',coordinates:[lng,lat]}, properties:props });
            }
            if (csvFeatures.length > 0) {
              const rawLayer = { id:`lyr_csv_${Date.now()}`, name:baseName, type:'point', visible:true, color:'#8b5cf6', fillOpacity:1, strokeOpacity:0.9, strokeWeight:2, no_turbines:false, features:csvFeatures };
              if (onClassifyMode) { onClassifyMode([rawLayer]); return; }
              allImported.push(rawLayer);
            } else {
              alert('CSV import: no valid rows found.');
            }
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
      
      // Auto-map cable endpoints to turbines/substations using spatial coordinate matching
      const turbineLayer = cleanLayers.find(l => l.type === 'turbine');
      const substationLayer = cleanLayers.find(l => l.type === 'substation');
      const cableLayer = cleanLayers.find(l => l.type === 'cable');
      
      if (cableLayer && (turbineLayer || substationLayer)) {
        const nodes = [
          ...(turbineLayer?.features || []).map(f => ({
            id: f.id,
            type: 'turbine',
            coords: f.geometry.coordinates
          })),
          ...(substationLayer?.features || []).map(f => ({
            id: f.id,
            type: 'substation',
            coords: f.geometry.coordinates
          }))
        ];
        
        // Match cable endpoints to nearest nodes (larger tolerance for imports)
        const SNAP_THRESHOLD = 0.001; // ~100m in degrees
        let snappedCount = 0;
        cableLayer.features = cableLayer.features.map(cable => {
          if (!cable.geometry.coordinates?.length) return cable;
          
          const coords = cable.geometry.coordinates;
          const startCoord = coords[0];
          const endCoord = coords[coords.length - 1];
          
          const findNearestNode = (coord) => {
            let nearest = null;
            let minDist = SNAP_THRESHOLD;
            for (const node of nodes) {
              const [nx, ny] = node.coords;
              const [cx, cy] = coord;
              const dist = Math.hypot(nx - cx, ny - cy);
              if (dist < minDist) {
                minDist = dist;
                nearest = node;
              }
            }
            return nearest;
          };
          
          const startNode = findNearestNode(startCoord);
          const endNode = findNearestNode(endCoord);
          
          if (startNode || endNode) snappedCount++;
          
          return {
            ...cable,
            properties: {
              ...cable.properties,
              start_node: startNode ? { type: startNode.type, id: startNode.id } : null,
              end_node: endNode ? { type: endNode.type, id: endNode.id } : null
            }
          };
        });
        
        // If many cables failed to snap, trigger topology modal so user can set manually
        if (snappedCount < cableLayer.features.length * 0.5 && onCableTopology) {
          const allTurbines = turbineLayer?.features || [];
          const allSubstations = substationLayer?.features || [];
          const allCables = cableLayer.features;
          const project = { layers: cleanLayers, turbineTypes: [], cableTypes: [] };
          onCableTopology(allCables, allTurbines, allSubstations, project);
          onLoading(false);
          return; // Skip setLayers; modal will handle the final import
        }
      }
      
      setTimeout(() => onLayers(cleanLayers), 0);
    }
  };

  input.click();
  return input;
}