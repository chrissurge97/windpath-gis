/**
 * Shapefile import/export utilities
 *
 * Export: writes a minimal Shapefile set (.shp + .dbf + .shx + .prj) as a zip.
 * Import: reads a .zip containing .shp + .dbf (or a bare .shp) and returns GeoJSON.
 *
 * Uses only browser-native APIs + a lightweight embedded parser — no npm deps required.
 * Supports Point, LineString (Polyline) and Polygon geometry types.
 */

// ── Binary helpers ──────────────────────────────────────────────────────────
function readUint32BE(dv, off) { return dv.getUint32(off, false); }
function readUint32LE(dv, off) { return dv.getUint32(off, true); }
function readInt32LE(dv, off) { return dv.getInt32(off, true); }
function readFloat64LE(dv, off) { return dv.getFloat64(off, true); }

function writeInt32BE(dv, off, v) { dv.setInt32(off, v, false); }
function writeInt32LE(dv, off, v) { dv.setInt32(off, v, true); }
function writeFloat64LE(dv, off, v) { dv.setFloat64(off, v, true); }

// ── SHP type codes ──────────────────────────────────────────────────────────
const SHP_NULL = 0;
const SHP_POINT = 1;
const SHP_POLYLINE = 3;
const SHP_POLYGON = 5;

// ── PRJ strings ─────────────────────────────────────────────────────────────
const PRJ_WGS84 = `GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]`;
const PRJ_ITM   = `PROJCS["Irish_Transverse_Mercator",GEOGCS["GCS_GRS_1980",DATUM["D_GRS_1980",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",600000.0],PARAMETER["False_Northing",750000.0],PARAMETER["Central_Meridian",-8.0],PARAMETER["Scale_Factor",0.99982],PARAMETER["Latitude_Of_Origin",53.5],UNIT["Meter",1.0],AUTHORITY["EPSG","2157"]]`;
const PRJ_IG    = `PROJCS["TM65_Irish_Grid",GEOGCS["GCS_TM65",DATUM["D_TM65",SPHEROID["Airy_Modified",6377340.189,299.3249646]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",200000.0],PARAMETER["False_Northing",250000.0],PARAMETER["Central_Meridian",-8.0],PARAMETER["Scale_Factor",1.000035],PARAMETER["Latitude_Of_Origin",53.5],UNIT["Meter",1.0],AUTHORITY["EPSG","29902"]]`;

function getPRJ(crs) {
  if (crs === 'ITM') return PRJ_ITM;
  if (crs === 'IG') return PRJ_IG;
  return PRJ_WGS84;
}

