/**
 * Web Worker for shapefile parsing — keeps the main thread unblocked.
 * Receives: { arrayBuffer, filename }
 * Posts back: { result } or { error }
 *
 * NOTE: Loaded via Vite's ?worker import — do NOT use ES module imports here.
 */

const SHP_NULL     = 0;
const SHP_POINT    = 1;
const SHP_POLYLINE = 3;
const SHP_POLYGON  = 5;

function readZip(arrayBuffer) {
  const buf = new Uint8Array(arrayBuffer);
  const dv  = new DataView(arrayBuffer);
  const files = {};
  let i = 0;
  while (i < buf.length - 4) {
    if (dv.getUint32(i, true) === 0x04034B50) {
      const nameLen  = dv.getUint16(i + 26, true);
      const extraLen = dv.getUint16(i + 28, true);
      const compSize = dv.getUint32(i + 18, true);
      const name = new TextDecoder().decode(buf.slice(i + 30, i + 30 + nameLen));
      const dataStart = i + 30 + nameLen + extraLen;
      files[name.toLowerCase()] = arrayBuffer.slice(dataStart, dataStart + compSize);
      i = dataStart + compSize;
    } else { i++; }
  }
  return files;
}

function parseDBF(arrayBuffer) {
  const dv = new DataView(arrayBuffer);
  const numRec     = dv.getUint32(4,  true);
  const headerSize = dv.getUint16(8,  true);
  const recordSize = dv.getUint16(10, true);
  const fields = [];
  let off = 32;
  while (off + 32 <= headerSize && dv.getUint8(off) !== 0x0D) {
    const nameBytes = new Uint8Array(arrayBuffer, off, 11);
    const name = new TextDecoder().decode(nameBytes).replace(/\0/g, '');
    const fieldLen = dv.getUint8(off + 16);
    fields.push({ name, len: fieldLen });
    off += 32;
  }
  const records = [];
  let recOff = headerSize;
  for (let r = 0; r < numRec; r++) {
    if (dv.getUint8(recOff) === 0x2A) { recOff += recordSize; continue; }
    recOff += 1;
    const props = {};
    for (const { name, len } of fields) {
      const val = new TextDecoder().decode(new Uint8Array(arrayBuffer, recOff, len)).trim();
      props[name] = (!isNaN(val) && val !== '') ? Number(val) : val;
      recOff += len;
    }
    records.push(props);
  }
  return records;
}

function parseSHP(arrayBuffer) {
  const dv = new DataView(arrayBuffer);
  const fileByteLen = dv.getInt32(24, false) * 2;
  const features = [];
  let off = 100;
  let recIdx = 0;
  while (off + 8 <= fileByteLen) {
    const contentWords = dv.getInt32(off + 4, false);
    const contentBytes = contentWords * 2;
    off += 8;
    if (contentBytes === 0) continue;
    const shpType = dv.getInt32(off, true);
    // Generate IDs in the worker to avoid main-thread crypto.randomUUID() cost
    const id = `f_${recIdx++}`;
    if (shpType === SHP_NULL) {
      features.push(null);
    } else if (shpType === SHP_POINT) {
      const x = dv.getFloat64(off + 4,  true);
      const y = dv.getFloat64(off + 12, true);
      features.push({ id, type: 'Feature', geometry: { type: 'Point', coordinates: [x, y] }, properties: {} });
    } else if (shpType === SHP_POLYLINE || shpType === SHP_POLYGON) {
      const numParts  = dv.getInt32(off + 36, true);
      const numPoints = dv.getInt32(off + 40, true);
      const partStarts = [];
      for (let i = 0; i < numParts; i++) partStarts.push(dv.getInt32(off + 44 + i * 4, true));
      const ptBase = off + 44 + numParts * 4;
      const pts = [];
      for (let i = 0; i < numPoints; i++) {
        pts.push([dv.getFloat64(ptBase + i * 16, true), dv.getFloat64(ptBase + i * 16 + 8, true)]);
      }
      const rings = partStarts.map((start, i) => pts.slice(start, partStarts[i + 1] || numPoints));
      if (shpType === SHP_POLYLINE) {
        features.push({ id, type: 'Feature', geometry: { type: rings.length === 1 ? 'LineString' : 'MultiLineString', coordinates: rings.length === 1 ? rings[0] : rings }, properties: {} });
      } else {
        features.push({ id, type: 'Feature', geometry: { type: 'Polygon', coordinates: rings }, properties: {} });
      }
    } else {
      features.push(null);
    }
    off += contentBytes;
  }
  return features;
}

