// ─────────────────────────────────────────────
// GIS Utility Functions
// ─────────────────────────────────────────────

export function createLayer(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: overrides.name || 'New Layer',
    type: overrides.type || 'polygon', // 'polygon' | 'turbine' | 'wind_resource'
    visible: true,
    color: overrides.color || '#06b6d4',
    fillOpacity: overrides.fillOpacity ?? 0.3,
    strokeOpacity: overrides.strokeOpacity ?? 0.8,
    strokeWeight: overrides.strokeWeight ?? 1.5,
    features: overrides.features || [],
    schema: overrides.schema || [], // [{ key: string, type: 'string'|'number'|'boolean', label: string }]
    ...overrides,
  };
}

export function createFeature(layerId, geometry, properties = {}) {
  return {
    id: crypto.randomUUID(),
    layerId,
    geometry, // { type: 'Polygon'|'Point', coordinates: [...] }
    properties,
  };
}

// ── Wind speed sampling from wind resource layers ──────────────────────────
// Simple bilinear lookup from stored wind cells
export function sampleWindSpeed(windLayer, lat, lng) {
  if (!windLayer || !windLayer.features || windLayer.features.length === 0) return null;
  // Find closest cell centroid
  let best = null, bestDist = Infinity;
  for (const f of windLayer.features) {
    const [clat, clng] = f.geometry.center || [0, 0];
    const d = Math.sqrt((lat - clat) ** 2 + (lng - clng) ** 2);
    if (d < bestDist) { bestDist = d; best = f; }
  }
  return best?.properties?.wind_speed_ms ?? null;
}

// ── Wind shear correction ──────────────────────────────────────────────────
export function windAtHubHeight(refSpeed, refHeight = 10, hubHeight = 100, alpha = 0.143) {
  if (!refSpeed) return null;
  return +(refSpeed * Math.pow(hubHeight / refHeight, alpha)).toFixed(2);
}

// ── Interpolate power curve at a given wind speed ─────────────────────────
function interpPower(sorted, v) {
  if (v <= sorted[0].v) return 0;
  if (v >= sorted[sorted.length - 1].v) return sorted[sorted.length - 1].p_kw;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (v >= sorted[i].v && v <= sorted[i + 1].v) {
      const t = (v - sorted[i].v) / (sorted[i + 1].v - sorted[i].v);
      return sorted[i].p_kw + t * (sorted[i + 1].p_kw - sorted[i].p_kw);
    }
  }
  return 0;
}

// ── Simple AEP estimate for a single turbine using power curve ─────────────
export function calcTurbineAEP(windSpeed, powerCurve) {
  if (!windSpeed || !powerCurve || powerCurve.length === 0) return null;
  const sorted = [...powerCurve].sort((a, b) => a.v - b.v);
  const power = interpPower(sorted, windSpeed);
  const aep_mwh = (power * 8760) / 1000;
  return { power_kw: +power.toFixed(1), aep_mwh: +aep_mwh.toFixed(1) };
}

// ── Weibull-integrated AEP for a turbine ──────────────────────────────────
// Integrates power curve × Weibull PDF over wind speeds 0–30 m/s
// Uses k and lambda directly (lambda is the Weibull scale parameter in m/s)
// hubWindSpeed is used to site-correct lambda: lambda is scaled so the
// Weibull mean equals hubWindSpeed, giving a per-turbine AEP estimate.
export function calcWeibullAEP(hubWindSpeed, powerCurve, k, lambda) {
  if (!hubWindSpeed || !powerCurve || !k || !lambda) return null;

  // Use the raw lambda from wind params as the shape, but rescale it so
  // the distribution mean equals the actual hub wind speed at this turbine.
  // Weibull mean = lambda * Gamma(1 + 1/k)
  const gamma1pk = Math.exp(lgamma(1 + 1 / k));
  // Reference mean from the slider lambda (what the user set for the site)
  const sliderMean = lambda * gamma1pk;
  // Ratio of actual hub speed to slider mean → scale lambda accordingly
  const siteLambda = lambda * (hubWindSpeed / sliderMean);

  const sorted = [...powerCurve].sort((a, b) => a.v - b.v);
  const dv = 0.25; // finer integration step for accuracy
  let energyKwh = 0;
  for (let v = dv / 2; v < 30; v += dv) {
    const pdf = (k / siteLambda) * Math.pow(v / siteLambda, k - 1) * Math.exp(-Math.pow(v / siteLambda, k));
    const p = interpPower(sorted, v);
    energyKwh += p * pdf * dv * 8760;
  }
  return { aep_mwh: +(energyKwh / 1000).toFixed(1) };
}

