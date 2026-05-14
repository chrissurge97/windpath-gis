import React, { useState } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const FIELDS = [
  { key: 'manufacturer', label: 'Manufacturer', type: 'text' },
  { key: 'model', label: 'Model', type: 'text' },
  { key: 'rated_power_mw', label: 'Rated Power (MW)', type: 'number' },
  { key: 'rotor_diameter_m', label: 'Rotor Diameter (m)', type: 'number' },
  { key: 'hub_height_m', label: 'Hub Height (m)', type: 'number' },
  { key: 'cut_in_ms', label: 'Cut-in (m/s)', type: 'number' },
  { key: 'rated_ms', label: 'Rated (m/s)', type: 'number' },
  { key: 'cut_out_ms', label: 'Cut-out (m/s)', type: 'number' },
  { key: 'color', label: 'Color', type: 'color' },
];

function Cell({ value, type, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));

  if (type === 'color') {
    return (
      <td className="px-2 py-1.5">
        <input
          type="color"
          value={value || '#10b981'}
          onChange={e => onChange(e.target.value)}
          className="w-7 h-6 rounded cursor-pointer border-0 bg-transparent"
        />
      </td>
    );
  }

  const commit = () => {
    setEditing(false);
    const v = type === 'number' ? parseFloat(draft) : draft;
    if (!isNaN(v) || type === 'text') onChange(v);
  };

  return (
    <td className="px-2 py-1.5">
      {editing ? (
        <input
          autoFocus
          type={type}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          className="w-full min-w-[60px] bg-slate-700 border border-emerald-500/60 rounded px-1.5 py-0.5 text-white outline-none text-xs"
        />
      ) : (
        <span
          onClick={() => { setDraft(String(value ?? '')); setEditing(true); }}
          className="cursor-pointer hover:bg-slate-700/60 rounded px-1 py-0.5 text-xs text-slate-300 group inline-flex items-center gap-1"
        >
          {value ?? <span className="text-slate-600 italic">—</span>}
          <span className="opacity-0 group-hover:opacity-40 text-[9px] text-slate-400">✎</span>
        </span>
      )}
    </td>
  );
}

export default function TurbineLibraryEditor({ turbineTypes, onChange }) {
  const update = (id, key, value) => {
    onChange(turbineTypes.map(t => t.id === id ? { ...t, [key]: value } : t));
  };

  const addNew = () => {
    onChange([...turbineTypes, {
      id: crypto.randomUUID(),
      manufacturer: 'New', model: 'Custom', rated_power_mw: 3.5,
      rotor_diameter_m: 130, hub_height_m: 100, cut_in_ms: 3,
      rated_ms: 12, cut_out_ms: 25, color: '#10b981',
    }]);
  };

  const remove = (id) => {
    if (turbineTypes.length <= 1) return;
    onChange(turbineTypes.filter(t => t.id !== id));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/60 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-white flex-1">Turbine Library</h2>
        <span className="text-[10px] text-slate-500">{turbineTypes.length} types</span>
        <button
          onClick={addNew}
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/30 transition-colors"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead className="bg-slate-800/80 border-b border-slate-700">
            <tr>
              {FIELDS.map(f => (
                <th key={f.key} className="px-2 py-2 text-left font-medium text-slate-400">{f.label}</th>
              ))}
              <th className="px-2 py-2 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {turbineTypes.map(t => (
              <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                {FIELDS.map(f => (
                  <Cell key={f.key} value={t[f.key]} type={f.type} onChange={v => update(t.id, f.key, v)} />
                ))}
                <td className="px-2 py-1.5">
                  <button onClick={() => remove(t.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}