// ── Zip writer (no dependencies) ────────────────────────────────────────────
// Minimal ZIP64-compatible writer; produces a valid ZIP with stored (uncompressed) entries.

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c;
    }
    return t;
  })());
  for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function zipFiles(files) {
  // files: [{ name: string, data: Uint8Array }]
  const enc = new TextEncoder();
  const localHeaders = [];
  const centralDirEntries = [];
  let offset = 0;

  for (const { name, data } of files) {
    const nameBytes = enc.encode(name);
    const crc = crc32(data);
    // Local file header
    const lh = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034B50, false); // signature
    dv.setUint16(4, 20, true); // version needed
    dv.setUint16(6, 0, true); // flags
    dv.setUint16(8, 0, true); // compression (stored)
    dv.setUint16(10, 0, true); // mod time
    dv.setUint16(12, 0, true); // mod date
    dv.setUint32(14, crc, true);
    dv.setUint32(18, data.length, true); // compressed
    dv.setUint32(22, data.length, true); // uncompressed
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true); // extra
    lh.set(nameBytes, 30);
    localHeaders.push(lh);

    // Central directory entry
    const cd = new Uint8Array(46 + nameBytes.length);
    const dvc = new DataView(cd.buffer);
    dvc.setUint32(0, 0x02014B50, false);
    dvc.setUint16(4, 20, true); dvc.setUint16(6, 20, true);
    dvc.setUint16(8, 0, true); dvc.setUint16(10, 0, true);
    dvc.setUint16(12, 0, true); dvc.setUint16(14, 0, true);
    dvc.setUint32(16, crc, true);
    dvc.setUint32(20, data.length, true);
    dvc.setUint32(24, data.length, true);
    dvc.setUint16(28, nameBytes.length, true);
    dvc.setUint16(30, 0, true); dvc.setUint16(32, 0, true);
    dvc.setUint16(34, 0, true); dvc.setUint16(36, 0, true);
    dvc.setUint32(40, 0, true); // external attrs
    dvc.setUint32(42, offset, true); // local header offset
    cd.set(nameBytes, 46);
    centralDirEntries.push(cd);

    offset += lh.length + data.length;
  }

  const cdOffset = offset;
  const cdSize = centralDirEntries.reduce((s, e) => s + e.length, 0);

  // End of central directory record
  const eocd = new Uint8Array(22);
  const dvE = new DataView(eocd.buffer);
  dvE.setUint32(0, 0x06054B50, false);
  dvE.setUint16(4, 0, true); dvE.setUint16(6, 0, true);
  dvE.setUint16(8, files.length, true);
  dvE.setUint16(10, files.length, true);
  dvE.setUint32(12, cdSize, true);
  dvE.setUint32(16, cdOffset, true);
  dvE.setUint16(20, 0, true);

  const parts = [];
  for (let i = 0; i < files.length; i++) {
    parts.push(localHeaders[i]);
    parts.push(files[i].data);
  }
  for (const e of centralDirEntries) parts.push(e);
  parts.push(eocd);

  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) { out.set(p, pos); pos += p.length; }
  return out;
}

// ── GeoJSON → Shapefile ─────────────────────────────────────────────────────

function coordsToPoints(coords) {
  // coords: [x,y] pairs
  if (!coords || coords.length === 0) return [];
  return coords;
}