// Stirling approximation for log-gamma (for Weibull mean correction)
function lgamma(x) {
  const c = [76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

// ── GeoJSON export ─────────────────────────────────────────────────────────
export function layersToGeoJSON(layers) {
  const featureCollection = {
    type: 'FeatureCollection',
    features: [],
  };
  for (const layer of layers) {
    for (const f of layer.features) {
      // Serialize object-valued props (e.g. start_node, end_node, custom_fields)
      // so they survive round-trips through formats that only support string values (DBF, CSV).
      const serializedProps = {};
      for (const [k, v] of Object.entries(f.properties || {})) {
        serializedProps[k] = (v !== null && typeof v === 'object') ? JSON.stringify(v) : v;
      }
      featureCollection.features.push({
        type: 'Feature',
        id: f.id,
        geometry: f.geometry,
        properties: {
          ...serializedProps,
          _layerId: layer.id,
          _layerName: layer.name,
          _layerType: layer.type,
          _layerColor: layer.color,
          _layerFillOpacity: layer.fillOpacity,
          _layerStrokeWeight: layer.strokeWeight,
          _layerStrokeOpacity: layer.strokeOpacity,
          _layerNoTurbines: layer.no_turbines || false,
          _layerVisible: layer.visible !== false,
        },
      });
    }
  }
  return featureCollection;
}

/**
 * Reconstruct layers from a GeoJSON FeatureCollection that was exported with layer metadata.
 * Falls back gracefully if metadata is missing.
 */
export function geoJSONToLayers(geojson) {
  const layerMap = {};
  for (const f of geojson.features || []) {
    const fp = f.properties || {};
    const layerId = fp._layerId || crypto.randomUUID();
    if (!layerMap[layerId]) {
      layerMap[layerId] = {
        id: layerId,
        name: fp._layerName || 'Imported Layer',
        type: fp._layerType || 'polygon',
        color: fp._layerColor || '#06b6d4',
        fillOpacity: fp._layerFillOpacity ?? 0.3,
        strokeWeight: fp._layerStrokeWeight || 2,
        strokeOpacity: fp._layerStrokeOpacity || 0.9,
        visible: fp._layerVisible !== false,
        no_turbines: fp._layerNoTurbines || false,
        features: [],
      };
    }
    const cleanProps = {};
    const META_KEYS = new Set(['_layerId','_layerName','_layerType','_layerColor','_layerFillOpacity',
     '_layerStrokeWeight','_layerStrokeOpacity','_layerNoTurbines','_layerVisible']);
    for (const [k, v] of Object.entries(fp)) {
      if (META_KEYS.has(k)) continue;
      // Deserialize JSON-stringified objects (start_node, end_node, custom_fields, etc.)
      if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
        try { cleanProps[k] = JSON.parse(v); continue; } catch {}
      }
      cleanProps[k] = v;
    }
    layerMap[layerId].features.push({ id: f.id || crypto.randomUUID(), layerId, geometry: f.geometry, properties: cleanProps });
  }
  return Object.values(layerMap);
}

export function layerToGeoJSON(layer) {
  return {
    type: 'FeatureCollection',
    metadata: {
      layerName: layer.name,
      layerType: layer.type,
      color: layer.color,
      fillOpacity: layer.fillOpacity,
      schema: layer.schema,
    },
    features: layer.features.map(f => ({
      type: 'Feature',
      id: f.id,
      geometry: f.geometry,
      properties: f.properties,
    })),
  };
}

// ── Schema export ──────────────────────────────────────────────────────────
export function exportSchema(layers) {
  return {
    version: '1.0',
    exported: new Date().toISOString(),
    layers: layers.map(l => ({
      name: l.name,
      type: l.type,
      schema: l.schema,
      style: {
        color: l.color,
        fillOpacity: l.fillOpacity,
        strokeOpacity: l.strokeOpacity,
        strokeWeight: l.strokeWeight,
      },
    })),
  };
}

// ── GeoJSON import ─────────────────────────────────────────────────────────
export function geoJSONToLayer(geojson, layerName) {
  const meta = geojson.metadata || {};
  // Use per-feature layer metadata if present (from EagleView exports)
  const firstFeature = geojson.features?.[0];
  const fp = firstFeature?.properties || {};
  const hasEmbeddedMeta = !!fp._layerName || !!fp._layerType;

  // Collect all unique property keys as schema (skip internal _keys)
  const schemaKeys = new Set();
  (geojson.features || []).forEach(f => {
    Object.keys(f.properties || {}).forEach(k => {
      if (!k.startsWith('_')) schemaKeys.add(k);
    });
  });
  const schema = [...schemaKeys].map(k => ({
    key: k,
    label: k,
    type: typeof (geojson.features?.[0]?.properties?.[k]) === 'number' ? 'number' : 'string',
  }));

  const cleanFeatures = (geojson.features || []).map(f => {
    const p = { ...f.properties };
    ['_layerId','_layerName','_layerType','_layerColor','_layerFillOpacity',
     '_layerStrokeWeight','_layerStrokeOpacity','_layerNoTurbines','_layerVisible'].forEach(k => delete p[k]);
    // Deserialize JSON-stringified objects (start_node, end_node, custom_fields)
    const deserialized = {};
    for (const [k, v] of Object.entries(p)) {
      if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
        try { deserialized[k] = JSON.parse(v); continue; } catch {}
      }
      deserialized[k] = v;
    }
    return { id: f.id || crypto.randomUUID(), layerId: null, geometry: f.geometry, properties: deserialized };
  });

  return createLayer({
    name: (hasEmbeddedMeta ? fp._layerName : null) || meta.layerName || layerName || 'Imported Layer',
    type: (hasEmbeddedMeta ? fp._layerType : null) || meta.layerType || 'polygon',
    color: (hasEmbeddedMeta ? fp._layerColor : null) || meta.color || '#06b6d4',
    fillOpacity: (hasEmbeddedMeta ? fp._layerFillOpacity : null) ?? meta.fillOpacity ?? 0.3,
    strokeWeight: (hasEmbeddedMeta ? fp._layerStrokeWeight : null) || 2,
    strokeOpacity: (hasEmbeddedMeta ? fp._layerStrokeOpacity : null) || 0.9,
    no_turbines: hasEmbeddedMeta ? (fp._layerNoTurbines || false) : false,
    visible: hasEmbeddedMeta ? (fp._layerVisible !== false) : true,
    schema: meta.schema || schema,
    features: cleanFeatures,
  });
}

