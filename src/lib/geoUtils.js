// ─────────────────────────────────────────────────────────────────────────────
// Point-in-polygon (ray casting) for GeoJSON Polygon features
// coords: [lng, lat] (GeoJSON order)
// ring: array of [lng, lat] pairs (closing vertex included)
// ─────────────────────────────────────────────────────────────────────────────

function pointInRing(px, py, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Returns true if [lng, lat] is inside the GeoJSON Polygon geometry.
 */
export function pointInPolygon(lng, lat, polygonGeometry) {
  if (polygonGeometry.type !== 'Polygon') return false;
  const outerRing = polygonGeometry.coordinates[0];
  return pointInRing(lng, lat, outerRing);
}

/**
 * Check if a lat/lng point falls inside any exclusion polygon across all layers.
 * Also checks point features with a setback radius and no_turbines=true.
 * Returns the first matching { layer, feature } or null.
 */
export function checkExclusionZones(lat, lng, layers) {
  for (const layer of layers) {
    if (!layer.visible) continue;

    // Polygon-based exclusion zones
    if (layer.no_turbines) {
      for (const feature of layer.features) {
        if (feature.geometry.type !== 'Polygon') continue;
        if (pointInPolygon(lng, lat, feature.geometry)) {
          return { layer, feature };
        }
      }
    }

    // Point-based setback exclusion zones (no_turbines on individual feature)
    if (layer.type === 'point') {
      for (const feature of layer.features) {
        if (feature.geometry.type !== 'Point') continue;
        if (!feature.properties?.no_turbines) continue;
        const setbackM = parseFloat(feature.properties?.setback_m) || 0;
        if (setbackM <= 0) continue;
        const [fLng, fLat] = feature.geometry.coordinates;
        const dist = haversineM(lat, lng, fLat, fLng);
        if (dist <= setbackM) {
          return { layer, feature };
        }
      }
    }
  }
  return null;
}

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}