import React, { useState, useEffect } from 'react';
import { X, Trash2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PointMenu({ feature, layer, layers, onApply, onDelete, onClose }) {
  const p = feature?.properties || {};
  const [name, setName] = useState(p.name || '');
  const [notes, setNotes] = useState(p.notes || '');
  const [setbackM, setSetbackM] = useState(p.setback_m || '');
  const [targetLayerId, setTargetLayerId] = useState(layer?.id || '');

  useEffect(() => {
    const p = feature?.properties || {};
    setName(p.name || '');
    setNotes(p.notes || '');
    setSetbackM(p.setback_m || '');
    setTargetLayerId(layer?.id || '');
  }, [feature?.id, layer?.id]);

  if (!feature) return null;

  const [lng, lat] = feature.geometry?.coordinates || [0, 0];

  // All metadata fields not in our managed set
  const extraFields = Object.entries(p).filter(([k]) =>
    !['name', 'notes', 'setback_m', '_featureType', 'layerId'].includes(k)
  );

  const pointLayers = layers?.filter(l => l.type === 'point') || [];

  const handleApply = () => {
    onApply({
      name,
      notes,
      setback_m: setbackM !== '' ? parseFloat(setbackM) || null : null,
      layerId: targetLayerId,
    });
  };

  return (
    <div className="absolute top-14 left-4 z-[1200] bg-slate-900 border border-purple-500/40 rounded-xl shadow-2xl p-4 w-72">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-purple-400 uppercase tracking-wider font-medium flex items-center gap-1">
          <MapPin className="w-3 h-3" /> Point Feature
        </span>
        <button onClick={onClose} className="text-slate-500 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Name */}
      <div className="mb-2">
        <label className="text-[10px] text-slate-400 block mb-0.5">Name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-purple-500/60"
          placeholder="Feature name"
        />
      </div>

      {/* Notes */}
      <div className="mb-2">
        <label className="text-[10px] text-slate-400 block mb-0.5">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white outline-none resize-none focus:border-purple-500/60"
          placeholder="Optional notes..."
        />
      </div>

      {/* Setback radius */}
      <div className="mb-3">
        <label className="text-[10px] text-slate-400 block mb-0.5">Setback / Buffer Radius (m)</label>
        <input
          type="number"
          value={setbackM}
          onChange={e => setSetbackM(e.target.value)}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-purple-500/60"
          placeholder="e.g. 500"
        />
        <p className="text-[9px] text-slate-600 mt-0.5">Draws a visible radius circle on the map</p>
      </div>

      {/* Layer selector */}
      {pointLayers.length > 1 && (
        <div className="mb-3">
          <label className="text-[10px] text-slate-400 block mb-0.5">Layer</label>
          <select
            value={targetLayerId}
            onChange={e => setTargetLayerId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 outline-none"
          >
            {pointLayers.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Extra metadata (read-only) */}
      {extraFields.length > 0 && (
        <div className="mb-3">
          <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">Imported Metadata</p>
          <div className="bg-slate-800/50 rounded-lg px-2 py-1.5 space-y-0.5 max-h-24 overflow-y-auto">
            {extraFields.map(([k, v]) => (
              <div key={k} className="flex gap-2 text-[9px]">
                <span className="text-slate-500 shrink-0 w-20 truncate">{k}</span>
                <span className="text-slate-300 truncate">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coordinates */}
      <p className="text-[9px] text-slate-600 mb-3">{lat.toFixed(5)}, {lng.toFixed(5)}</p>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleApply}
          className="flex-1 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-medium rounded-lg border border-purple-600/30 transition-colors"
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
    </div>
  );
}