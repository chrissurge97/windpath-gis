/**
 * Coordinate Reference System utilities
 * Supports: WGS84 (EPSG:4326), ITM - Irish Transverse Mercator (EPSG:2157), IG - Irish Grid (EPSG:29902)
 *
 * ITM and IG use a Transverse Mercator projection.
 * Formulae follow the OSGB/OSi methodology.
 */

// ── Ellipsoid definitions ──────────────────────────────────────────────────
const GRS80 = { a: 6378137.0, f: 1 / 298.257222101 };
const AIRY_MOD = { a: 6377340.189, f: 1 / 299.3249646 };

function ellipsoidParams(e) {
  const { a, f } = e;
  const b = a * (1 - f);
  const e2 = (a * a - b * b) / (a * a);
  return { a, b, e2, e: Math.sqrt(e2) };
}

// ── TM projection parameters ───────────────────────────────────────────────
const ITM_PARAMS = {
  ellipsoid: GRS80,
  lat0: 53.5 * Math.PI / 180,
  lng0: -8.0 * Math.PI / 180,
  N0: 750000,
  E0: 600000,
  k0: 0.999820,
};

const IG_PARAMS = {
  ellipsoid: AIRY_MOD,
  lat0: 53.5 * Math.PI / 180,
  lng0: -8.0 * Math.PI / 180,
  N0: 250000,
  E0: 200000,
  k0: 1.000035,
};

// ── Helmert 7-param datum shift (WGS84 → Airy Modified for Irish Grid) ────
// OSi published parameters
const HELMERT_WGS84_TO_AIRY_MOD = {
  tx: -482.530, ty: 130.596, tz: -564.557,
  rx: -1.042, ry: -0.214, rz: -0.631,
  s: 8.15,
};

function helmertTransform(X, Y, Z, params) {
  const { tx, ty, tz, rx, ry, rz, s } = params;
  const ppm = s * 1e-6;
  const rxR = rx * Math.PI / (180 * 3600);
  const ryR = ry * Math.PI / (180 * 3600);
  const rzR = rz * Math.PI / (180 * 3600);
  return {
    X: tx + X * (1 + ppm) - Y * rzR + Z * ryR,
    Y: ty + X * rzR + Y * (1 + ppm) - Z * rxR,
    Z: tz - X * ryR + Y * rxR + Z * (1 + ppm),
  };
}

// ── Cartesian ↔ Geodetic ───────────────────────────────────────────────────
function geodeticToCartesian(lat, lng, h, ep) {
  const { a, e2 } = ep;
  const nu = a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
  return {
    X: (nu + h) * Math.cos(lat) * Math.cos(lng),
    Y: (nu + h) * Math.cos(lat) * Math.sin(lng),
    Z: (nu * (1 - e2) + h) * Math.sin(lat),
  };
}

function cartesianToGeodetic(X, Y, Z, ep) {
  const { a, b, e2 } = ep;
  const p = Math.sqrt(X * X + Y * Y);
  let lat = Math.atan2(Z, p * (1 - e2));
  for (let i = 0; i < 10; i++) {
    const nu = a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
    lat = Math.atan2(Z + e2 * nu * Math.sin(lat), p);
  }
  const lng = Math.atan2(Y, X);
  return { lat, lng };
}

// ── Transverse Mercator forward projection (lat/lng in radians → E, N) ────
function tmForward(lat, lng, params) {
  const ep = ellipsoidParams(params.ellipsoid);
  const { a, e2 } = ep;
  const { lat0, lng0, N0, E0, k0 } = params;

  const n = (a - ep.b) / (a + ep.b);
  const n2 = n * n, n3 = n * n * n, n4 = n2 * n2;

  const cosLat = Math.cos(lat), sinLat = Math.sin(lat), tanLat = Math.tan(lat);
  const nu = a * k0 / Math.sqrt(1 - e2 * sinLat * sinLat);
  const rho = a * k0 * (1 - e2) / Math.pow(1 - e2 * sinLat * sinLat, 1.5);
  const eta2 = nu / rho - 1;

  const dLng = lng - lng0;

  // Meridian arc
  const M0 = meridianArc(lat0, a, n, n2, n3, n4);
  const M = meridianArc(lat, a, n, n2, n3, n4);

  const I = M - M0;
  const II = (nu / 2) * sinLat * cosLat;
  const III = (nu / 24) * sinLat * cosLat ** 3 * (5 - tanLat * tanLat + 9 * eta2);
  const IIIA = (nu / 720) * sinLat * cosLat ** 5 * (61 - 58 * tanLat * tanLat + tanLat ** 4);

  const IV = nu * cosLat;
  const V = (nu / 6) * cosLat ** 3 * (nu / rho - tanLat * tanLat);
  const VI = (nu / 120) * cosLat ** 5 * (5 - 18 * tanLat * tanLat + tanLat ** 4 + 14 * eta2 - 58 * tanLat * tanLat * eta2);

  const N = N0 + I + II * dLng * dLng + III * dLng ** 4 + IIIA * dLng ** 6;
  const E = E0 + IV * dLng + V * dLng ** 3 + VI * dLng ** 5;

  return { E, N };
}

