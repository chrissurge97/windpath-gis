// Comprehensive project export with full data preservation

import { resolveKMLCableNetwork } from '@/lib/kmlCableResolver';

const FORMAT_TAG = 'eagleview-wind-farm-project';
const FORMAT_VERSION = '2.0';

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build the set of per-feature layer metadata properties that get
 * embedded in every exported feature so they survive round-trips.
 */
function layerMeta(layer) {
  return {
    _layerId: layer.id,
    _layerName: layer.name,
    _layerType: layer.type,
    _layerColor: layer.color,
    _layerFillOpacity: layer.fillOpacity,
    _layerStrokeWeight: layer.strokeWeight,
    _layerStrokeOpacity: layer.strokeOpacity,
    _layerNoTurbines: layer.no_turbines || false,
    _layerVisible: layer.visible !== false,
  };
}

const META_KEYS = new Set(['_layerId','_layerName','_layerType','_layerColor','_layerFillOpacity',
  '_layerStrokeWeight','_layerStrokeOpacity','_layerNoTurbines','_layerVisible']);

function stripLayerMeta(props) {
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (META_KEYS.has(k)) continue;
    // Deserialize JSON-stringified objects (start_node, end_node, custom_fields, etc.)
    if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
      try { out[k] = JSON.parse(v); continue; } catch {}
    }
    out[k] = v;
  }
  return out;
}

// ── GeoJSON Project Export ────────────────────────────────────────────────────

/**
 * Export entire project as a GeoJSON FeatureCollection with embedded metadata.
 * This is the canonical lossless project format.
 */
export function exportProjectGeoJSON(project) {
  const geojson = {
    type: 'FeatureCollection',
    features: [],
    properties: {
      projectName: project.name,
      projectDescription: project.description || '',
      turbineTypes: project.turbineTypes || [],
      cableTypes: project.cableTypes || [],
      windParams: project.windParams || { k: 2.0, lambda: 7.0 },
      globalRadii: project.globalRadii || null,
      exportDate: new Date().toISOString(),
      format: FORMAT_TAG,
      version: FORMAT_VERSION,
    },
  };

  if (project.layers) {
    for (const layer of project.layers) {
      for (const feature of layer.features || []) {
        geojson.features.push({
          ...feature,
          type: 'Feature',
          properties: {
            ...feature.properties,
            ...layerMeta(layer),
          },
        });
      }
    }
  }

  return geojson;
}

/**
 * Import a GeoJSON project file — works with both v1.0 and v2.0 formats.
 */
export function importProjectGeoJSON(geojson) {
  const props = geojson.properties || {};
  // Accept both old and new format tags
  const isProject = props.format === FORMAT_TAG || props.format === 'base44-wind-farm-project';
  if (!isProject) {
    throw new Error('Invalid project file format. Export using the Project (GeoJSON) option.');
  }

  const layerMap = {};

  for (const feature of geojson.features || []) {
    const fp = feature.properties || {};
    const layerId = fp._layerId || 'default';
    const layerName = fp._layerName || 'Imported Layer';
    const layerType = fp._layerType || 'polygon';

    if (!layerMap[layerId]) {
      layerMap[layerId] = {
        id: layerId,
        name: layerName,
        type: layerType,
        color: fp._layerColor || '#06b6d4',
        fillOpacity: fp._layerFillOpacity ?? 0.1,
        strokeWeight: fp._layerStrokeWeight || 2,
        strokeOpacity: fp._layerStrokeOpacity || 0.9,
        visible: fp._layerVisible !== false,
        no_turbines: fp._layerNoTurbines || false,
        features: [],
      };
    }

    layerMap[layerId].features.push({
      ...feature,
      properties: stripLayerMeta(fp),
    });
  }

  return {
    name: props.projectName || 'Imported Project',
    description: props.projectDescription || '',
    layers: Object.values(layerMap),
    turbineTypes: props.turbineTypes || [],
    cableTypes: props.cableTypes || [],
    windParams: props.windParams || { k: 2.0, lambda: 7.0 },
    globalRadii: props.globalRadii || null,
  };
}

// ── Plain GeoJSON export (with embedded layer metadata) ───────────────────────