function buildSHP(features) {
  // Determine shape type from first non-null feature
  let shpType = SHP_NULL;
  for (const f of features) {
    const t = f.geometry?.type;
    if (t === 'Point') { shpType = SHP_POINT; break; }
    if (t === 'LineString' || t === 'MultiLineString') { shpType = SHP_POLYLINE; break; }
    if (t === 'Polygon' || t === 'MultiPolygon') { shpType = SHP_POLYGON; break; }
  }

  // Collect records
  const records = [];
  let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;

  for (const f of features) {
    const geom = f.geometry;
    if (!geom) { records.push(null); continue; }
    const t = geom.type;

    if (t === 'Point') {
      const [x, y] = geom.coordinates;
      xmin = Math.min(xmin, x); xmax = Math.max(xmax, x);
      ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
      const buf = new ArrayBuffer(4 + 8 + 8);
      const dv = new DataView(buf);
      writeInt32LE(dv, 0, SHP_POINT);
      dv.setFloat64(4, x, true); dv.setFloat64(12, y, true);
      records.push(new Uint8Array(buf));
    } else if (t === 'Polygon' || t === 'MultiPolygon') {
      // Flatten to array of rings
      const rings = t === 'Polygon' ? geom.coordinates : geom.coordinates.flat();
      let numPts = 0;
      for (const r of rings) {
        numPts += r.length;
        for (const [x, y] of r) {
          xmin = Math.min(xmin, x); xmax = Math.max(xmax, x);
          ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
        }
      }
      const contentLen = 4 + 32 + 4 + 4 + rings.length * 4 + numPts * 16;
      const buf = new ArrayBuffer(contentLen);
      const dv = new DataView(buf);
      let off = 0;
      writeInt32LE(dv, off, SHP_POLYGON); off += 4;
      dv.setFloat64(off, xmin, true); off += 8;
      dv.setFloat64(off, ymin, true); off += 8;
      dv.setFloat64(off, xmax, true); off += 8;
      dv.setFloat64(off, ymax, true); off += 8;
      writeInt32LE(dv, off, rings.length); off += 4;
      writeInt32LE(dv, off, numPts); off += 4;
      let partStart = 0;
      for (const r of rings) { writeInt32LE(dv, off, partStart); off += 4; partStart += r.length; }
      for (const r of rings) for (const [x, y] of r) {
        dv.setFloat64(off, x, true); off += 8;
        dv.setFloat64(off, y, true); off += 8;
      }
      records.push(new Uint8Array(buf));
    } else if (t === 'LineString' || t === 'MultiLineString') {
      const parts = t === 'LineString' ? [geom.coordinates] : geom.coordinates;
      let numPts = 0;
      for (const p of parts) {
        numPts += p.length;
        for (const [x, y] of p) {
          xmin = Math.min(xmin, x); xmax = Math.max(xmax, x);
          ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
        }
      }
      const contentLen = 4 + 32 + 4 + 4 + parts.length * 4 + numPts * 16;
      const buf = new ArrayBuffer(contentLen);
      const dv = new DataView(buf);
      let off = 0;
      writeInt32LE(dv, off, SHP_POLYLINE); off += 4;
      dv.setFloat64(off, xmin, true); off += 8;
      dv.setFloat64(off, ymin, true); off += 8;
      dv.setFloat64(off, xmax, true); off += 8;
      dv.setFloat64(off, ymax, true); off += 8;
      writeInt32LE(dv, off, parts.length); off += 4;
      writeInt32LE(dv, off, numPts); off += 4;
      let partStart = 0;
      for (const p of parts) { writeInt32LE(dv, off, partStart); off += 4; partStart += p.length; }
      for (const p of parts) for (const [x, y] of p) {
        dv.setFloat64(off, x, true); off += 8;
        dv.setFloat64(off, y, true); off += 8;
      }
      records.push(new Uint8Array(buf));
    } else {
      records.push(null);
    }
  }

  if (!isFinite(xmin)) { xmin = 0; xmax = 0; ymin = 0; ymax = 0; }

  // Build SHX (100 + 8 per record) and SHP
  let shpSize = 100;
  for (const r of records) shpSize += r ? 8 + r.length : 8;

  const shpBuf = new ArrayBuffer(shpSize);
  const shpDV = new DataView(shpBuf);
  const shxBuf = new ArrayBuffer(100 + records.length * 8);
  const shxDV = new DataView(shxBuf);

  // SHP file header
  function writeFileHeader(dv, fileLen, shpT) {
    writeInt32BE(dv, 0, 9994);
    for (let i = 4; i < 24; i += 4) writeInt32BE(dv, i, 0);
    writeInt32BE(dv, 24, fileLen / 2); // file length in 16-bit words
    writeInt32LE(dv, 28, 1000); // version
    writeInt32LE(dv, 32, shpT);
    dv.setFloat64(36, xmin, true); dv.setFloat64(44, ymin, true);
    dv.setFloat64(52, xmax, true); dv.setFloat64(60, ymax, true);
    for (let i = 68; i < 100; i += 8) dv.setFloat64(i, 0, true);
  }
  writeFileHeader(shpDV, shpSize, shpType);
  writeFileHeader(shxDV, 100 + records.length * 8, shpType);

  let shpOff = 100;
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    // SHX entry: offset and content length in 16-bit words
    writeInt32BE(shxDV, 100 + i * 8, shpOff / 2);
    writeInt32BE(shxDV, 100 + i * 8 + 4, r ? r.length / 2 : 2);
    // SHP record header
    writeInt32BE(shpDV, shpOff, i + 1); // record number (1-based)
    writeInt32BE(shpDV, shpOff + 4, r ? r.length / 2 : 2);
    shpOff += 8;
    if (r) { new Uint8Array(shpBuf).set(r, shpOff); shpOff += r.length; }
    else {
      writeInt32LE(shpDV, shpOff, SHP_NULL); shpOff += 4;
    }
  }

  return {
    shp: new Uint8Array(shpBuf),
    shx: new Uint8Array(shxBuf),
  };
}

