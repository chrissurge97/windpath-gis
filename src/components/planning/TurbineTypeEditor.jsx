import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const FIELDS = [
  { key: 'manufacturer', label: 'Manufacturer', type: 'text' },
  { key: 'model', label: 'Model', type: 'text' },
  { key: 'rated_power_mw', label: 'Rated Power (MW)', type: 'number', step: 0.1 },
  { key: 'rotor_diameter_m', label: 'Rotor Diameter (m)', type: 'number', step: 1 },
  { key: 'hub_height_m', label: 'Hub Height (m)', type: 'number', step: 1 },
  { key: 'cut_in_ms', label: 'Cut-in (m/s)', type: 'number', step: 0.5 },
  { key: 'rated_ms', label: 'Rated speed (m/s)', type: 'number', step: 0.5 },
  { key: 'cut_out_ms', label: 'Cut-out (m/s)', type: 'number', step: 1 },
  { key: 'color', label: 'Colour', type: 'color' },
];

export default function TurbineTypeEditor({ turbineTypes, onUpdate, onAdd, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [editVals, setEditVals] = useState({});
  const [addingNew, setAddingNew] = useState(false);
  const [newVals, setNewVals] = useState({
    manufacturer: '', model: '', rated_power_mw: 4.0, rotor_diameter_m: 130,
    hub_height_m: 110, cut_in_ms: 3, rated_ms: 12, cut_out_ms: 25, color: '#10b981',
  });

  const startEdit = (tt) => { setEditingId(tt.id); setEditVals({ ...tt }); };
  const commitEdit = () => { onUpdate(editingId, editVals); setEditingId(null); };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Turbine Types Library</p>
        <button onClick={() => setAddingNew(true)} className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300">
          <Plus className="w-3 h-3" /> Add Type
        </button>
      </div>

      {addingNew && (
        <div className="bg-slate-800 border border-emerald-500/30 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-white">New Turbine Type</p>
          <div className="grid grid-cols-2 gap-2">
            {FIELDS.map(f => (
              <div key={f.key} className={cn("flex flex-col gap-0.5", f.type === 'text' && 'col-span-2')}>
                <label className="text-[10px] text-slate-500">{f.label}</label>
                {f.type === 'color' ? (
                  <input type="color" value={newVals[f.key]} onChange={e => setNewVals(v => ({ ...v, [f.key]: e.target.value }))}
                    className="w-8 h-6 rounded cursor-pointer border-0 bg-transparent" />
                ) : (
                  <input type={f.type} step={f.step} value={newVals[f.key]} onChange={e => setNewVals(v => ({ ...v, [f.key]: f.type === 'number' ? +e.target.value : e.target.value }))}
                    className="bg-slate-700 text-white text-xs rounded px-2 py-1 outline-none border border-slate-600 focus:border-emerald-500" />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { onAdd({ ...newVals, id: crypto.randomUUID() }); setAddingNew(false); }}
              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-medium text-white transition-colors">
              Add
            </button>
            <button onClick={() => setAddingNew(false)} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {turbineTypes.map(tt => (
        <div key={tt.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: tt.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{tt.manufacturer} {tt.model}</p>
              <p className="text-[10px] text-slate-400">{tt.rated_power_mw} MW · Ø{tt.rotor_diameter_m}m · H{tt.hub_height_m}m</p>
            </div>
            <div className="flex gap-0.5 shrink-0">
              <button onClick={() => startEdit(tt)} className="p-1 text-slate-500 hover:text-white"><Edit2 className="w-3 h-3" /></button>
              <button onClick={() => onDelete(tt.id)} className="p-1 text-slate-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
          {editingId === tt.id && (
            <div className="px-3 pb-3 border-t border-slate-700 pt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {FIELDS.map(f => (
                  <div key={f.key} className={cn("flex flex-col gap-0.5", f.type === 'text' && 'col-span-2')}>
                    <label className="text-[10px] text-slate-500">{f.label}</label>
                    {f.type === 'color' ? (
                      <input type="color" value={editVals[f.key]} onChange={e => setEditVals(v => ({ ...v, [f.key]: e.target.value }))}
                        className="w-8 h-6 rounded cursor-pointer border-0 bg-transparent" />
                    ) : (
                      <input type={f.type} step={f.step} value={editVals[f.key]} onChange={e => setEditVals(v => ({ ...v, [f.key]: f.type === 'number' ? +e.target.value : e.target.value }))}
                        className="bg-slate-700 text-white text-xs rounded px-2 py-1 outline-none border border-slate-600 focus:border-emerald-500" />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={commitEdit} className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-medium text-white flex items-center justify-center gap-1">
                  <Check className="w-3 h-3" /> Save
                </button>
                <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-slate-700 rounded-lg text-xs text-slate-400 flex items-center gap-1">
                  <X className="w-3 h-3" /> Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}