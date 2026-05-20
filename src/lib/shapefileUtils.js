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
      if (!isFinite(x) || !isFinite(y)) { records.push(null); continue; }
      fileXmin = Math.min(fileXmin, x); fileXmax = Math.max(fileXmax, x);
      fileYmin = Math.min(fileYmin, y); fileYmax = Math.max(fileYmax, y);

      // Point content: shapeType(4) + x(8) + y(8) = 20 bytes = 10 words
      const buf = new ArrayBuffer(20);
      const dv  = new DataView(buf);
      dv.setInt32(0,   SHP_POINT, true);
      dv.setFloat64(4,  x, true);
      dv.setFloat64(12, y, true);
      records.push(new Uint8Array(buf));

    } else if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
      // Flatten to array of rings, filter out empties, ensure each ring is closed
      const rawRings = geom.type === 'Polygon' ? geom.coordinates : geom.coordinates.flat(1);
      const rings = rawRings
        .filter(r => r && r.length >= 3)
        .map(r => {
          // Ensure ring is closed (last point == first point)
          const first = r[0], last = r[r.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) return [...r, r[0]];
          return r;
        });

      if (rings.length === 0) { records.push(null); continue; }

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

      // Content: shapeType(4) + bbox(32) + numParts(4) + numPoints(4) + partStarts(4*numParts) + points(16*numPoints)
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
      dv.setInt32(off, totalPts, true);     off += 4;
      let partStart = 0;
      for (const ring of rings) { dv.setInt32(off, partStart, true); off += 4; partStart += ring.length; }
      for (const ring of rings) for (const [x, y] of ring) {
        dv.setFloat64(off, x, true); off += 8;
        dv.setFloat64(off, y, true); off += 8;
      }
      // Sanity-check: off must equal contentLen
      if (off !== contentLen) { records.push(null); continue; }
      records.push(new Uint8Array(buf));

    } else if (geom.type === 'LineString' || geom.type === 'MultiLineString') {
      const rawParts = geom.type === 'LineString' ? [geom.coordinates] : geom.coordinates;
      const parts = rawParts.filter(p => p && p.length >= 2);

      if (parts.length === 0) { records.push(null); continue; }

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

      // Content: shapeType(4) + bbox(32) + numParts(4) + numPoints(4) + partStarts(4*numParts) + points(16*numPoints)
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
      dv.setInt32(off, totalPts, true);     off += 4;
      let partStart = 0;
      for (const part of parts) { dv.setInt32(off, partStart, true); off += 4; partStart += part.length; }
      for (const part of parts) for (const [x, y] of part) {
        dv.setFloat64(off, x, true); off += 8;
        dv.setFloat64(off, y, true); off += 8;
      }
      if (off !== contentLen) { records.push(null); continue; }
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

  // Collect unique field names (max 10 chars for DBF), skip any residual _ fields
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
 * If the GeoJSON has _layers metadata (from layersToGeoJSON), each layer is
 * written as a separate .shp inside the ZIP, preserving layer names.
 * Otherwise all features go into a single .shp.
 * Returns a Uint8Array of the ZIP file.
 */
export function exportShapefile(geojson, baseName = 'export') {
  const allFeatures = (geojson.features || []).filter(f => f.geometry);
  const crsName = geojson._crsName || 'WGS84';
  const prj = new TextEncoder().encode(getPRJ(crsName));

  // Group features by their embedded _layerName (set by layersToGeoJSON).
  // Fall back to a single group when no layer metadata is present.
  const layerGroups = new Map();
  for (const f of allFeatures) {
    const layerName = f.properties?._layerName || baseName;
    if (!layerGroups.has(layerName)) layerGroups.set(layerName, []);
    layerGroups.get(layerName).push(f);
  }

  // Sanitise a layer name to a safe filename (no special chars, max 60 chars)
  const toFilename = (name) =>
    name.replace(/[^a-zA-Z0-9_\-. ]/g, '_').replace(/\s+/g, '_').slice(0, 60);

  // Deduplicate filenames in case two layers have the same sanitised name
  const usedNames = new Map();
  const zipEntries = []; // { name, data }

  for (const [layerName, features] of layerGroups) {
    // Pull layer metadata from the first feature (all features in this group share the same layer)
    const firstProps = features[0]?.properties || {};
    const layerMeta = {
      ev_type:    firstProps._layerType    || 'polygon',
      ev_color:   firstProps._layerColor   || '#06b6d4',
      ev_opacity: String(firstProps._layerFillOpacity ?? 0.15),
      ev_stroke:  String(firstProps._layerStrokeWeight ?? 2),
      ev_sopac:   String(firstProps._layerStrokeOpacity ?? 0.9),
      ev_visible: firstProps._layerVisible === false ? 'false' : 'true',
      ev_noturb:  firstProps._layerNoTurbines ? 'true' : 'false',
    };

    // Strip internal _layer* fields, serialize object-valued props (e.g. start_node/end_node),
    // and inject short ev_* metadata into each feature
    const cleanFeatures = features.map(f => ({
      ...f,
      properties: {
        ...Object.fromEntries(
          Object.entries(f.properties || {})
            .filter(([k]) => !k.startsWith('_'))
            .map(([k, v]) => {
              // Serialize objects/arrays to JSON strings so DBF can store them
              if (v !== null && typeof v === 'object') return [k, JSON.stringify(v)];
              return [k, v];
            })
        ),
        ...layerMeta,
      },
    }));

    const { shp, shx } = buildSHP(cleanFeatures);
    const dbf = buildDBF(cleanFeatures);

    let fname = toFilename(layerName);
    const count = (usedNames.get(fname) || 0) + 1;
    usedNames.set(fname, count);
    if (count > 1) fname = `${fname}_${count}`;

    zipEntries.push(
      { name: `${fname}.shp`, data: shp },
      { name: `${fname}.shx`, data: shx },
      { name: `${fname}.dbf`, data: dbf },
      { name: `${fname}.prj`, data: prj },
    );
  }

  return zipFiles(zipEntries);
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

function deserializeProps(props) {
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
      try { out[k] = JSON.parse(v); continue; } catch {}
    }
    out[k] = v;
  }
  return out;
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
    // Deserialize JSON-stringified objects (start_node, end_node, custom_fields)
    records.push(deserializeProps(props));
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

// ── CRS detection from .prj content ─────────────────────────────────────────
function detectCRS(prjText) {
  if (!prjText) return 'WGS84';
  const t = prjText.toUpperCase();
  if (t.includes('IRISH_TRANSVERSE_MERCATOR') || t.includes('2157') || t.includes('ITM')) return 'ITM';
  if (t.includes('TM65') || t.includes('IRISH_GRID') || t.includes('29902') || t.includes('IG')) return 'IG';
  return 'WGS84';
}

// ── Reproject projected coordinates to WGS84 ────────────────────────────────
// Basic Transverse Mercator inverse projection for ITM (EPSG:2157) and IG (EPSG:29902)
function tmInverse(E, N, params) {
  const { a, e2, E0, N0, k0, lat0, lng0 } = params;
  const e4 = e2 * e2, e6 = e4 * e2;
  const n = (a - Math.sqrt(a * a * (1 - e2))) / (a + Math.sqrt(a * a * (1 - e2)));
  const n2 = n*n, n3 = n2*n, n4 = n3*n;

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

  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const tanLat1 = Math.tan(lat1);
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

const ITM_PARAMS = { a: 6378137.0, e2: 0.00669438002290, E0: 600000, N0: 750000, k0: 0.99982, lat0: 53.5 * Math.PI / 180, lng0: -8.0 * Math.PI / 180 };
const IG_PARAMS  = { a: 6377340.189, e2: 0.00667054, E0: 200000, N0: 250000, k0: 1.000035, lat0: 53.5 * Math.PI / 180, lng0: -8.0 * Math.PI / 180 };

function reprojectCoord(coord, crs) {
  if (crs === 'WGS84') return coord;
  const params = crs === 'ITM' ? ITM_PARAMS : IG_PARAMS;
  // Heuristic: ITM/IG coords are in the hundreds-of-thousands range
  const [x, y] = coord;
  if (Math.abs(x) < 180 && Math.abs(y) < 90) return coord; // Already WGS84
  return tmInverse(x, y, params);
}

function reprojectFeature(feature, crs) {
  if (crs === 'WGS84') return feature;
  const g = feature.geometry;
  if (!g) return feature;
  const rc = (c) => reprojectCoord(c, crs);
  let geometry;
  if (g.type === 'Point') {
    geometry = { ...g, coordinates: rc(g.coordinates) };
  } else if (g.type === 'LineString') {
    geometry = { ...g, coordinates: g.coordinates.map(rc) };
  } else if (g.type === 'Polygon') {
    geometry = { ...g, coordinates: g.coordinates.map(ring => ring.map(rc)) };
  } else if (g.type === 'MultiPolygon') {
    geometry = { ...g, coordinates: g.coordinates.map(poly => poly.map(ring => ring.map(rc))) };
  } else if (g.type === 'MultiLineString') {
    geometry = { ...g, coordinates: g.coordinates.map(line => line.map(rc)) };
  } else {
    geometry = g;
  }
  return { ...feature, geometry };
}

// Parse a single shapefile set (shpBuf + optional dbfBuf + optional prjText)
function parseShapefileSet(shpBuf, dbfBuf, prjText, layerName) {
  const crs = detectCRS(prjText);
  const geomFeatures = parseSHP(shpBuf);
  const dbfRecords = dbfBuf ? parseDBF(dbfBuf) : [];
  
  let features = geomFeatures
    .map((f, i) => f ? reprojectFeature({ ...f, properties: dbfRecords[i] || {} }, crs) : null)
    .filter(Boolean);
  
  // CRITICAL: If we have more DBF records than features, shapefile grouped multiple parts into one.
  // Unfold MultiLineStrings back to individual features per DBF record.
  if (dbfRecords.length > features.length) {
    const expanded = [];
    let dbfIdx = 0;
    for (const feature of features) {
      const geom = feature.geometry;
      if (geom?.type === 'MultiLineString' && dbfIdx < dbfRecords.length) {
        // One feature with multiple parts → split into separate features
        for (const coords of geom.coordinates) {
          if (dbfIdx < dbfRecords.length) {
            expanded.push({
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: coords },
              properties: dbfRecords[dbfIdx]
            });
            dbfIdx++;
          }
        }
      } else {
        // Single-part feature → use as-is
        expanded.push(feature);
        dbfIdx++;
      }
    }
    features = expanded;
  }
  
  const geojson = { type: 'FeatureCollection', features };
  if (layerName) geojson._layerName = layerName;
  return geojson;
}

/**
 * Import one or more shapefiles.
 * - Bare .shp file → returns a single GeoJSON FeatureCollection
 * - ZIP with ONE .shp → returns a single GeoJSON FeatureCollection
 * - ZIP with MULTIPLE .shp files → returns an Array of GeoJSON FeatureCollections
 * Each collection has a `_layerName` property for the layer name.
 */
export async function importShapefile(arrayBuffer, filename = '') {
  const isZip = filename.toLowerCase().endsWith('.zip') ||
    (arrayBuffer.byteLength >= 4 && new DataView(arrayBuffer).getUint32(0, true) === 0x04034B50);

  if (!isZip) {
    // Bare .shp file — no DBF or PRJ available
    return parseShapefileSet(arrayBuffer, null, null, filename.replace(/\.[^.]+$/, ''));
  }

  const files = await readZip(arrayBuffer);

  // Group by base name (strip path + extension)
  const groups = {};
  for (const key of Object.keys(files)) {
    const parts = key.split('/');
    const fname = parts[parts.length - 1]; // handle subdirectories
    const ext = fname.split('.').pop().toLowerCase();
    const base = fname.slice(0, -(ext.length + 1)).toLowerCase();
    if (!groups[base]) groups[base] = {};
    groups[base][ext] = files[key];
  }

  const shpGroups = Object.entries(groups).filter(([, g]) => g['shp']);

  if (shpGroups.length === 0) throw new Error('No .shp file found in ZIP');

  const results = shpGroups.map(([base, g]) => {
    const prjText = g['prj'] ? new TextDecoder().decode(g['prj']) : null;
    return parseShapefileSet(g['shp'], g['dbf'] || null, prjText, base);
  });

  // Return array for multi-layer, single object for single layer
  return results.length === 1 ? results[0] : results;
}