// ── Default power curve for a generic 3.5 MW turbine ──────────────────────
export const DEFAULT_POWER_CURVE = [
  { v: 0, p_kw: 0 }, { v: 1, p_kw: 0 }, { v: 2, p_kw: 0 },
  { v: 3, p_kw: 50 }, { v: 4, p_kw: 150 }, { v: 5, p_kw: 320 },
  { v: 6, p_kw: 570 }, { v: 7, p_kw: 900 }, { v: 8, p_kw: 1300 },
  { v: 9, p_kw: 1780 }, { v: 10, p_kw: 2300 }, { v: 11, p_kw: 2850 },
  { v: 12, p_kw: 3500 }, { v: 13, p_kw: 3500 }, { v: 14, p_kw: 3500 },
  { v: 15, p_kw: 3500 }, { v: 16, p_kw: 3500 }, { v: 17, p_kw: 3500 },
  { v: 18, p_kw: 3500 }, { v: 19, p_kw: 3500 }, { v: 20, p_kw: 3500 },
  { v: 21, p_kw: 3500 }, { v: 22, p_kw: 3500 }, { v: 23, p_kw: 3500 },
  { v: 24, p_kw: 3500 }, { v: 25, p_kw: 3500 }, { v: 26, p_kw: 0 },
];

export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}