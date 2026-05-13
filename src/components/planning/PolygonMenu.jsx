import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#f97316', '#3b82f6', '#84cc16', '#ffffff',
];

export default function PolygonMenu({ feature, layer, onApply, onDelete, onClose, onEditVertices, layers, onChangeLayer }) {
  const [name, setName] = useState(feature?.properties?.name || '');
  const [color, setColor] = useState(layer?.color || '#06b6d4');
  const [fillOpacity, setFillOpacity] = useState(layer?.fillOpacity ?? 0.15);
  const [notes, setNotes] = useState(feature?.properties?.notes || '');
  const [noTurbines, setNoTurbines] = useState(layer?.no_turbines ?? false);
  const [selectedLayerId, setSelectedLayerId] = useState(layer?.id || '');

  useEffect(() => {
    setName(feature?.properties?.name || '');
    setColor(layer?.color || '#06b6d4');
    setFillOpacity(layer?.fillOpacity ?? 0.15);
    setNotes(feature?.properties?.notes || '');
    setNoTurbines(layer?.no_turbines ?? false);
  }, [feature?.id]);

  if (!feature || !layer) return null;

  return (
    <div className="absolute top-14 left-4 z-[1200] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 w-72">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Polygon</span>
        <button onClick={onClose} className="text-slate-500 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Zone / Layer Selection */}
      {layers && layers.length > 0 && (
        <div className="mb-3">
          <label className="text-[10px] text-slate-400 block mb-1">Zone</label>
          <select
            value={selectedLayerId}
            onChange={e => {
              const newLayerId = e.target.value;
              setSelectedLayerId(newLayerId);
              if (onChangeLayer) onChangeLayer(newLayerId);
            }}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-white outline-none"
          >
            {layers.filter(l => !['turbine', 'cable', 'substation', 'wind_resource'].includes(l.type)).map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Name */}
      <div className="mb-3">
        <label className="text-[10px] text-slate-400 block mb-1">Name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-white outline-none"
          placeholder="Polygon name"
        />
      </div>

      {/* Colour */}
      <div className="mb-3">
        <label className="text-[10px] text-slate-400 block mb-1">Colour</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{ background: c }}
              className={cn(
                'w-5 h-5 rounded-full border-2 transition-all',
                color === c ? 'border-white scale-110' : 'border-transparent'
              )}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-8 h-7 rounded cursor-pointer bg-transparent border-0"
          />
          <input
            type="text"
            value={color}
            onChange={e => setColor(e.target.value)}
            onBlur={e => {
              const v = e.target.value;
              if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v)) setColor(v);
            }}
            maxLength={7}
            className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-[11px] text-slate-200 font-mono outline-none focus:border-cyan-500"
            placeholder="#hex"
          />
        </div>
      </div>

      {/* Fill Opacity */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] mb-1">
          <label className="text-slate-400">Fill Transparency</label>
          <span className="text-cyan-400 font-medium">{Math.round(fillOpacity * 100)}%</span>
        </div>
        <input
          type="range" min={0} max={0.8} step={0.05} value={fillOpacity}
          onChange={e => setFillOpacity(parseFloat(e.target.value))}
          className="w-full accent-cyan-500 h-1"
        />
      </div>

      {/* Notes */}
      <div className="mb-3">
        <label className="text-[10px] text-slate-400 block mb-1">Notes / Data</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white outline-none resize-none"
          placeholder="Add any notes, land reference, status, area details…"
        />
      </div>

      {/* No-turbine zone toggle */}
      <div className="mb-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setNoTurbines(v => !v)}
            className={cn(
              "w-8 h-4 rounded-full transition-colors relative shrink-0",
              noTurbines ? "bg-red-500" : "bg-slate-600"
            )}
          >
            <div className={cn(
              "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform",
              noTurbines ? "translate-x-4" : "translate-x-0.5"
            )} />
          </div>
          <div>
            <span className={cn("text-xs font-semibold", noTurbines ? "text-red-400" : "text-slate-400")}>
              {noTurbines ? "⛔ No-Turbine Zone" : "Turbine Placement Allowed"}
            </span>
            <p className="text-[9px] text-slate-600 leading-tight">Blocks turbine placement within this polygon</p>
          </div>
        </label>
      </div>

      <div className="flex gap-2 mb-2">
        <button
          onClick={() => onApply({ name, color, fillOpacity, notes, no_turbines: noTurbines })}
          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors"
        >
          Apply
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {onEditVertices && (
        <div className="flex gap-2">
          <button
            onClick={onEditVertices}
            className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-600"
          >
            ✏ Edit Vertices
          </button>
          <button
            onClick={() => onEditVertices()}
            className="flex-1 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/40 text-xs font-medium rounded-lg transition-colors"
            title="Drag mode: click and drag the polygon to move it"
          >
            🖱 Move
          </button>
        </div>
      )}
    </div>
  );
}