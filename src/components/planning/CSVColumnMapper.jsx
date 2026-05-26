import React, { useState, useMemo } from 'react';
import { X, Table, MapPin, Tag, FileText, EyeOff, ChevronRight } from 'lucide-react';
import { itmToWGS84, igToWGS84 } from '@/lib/crsUtils';

const COLUMN_ROLES = [
  { id: 'lat',    label: 'Latitude',    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  { id: 'lng',    label: 'Longitude',   color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/30' },
  { id: 'name',   label: 'Name',        color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/30' },
  { id: 'notes',  label: 'Notes',       color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30' },
  { id: 'custom', label: 'Attribute',   color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30' },
  { id: 'ignore', label: 'Ignore',      color: 'text-slate-500',   bg: 'bg-slate-700/40 border-slate-600/30' },
];

const CRS_OPTIONS = [
  { id: 'WGS84', label: 'WGS84 (GPS)', hint: 'Decimal degrees, e.g. 53.3, -6.2' },
  { id: 'ITM',   label: 'ITM — Irish Transverse Mercator (EPSG:2157)', hint: 'Metres, e.g. Easting 700000, Northing 750000' },
  { id: 'IG',    label: 'Irish Grid (EPSG:29902)', hint: 'Metres, e.g. Easting 300000, Northing 230000' },
];

function guessCRS(rows, headers, latCol, lngCol) {
  if (!latCol || !lngCol) return 'WGS84';
  const latIdx = headers.indexOf(latCol);
  const lngIdx = headers.indexOf(lngCol);
  // Sample up to 5 rows
  for (const row of rows.slice(0, 5)) {
    const y = parseFloat(row[latIdx]);
    const x = parseFloat(row[lngIdx]);
    if (isNaN(y) || isNaN(x)) continue;
    // ITM: Easting 400000–800000, Northing 500000–1000000
    if (x > 400000 && x < 900000 && y > 500000 && y < 1100000) return 'ITM';
    // Irish Grid: Easting 0–400000, Northing 0–500000
    if (x >= 0 && x < 400000 && y >= 0 && y < 500000) return 'IG';
    // WGS84: lat ±90, lng ±180
    if (Math.abs(y) <= 90 && Math.abs(x) <= 180) return 'WGS84';
  }
  return 'WGS84';
}

function guessRole(header) {
  const h = header.toLowerCase().trim();
  if (/^(lat|latitude|y|northing)$/.test(h)) return 'lat';
  if (/^(lng|lon|long|longitude|x|easting)$/.test(h)) return 'lng';
  if (/^(name|title|label|id|identifier)$/.test(h)) return 'name';
  if (/^(note|notes|description|desc|comment|remarks)$/.test(h)) return 'notes';
  return 'custom';
}

function parseCSVRow(line) {
  const result = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === ',' && !inQuote) {
      result.push(cur.trim()); cur = '';
    } else { cur += ch; }
  }
  result.push(cur.trim());
  return result;
}

export default function CSVColumnMapper({ csvText, fileName, onConfirm, onCancel }) {
  const lines = useMemo(() => csvText.split('\n').filter(l => l.trim()), [csvText]);
  const headers = useMemo(() => parseCSVRow(lines[0] || ''), [lines]);
  const previewRows = useMemo(() => lines.slice(1, 6).map(l => parseCSVRow(l)), [lines]);

  const [roles, setRoles] = useState(() =>
    Object.fromEntries(headers.map(h => [h, guessRole(h)]))
  );

  const latCol  = Object.entries(roles).find(([, r]) => r === 'lat')?.[0];
  const lngCol  = Object.entries(roles).find(([, r]) => r === 'lng')?.[0];

  const allRows = useMemo(() => lines.slice(1).map(l => parseCSVRow(l)), [lines]);

  const [crs, setCrs] = useState(() => {
    const initRoles = Object.fromEntries(headers.map(h => [h, guessRole(h)]));
    const latC = Object.entries(initRoles).find(([, r]) => r === 'lat')?.[0];
    const lngC = Object.entries(initRoles).find(([, r]) => r === 'lng')?.[0];
    return guessCRS(allRows, headers, latC, lngC);
  });
  const nameCol = Object.entries(roles).find(([, r]) => r === 'name')?.[0];
  const valid   = latCol && lngCol;

  const setRole = (header, role) => {
    setRoles(prev => {
      const next = { ...prev };
      // Only one lat and one lng allowed
      if (role === 'lat') Object.keys(next).forEach(k => { if (next[k] === 'lat') next[k] = 'ignore'; });
      if (role === 'lng') Object.keys(next).forEach(k => { if (next[k] === 'lng') next[k] = 'ignore'; });
      if (role === 'name') Object.keys(next).forEach(k => { if (next[k] === 'name') next[k] = 'custom'; });
      next[header] = role;
      return next;
    });
  };

  const totalRows = lines.length - 1;

  const handleConfirm = () => {
    if (!latCol || !lngCol) return;
    const features = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = parseCSVRow(lines[i]);
      const row = Object.fromEntries(headers.map((h, j) => [h, vals[j] ?? '']));
      let lat = parseFloat(row[latCol]);
      let lng = parseFloat(row[lngCol]);
      if (isNaN(lat) || isNaN(lng)) continue;
      // Convert projected coordinates to WGS84
      if (crs === 'ITM') {
        const wgs = itmToWGS84(lng, lat); // easting=lng col, northing=lat col
        lat = wgs.lat; lng = wgs.lng;
      } else if (crs === 'IG') {
        const wgs = igToWGS84(lng, lat);
        lat = wgs.lat; lng = wgs.lng;
      }
      const name = nameCol ? (row[nameCol] || `Feature ${i}`) : `Feature ${i}`;
      const props = { name };
      for (const h of headers) {
        const role = roles[h];
        if (role === 'ignore' || role === 'lat' || role === 'lng' || role === 'name') continue;
        if (role === 'notes') { props.notes = row[h]; continue; }
        if (role === 'custom') props[h] = row[h];
      }
      features.push({
        id: `csv_${i}`,
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: props,
      });
    }
    const baseName = fileName.replace(/\.[^.]+$/, '');
    const layer = {
      id: `lyr_csv_${Date.now()}`, name: baseName, type: 'point',
      visible: true, color: '#8b5cf6', fillOpacity: 1,
      strokeOpacity: 0.9, strokeWeight: 2, no_turbines: false, features,
    };
    onConfirm(layer);
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <Table className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-white">CSV Column Mapping</h2>
              <p className="text-[11px] text-slate-400">{fileName} — {totalRows} rows, {headers.length} columns</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role legend */}
        <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-slate-800 bg-slate-900/60 shrink-0">
          {COLUMN_ROLES.map(r => (
            <span key={r.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${r.bg} ${r.color}`}>
              {r.label}
            </span>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-auto px-5 py-4">
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-slate-800/80">
                  {headers.map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-slate-300 whitespace-nowrap min-w-[120px]">
                      <div className="flex flex-col gap-1.5">
                        {/* Column header */}
                        <span className="text-slate-200 font-mono text-[10px]">{h}</span>
                        {/* Role selector */}
                        <div className="flex flex-wrap gap-1">
                          {COLUMN_ROLES.map(r => {
                            const active = roles[h] === r.id;
                            return (
                              <button
                                key={r.id}
                                onClick={() => setRole(h, r.id)}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all ${
                                  active ? `${r.bg} ${r.color}` : 'bg-slate-700/50 border-slate-600 text-slate-500 hover:text-slate-300'
                                }`}
                              >
                                {r.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/10'}>
                    {headers.map((h, hi) => {
                      const role = roles[h];
                      const roleInfo = COLUMN_ROLES.find(r => r.id === role);
                      const val = row[hi] ?? '';
                      return (
                        <td key={h} className={`px-3 py-1.5 whitespace-nowrap max-w-[160px] truncate font-mono ${
                          role === 'ignore' ? 'text-slate-600' : roleInfo?.color || 'text-slate-300'
                        }`}>
                          {val || <span className="text-slate-700 italic">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewRows.length > 0 && (
            <p className="text-[10px] text-slate-600 mt-2">Showing {previewRows.length} of {totalRows} rows</p>
          )}
        </div>

        {/* CRS selector */}
        <div className="flex items-center gap-3 px-5 py-3 border-t border-slate-800 bg-slate-900/60 shrink-0">
          <span className="text-[10px] font-semibold text-slate-400 shrink-0">Coordinate System:</span>
          <div className="flex flex-wrap gap-2">
            {CRS_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setCrs(opt.id)}
                title={opt.hint}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                  crs === opt.id
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-white hover:border-slate-500'
                }`}
              >
                {opt.id === crs && '✓ '}{opt.label}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-slate-600 hidden sm:block">{CRS_OPTIONS.find(o => o.id === crs)?.hint}</span>
        </div>

        {/* Validation / Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-700 bg-slate-900/80 shrink-0">
          <div className="text-[11px]">
            {!latCol && <span className="text-red-400 mr-3">⚠ No Latitude column assigned</span>}
            {!lngCol && <span className="text-red-400 mr-3">⚠ No Longitude column assigned</span>}
            {valid && (
              <span className="text-emerald-400">
                ✓ Ready — {crs !== 'WGS84' ? <span className="text-amber-300 font-bold">{crs} → WGS84</span> : 'WGS84'} · lat/N: <span className="font-mono font-bold">{latCol}</span>, lng/E: <span className="font-mono font-bold">{lngCol}</span>
                {nameCol && <>, name: <span className="font-mono font-bold">{nameCol}</span></>}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 py-1.5 text-xs text-slate-400 hover:text-white border border-slate-600 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!valid}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
            >
              Import <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}