function meridianArc(lat, a, n, n2, n3, n4) {
  return a * (
    (1 + n + (5 / 4) * n2 + (5 / 4) * n3) * lat
    - (3 * n + 3 * n2 + (21 / 8) * n3) * Math.sin(2 * lat)
    + ((15 / 8) * n2 + (15 / 8) * n3) * Math.sin(4 * lat)
    - (35 / 24) * n3 * Math.sin(6 * lat)
  ) / (1 + n);
}

// ── Transverse Mercator inverse projection (E, N → lat/lng in radians) ────
function tmInverse(E, N, params) {
  const ep = ellipsoidParams(params.ellipsoid);
  const { a, e2 } = ep;
  const { lat0, lng0, N0, E0, k0 } = params;

  const n = (a - ep.b) / (a + ep.b);
  const n2 = n * n, n3 = n * n * n, n4 = n2 * n2;

  // Find latitude of foot-point
  const M0 = meridianArc(lat0, a, n, n2, n3, n4);
  let lat1 = (N - N0 + M0 * (1 + n)) / (a / (1 + n));
  for (let i = 0; i < 10; i++) {
    const M = meridianArc(lat1, a, n, n2, n3, n4);
    lat1 += (N - N0 - M + M0) / (a / (1 + n));
  }

  const sinLat1 = Math.sin(lat1), cosLat1 = Math.cos(lat1), tanLat1 = Math.tan(lat1);
  const nu = a * k0 / Math.sqrt(1 - e2 * sinLat1 * sinLat1);
  const rho = a * k0 * (1 - e2) / Math.pow(1 - e2 * sinLat1 * sinLat1, 1.5);
  const eta2 = nu / rho - 1;

  const dE = E - E0;

  const VII = tanLat1 / (2 * rho * nu);
  const VIII = tanLat1 / (24 * rho * nu ** 3) * (5 + 3 * tanLat1 * tanLat1 + eta2 - 9 * tanLat1 * tanLat1 * eta2);
  const IX = tanLat1 / (720 * rho * nu ** 5) * (61 + 90 * tanLat1 * tanLat1 + 45 * tanLat1 ** 4);

  const X = 1 / (cosLat1 * nu);
  const XI = 1 / (cosLat1 * 6 * nu ** 3) * (nu / rho + 2 * tanLat1 * tanLat1);
  const XII = 1 / (cosLat1 * 120 * nu ** 5) * (5 + 28 * tanLat1 * tanLat1 + 24 * tanLat1 ** 4);
  const XIIA = 1 / (cosLat1 * 5040 * nu ** 7) * (61 + 662 * tanLat1 * tanLat1 + 1320 * tanLat1 ** 4 + 720 * tanLat1 ** 6);

  const lat = lat1 - VII * dE * dE + VIII * dE ** 4 - IX * dE ** 6;
  const lng = lng0 + X * dE - XI * dE ** 3 + XII * dE ** 5 - XIIA * dE ** 7;

  return { lat, lng };
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Convert WGS84 (lat, lng degrees) to ITM (Easting, Northing metres)
 */
export function wgs84ToITM(lat, lng) {
  const latR = lat * Math.PI / 180;
  const lngR = lng * Math.PI / 180;
  const { E, N } = tmForward(latR, lngR, ITM_PARAMS);
  return { easting: Math.round(E * 1000) / 1000, northing: Math.round(N * 1000) / 1000 };
}

/**
 * Convert ITM (Easting, Northing metres) to WGS84 (lat, lng degrees)
 */
export function itmToWGS84(easting, northing) {
  const { lat, lng } = tmInverse(easting, northing, ITM_PARAMS);
  return { lat: lat * 180 / Math.PI, lng: lng * 180 / Math.PI };
}

/**
 * Convert WGS84 (lat, lng degrees) to Irish Grid (Easting, Northing metres)
 */
export function wgs84ToIG(lat, lng) {
  // First datum shift WGS84 → Airy Modified
  const ep_wgs = ellipsoidParams(GRS80);
  const { X, Y, Z } = geodeticToCartesian(lat * Math.PI / 180, lng * Math.PI / 180, 0, ep_wgs);
  const airy = helmertTransform(X, Y, Z, HELMERT_WGS84_TO_AIRY_MOD);
  const ep_airy = ellipsoidParams(AIRY_MOD);
  const { lat: latR, lng: lngR } = cartesianToGeodetic(airy.X, airy.Y, airy.Z, ep_airy);
  const { E, N } = tmForward(latR, lngR, IG_PARAMS);
  return { easting: Math.round(E * 1000) / 1000, northing: Math.round(N * 1000) / 1000 };
}

/**
 * Convert Irish Grid (Easting, Northing metres) to WGS84 (lat, lng degrees)
 */
export function igToWGS84(easting, northing) {
  const { lat: latR, lng: lngR } = tmInverse(easting, northing, IG_PARAMS);
  const ep_airy = ellipsoidParams(AIRY_MOD);
  const { X, Y, Z } = geodeticToCartesian(latR, lngR, 0, ep_airy);
  // Inverse Helmert (approximate — negate parameters)
  const inv = {
    tx: -HELMERT_WGS84_TO_AIRY_MOD.tx, ty: -HELMERT_WGS84_TO_AIRY_MOD.ty,
    tz: -HELMERT_WGS84_TO_AIRY_MOD.tz, rx: -HELMERT_WGS84_TO_AIRY_MOD.rx,
    ry: -HELMERT_WGS84_TO_AIRY_MOD.ry, rz: -HELMERT_WGS84_TO_AIRY_MOD.rz,
    s: -HELMERT_WGS84_TO_AIRY_MOD.s,
  };
  const wgs = helmertTransform(X, Y, Z, inv);
  const ep_wgs = ellipsoidParams(GRS80);
  const { lat, lng } = cartesianToGeodetic(wgs.X, wgs.Y, wgs.Z, ep_wgs);
  return { lat: lat * 180 / Math.PI, lng: lng * 180 / Math.PI };
}

/**
 * Re-project a GeoJSON FeatureCollection from WGS84 to a target CRS.
 * Returns a new GeoJSON object — all coordinates transformed.
 * targetCrs: 'WGS84' | 'ITM' | 'IG'
 */
export function reprojectGeoJSON(geojson, targetCrs) {
  if (targetCrs === 'WGS84') return geojson;

  const toTarget = targetCrs === 'ITM'
    ? ([lng, lat]) => { const r = wgs84ToITM(lat, lng); return [r.easting, r.northing]; }
    : ([lng, lat]) => { const r = wgs84ToIG(lat, lng); return [r.easting, r.northing]; };

  const transformGeom = (geom) => {
    if (!geom) return geom;
    if (geom.type === 'Point') return { ...geom, coordinates: toTarget(geom.coordinates) };
    if (geom.type === 'LineString') return { ...geom, coordinates: geom.coordinates.map(toTarget) };
    if (geom.type === 'Polygon') return { ...geom, coordinates: geom.coordinates.map(ring => ring.map(toTarget)) };
    if (geom.type === 'MultiPolygon') return { ...geom, coordinates: geom.coordinates.map(poly => poly.map(ring => ring.map(toTarget))) };
    return geom;
  };

  return {
    ...geojson,
    crs: {
      type: 'name',
      properties: {
        name: targetCrs === 'ITM' ? 'urn:ogc:def:crs:EPSG::2157' : 'urn:ogc:def:crs:EPSG::29902',
      },
    },
    features: (geojson.features || []).map(f => ({ ...f, geometry: transformGeom(f.geometry) })),
  };
}