function detectCRS(prjText) {
  if (!prjText) return 'WGS84';
  const t = prjText.toUpperCase();
  if (t.includes('IRISH_TRANSVERSE_MERCATOR') || t.includes('2157') || t.includes('ITM')) return 'ITM';
  if (t.includes('TM65') || t.includes('IRISH_GRID') || t.includes('29902') || t.includes('IG')) return 'IG';
  return 'WGS84';
}

const ITM_PARAMS = { a: 6378137.0, e2: 0.00669438002290, E0: 600000, N0: 750000, k0: 0.99982, lat0: 53.5 * Math.PI / 180, lng0: -8.0 * Math.PI / 180 };
const IG_PARAMS  = { a: 6377340.189, e2: 0.00667054, E0: 200000, N0: 250000, k0: 1.000035, lat0: 53.5 * Math.PI / 180, lng0: -8.0 * Math.PI / 180 };

function tmInverse(E, N, params) {
  const { a, e2, E0, N0, k0, lat0, lng0 } = params;
  const e4 = e2 * e2, e6 = e4 * e2;
  const n = (a - Math.sqrt(a * a * (1 - e2))) / (a + Math.sqrt(a * a * (1 - e2)));
  const M0 = a * ((1 - e2/4 - 3*e4/64 - 5*e6/256) * lat0
    - (3*e2/8 + 3*e4/32 + 45*e6/1024) * Math.sin(2*lat0)
    + (15*e4/256 + 45*e6/1024) * Math.sin(4*lat0)
    - (35*e6/3072) * Math.sin(6*lat0));
  const M = M0 + (N - N0) / k0;
  const mu = M / (a * (1 - e2/4 - 3*e4/64 - 5*e6/256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const lat1 = mu
    + (3*e1/2 - 27*e1*e1*e1/32) * Math.sin(2*mu)
    + (21*e1*e1/16 - 55*e1*e1*e1*e1/32) * Math.sin(4*mu)
    + (151*e1*e1*e1/96) * Math.sin(6*mu)
    + (1097*e1*e1*e1*e1/512) * Math.sin(8*mu);
  const sinLat1 = Math.sin(lat1), cosLat1 = Math.cos(lat1), tanLat1 = Math.tan(lat1);
  const v = a / Math.sqrt(1 - e2 * sinLat1 * sinLat1);
  const rho = a * (1 - e2) / Math.pow(1 - e2 * sinLat1 * sinLat1, 1.5);
  const eta2 = v / rho - 1;
  const D = (E - E0) / (v * k0);
  const D2 = D*D, D3 = D2*D, D4 = D3*D, D5 = D4*D, D6 = D5*D;
  const lat = lat1
    - (v * tanLat1 / rho) * (D2/2
      - (5 + 3*tanLat1*tanLat1 + 10*eta2 - 4*eta2*eta2 - 9*e2) * D4/24
      + (61 + 90*tanLat1*tanLat1 + 298*eta2 + 45*tanLat1*tanLat1*tanLat1*tanLat1 - 252*e2 - 3*eta2*eta2) * D6/720);
  const lng = lng0 + (D
    - (1 + 2*tanLat1*tanLat1 + eta2) * D3/6
    + (5 - 2*eta2 + 28*tanLat1*tanLat1 - 3*eta2*eta2 + 8*e2 + 24*tanLat1*tanLat1*tanLat1*tanLat1) * D5/120) / cosLat1;
  return [lng * 180 / Math.PI, lat * 180 / Math.PI];
}

function reprojectCoord(coord, crs) {
  if (crs === 'WGS84') return coord;
  const params = crs === 'ITM' ? ITM_PARAMS : IG_PARAMS;
  const [x, y] = coord;
  if (Math.abs(x) < 180 && Math.abs(y) < 90) return coord;
  return tmInverse(x, y, params);
}

function reprojectFeature(feature, crs) {
  if (crs === 'WGS84') return feature;
  const g = feature.geometry;
  if (!g) return feature;
  const rc = (c) => reprojectCoord(c, crs);
  let geometry;
  if (g.type === 'Point') geometry = { ...g, coordinates: rc(g.coordinates) };
  else if (g.type === 'LineString') geometry = { ...g, coordinates: g.coordinates.map(rc) };
  else if (g.type === 'Polygon') geometry = { ...g, coordinates: g.coordinates.map(ring => ring.map(rc)) };
  else if (g.type === 'MultiPolygon') geometry = { ...g, coordinates: g.coordinates.map(poly => poly.map(ring => ring.map(rc))) };
  else if (g.type === 'MultiLineString') geometry = { ...g, coordinates: g.coordinates.map(line => line.map(rc)) };
  else geometry = g;
  return { ...feature, geometry };
}

function parseShapefileSet(shpBuf, dbfBuf, prjText, layerName) {
  const crs = detectCRS(prjText);
  const geomFeatures = parseSHP(shpBuf);
  const dbfRecords = dbfBuf ? parseDBF(dbfBuf) : [];
  const features = geomFeatures
    .map((f, i) => f ? reprojectFeature({ ...f, properties: dbfRecords[i] || {} }, crs) : null)
    .filter(Boolean);
  const geojson = { type: 'FeatureCollection', features };
  if (layerName) geojson._layerName = layerName;
  return geojson;
}

self.onmessage = function(e) {
  const { arrayBuffer, filename } = e.data;
  try {
    console.log('[ShapefileWorker] starting parse, bytes:', arrayBuffer.byteLength);
    const isZip = filename.toLowerCase().endsWith('.zip') ||
      (arrayBuffer.byteLength >= 4 && new DataView(arrayBuffer).getUint32(0, true) === 0x04034B50);

    if (!isZip) {
      const result = parseShapefileSet(arrayBuffer, null, null, filename.replace(/\.[^.]+$/, ''));
      console.log('[ShapefileWorker] done, features:', result.features.length);
      self.postMessage({ result });
      return;
    }

    const files = readZip(arrayBuffer);
    console.log('[ShapefileWorker] zip entries:', Object.keys(files));

    const groups = {};
    for (const key of Object.keys(files)) {
      const parts = key.split('/');
      const fname = parts[parts.length - 1];
      const ext = fname.split('.').pop().toLowerCase();
      const base = fname.slice(0, -(ext.length + 1)).toLowerCase();
      if (!groups[base]) groups[base] = {};
      groups[base][ext] = files[key];
    }

    const shpGroups = Object.entries(groups).filter(([, g]) => g['shp']);
    if (shpGroups.length === 0) {
      self.postMessage({ error: 'No .shp file found in ZIP. Files found: ' + Object.keys(files).join(', ') });
      return;
    }

    const results = shpGroups.map(([base, g]) => {
      const prjText = g['prj'] ? new TextDecoder().decode(g['prj']) : null;
      const r = parseShapefileSet(g['shp'], g['dbf'] || null, prjText, base);
      console.log('[ShapefileWorker] layer:', base, 'features:', r.features.length);
      return r;
    });

    self.postMessage({ result: results.length === 1 ? results[0] : results });
  } catch (err) {
    console.error('[ShapefileWorker] error:', err);
    self.postMessage({ error: err.message + '\n' + (err.stack || '') });
  }
};