/**
 * Export all layers as a standard GeoJSON FeatureCollection.
 * Layer styling metadata is embedded in each feature so reimporting restores it.
 */
export function exportLayersGeoJSON(layers) {
  return {
    type: 'FeatureCollection',
    // Top-level metadata sidecar — preserved by many GIS tools
    _eagleview: {
      format: FORMAT_TAG,
      version: FORMAT_VERSION,
      exportDate: new Date().toISOString(),
    },
    features: layers.flatMap(layer =>
      (layer.features || []).map(f => ({
        type: 'Feature',
        id: f.id,
        geometry: f.geometry,
        properties: {
          ...f.properties,
          ...layerMeta(layer),
        },
      }))
    ),
  };
}

// ── KML Export ────────────────────────────────────────────────────────────────

/**
 * Export project as KML with embedded ExtendedData for all layer/feature properties.
 * On reimport the metadata is parsed back from ExtendedData.
 */
export async function exportProjectKMZ(project) {
  const layers = project.layers || [];

  // Embed the full project metadata as a JSON blob in the KML description
  const projectMeta = {
    format: FORMAT_TAG,
    version: FORMAT_VERSION,
    projectName: project.name,
    turbineTypes: project.turbineTypes || [],
    cableTypes: project.cableTypes || [],
    windParams: project.windParams || { k: 2.0, lambda: 7.0 },
    globalRadii: project.globalRadii || null,
  };

  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(project.name)}</name>
    <description><![CDATA[${JSON.stringify(projectMeta)}]]></description>
`;

  for (const layer of layers) {
    const meta = layerMeta(layer);
    kml += `    <Folder>
      <name>${escapeXml(layer.name)}</name>
`;

    for (const feature of layer.features || []) {
      const props = { ...feature.properties, ...meta };
      const geom = feature.geometry;

      // Build ExtendedData block with all properties (including layer metadata)
      let extData = '        <ExtendedData>\n';
      for (const [k, v] of Object.entries(props)) {
        // Serialize objects/arrays to JSON so they survive KML round-trips
        const serialized = (v !== null && typeof v === 'object') ? JSON.stringify(v) : String(v ?? '');
        extData += `          <Data name="${escapeXml(k)}"><value>${escapeXml(serialized)}</value></Data>\n`;
      }
      extData += '        </ExtendedData>\n';

      kml += `      <Placemark>
        <name>${escapeXml(props.name || feature.id || 'Feature')}</name>
