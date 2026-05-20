/**
 * Handles file import logic for GeoJSON, KML, Shapefile, and CSV files.
 * Extracts from Planning.jsx to keep it under the size limit.
 */
import { geoJSONToLayer, geoJSONToLayers } from '@/lib/gisUtils';
import { importProjectGeoJSON, importKML } from '@/lib/projectExport';
import { importShapefile } from '@/lib/shapefileUtils';
import { DEFAULT_TURBINE_TYPES, DEFAULT_CABLE_TYPES } from '@/lib/turbineTypes';

/**
 * Split a flat GeoJSON FeatureCollection into separate layers by geometry type.
 * - Polygon/MultiPolygon → polygon layer
 * - LineString/MultiLineString → cable-style layer (type: 'cable')
 * - Point/MultiPoint → turbine-candidate layer (type: 'turbine')
 *
 * Each layer gets `_featureType` metadata stamped on features for re-import recognition.
 */
function splitByGeometryType(geojson, baseName) {
  const groups = { polygon: [], line: [], point: [] };

  for (const f of geojson.features || []) {
    const t = f.geometry?.type;
    const id = f.id || crypto.randomUUID();
    const stamped = { ...f, id, properties: { ...f.properties, _importGeomType: t } };
    if (t === 'Polygon' || t === 'MultiPolygon') groups.polygon.push(stamped);
    else if (t === 'LineString' || t === 'MultiLineString') groups.line.push(stamped);
    else if (t === 'Point' || t === 'MultiPoint') groups.point.push(stamped);
  }

  const layers = [];

  if (groups.polygon.length) {
    layers.push({
      id: crypto.randomUUID(), name: `${baseName} (Polygons)`,
      type: 'polygon', visible: true,
      color: '#06b6d4', fillOpacity: 0.15, strokeWeight: 2, strokeOpacity: 0.9,
      no_turbines: false, features: groups.polygon,
    });
  }
  if (groups.line.length) {
    layers.push({
      id: crypto.randomUUID(), name: `${baseName} (Lines)`,
      type: 'cable', visible: true,
      color: '#f97316', fillOpacity: 0.8, strokeWeight: 2, strokeOpacity: 0.9,
      no_turbines: false, features: groups.line,
    });
  }
  if (groups.point.length) {
    layers.push({
      id: crypto.randomUUID(), name: `${baseName} (Points)`,
      type: 'turbine', visible: true,
      color: '#10b981', fillOpacity: 0.8, strokeWeight: 2, strokeOpacity: 0.9,
      no_turbines: false, features: groups.point,
    });
  }

  return layers;
}

/**
 * Merge imported layers into existing project layers.
 * - Typed layers (turbine/cable/substation) are merged INTO the matching existing layer
 * - Plain polygon layers are returned separately (caller may show classify modal)
 *
 * Returns { merged: Layer[], plain: Layer[] }
 */
export function partitionImportedLayers(importedLayers) {
  const TYPED = ['turbine', 'cable', 'substation'];
  return {
    typed: importedLayers.filter(l => TYPED.includes(l.type)),
    plain: importedLayers.filter(l => !TYPED.includes(l.type)),
  };
}

/**
 * Opens a file picker and processes selected files.
 * Calls back with:
 *   onLayers(layers)       — array of layers to merge
 *   onProject(project)     — full project to switch to (project GeoJSON or KML)
 *   onTypesUpdate({turbineTypes, cableTypes}) — when KML carries type libraries
 */
export function openImportFilePicker({ onLayers, onProject, onTypesUpdate }) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.geojson,.shp,.zip,.csv,.kml,.kmz';
  input.multiple = true;

  input.onchange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
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
          // Treat KML as a project switch so layers/types are all loaded properly
          if (onProject) { onProject(project); return; }
          if (project.layers?.length) allImported.push(...project.layers);

        } else if (fname.endsWith('.shp') || fname.endsWith('.zip')) {
          const buf = await file.arrayBuffer();
          const result = await importShapefile(buf, file.name);
          const toProcess = Array.isArray(result) ? result : [result];
          for (const geojson of toProcess) {
            const hasLayerMeta = geojson.features?.some(f => f.properties?._layerId);
            if (hasLayerMeta) {
              geoJSONToLayers(geojson).forEach(l => allImported.push(l));
            } else {
              // Split by geometry type so Points/Lines/Polygons become separate layers
              splitByGeometryType(geojson, geojson._layerName || baseName).forEach(l => allImported.push(l));
            }
          }

        } else if (fname.endsWith('.json') || fname.endsWith('.geojson')) {
          const text = await file.text();
          const data = JSON.parse(text);

          // Full project export → switch entire project
          const isProjectExport = data.properties?.format === 'eagleview-wind-farm-project' ||
                                  data.properties?.format === 'base44-wind-farm-project';
          if (isProjectExport) {
            const project = importProjectGeoJSON(data);
            if (!project.turbineTypes?.length) project.turbineTypes = DEFAULT_TURBINE_TYPES;
            if (!project.cableTypes?.length) project.cableTypes = DEFAULT_CABLE_TYPES;
            if (onProject) onProject(project);
            return; // stop processing other files
          }

          // Features with embedded layer metadata → reconstruct multiple layers
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
              id: crypto.randomUUID(), layerId: baseName,
              geometry: { type: 'Point', coordinates: [lng, lat] },
              properties: { name: row.name || `Feature ${i}`, notes: row.notes || '' }
            });
          }
          if (csvFeatures.length > 0) {
            allImported.push({
              id: crypto.randomUUID(), name: baseName, type: 'polygon',
              visible: true, color: '#8b5cf6', fillOpacity: 0.2,
              strokeOpacity: 0.8, strokeWeight: 2, no_turbines: false, features: csvFeatures
            });
          }
        }
      } catch (err) {
        console.error('Import error for', file.name, err);
        alert(`Could not import ${file.name}: ${err.message}`);
      }
    }

    if (allImported.length > 0 && onLayers) {
      onLayers(allImported);
    }
  };

  input.click();
  return input;
}