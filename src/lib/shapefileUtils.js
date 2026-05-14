/**
 * Shapefile import/export utilities
 *
 * Export: writes a Shapefile set (.shp + .dbf + .shx + .prj) inside a ZIP.
 * Import: reads a .zip containing .shp + .dbf (or a bare .shp) and returns GeoJSON.
 *
 * Uses only browser-native APIs — no npm deps required.
 * Supports Point, LineString (Polyline) and Polygon geometry types.
 */

// ── SHP type codes ──────────────────────────────────────────────────────────
const SHP_NULL     = 0;
const SHP_POINT    = 1;
const SHP_POLYLINE = 3;
const SHP_POLYGON  = 5;

// ── PRJ strings ─────────────────────────────────────────────────────────────
const PRJ_WGS84 = `GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]`;
const PRJ_ITM   = `PROJCS["Irish_Transverse_Mercator",GEOGCS["GCS_GRS_1980",DATUM["D_GRS_1980",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",600000.0],PARAMETER["False_Northing",750000.0],PARAMETER["Central_Meridian",-8.0],PARAMETER["Scale_Factor",0.99982],PARAMETER["Latitude_Of_Origin",53.5],UNIT["Meter",1.0],AUTHORITY["EPSG","2157"]]`;
const PRJ_IG    = `PROJCS["TM65_Irish_Grid",GEOGCS["GCS_TM65",DATUM["D_TM65",SPHEROID["Airy_Modified",6377340.189,299.3249646]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",200000.0],PARAMETER["False_Northing",250000.0],PARAMETER["Central_Meridian",-8.0],PARAMETER["Scale_Factor",1.000035],PARAMETER["Latitude_Of_Origin",53.5],UNIT["Meter",1.0],AUTHORITY["EPSG","29902"]]`;

function getPRJ(crs) {
  if (crs === 'ITM') return PRJ_ITM;
  if (crs === 'IG')  return PRJ_IG;
  return PRJ_WGS84;
}

// ── CRC-32 ──────────────────────────────────────────────────────────────────
function makeCRCTable() {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
}
const CRC_TABLE = makeCRCTable();

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ── ZIP writer ───────────────────────────────────────────────────────────────
// Produces a valid PKZIP (store/no-compression) archive.
// All multi-byte integers in ZIP structures are little-endian.
function zipFiles(files) {
  const enc = new TextEncoder();

  // First pass: build local file entries
  const localEntries = [];
  let localOffset = 0;

  for (const { name, data } of files) {
    const nameBytes = enc.encode(name);
    const checksum  = crc32(data);
    const size      = data.length;

    // Local file header: 30 bytes + filename
    const lhSize = 30 + nameBytes.length;
    const lh = new Uint8Array(lhSize);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0,  0x04034B50, true); // local file header signature
    lv.setUint16(4,  20,         true); // version needed: 2.0
    lv.setUint16(6,  0,          true); // general purpose flags
    lv.setUint16(8,  0,          true); // compression: stored
    lv.setUint16(10, 0,          true); // last mod time
    lv.setUint16(12, 0,          true); // last mod date
    lv.setUint32(14, checksum,   true); // crc-32
    lv.setUint32(18, size,       true); // compressed size
    lv.setUint32(22, size,       true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true); // filename length
    lv.setUint16(28, 0,          true); // extra field length
    lh.set(nameBytes, 30);

    localEntries.push({ nameBytes, checksum, size, lh, data, localOffset });
    localOffset += lhSize + size;
  }

  // Second pass: build central directory entries
  const cdEntries = [];
  for (const e of localEntries) {
    const cdSize = 46 + e.nameBytes.length;
    const cd = new Uint8Array(cdSize);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0,  0x02014B50,         true); // central dir signature
    cv.setUint16(4,  20,                 true); // version made by
    cv.setUint16(6,  20,                 true); // version needed
    cv.setUint16(8,  0,                  true); // flags
    cv.setUint16(10, 0,                  true); // compression
    cv.setUint16(12, 0,                  true); // last mod time
    cv.setUint16(14, 0,                  true); // last mod date
    cv.setUint32(16, e.checksum,         true); // crc-32
    cv.setUint32(20, e.size,             true); // compressed size
    cv.setUint32(24, e.size,             true); // uncompressed size
    cv.setUint16(28, e.nameBytes.length, true); // filename length
    cv.setUint16(30, 0,                  true); // extra field length
    cv.setUint16(32, 0,                  true); // file comment length
    cv.setUint16(34, 0,                  true); // disk number start
    cv.setUint16(36, 0,                  true); // internal attributes
    cv.setUint32(38, 0,                  true); // external attributes
    cv.setUint32(42, e.localOffset,      true); // offset of local header
    cd.set(e.nameBytes, 46);
    cdEntries.push(cd);
  }

  // End of central directory
  const cdOffset = localOffset;
  const cdSize   = cdEntries.reduce((s, e) => s + e.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0,  0x06054B50,         true); // EOCD signature
  ev.setUint16(4,  0,                  true); // disk number
  ev.setUint16(6,  0,                  true); // start disk
  ev.setUint16(8,  files.length,       true); // entries on this disk
  ev.setUint16(10, files.length,       true); // total entries
  ev.setUint32(12, cdSize,             true); // central dir size
  ev.setUint32(16, cdOffset,           true); // central dir offset
  ev.setUint16(20, 0,                  true); // comment length

  // Concatenate everything
  const totalSize = localEntries.reduce((s, e) => s + e.lh.length + e.data.length, 0)
    + cdEntries.reduce((s, e) => s + e.length, 0)
    + eocd.length;

  const out = new Uint8Array(totalSize);
  let pos = 0;
  for (const e of localEntries) {
    out.set(e.lh,   pos); pos += e.lh.length;
    out.set(e.data, pos); pos += e.data.length;
  }
  for (const cd of cdEntries) { out.set(cd, pos); pos += cd.length; }
  out.set(eocd, pos);
  return out;
}

