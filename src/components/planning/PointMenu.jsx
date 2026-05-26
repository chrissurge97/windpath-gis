import React, { useState, useEffect } from 'react';
import { X, Trash2, MapPin, PlusCircle } from 'lucide-react';

const DEFAULT_RADIUS_COLORS = ['#06b6d4', '#f97316', '#ef4444', '#a855f7', '#10b981'];

function makeRadius(idx) {
  return { id: `r${Date.now()}_${idx}`, label: `Radius ${idx + 1}`, radiusM: 500, color: DEFAULT_RADIUS_COLORS[idx % DEFAULT_RADIUS_COLORS.length], blockPlacement: false };
}

export default function PointMenu({ feature, layer, layers, onApply, onDelete, onClose }) {
  const p = feature?.properties || {};
  const [name, setName] = useState(p.name || '');
  const [notes, setNotes] = useState(p.notes || '');
  const [noTurbines, setNoTurbines] = useState(p.no_turbines || false);
  const [targetLayerId, setTargetLayerId] = useState(layer?.id || '');
  const [radii, setRadii] = useState(() => {
    if (p.radii && p.radii.length > 0) return p.radii;
    if (p.setback_m > 0) return [{ id: 'r0', label: 'Radius 1', radiusM: p.setback_m, color: '#06b6d4', blockPlacement: p.no_turbines || false }];
    return [];
  });
  const [customFields, setCustomFields] = useState(() => {
    const skip = new Set(['name', 'notes', 'setback_m', 'no_turbines', '_featureType', 'layerId', 'radii']);
    return Object.entries(p)
      .filter(([k]) => !skip.has(k))
      .map(([k, v]) => ({ key: k, value: String(v ?? '') }));
  });

  useEffect(() => {
    const p = feature?.properties || {};
    setName(p.name || '');
    setNotes(p.notes || '');
    setNoTurbines(p.no_turbines || false);
    setTargetLayerId(layer?.id || '');
    if (p.radii && p.radii.length > 0) setRadii(p.radii);
    else if (p.setback_m > 0) setRadii([{ id: 'r0', label: 'Radius 1', radiusM: p.setback_m, color: '#06b6d4', blockPlacement: p.no_turbines || false }]);
    else setRadii([]);
    const skip = new Set(['name', 'notes', 'setback_m', 'no_turbines', '_featureType', 'layerId', 'radii']);
    setCustomFields(Object.entries(p).filter(([k]) => !skip.has(k)).map(([k, v]) => ({ key: k, value: String(v ?? '') })));
  }, [feature?.id, layer?.id]);

  if (!feature) return null;
  const [lng, lat] = feature.geometry?.coordinates || [0, 0];
  const assignableLayers = layers?.filter(l => !['turbine', 'cable', 'substation', 'wind_resource'].includes(l.type)) || [];

  const addRadius = () => setRadii(prev => [...prev, makeRadius(prev.length)]);
  const updateRadius = (i, changes) => setRadii(prev => prev.map((r, idx) => idx === i ? { ...r, ...changes } : r));
  const removeRadius = (i) => setRadii(prev => prev.filter((_, idx) => idx !== i));

  const addField = () => setCustomFields(prev => [...prev, { key: `Field ${prev.length + 1}`, value: '' }]);
  const updateFieldKey = (i, key) => setCustomFields(prev => prev.map((f, idx) => idx === i ? { ...f, key } : f));
  const updateFieldValue = (i, value) => setCustomFields(prev => prev.map((f, idx) => idx === i ? { ...f, value } : f));
  const removeField = (i) => setCustomFields(prev => prev.filter((_, idx) => idx !== i));

  const handleApply = () => {
    const extra = {};
    customFields.forEach(({ key, value }) => { if (key.trim()) extra[key.trim()] = value; });
    // Back-compat: also set setback_m from first blocking radius or first radius
    const firstBlock = radii.find(r => r.blockPlacement);
    const firstAny = radii[0];
    onApply({
      name,
      notes,
      setback_m: (firstBlock || firstAny)?.radiusM || null,
      no_turbines: radii.some(r => r.blockPlacement),
      radii,
      layerId: targetLayerId,
      custom_fields: extra,
    });
  };

  return (
    <div className="absolute top-14 left-4 z-[1200] bg-slate-900 border border-purple-500/40 rounded-xl shadow-2xl p-4 w-76 max-h-[82vh] overflow-y-auto" style={{ width: 300 }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-purple-400 uppercase tracking-wider font-medium flex items-center gap-1">
          <MapPin className="w-3 h-3" /> Point Feature
        </span>
        <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      {/* Name */}
      <div className="mb-2">
        <label className="text-[10px] text-slate-400 block mb-0.5">Name</label>
        <input value={name} onChange={e => setName(e.target.value)}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-purple-500/60" placeholder="Feature name" />
      </div>

      {/* Notes */}
      <div className="mb-3">
        <label className="text-[10px] text-slate-400 block mb-0.5">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white outline-none resize-none focus:border-purple-500/60" placeholder="Optional notes..." />
      </div>

      {/* Radii */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] text-slate-400 font-medium">Buffer Radii</label>
          <button onClick={addRadius} className="flex items-center gap-0.5 text-[10px] text-slate-500 hover:text-purple-400 transition-colors">
            <PlusCircle className="w-3 h-3" /> Add
          </button>
        </div>
        {radii.length === 0 && (
          <p className="text-[9px] text-slate-600 italic">No radii. Click + to add one.</p>
        )}
        <div className="space-y-2">
          {radii.map((r, i) => (
            <div key={r.id} className="bg-slate-800/60 rounded-lg p-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <input type="color" value={r.color} onChange={e => updateRadius(i, { color: e.target.value })}
                  className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0 shrink-0" />
                <input value={r.label} onChange={e => updateRadius(i, { label: e.target.value })}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-[10px] text-white outline-none" placeholder="Label" />
                <button onClick={() => removeRadius(i)} className="text-slate-600 hover:text-red-400 shrink-0 transition-colors"><X className="w-3 h-3" /></button>
              </div>
              <div className="flex items-center gap-1.5">
                <input type="number" value={r.radiusM} min={0} onChange={e => updateRadius(i, { radiusM: parseFloat(e.target.value) || 0 })}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-[10px] text-white outline-none" placeholder="Radius (m)" />
                <span className="text-[9px] text-slate-500 shrink-0">m</span>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={r.blockPlacement} onChange={e => updateRadius(i, { blockPlacement: e.target.checked })}
                  className="accent-red-500 w-3 h-3" />
                <span className="text-[10px] text-slate-400">Block turbine placement</span>
                {r.blockPlacement && <span className="text-[9px] text-red-400 ml-auto">⛔ Active</span>}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Layer selector */}
      {assignableLayers.length > 1 && (
        <div className="mb-3">
          <label className="text-[10px] text-slate-400 block mb-0.5">Layer</label>
          <select value={targetLayerId} onChange={e => setTargetLayerId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 outline-none">
            {assignableLayers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      )}

      {/* Custom fields */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-slate-400">Custom Fields</label>
          <button onClick={addField} className="flex items-center gap-0.5 text-[10px] text-slate-500 hover:text-purple-400 transition-colors">
            <PlusCircle className="w-3 h-3" /> Add
          </button>
        </div>
        {customFields.length === 0 && <p className="text-[9px] text-slate-600 italic">No custom fields.</p>}
        <div className="space-y-1.5">
          {customFields.map((field, i) => (
            <div key={i} className="flex items-center gap-1">
              <input value={field.key} onChange={e => updateFieldKey(i, e.target.value)}
                className="w-24 bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-[10px] text-slate-300 outline-none" placeholder="Label" />
              <input value={field.value} onChange={e => updateFieldValue(i, e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-[10px] text-white outline-none" placeholder="Value" />
              <button onClick={() => removeField(i)} className="text-slate-600 hover:text-red-400 shrink-0"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[9px] text-slate-600 mb-3">{lat.toFixed(5)}, {lng.toFixed(5)}</p>

      <div className="flex gap-2">
        <button onClick={handleApply}
          className="flex-1 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-medium rounded-lg border border-purple-600/30 transition-colors">
          Apply
        </button>
        <button onClick={onDelete}
          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs rounded-lg transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}