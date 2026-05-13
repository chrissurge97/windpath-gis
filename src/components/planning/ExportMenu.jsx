import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileJson, Map, FileText, File } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ExportMenu({ onExportGeoJSON, onExportKML, onExportPDF, onExportCSV, onExportProject }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const items = [
    { label: 'Project (GeoJSON)', desc: 'Full project with all metadata', icon: FileJson, color: 'text-cyan-400', action: onExportProject },
    { label: 'GeoJSON', desc: 'All layers — QGIS / ArcGIS compatible', icon: FileJson, color: 'text-emerald-400', action: onExportGeoJSON },
    { label: 'KML', desc: 'Google Earth / ArcGIS / QGIS', icon: Map, color: 'text-green-400', action: onExportKML },
    { label: 'CSV (per layer)', desc: 'Spreadsheet — feature attributes', icon: File, color: 'text-yellow-400', action: onExportCSV },
    { label: 'PDF Report', desc: 'Full project summary report', icon: FileText, color: 'text-purple-400', action: onExportPDF },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-slate-800 text-white border-slate-600 hover:bg-slate-700 transition-all"
      >
        <Download className="w-3 h-3" />
        Export
        <ChevronDown className={cn("w-3 h-3 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[2000] overflow-hidden">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider px-3 pt-2.5 pb-1">Export Format</p>
          {items.map(({ label, desc, icon: Icon, color, action }) => (
            <button
              key={label}
              onClick={() => { action?.(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 transition-colors text-left"
            >
              <Icon className={cn("w-4 h-4 shrink-0", color)} />
              <div>
                <p className="text-xs font-semibold text-white">{label}</p>
                <p className="text-[10px] text-slate-500">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}