function buildDBF(features) {
  // Collect field names from all properties
  const fieldSet = new Set();
  for (const f of features) {
    for (const k of Object.keys(f.properties || {})) {
      if (k && !k.startsWith('_')) fieldSet.add(k.slice(0, 10));
    }
  }
  const fields = [...fieldSet].slice(0, 128); // DBF max 128 fields

  const enc = new TextEncoder();
  const FIELD_LEN = 250;
  const headerSize = 32 + fields.length * 32 + 1;
  const recordSize = 1 + fields.length * FIELD_LEN;
  const totalSize = headerSize + features.length * recordSize + 1;

  const buf = new Uint8Array(totalSize);
  const dv = new DataView(buf.buffer);

  // Header
  buf[0] = 3; // dBASE III
  const now = new Date();
  buf[1] = now.getFullYear() - 1900;
  buf[2] = now.getMonth() + 1;
  buf[3] = now.getDate();
  dv.setUint32(4, features.length, true);
  dv.setUint16(8, headerSize, true);
  dv.setUint16(10, recordSize, true);

  // Field descriptors
  for (let i = 0; i < fields.length; i++) {
    const off = 32 + i * 32;
    const nameBytes = enc.encode(fields[i].padEnd(11, '\0').slice(0, 11));
    buf.set(nameBytes, off);
    buf[off + 11] = 67; // 'C' = character
    buf[off + 16] = FIELD_LEN;
  }
  buf[32 + fields.length * 32] = 0x0D; // header terminator

  // Records
  let recOff = headerSize;
  for (const f of features) {
    buf[recOff] = 0x20; // not deleted
    recOff += 1;
    for (const field of fields) {
      // Find original key (may be longer than 10 chars)
      const origKey = Object.keys(f.properties || {}).find(k => k.slice(0, 10) === field);
      let val = origKey ? String(f.properties[origKey] ?? '') : '';
      val = val.slice(0, FIELD_LEN).padEnd(FIELD_LEN, ' ');
      const bytes = enc.encode(val);
      buf.set(bytes.slice(0, FIELD_LEN), recOff);
      recOff += FIELD_LEN;
    }
  }
  buf[recOff] = 0x1A; // EOF

  return buf;
}

/**
 * Export a GeoJSON FeatureCollection as a Shapefile ZIP.
 * Returns a Uint8Array of the zip file.
 * baseName: filename prefix (no extension)
 * crs: 'WGS84' | 'ITM' | 'IG'
 */
export function exportShapefile(geojson, baseName = 'export') {
  const features = geojson.features || [];
  const { shp, shx } = buildSHP(features);
  const dbf = buildDBF(features);
  const prj = new TextEncoder().encode(getPRJ(geojson._crsName || 'WGS84'));

  return zipFiles([
    { name: `${baseName}.shp`, data: shp },
    { name: `${baseName}.shx`, data: shx },
    { name: `${baseName}.dbf`, data: dbf },
    { name: `${baseName}.prj`, data: prj },
  ]);
}

// ── Shapefile → GeoJSON ─────────────────────────────────────────────────────

