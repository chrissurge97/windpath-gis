import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileJson, Map, FileText, File, Globe, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const CRS_OPTIONS = [
  { id: 'WGS84', label: 'WGS84', desc: 'EPSG:4326 — degrees lat/lng (default)' },
  { id: 'ITM',   label: 'ITM',   desc: 'EPSG:2157 — Irish Transverse Mercator (metres)' },
  { id: 'IG',    label: 'IG',    desc: 'EPSG:29902 — Irish Grid / TM65 (metres)' },
];

export default function ExportMenu({
  onExportGeoJSON, onExportKML, onExportPDF, onExportCSV, onExportProject,
  onExportShapefile,
}) {
  const [open, setOpen] = useState(false);
  const [crs, setCrs] = useState('WGS84');
  const [showCrs, setShowCrs] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const items = [
    { label: 'Project (GeoJSON)', desc: 'Full project with all metadata', icon: FileJson, color: 'text-cyan-400', action: () => onExportProject?.(crs), hasCrs: true },
    { label: 'GeoJSON', desc: 'All layers — QGIS / ArcGIS compatible', icon: FileJson, color: 'text-emerald-400', action: () => onExportGeoJSON?.(crs), hasCrs: true },
    { label: 'Shapefile (.zip)', desc: 'ESRI Shapefile — GIS software', icon: File, color: 'text-blue-400', action: () => onExportShapefile?.(crs), hasCrs: true },
    { label: 'KML', desc: 'Google Earth / ArcGIS / QGIS', icon: Map, color: 'text-green-400', action: () => onExportKML?.(crs), hasCrs: false },
    { label: 'CSV (per layer)', desc: 'Spreadsheet — feature attributes', icon: File, color: 'text-yellow-400', action: () => onExportCSV?.(crs), hasCrs: true },
    { label: 'PDF Report', desc: 'Full project summary report', icon: FileText, color: 'text-purple-400', action: () => onExportPDF?.(), hasCrs: false },
  ];

  const selectedCrs = CRS_OPTIONS.find(c => c.id === crs);

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
        <div className="absolute top-full right-0 mt-1 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[2000] overflow-hidden">

          {/* CRS selector */}
          <div className="border-b border-slate-700 px-3 pt-2.5 pb-2">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Globe className="w-3 h-3" /> Coordinate System
            </p>
            <button
              onClick={() => setShowCrs(v => !v)}
              className="w-full flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 hover:bg-slate-700 transition-colors"
            >
              <div>
                <span className="text-xs font-semibold text-white">{selectedCrs.label}</span>
                <span className="text-[10px] text-slate-400 ml-2">{selectedCrs.desc}</span>
              </div>
              <ChevronRight className={cn("w-3 h-3 text-slate-500 transition-transform shrink-0", showCrs && "rotate-90")} />
            </button>
            {showCrs && (
              <div className="mt-1.5 space-y-1">
                {CRS_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setCrs(opt.id); setShowCrs(false); }}
                    className={cn(
                      "w-full flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors",
                      opt.id === crs ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-slate-800/60 hover:bg-slate-700"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full mt-1 shrink-0", opt.id === crs ? "bg-emerald-400" : "bg-slate-600")} />
                    <div>
                      <p className="text-xs font-semibold text-white">{opt.label}</p>
                      <p className="text-[10px] text-slate-400">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-[9px] text-slate-500 uppercase tracking-wider px-3 pt-2 pb-1">Format</p>
          {items.map(({ label, desc, icon: Icon, color, action, hasCrs }) => (
            <button
              key={label}
              onClick={() => { action(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 transition-colors text-left"
            >
              <Icon className={cn("w-4 h-4 shrink-0", color)} />
              <div className="flex-1">
                <p className="text-xs font-semibold text-white">{label}</p>
                <p className="text-[10px] text-slate-500">{desc}</p>
              </div>
              {hasCrs && crs !== 'WGS84' && (
                <span className="text-[9px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  {crs}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}