// ── SHP / SHX builder ────────────────────────────────────────────────────────
function buildSHP(features) {
  // Determine shape type from first valid feature
  let shpType = SHP_NULL;
  for (const f of features) {
    const t = f.geometry?.type;
    if (t === 'Point')                              { shpType = SHP_POINT;    break; }
    if (t === 'LineString' || t === 'MultiLineString') { shpType = SHP_POLYLINE; break; }
    if (t === 'Polygon'    || t === 'MultiPolygon')    { shpType = SHP_POLYGON;  break; }
  }

  // Build per-record binary content
  const records = [];
  let fileXmin = Infinity, fileYmin = Infinity, fileXmax = -Infinity, fileYmax = -Infinity;

  for (const f of features) {
    const geom = f.geometry;
    if (!geom) { records.push(null); continue; }

    if (geom.type === 'Point') {
      const [x, y] = geom.coordinates;
      fileXmin = Math.min(fileXmin, x); fileXmax = Math.max(fileXmax, x);
      fileYmin = Math.min(fileYmin, y); fileYmax = Math.max(fileYmax, y);

      const buf = new ArrayBuffer(20); // 4 (type) + 8 (x) + 8 (y)
      const dv  = new DataView(buf);
      dv.setInt32(0,   SHP_POINT, true);
      dv.setFloat64(4,  x,        true);
      dv.setFloat64(12, y,        true);
      records.push(new Uint8Array(buf));

    } else if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
      const rings = geom.type === 'Polygon' ? geom.coordinates : geom.coordinates.flat(1);

      // Compute feature bbox
      let fxmin = Infinity, fymin = Infinity, fxmax = -Infinity, fymax = -Infinity;
      let totalPts = 0;
      for (const ring of rings) {
        totalPts += ring.length;
        for (const [x, y] of ring) {
          fxmin = Math.min(fxmin, x); fxmax = Math.max(fxmax, x);
          fymin = Math.min(fymin, y); fymax = Math.max(fymax, y);
        }
      }
      fileXmin = Math.min(fileXmin, fxmin); fileXmax = Math.max(fileXmax, fxmax);
      fileYmin = Math.min(fileYmin, fymin); fileYmax = Math.max(fileYmax, fymax);

      // Content: type(4) + bbox(32) + numParts(4) + numPoints(4) + parts(4*n) + points(16*n)
      const contentLen = 4 + 32 + 4 + 4 + rings.length * 4 + totalPts * 16;
      const buf = new ArrayBuffer(contentLen);
      const dv  = new DataView(buf);
      let off = 0;
      dv.setInt32(off, SHP_POLYGON, true); off += 4;
      dv.setFloat64(off, fxmin, true); off += 8;
      dv.setFloat64(off, fymin, true); off += 8;
      dv.setFloat64(off, fxmax, true); off += 8;
      dv.setFloat64(off, fymax, true); off += 8;
      dv.setInt32(off, rings.length, true); off += 4;
      dv.setInt32(off, totalPts,     true); off += 4;
      let partStart = 0;
      for (const ring of rings) { dv.setInt32(off, partStart, true); off += 4; partStart += ring.length; }
      for (const ring of rings) for (const [x, y] of ring) {
        dv.setFloat64(off, x, true); off += 8;
        dv.setFloat64(off, y, true); off += 8;
      }
      records.push(new Uint8Array(buf));

    } else if (geom.type === 'LineString' || geom.type === 'MultiLineString') {
      const parts = geom.type === 'LineString' ? [geom.coordinates] : geom.coordinates;

      let fxmin = Infinity, fymin = Infinity, fxmax = -Infinity, fymax = -Infinity;
      let totalPts = 0;
      for (const part of parts) {
        totalPts += part.length;
        for (const [x, y] of part) {
          fxmin = Math.min(fxmin, x); fxmax = Math.max(fxmax, x);
          fymin = Math.min(fymin, y); fymax = Math.max(fymax, y);
        }
      }
      fileXmin = Math.min(fileXmin, fxmin); fileXmax = Math.max(fileXmax, fxmax);
      fileYmin = Math.min(fileYmin, fymin); fileYmax = Math.max(fileYmax, fymax);

      const contentLen = 4 + 32 + 4 + 4 + parts.length * 4 + totalPts * 16;
      const buf = new ArrayBuffer(contentLen);
      const dv  = new DataView(buf);
      let off = 0;
      dv.setInt32(off, SHP_POLYLINE, true); off += 4;
      dv.setFloat64(off, fxmin, true); off += 8;
      dv.setFloat64(off, fymin, true); off += 8;
      dv.setFloat64(off, fxmax, true); off += 8;
      dv.setFloat64(off, fymax, true); off += 8;
      dv.setInt32(off, parts.length, true); off += 4;
      dv.setInt32(off, totalPts,     true); off += 4;
      let partStart = 0;
      for (const part of parts) { dv.setInt32(off, partStart, true); off += 4; partStart += part.length; }
      for (const part of parts) for (const [x, y] of part) {
        dv.setFloat64(off, x, true); off += 8;
        dv.setFloat64(off, y, true); off += 8;
      }
      records.push(new Uint8Array(buf));

    } else {
      records.push(null);
    }
  }

  if (!isFinite(fileXmin)) { fileXmin = 0; fileXmax = 0; fileYmin = 0; fileYmax = 0; }

  // SHP total byte length
  let shpByteLen = 100;
  for (const r of records) shpByteLen += 8 + (r ? r.length : 4); // 8 header + content (null = 4 bytes)

  const shpBuf = new ArrayBuffer(shpByteLen);
  const shpDV  = new DataView(shpBuf);
  const shxLen = 100 + records.length * 8;
  const shxBuf = new ArrayBuffer(shxLen);
  const shxDV  = new DataView(shxBuf);

  function writeFileHeader(dv, byteLen, type) {
    // File code: big-endian 9994
    dv.setInt32(0,   9994,            false);
    dv.setInt32(4,   0,               false);
    dv.setInt32(8,   0,               false);
    dv.setInt32(12,  0,               false);
    dv.setInt32(16,  0,               false);
    dv.setInt32(20,  0,               false);
    dv.setInt32(24,  byteLen / 2,     false); // file length in 16-bit words, big-endian
    dv.setInt32(28,  1000,            true);  // version, little-endian
    dv.setInt32(32,  type,            true);  // shape type, little-endian
    dv.setFloat64(36, fileXmin,       true);
    dv.setFloat64(44, fileYmin,       true);
    dv.setFloat64(52, fileXmax,       true);
    dv.setFloat64(60, fileYmax,       true);
    dv.setFloat64(68, 0,              true);  // Zmin
    dv.setFloat64(76, 0,              true);  // Zmax
    dv.setFloat64(84, 0,              true);  // Mmin
    dv.setFloat64(92, 0,              true);  // Mmax
  }

  writeFileHeader(shpDV, shpByteLen, shpType);
  writeFileHeader(shxDV, shxLen,     shpType);

  let shpOff = 100;
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const contentWords = r ? r.length / 2 : 2; // content length in 16-bit words

    // SHX entry (big-endian offsets/lengths in 16-bit words)
    shxDV.setInt32(100 + i * 8,     shpOff / 2,    false);
    shxDV.setInt32(100 + i * 8 + 4, contentWords,  false);

    // SHP record header (big-endian)
    shpDV.setInt32(shpOff,     i + 1,         false); // record number (1-based)
    shpDV.setInt32(shpOff + 4, contentWords,  false); // content length
    shpOff += 8;

    if (r) {
      new Uint8Array(shpBuf).set(r, shpOff);
      shpOff += r.length;
    } else {
      // Null shape record: 4 bytes
      shpDV.setInt32(shpOff, SHP_NULL, true);
      shpOff += 4;
    }
  }

  return { shp: new Uint8Array(shpBuf), shx: new Uint8Array(shxBuf) };
}

