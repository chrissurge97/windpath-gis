import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { layersToGeoJSON } from '@/lib/gisUtils';
import { reprojectGeoJSON } from '@/lib/crsUtils';
import { exportShapefile } from '@/lib/shapefileUtils';
import { exportProjectKMZ, downloadFile } from '@/lib/projectExport';
import { wgs84ToITM, wgs84ToIG } from '@/lib/crsUtils';

const FORMATS = [
  { id: 'geojson', label: 'GeoJSON', ext: 'geojson', mime: 'application/json' },
  { id: 'csv',     label: 'CSV',     ext: 'csv',     mime: 'text/csv' },
  { id: 'shapefile', label: 'Shapefile (ZIP)', ext: 'zip', mime: 'application/zip' },
  { id: 'kml',     label: 'KML',     ext: 'kml',     mime: 'application/vnd.google-earth.kml+xml' },
];

const CRS_OPTIONS = [
  { id: 'WGS84', label: 'WGS84 (EPSG:4326) — Lat/Lng' },
  { id: 'ITM',   label: 'ITM (EPSG:2157) — Irish Transverse Mercator' },
  { id: 'IG',    label: 'Irish Grid (EPSG:29902)' },
];

function layersToCSV(layers, crs) {
  const rows = [['layer','feature_id','name','geometry_type','x','y','notes'].join(',')];
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  for (const layer of layers) {
    for (const f of layer.features) {
      const g = f.geometry;
      let rawX = '', rawY = '';
      if (g.type === 'Point') { [rawX, rawY] = g.coordinates; }
      else if (g.type === 'Polygon') { [rawX, rawY] = g.coordinates[0][0]; }
      else if (g.type === 'LineString') { [rawX, rawY] = g.coordinates[0]; }
      // rawX = lng, rawY = lat (WGS84 internal storage)
      let x = rawX, y = rawY;
      if (crs === 'ITM') {
        const r = wgs84ToITM(rawY, rawX); x = r.easting; y = r.northing;
      } else if (crs === 'IG') {
        const r = wgs84ToIG(rawY, rawX); x = r.easting; y = r.northing;
      }
      rows.push([esc(layer.name), esc(f.id), esc(f.properties?.name || ''), esc(g.type), esc(x), esc(y), esc(f.properties?.notes || '')].join(','));
    }
  }
  return rows.join('\n');
}

export default function LayerExportModal({ layers, projectName = 'project', onClose }) {
  const [selectedLayers, setSelectedLayers] = useState(() => new Set(layers.map(l => l.id)));
  const [format, setFormat] = useState('geojson');
  const [crs, setCrs] = useState('WGS84');
  const overlayRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const h = (e) => { if (overlayRef.current && e.target === overlayRef.current) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const toggleLayer = (id) => {
    setSelectedLayers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedLayers.size === layers.length) setSelectedLayers(new Set());
    else setSelectedLayers(new Set(layers.map(l => l.id)));
  };

  const kmlUnsupported = crs !== 'WGS84' && format === 'kml';

  const doExport = async () => {
    const exportLayers = layers.filter(l => selectedLayers.has(l.id));
    if (exportLayers.length === 0) return;
    const name = projectName;

    if (format === 'kml') {
      const kml = await exportProjectKMZ({ name, layers: exportLayers });
      downloadFile(kml, `${name}.kml`, 'application/vnd.google-earth.kml+xml');
    } else if (format === 'csv') {
      // Dynamic import workaround: just inline the CRS transform
      const geojson = layersToGeoJSON(exportLayers);
      const projected = reprojectGeoJSON(geojson, crs);
      const rows = [['layer','feature_id','name','geometry_type','x','y','notes'].join(',')];
      const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      // Map projected features back to layer names
      const layerMap = {};
      for (const l of exportLayers) for (const f of l.features) layerMap[f.id] = l.name;
      for (const f of projected.features) {
        const g = f.geometry;
        let x = '', y = '';
        if (g.type === 'Point') { [x, y] = g.coordinates; }
        else if (g.type === 'Polygon') { [x, y] = g.coordinates[0][0]; }
        else if (g.type === 'LineString') { [x, y] = g.coordinates[0]; }
        rows.push([esc(layerMap[f.id] || f.properties?._layerName || ''), esc(f.id), esc(f.properties?.name || ''), esc(g.type), esc(x), esc(y), esc(f.properties?.notes || '')].join(','));
      }
      const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${name}.csv`; a.click(); URL.revokeObjectURL(url);
    } else if (format === 'shapefile') {
      const geojson = layersToGeoJSON(exportLayers);
      const projected = reprojectGeoJSON(geojson, crs);
      projected._crsName = crs;
      const zip = exportShapefile(projected, name);
      downloadFile(zip, `${name}-shapefile.zip`, 'application/zip');
    } else {
      // geojson
      const geojson = layersToGeoJSON(exportLayers);
      const projected = reprojectGeoJSON(geojson, crs);
      downloadFile(JSON.stringify(projected, null, 2), `${name}.geojson`, 'application/json');
    }
    onClose();
  };

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white">Export Layers</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">Choose layers, format and coordinate system</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Layer selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Layers</span>
              <button onClick={toggleAll} className="text-[10px] text-slate-500 hover:text-emerald-400 transition-colors">
                {selectedLayers.size === layers.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="space-y-1">
              {layers.map(l => (
                <button
                  key={l.id}
                  onClick={() => toggleLayer(l.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors text-left",
                    selectedLayers.has(l.id)
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                    selectedLayers.has(l.id) ? "bg-emerald-500 border-emerald-500" : "border-slate-600"
                  )}>
                    {selectedLayers.has(l.id) && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: l.color }} />
                  <span className="flex-1 text-xs text-slate-300 truncate">{l.name}</span>
                  <span className="text-[10px] text-slate-600 shrink-0">{l.features.length} features</span>
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-2">Format</span>
            <div className="grid grid-cols-2 gap-1.5">
              {FORMATS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-xs font-medium transition-colors text-left",
                    format === f.id
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* CRS */}
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-2">Coordinate System</span>
            <div className="space-y-1">
              {CRS_OPTIONS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCrs(c.id)}
                  disabled={format === 'kml' && c.id !== 'WGS84'}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-xs transition-colors text-left",
                    crs === c.id
                      ? "bg-purple-500/20 border-purple-500/40 text-purple-200"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500",
                    format === 'kml' && c.id !== 'WGS84' && "opacity-30 cursor-not-allowed"
                  )}
                >
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center",
                    crs === c.id ? "border-purple-400" : "border-slate-600"
                  )}>
                    {crs === c.id && <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                  </div>
                  {c.label}
                </button>
              ))}
            </div>
            {format === 'kml' && (
              <p className="text-[10px] text-amber-500 mt-1.5">KML always uses WGS84.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs font-medium transition-colors hover:bg-slate-800">
            Cancel
          </button>
          <button
            onClick={doExport}
            disabled={selectedLayers.size === 0}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors",
              selectedLayers.size > 0
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-slate-800 text-slate-600 cursor-not-allowed"
            )}
          >
            <Download className="w-3.5 h-3.5" />
            Export {selectedLayers.size > 0 ? `(${selectedLayers.size} layer${selectedLayers.size > 1 ? 's' : ''})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}