async function readZip(arrayBuffer) {
  // Minimal ZIP reader — finds local file entries
  const buf = new Uint8Array(arrayBuffer);
  const dv = new DataView(arrayBuffer);
  const files = {};
  let i = 0;
  while (i < buf.length - 4) {
    if (dv.getUint32(i, false) === 0x504B0304) {
      // Local file header
      const nameLen = dv.getUint16(i + 26, true);
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
  const numRec = dv.getUint32(4, true);
  const headerSize = dv.getUint16(8, true);
  const recordSize = dv.getUint16(10, true);

  const fields = [];
  let off = 32;
  while (dv.getUint8(off) !== 0x0D && off < headerSize - 1) {
    const nameBytes = new Uint8Array(arrayBuffer, off, 11);
    const name = new TextDecoder().decode(nameBytes).replace(/\0/g, '');
    const fieldLen = dv.getUint8(off + 16);
    fields.push({ name, len: fieldLen });
    off += 32;
  }

  const records = [];
  let recOff = headerSize;
  for (let r = 0; r < numRec; r++) {
    if (dv.getUint8(recOff) === 0x2A) { recOff += recordSize; continue; } // deleted
    recOff += 1;
    const props = {};
    for (const { name, len } of fields) {
      const val = new TextDecoder().decode(new Uint8Array(arrayBuffer, recOff, len)).trim();
      props[name] = isNaN(val) || val === '' ? val : Number(val);
      recOff += len;
    }
    records.push(props);
  }
  return records;
}

function parseSHP(arrayBuffer) {
  const dv = new DataView(arrayBuffer);
  const fileLen = readUint32BE(dv, 24) * 2;
  const features = [];
  let off = 100;

  while (off < fileLen) {
    if (off + 8 > fileLen) break;
    const contentLen = readUint32BE(dv, off + 4) * 2;
    off += 8;
    if (contentLen === 0) continue;

    const shpType = readInt32LE(dv, off);

    if (shpType === SHP_NULL) {
      features.push(null);
    } else if (shpType === SHP_POINT) {
      const x = readFloat64LE(dv, off + 4);
      const y = readFloat64LE(dv, off + 12);
      features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [x, y] }, properties: {} });
    } else if (shpType === SHP_POLYLINE || shpType === SHP_POLYGON) {
      const numParts = readInt32LE(dv, off + 36);
      const numPoints = readInt32LE(dv, off + 40);
      const partStarts = [];
      for (let i = 0; i < numParts; i++) partStarts.push(readInt32LE(dv, off + 44 + i * 4));
      const ptOff = off + 44 + numParts * 4;
      const pts = [];
      for (let i = 0; i < numPoints; i++) {
        pts.push([readFloat64LE(dv, ptOff + i * 16), readFloat64LE(dv, ptOff + i * 16 + 8)]);
      }
      const rings = partStarts.map((start, i) => {
        const end = partStarts[i + 1] || numPoints;
        return pts.slice(start, end);
      });
      if (shpType === SHP_POLYLINE) {
        features.push({ type: 'Feature', geometry: { type: rings.length === 1 ? 'LineString' : 'MultiLineString', coordinates: rings.length === 1 ? rings[0] : rings }, properties: {} });
      } else {
        features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: rings }, properties: {} });
      }
    } else {
      features.push(null);
    }
    off += contentLen;
  }
  return features;
}

/**
 * Import a Shapefile ZIP or .shp ArrayBuffer and return a GeoJSON FeatureCollection.
 */
export async function importShapefile(arrayBuffer, filename = '') {
  let shpBuf, dbfBuf;

  const isZip = filename.toLowerCase().endsWith('.zip') ||
    (new DataView(arrayBuffer)).getUint32(0, false) === 0x504B0304;

  if (isZip) {
    const files = await readZip(arrayBuffer);
    const shpKey = Object.keys(files).find(k => k.endsWith('.shp'));
    const dbfKey = Object.keys(files).find(k => k.endsWith('.dbf'));
    if (!shpKey) throw new Error('No .shp file found in ZIP');
    shpBuf = files[shpKey];
    dbfBuf = dbfKey ? files[dbfKey] : null;
  } else {
    shpBuf = arrayBuffer;
    dbfBuf = null;
  }

  const geomFeatures = parseSHP(shpBuf);
  const dbfRecords = dbfBuf ? parseDBF(dbfBuf) : [];

  const features = geomFeatures
    .map((f, i) => {
      if (!f) return null;
      return { ...f, properties: dbfRecords[i] || {} };
    })
    .filter(Boolean);

  return { type: 'FeatureCollection', features };
}