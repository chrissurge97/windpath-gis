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
 * Returns the first matching { layer, feature } or null.
 */
export function checkExclusionZones(lat, lng, layers) {
  for (const layer of layers) {
    if (!layer.no_turbines) continue;
    if (!layer.visible) continue;
    for (const feature of layer.features) {
      if (feature.geometry.type !== 'Polygon') continue;
      if (pointInPolygon(lng, lat, feature.geometry)) {
        return { layer, feature };
      }
    }
  }
  return null;
}