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
export function calcWeibullAEP(hubWindSpeed, powerCurve, k, lambda) {
  if (!hubWindSpeed || !powerCurve || !k || !lambda) return null;
  // Scale lambda so the Weibull mean matches hubWindSpeed
  // Weibull mean = lambda * Gamma(1 + 1/k); scale lambda to target
  const gamma1pk = Math.exp(lgamma(1 + 1 / k));
  const scaledLambda = hubWindSpeed / gamma1pk;

  const sorted = [...powerCurve].sort((a, b) => a.v - b.v);
  const dv = 0.5; // integration step m/s
  let energyKwh = 0;
  for (let v = 0; v < 30; v += dv) {
    const pdf = (k / scaledLambda) * Math.pow(v / scaledLambda, k - 1) * Math.exp(-Math.pow(v / scaledLambda, k));
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
      featureCollection.features.push({
        type: 'Feature',
        id: f.id,
        geometry: f.geometry,
        properties: {
          ...f.properties,
          _layerId: layer.id,
          _layerName: layer.name,
          _layerType: layer.type,
        },
      });
    }
  }
  return featureCollection;
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
  // Collect all unique property keys as schema
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

  return createLayer({
    name: meta.layerName || layerName || 'Imported Layer',
    type: meta.layerType || 'polygon',
    color: meta.color || '#06b6d4',
    fillOpacity: meta.fillOpacity ?? 0.3,
    schema: meta.schema || schema,
    features: (geojson.features || []).map(f => ({
      id: f.id || crypto.randomUUID(),
      layerId: null, // will be set
      geometry: f.geometry,
      properties: f.properties || {},
    })),
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