// ── DBF builder ──────────────────────────────────────────────────────────────
function buildDBF(features) {
  const enc = new TextEncoder();
  const FIELD_LEN = 80; // safe max for broad compatibility

  // Collect unique field names (max 10 chars for DBF), skip internal _ fields
  const fieldSet = new Set();
  for (const f of features) {
    for (const k of Object.keys(f.properties || {})) {
      if (k && !k.startsWith('_')) fieldSet.add(k.slice(0, 10));
    }
  }
  const fields = [...fieldSet].slice(0, 128);

  const headerSize  = 32 + fields.length * 32 + 1; // +1 for terminator byte
  const recordSize  = 1 + fields.length * FIELD_LEN;
  const totalSize   = headerSize + features.length * recordSize + 1; // +1 for EOF

  const buf = new Uint8Array(totalSize);
  const dv  = new DataView(buf.buffer);

  // DBF header
  buf[0] = 0x03; // version: dBASE III
  const now = new Date();
  buf[1] = now.getFullYear() - 1900;
  buf[2] = now.getMonth() + 1;
  buf[3] = now.getDate();
  dv.setUint32(4,  features.length, true);
  dv.setUint16(8,  headerSize,      true);
  dv.setUint16(10, recordSize,      true);
  // bytes 12–31: reserved / zero — already zero from Uint8Array init

  // Field descriptor records (32 bytes each)
  for (let i = 0; i < fields.length; i++) {
    const base = 32 + i * 32;
    // Name: null-padded to 11 bytes
    const nameBytes = enc.encode(fields[i]);
    for (let j = 0; j < 11; j++) buf[base + j] = j < nameBytes.length ? nameBytes[j] : 0;
    buf[base + 11] = 0x43; // type 'C' = character
    // bytes 12–15: reserved
    buf[base + 16] = FIELD_LEN; // field length
    buf[base + 17] = 0;         // decimal count
    // bytes 18–31: reserved
  }
  buf[32 + fields.length * 32] = 0x0D; // header terminator

  // Data records
  let recOff = headerSize;
  for (const f of features) {
    buf[recOff] = 0x20; // record not deleted
    recOff += 1;
    for (const fieldName of fields) {
      const origKey = Object.keys(f.properties || {}).find(k => k.slice(0, 10) === fieldName);
      let val = origKey != null ? String(f.properties[origKey] ?? '') : '';
      // Encode and space-pad to FIELD_LEN
      const valBytes = enc.encode(val);
      for (let j = 0; j < FIELD_LEN; j++) {
        buf[recOff + j] = j < valBytes.length ? valBytes[j] : 0x20; // space pad
      }
      recOff += FIELD_LEN;
    }
  }
  buf[recOff] = 0x1A; // EOF marker

  return buf;
}

