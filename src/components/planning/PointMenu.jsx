import React, { useState, useEffect } from 'react';
import { X, Trash2, MapPin, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PointMenu({ feature, layer, layers, onApply, onDelete, onClose }) {
  const p = feature?.properties || {};
  const [name, setName] = useState(p.name || '');
  const [notes, setNotes] = useState(p.notes || '');
  const [setbackM, setSetbackM] = useState(p.setback_m || '');
  const [noTurbines, setNoTurbines] = useState(p.no_turbines || false);
  const [targetLayerId, setTargetLayerId] = useState(layer?.id || '');
  const [customFields, setCustomFields] = useState(() => {
    const skip = new Set(['name', 'notes', 'setback_m', 'no_turbines', '_featureType', 'layerId']);
    return Object.entries(p)
      .filter(([k]) => !skip.has(k))
      .map(([k, v]) => ({ key: k, value: String(v ?? '') }));
  });

  useEffect(() => {
    const p = feature?.properties || {};
    setName(p.name || '');
    setNotes(p.notes || '');
    setSetbackM(p.setback_m || '');
    setNoTurbines(p.no_turbines || false);
    setTargetLayerId(layer?.id || '');
    const skip = new Set(['name', 'notes', 'setback_m', 'no_turbines', '_featureType', 'layerId']);
    setCustomFields(
      Object.entries(p)
        .filter(([k]) => !skip.has(k))
        .map(([k, v]) => ({ key: k, value: String(v ?? '') }))
    );
  }, [feature?.id, layer?.id]);

  if (!feature) return null;

  const [lng, lat] = feature.geometry?.coordinates || [0, 0];
  // All layers that can hold points (exclude turbine/cable/substation/wind_resource)
  const assignableLayers = layers?.filter(l => !['turbine', 'cable', 'substation', 'wind_resource'].includes(l.type)) || [];

  const addField = () => setCustomFields(prev => [...prev, { key: `Field ${prev.length + 1}`, value: '' }]);
  const updateFieldKey = (i, key) => setCustomFields(prev => prev.map((f, idx) => idx === i ? { ...f, key } : f));
  const updateFieldValue = (i, value) => setCustomFields(prev => prev.map((f, idx) => idx === i ? { ...f, value } : f));
  const removeField = (i) => setCustomFields(prev => prev.filter((_, idx) => idx !== i));

  const handleApply = () => {
    const extra = {};
    customFields.forEach(({ key, value }) => { if (key.trim()) extra[key.trim()] = value; });
    onApply({
      name,
      notes,
      setback_m: setbackM !== '' ? parseFloat(setbackM) || null : null,
      no_turbines: noTurbines,
      layerId: targetLayerId,
      custom_fields: extra,
    });
  };

  return (
    <div className="absolute top-14 left-4 z-[1200] bg-slate-900 border border-purple-500/40 rounded-xl shadow-2xl p-4 w-72 max-h-[80vh] overflow-y-auto">
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
      <div className="mb-2">
        <label className="text-[10px] text-slate-400 block mb-0.5">Setback / Buffer Radius (m)</label>
        <input
          type="number"
          value={setbackM}
          onChange={e => setSetbackM(e.target.value)}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-purple-500/60"
          placeholder="e.g. 500"
        />
      </div>

      {/* Block turbine placement */}
      {(setbackM > 0 || parseFloat(setbackM) > 0) && (
        <div className="mb-3 flex items-center gap-2 bg-slate-800/60 rounded-lg px-2.5 py-2">
          <input
            id="pt-no-turbines"
            type="checkbox"
            checked={noTurbines}
            onChange={e => setNoTurbines(e.target.checked)}
            className="accent-red-500 w-3.5 h-3.5 shrink-0"
          />
          <label htmlFor="pt-no-turbines" className="text-[10px] text-slate-300 cursor-pointer leading-snug">
            Block turbine placement within radius
          </label>
          {noTurbines && <span className="ml-auto text-[9px] text-red-400 font-semibold shrink-0">⛔ Active</span>}
        </div>
      )}

      {/* Layer selector — always show so user can reassign */}
      {assignableLayers.length > 1 && (
        <div className="mb-3">
          <label className="text-[10px] text-slate-400 block mb-0.5">Layer</label>
          <select
            value={targetLayerId}
            onChange={e => setTargetLayerId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 outline-none"
          >
            {assignableLayers.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Custom fields */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] text-slate-400">Custom Fields</label>
          <button
            onClick={addField}
            className="flex items-center gap-0.5 text-[10px] text-slate-500 hover:text-purple-400 transition-colors"
          >
            <PlusCircle className="w-3 h-3" /> Add Field
          </button>
        </div>
        {customFields.length === 0 && (
          <p className="text-[9px] text-slate-600 italic">No custom fields. Click "Add Field" to add one.</p>
        )}
        <div className="space-y-1.5">
          {customFields.map((field, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                value={field.key}
                onChange={e => updateFieldKey(i, e.target.value)}
                className="w-24 bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-[10px] text-slate-300 outline-none"
                placeholder="Label"
              />
              <input
                value={field.value}
                onChange={e => updateFieldValue(i, e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-[10px] text-white outline-none"
                placeholder="Value"
              />
              <button
                onClick={() => removeField(i)}
                className="text-slate-600 hover:text-red-400 shrink-0 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

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