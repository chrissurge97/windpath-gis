import React, { useRef, useState } from 'react';
import { Upload, Download } from 'lucide-react';
import { geoJSONToLayer } from '@/lib/gisUtils';
import LayerExportModal from '@/components/planning/LayerExportModal';

export default function LayerImportExport({ layers, onAddLayer, projectName = 'project', mapRef }) {
   const fileRef = useRef(null);
   const [showExport, setShowExport] = useState(false);

  const handleImport = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const name = file.name.replace(/\.[^.]+$/, '');
        if (file.name.endsWith('.csv')) {
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
          onAddLayer({ id: crypto.randomUUID(), name, type: 'polygon', visible: true, color: '#8b5cf6', fillOpacity: 0.2, strokeOpacity: 0.8, strokeWeight: 2, no_turbines: false, features });
        } else {
          const data = JSON.parse(text);
          onAddLayer(geoJSONToLayer(data, name));
        }
      } catch (err) { alert('Could not parse file: ' + err.message); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition-colors"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          Import Layer
        </button>
        <input ref={fileRef} type="file" accept=".json,.geojson,.csv" className="hidden" onChange={handleImport} />

        <button
          onClick={() => setShowExport(true)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          Export Layers
        </button>
      </div>

      {showExport && (
        <LayerExportModal
          layers={layers}
          projectName={projectName}
          mapRef={mapRef}
          onClose={() => setShowExport(false)}
        />
      )}
    </>
  );
}