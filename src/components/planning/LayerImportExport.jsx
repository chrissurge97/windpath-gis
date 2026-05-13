import React, { useRef } from 'react';
import { Upload, Download, FileJson, File } from 'lucide-react';
import { geoJSONToLayer, layersToGeoJSON, downloadJSON } from '@/lib/gisUtils';

function layersToCSV(layers) {
  // Export all features from all layers as one CSV with layer name column
  const rows = [];
  rows.push(['layer', 'feature_id', 'name', 'type', 'geometry_type', 'lat', 'lng', 'notes', 'extra'].join(','));
  for (const layer of layers) {
    for (const f of layer.features) {
      const geo = f.geometry;
      let lat = '', lng = '';
      if (geo.type === 'Point') { [lng, lat] = geo.coordinates; }
      else if (geo.type === 'Polygon') { const c = geo.coordinates[0][0]; lng = c[0]; lat = c[1]; }
      else if (geo.type === 'LineString') { const c = geo.coordinates[0]; lng = c[0]; lat = c[1]; }
      const extra = Object.entries(f.properties || {})
        .filter(([k]) => !['name','notes'].includes(k))
        .map(([k,v]) => `${k}=${v}`)
        .join('|');
      const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      rows.push([
        esc(layer.name), esc(f.id), esc(f.properties?.name || ''),
        esc(layer.type), esc(geo.type),
        esc(lat), esc(lng),
        esc(f.properties?.notes || ''), esc(extra)
      ].join(','));
    }
  }
  return rows.join('\n');
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function LayerImportExport({ layers, onAddLayer, projectName = 'project' }) {
  const fileRef = useRef(null);

  const handleImport = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const name = file.name.replace(/\.[^.]+$/, '');
        if (file.name.endsWith('.csv')) {
          // Parse CSV back to a layer
          const lines = text.split('\n').filter(Boolean);
          const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, ''));
          const features = [];
          for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].match(/("(?:[^"]|"")*"|[^,]*)/g)?.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"')) || [];
            const row = Object.fromEntries(headers.map((h, j) => [h, vals[j] || '']));
            if (!row.lat || !row.lng) continue;
            const lat = parseFloat(row.lat), lng = parseFloat(row.lng);
            if (isNaN(lat) || isNaN(lng)) continue;
            features.push({ id: crypto.randomUUID(), layerId: name, geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { name: row.name || `Feature ${i}`, notes: row.notes || '' } });
          }
          const layer = { id: crypto.randomUUID(), name, type: 'polygon', visible: true, color: '#8b5cf6', fillOpacity: 0.2, strokeOpacity: 0.8, strokeWeight: 2, no_turbines: false, features };
          onAddLayer(layer);
        } else {
          const data = JSON.parse(text);
          const layer = geoJSONToLayer(data, name);
          onAddLayer(layer);
        }
      } catch (err) { alert('Could not parse file: ' + err.message); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden mt-2">
      <p className="text-[9px] text-slate-500 uppercase tracking-wider px-3 py-2 bg-slate-800/60 border-b border-slate-700">Import / Export Layers</p>
      <div className="p-2 space-y-1.5">
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition-colors text-left"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <div>
            <p className="font-medium text-white">Import Layer</p>
            <p className="text-[9px] text-slate-500">GeoJSON, CSV, KML</p>
          </div>
        </button>
        <input ref={fileRef} type="file" accept=".json,.geojson,.csv" className="hidden" onChange={handleImport} />

        <button
          onClick={() => downloadJSON(layersToGeoJSON(layers), `${projectName}.geojson`)}
          className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition-colors text-left"
        >
          <FileJson className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <div>
            <p className="font-medium text-white">Export All → GeoJSON</p>
            <p className="text-[9px] text-slate-500">QGIS / ArcGIS compatible</p>
          </div>
        </button>

        <button
          onClick={() => downloadCSV(layersToCSV(layers), `${projectName}.csv`)}
          className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition-colors text-left"
        >
          <File className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
          <div>
            <p className="font-medium text-white">Export All → CSV</p>
            <p className="text-[9px] text-slate-500">Feature attributes spreadsheet</p>
          </div>
        </button>
      </div>
    </div>
  );
}