// ── Public export API ────────────────────────────────────────────────────────
/**
 * Export a GeoJSON FeatureCollection as a Shapefile ZIP.
 * All features must be the same geometry type (Point, LineString, or Polygon).
 * Returns a Uint8Array of the ZIP file.
 */
export function exportShapefile(geojson, baseName = 'export') {
  const features = (geojson.features || []).filter(f => f.geometry);
  const crsName   = geojson._crsName || 'WGS84';

  const { shp, shx } = buildSHP(features);
  const dbf = buildDBF(features);
  const prj = new TextEncoder().encode(getPRJ(crsName));

  return zipFiles([
    { name: `${baseName}.shp`, data: shp },
    { name: `${baseName}.shx`, data: shx },
    { name: `${baseName}.dbf`, data: dbf },
    { name: `${baseName}.prj`, data: prj },
  ]);
}

// ── Shapefile → GeoJSON (import) ─────────────────────────────────────────────
async function readZip(arrayBuffer) {
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

  while (off + 8 <= fileByteLen) {
    const contentWords = dv.getInt32(off + 4, false);
    const contentBytes = contentWords * 2;
    off += 8;
    if (contentBytes === 0) continue;

    const shpType = dv.getInt32(off, true);

    if (shpType === SHP_NULL) {
      features.push(null);
    } else if (shpType === SHP_POINT) {
      const x = dv.getFloat64(off + 4,  true);
      const y = dv.getFloat64(off + 12, true);
      features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [x, y] }, properties: {} });
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
        features.push({ type: 'Feature', geometry: { type: rings.length === 1 ? 'LineString' : 'MultiLineString', coordinates: rings.length === 1 ? rings[0] : rings }, properties: {} });
      } else {
        features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: rings }, properties: {} });
      }
    } else {
      features.push(null);
    }
    off += contentBytes;
  }
  return features;
}

export async function importShapefile(arrayBuffer, filename = '') {
  let shpBuf, dbfBuf;

  const isZip = filename.toLowerCase().endsWith('.zip') ||
    new DataView(arrayBuffer).getUint32(0, true) === 0x04034B50;

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
  const dbfRecords   = dbfBuf ? parseDBF(dbfBuf) : [];
  const features = geomFeatures
    .map((f, i) => f ? { ...f, properties: dbfRecords[i] || {} } : null)
    .filter(Boolean);

  return { type: 'FeatureCollection', features };
}