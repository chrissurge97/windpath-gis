import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { layersToGeoJSON } from '@/lib/gisUtils';
import { reprojectGeoJSON } from '@/lib/crsUtils';
import { exportShapefile } from '@/lib/shapefileUtils';
import { exportProjectKMZ, downloadFile } from '@/lib/projectExport';
import { wgs84ToITM, wgs84ToIG } from '@/lib/crsUtils';
import polygonClipping from 'polygon-clipping';

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

export default function LayerExportModal({ layers, projectName = 'project', mapRef, onClose }) {
   const [selectedLayers, setSelectedLayers] = useState(() => new Set(layers.map(l => l.id)));
   const [format, setFormat] = useState('geojson');
   const [crs, setCrs] = useState('WGS84');
   const [scope, setScope] = useState('whole'); // 'whole' or 'view'
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
    let exportLayers = layers.filter(l => selectedLayers.has(l.id));
    if (exportLayers.length === 0) return;
    const name = projectName;

    // Clip features to map bounds if "Current View" selected
    if (scope === 'view' && mapRef?.current) {
      const bounds = mapRef.current.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const minLng = sw.lng, minLat = sw.lat, maxLng = ne.lng, maxLat = ne.lat;

      // The bbox as a polygon-clipping polygon (array of rings, each ring closed)
      const bboxPoly = [[[minLng, minLat], [maxLng, minLat], [maxLng, maxLat], [minLng, maxLat], [minLng, minLat]]];

      // Ensure a ring is closed (first === last point)
      const closeRing = ring => {
        const last = ring[ring.length - 1];
        if (last[0] === ring[0][0] && last[1] === ring[0][1]) return ring;
        return [...ring, ring[0]];
      };

      // Clip a GeoJSON Polygon or MultiPolygon geometry to the bbox, returns clipped geometry or null
      function clipGeomToBbox(geom) {
        let inputPolygons; // array of polygons in polygon-clipping format: [outerRing, ...holeRings]
        if (geom.type === 'Polygon') {
          inputPolygons = [geom.coordinates.map(closeRing)];
        } else if (geom.type === 'MultiPolygon') {
          inputPolygons = geom.coordinates.map(poly => poly.map(closeRing));
        } else {
          return geom; // non-polygon types passed through
        }

        let result;
        try {
          result = polygonClipping.intersection(inputPolygons, [bboxPoly]);
        } catch {
          return null;
        }
        if (!result || result.length === 0) return null;

        if (result.length === 1) {
          return { type: 'Polygon', coordinates: result[0] };
        }
        return { type: 'MultiPolygon', coordinates: result };
      }

      exportLayers = exportLayers.map(layer => ({
        ...layer,
        features: layer.features.map(f => {
          const geom = f.geometry;
          if (!geom) return null;

          if (geom.type === 'Point') {
            const [lng, lat] = geom.coordinates;
            return bounds.contains([lat, lng]) ? f : null;
          }

          if (geom.type === 'LineString') {
            // Keep if any segment intersects the bbox
            const hasPoint = geom.coordinates.some(([lng, lat]) =>
              lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat
            );
            return hasPoint ? f : null;
          }

          if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
            const clipped = clipGeomToBbox(geom);
            if (!clipped) return null;
            return { ...f, geometry: clipped };
          }

          return f;
        }).filter(Boolean)
      }));
    }

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
      // Shapefiles require a single geometry type per file.
      // Split features by geometry type and produce one shapefile per type in a combined ZIP.
      const geojson = layersToGeoJSON(exportLayers);
      const projected = reprojectGeoJSON(geojson, crs);
      projected._crsName = crs;

      const byType = { Point: [], LineString: [], Polygon: [] };
      for (const f of projected.features) {
        const t = f.geometry?.type;
        if (t === 'Point') byType.Point.push(f);
        else if (t === 'LineString' || t === 'MultiLineString') byType.LineString.push(f);
        else if (t === 'Polygon' || t === 'MultiPolygon') byType.Polygon.push(f);
      }

      const typeLabel = { Point: 'points', LineString: 'lines', Polygon: 'polygons' };
      const zips = Object.entries(byType)
        .filter(([, feats]) => feats.length > 0)
        .map(([type, feats]) => ({
          label: typeLabel[type],
          zip: exportShapefile({ ...projected, features: feats }, `${name}_${typeLabel[type]}`),
        }));

      if (zips.length === 1) {
        // Only one geometry type — export as single zip
        downloadFile(zips[0].zip, `${name}-shapefile.zip`, 'application/zip');
      } else {
        // Multiple types — download each separately
        for (const { label, zip } of zips) {
          downloadFile(zip, `${name}-${label}.zip`, 'application/zip');
        }
      }
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
            {format === 'shapefile' && (
              <p className="text-[10px] text-slate-500 mt-1.5">Mixed geometry layers export as separate ZIPs (one per geometry type).</p>
            )}
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

          {/* Export scope */}
           <div>
             <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-2">Export Scope</span>
             <div className="flex gap-2">
               <button
                 onClick={() => setScope('whole')}
                 className={cn(
                   "flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-colors text-left",
                   scope === 'whole'
                     ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                     : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
                 )}
               >
                 Whole Layer
               </button>
               <button
                 onClick={() => setScope('view')}
                 disabled={!mapRef?.current}
                 className={cn(
                   "flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-colors text-left",
                   scope === 'view'
                     ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                     : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500",
                   !mapRef?.current && "opacity-50 cursor-not-allowed"
                 )}
               >
                 Current View
               </button>
             </div>
           </div>

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