/**
 * Developable Area computation
 *
 * Starts with Ireland's boundary as a MultiPolygon and subtracts:
 *  - Any polygon layer/feature flagged as no_turbines (layer.no_turbines or feature.properties.no_turbines)
 *  - Blocking radii circles around point features (buffered as GeoJSON polygon approximations)
 *  - Blocking radii circles around turbine features (per turbine's radii or globalRadii)
 *
 * Returns a GeoJSON MultiPolygon geometry (in [lng,lat] order) ready to render.
 */

import polygonClipping from 'polygon-clipping';

// Simple bounding box for Ireland
export const IRELAND_BBOX_RING = [
  [-10.7, 51.2],[-10.7, 55.5],[-5.3, 55.5],[-5.3, 51.2],[-10.7, 51.2]
];

/**
 * Create a circle polygon approximation (in [lng,lat] order)
 * around a given center, radius in metres, with N segments.
 */
function circlePolygon(centerLng, centerLat, radiusM, segments = 32) {
  const coords = [];
  const R = 6371000;
  const dLat = (radiusM / R) * (180 / Math.PI);
  const dLng = dLat / Math.cos(centerLat * Math.PI / 180);
  for (let i = 0; i <= segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    coords.push([
      centerLng + dLng * Math.cos(angle),
      centerLat + dLat * Math.sin(angle),
    ]);
  }
  return coords;
}

/**
 * Compute the developable area geometry.
 *
 * @param {Array} layers - all project layers
 * @param {Array} turbineTypes - turbine type definitions
 * @param {Array} globalRadii - global turbine radii config
 * @returns {Object|null} GeoJSON MultiPolygon geometry or null on error
 */
export function computeDevelopableArea(layers, turbineTypes, globalRadii) {
  // Start with Ireland bounding box as subject
  let subject = [[IRELAND_BBOX_RING]];

  const clippers = [];

  for (const layer of layers) {
    if (['turbine', 'cable', 'wind_resource'].includes(layer.type)) continue;
    // Skip baked developable area layers — they are display-only outputs, not inputs
    if (layer._isDevelopableArea) continue;

    const isLayerBlocking = !!layer.no_turbines;

    for (const f of layer.features) {
      const geom = f.geometry;
      if (!geom) continue;


      // ── Polygon exclusion zones (with holes) ────────────────────────────────
      if (geom.type === 'Polygon') {
        const featureBlocking = isLayerBlocking || !!f.properties?.no_turbines;
        if (!featureBlocking) continue;
        // polygon-clipping wants [ [outer ring], [hole1], [hole2], ... ]
        const coords = geom.coordinates;
        if (coords && coords[0] && coords[0].length >= 4) {
          clippers.push(coords);
        }
      }

      // ── MultiPolygon exclusion zones (with holes) ────────────────────────
      if (geom.type === 'MultiPolygon') {
        const featureBlocking = isLayerBlocking || !!f.properties?.no_turbines;
        if (!featureBlocking) continue;
        for (const poly of geom.coordinates) {
          if (poly && poly[0] && poly[0].length >= 4) {
            clippers.push(poly);
          }
        }
      }

      // ── Point buffer exclusion zones ─────────────────────────────────────
      if (geom.type === 'Point') {
        const [lng, lat] = geom.coordinates;
        const radii = f.properties?.radii;
        console.log('[DevArea] Point:', f.id, 'radii:', JSON.stringify(radii), 'no_turbines:', f.properties?.no_turbines, 'setback_m:', f.properties?.setback_m);
        if (radii && radii.length > 0) {
          for (const r of radii) {
            console.log('[DevArea]   radius:', r.label, 'blockPlacement:', r.blockPlacement, 'radiusM:', r.radiusM, 'center:', lng, lat);
            if (!r.blockPlacement || !(r.radiusM > 0)) continue;
            clippers.push([circlePolygon(lng, lat, r.radiusM)]);
          }
        }
        // Legacy single setback
        if (f.properties?.no_turbines && f.properties?.setback_m > 0) {
          clippers.push([circlePolygon(lng, lat, f.properties.setback_m)]);
        }
      }
    }
  }

  // ── Turbine radii (blocking) ─────────────────────────────────────────────
  const turbineLayer = layers.find(l => l.type === 'turbine');
  if (turbineLayer) {
    for (const t of turbineLayer.features) {
      if (t.geometry?.type !== 'Point') continue;
      const [lng, lat] = t.geometry.coordinates;
      const tt = turbineTypes.find(ty => ty.id === t.properties?.turbine_type_id) || turbineTypes[0];
      const rotorD = tt?.rotor_diameter_m || 130;
      const radii = t.properties?.radii || globalRadii || [];
      for (const r of radii) {
        if (!r.enabled || !r.blockPlacement) continue;
        const radiusM = (rotorD * r.dMultiple) / 2;
        if (radiusM > 0) {
          clippers.push([circlePolygon(lng, lat, radiusM)]);
        }
      }
    }
  }

  if (clippers.length === 0) {
    // Nothing to subtract — return bounding box as a single polygon
    return {
      type: 'Polygon',
      coordinates: [IRELAND_BBOX_RING],
    };
  }

  console.log('[DevArea] Total clippers:', clippers.length, 'Subject:', JSON.stringify(subject).slice(0, 80));
  try {
    const result = polygonClipping.difference(subject, ...clippers);
    console.log('[DevArea] Result polygons:', result?.length, 'clippers used:', clippers.length);
    if (!result || result.length === 0) return null;
    if (result.length === 1 && result[0].length === 1) {
      return { type: 'Polygon', coordinates: result[0] };
    }
    return {
      type: 'MultiPolygon',
      coordinates: result,
    };
  } catch (e) {
    console.warn('DevelopableArea: polygon-clipping error', e);
    return null;
  }
}