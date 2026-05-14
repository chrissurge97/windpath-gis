import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const FIELDS = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'voltage_kv', label: 'Voltage (kV)', type: 'number' },
  { key: 'cross_section_mm2', label: 'Cross Section (mm²)', type: 'number' },
  { key: 'ampacity_a', label: 'Ampacity (A)', type: 'number' },
  { key: 'resistance_ohm_km', label: 'Resistance (Ω/km)', type: 'number' },
  { key: 'cost_per_m', label: 'Cost (£/m)', type: 'number' },
  { key: 'type', label: 'Type', type: 'text' },
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
          value={value || '#f97316'}
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
          className="w-full min-w-[60px] bg-slate-700 border border-orange-500/60 rounded px-1.5 py-0.5 text-white outline-none text-xs"
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

export default function CableLibraryEditor({ cableTypes, onChange }) {
  const update = (id, key, value) => {
    onChange(cableTypes.map(c => c.id === id ? { ...c, [key]: value } : c));
  };

  const addNew = () => {
    onChange([...cableTypes, {
      id: crypto.randomUUID(),
      name: 'New Cable', voltage_kv: 33, cross_section_mm2: 150,
      ampacity_a: 340, resistance_ohm_km: 0.124, cost_per_m: 120,
      type: 'underground', color: '#f97316',
    }]);
  };

  const remove = (id) => {
    if (cableTypes.length <= 1) return;
    onChange(cableTypes.filter(c => c.id !== id));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/60 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-white flex-1">Cable Library</h2>
        <span className="text-[10px] text-slate-500">{cableTypes.length} types</span>
        <button
          onClick={addNew}
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-orange-600/20 border border-orange-500/40 text-orange-400 hover:bg-orange-600/30 transition-colors"
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
            {cableTypes.map(c => (
              <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                {FIELDS.map(f => (
                  <Cell key={f.key} value={c[f.key]} type={f.type} onChange={v => update(c.id, f.key, v)} />
                ))}
                <td className="px-2 py-1.5">
                  <button onClick={() => remove(c.id)} className="text-slate-600 hover:text-red-400 transition-colors">
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