${extData}`;

      if (geom?.type === 'Point') {
        const [lng, lat] = geom.coordinates;
        kml += `        <Point><coordinates>${lng},${lat},0</coordinates></Point>\n`;
      } else if (geom?.type === 'LineString') {
        const coords = geom.coordinates.map(([lng, lat]) => `${lng},${lat},0`).join(' ');
        kml += `        <LineString><coordinates>${coords}</coordinates></LineString>\n`;
      } else if (geom?.type === 'Polygon') {
        const coords = geom.coordinates[0].map(([lng, lat]) => `${lng},${lat},0`).join(' ');
        kml += `        <Polygon><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon>\n`;
      }

      kml += `      </Placemark>\n`;
    }

    kml += `    </Folder>\n`;
  }

  kml += `  </Document>\n</kml>`;
  return kml;
}

// ── KML Import ────────────────────────────────────────────────────────────────

export function importKML(kmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlText, 'application/xml');

  // Check for XML parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('KML file could not be parsed: ' + parseError.textContent.slice(0, 120));

  // Try to extract project metadata from Document/description
  let projectMeta = null;
  const docDesc = doc.querySelector('Document > description');
  if (docDesc) {
    try { projectMeta = JSON.parse(docDesc.textContent); } catch {}
  }

  const layerMap = {};
  const placemarks = doc.querySelectorAll('Placemark');

  for (const pm of placemarks) {
    // Extract ExtendedData
    const props = {};
    pm.querySelectorAll('ExtendedData > Data').forEach(d => {
      const name = d.getAttribute('name');
      const val = d.querySelector('value')?.textContent ?? '';
      props[name] = val;
    });
    // Also grab name
    const pmName = pm.querySelector(':scope > name')?.textContent;
    if (pmName && !props.name) props.name = pmName;

    // Deserialize JSON-stringified objects (start_node, end_node, custom_fields, etc.)
    const deserializedProps = {};
    for (const [k, v] of Object.entries(props)) {
      if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
        try { deserializedProps[k] = JSON.parse(v); continue; } catch {}
      }
      deserializedProps[k] = v;
    }
    Object.assign(props, deserializedProps);

    // Parse geometry
    let geometry = null;
    const pointEl = pm.querySelector('Point > coordinates');
    if (pointEl) {
      const parts = pointEl.textContent.trim().split(',').map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        geometry = { type: 'Point', coordinates: [parts[0], parts[1]] };
      }
    }
    const lineEl = pm.querySelector('LineString > coordinates');
    if (lineEl) {
      const coords = lineEl.textContent.trim().split(/\s+/)
        .map(c => { const p = c.split(',').map(Number); return p; })
        .filter(p => p.length >= 2 && !isNaN(p[0]) && !isNaN(p[1]))
        .map(p => [p[0], p[1]]);
      if (coords.length >= 2) geometry = { type: 'LineString', coordinates: coords };
    }
    const polyEl = pm.querySelector('Polygon outerBoundaryIs LinearRing coordinates');
    if (polyEl) {
      const coords = polyEl.textContent.trim().split(/\s+/)
        .map(c => { const p = c.split(',').map(Number); return p; })
        .filter(p => p.length >= 2 && !isNaN(p[0]) && !isNaN(p[1]))
        .map(p => [p[0], p[1]]);
      if (coords.length >= 3) geometry = { type: 'Polygon', coordinates: [coords] };
    }

    if (!geometry) continue;

    const layerId = props._layerId || `kml_layer_${pm.closest('Folder')?.querySelector(':scope > name')?.textContent || 'default'}`;
    const layerName = props._layerName || pm.closest('Folder')?.querySelector(':scope > name')?.textContent || 'Imported';

    if (!layerMap[layerId]) {
      layerMap[layerId] = {
        id: layerId,
        name: layerName,
        type: props._layerType || 'polygon',
        color: props._layerColor || '#06b6d4',
        fillOpacity: parseFloat(props._layerFillOpacity) || 0.1,
        strokeWeight: parseFloat(props._layerStrokeWeight) || 2,
        strokeOpacity: parseFloat(props._layerStrokeOpacity) || 0.9,
        visible: props._layerVisible !== 'false',
        no_turbines: props._layerNoTurbines === 'true',
        features: [],
      };
    }

    layerMap[layerId].features.push({
      id: crypto.randomUUID(),
      geometry,
      properties: stripLayerMeta(props),
    });
  }

  const layers = Object.values(layerMap);

  // ── Resolve cable network topology for proper load calculations ────────────
  // Use dedicated KML resolver to establish node-based connections
  const turbineLayer = layers.find(l => l.type === 'turbine');
  const cableLayer = layers.find(l => l.type === 'cable');
  const substationLayer = layers.find(l => l.type === 'substation');

  if (cableLayer && (turbineLayer || substationLayer)) {
    try {
      const resolved = resolveKMLCableNetwork(cableLayer, turbineLayer, substationLayer);
      const cableLayerIdx = layers.findIndex(l => l.id === cableLayer.id);
      if (cableLayerIdx >= 0) {
        layers[cableLayerIdx] = resolved;
      }
    } catch (err) {
      console.warn('KML cable resolver failed:', err);
    }
  }

  return {
    name: projectMeta?.projectName || doc.querySelector('Document > name')?.textContent || 'KML Import',
    layers,
    turbineTypes: projectMeta?.turbineTypes || [],
    cableTypes: projectMeta?.cableTypes || [],
    windParams: projectMeta?.windParams || { k: 2.0, lambda: 7.0 },
    globalRadii: projectMeta?.globalRadii || null,
  };
}

// ── Download helper ───────────────────────────────────────────────────────────

export function downloadFile(content, filename, mimeType = 'application/json') {
  const isBytes = content instanceof Uint8Array || content instanceof ArrayBuffer;
  const blob = isBytes ? new Blob([content], { type: mimeType }) : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}