import React, { useState } from 'react';
import { Trash2, Edit2, Check, X, Zap, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CableDataTable({ cables, cableTypes, selectedCableTypeId, onSelectCableType, onDeleteCable, onUpdateCableType }) {
  const [showTypeSelect, setShowTypeSelect] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [editTypeVals, setEditTypeVals] = useState({});

  const selectedType = cableTypes.find(t => t.id === selectedCableTypeId) || cableTypes[0];

  const totalLength = cables.reduce((s, c) => s + (c.properties.length_m || 0), 0);
  const totalCost = cables.reduce((s, c) => {
    const ctype = cableTypes.find(t => t.id === c.properties.cable_type_id) || selectedType;
    return s + (c.properties.length_m || 0) * (ctype?.cost_per_m || 0);
  }, 0);

  const startEditType = (ct) => {
    setEditingTypeId(ct.id);
    setEditTypeVals({ name: ct.name, cost_per_m: ct.cost_per_m, voltage_kv: ct.voltage_kv });
  };
  const commitEditType = (ct) => {
    onUpdateCableType(ct.id, { ...ct, ...editTypeVals });
    setEditingTypeId(null);
  };

  return (
    <div className="space-y-3">
      {/* Cable type selector */}
      <div className="bg-slate-800/60 rounded-xl p-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Active Cable Type</p>
        <button
          onClick={() => setShowTypeSelect(s => !s)}
          className="w-full flex items-center gap-2 bg-slate-700 hover:bg-slate-600 rounded-lg px-3 py-2 text-left transition-colors"
        >
          <div className="w-3 h-3 rounded shrink-0" style={{ background: selectedType?.color }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{selectedType?.name}</p>
            <p className="text-[10px] text-slate-400">{selectedType?.voltage_kv}kV · £{selectedType?.cost_per_m}/m · {selectedType?.type}</p>
          </div>
          <ChevronDown className={cn("w-3 h-3 text-slate-400 transition-transform shrink-0", showTypeSelect && "rotate-180")} />
        </button>

        {showTypeSelect && (
          <div className="mt-2 space-y-1">
            {cableTypes.map(ct => (
              <div key={ct.id} className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors",
                ct.id === selectedCableTypeId ? "bg-orange-500/20 border border-orange-500/30" : "bg-slate-700/50"
              )}>
                {editingTypeId === ct.id ? (
                  <div className="flex-1 grid grid-cols-3 gap-1 text-[10px]">
                    <input value={editTypeVals.name} onChange={e => setEditTypeVals(v => ({ ...v, name: e.target.value }))}
                      className="col-span-2 bg-slate-600 text-white rounded px-1 py-0.5 outline-none" placeholder="Name" />
                    <input type="number" value={editTypeVals.cost_per_m} onChange={e => setEditTypeVals(v => ({ ...v, cost_per_m: +e.target.value }))}
                      className="bg-slate-600 text-white rounded px-1 py-0.5 outline-none" placeholder="£/m" />
                    <button onClick={() => commitEditType(ct)} className="p-0.5 text-emerald-400"><Check className="w-3 h-3" /></button>
                    <button onClick={() => setEditingTypeId(null)} className="p-0.5 text-slate-400"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => { onSelectCableType(ct.id); setShowTypeSelect(false); }} className="flex items-center gap-2 flex-1 text-left">
                      <div className="w-3 h-3 rounded shrink-0" style={{ background: ct.color }} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{ct.name}</p>
                        <p className="text-[10px] text-slate-400">{ct.voltage_kv}kV · <span className="text-orange-400 font-semibold">£{ct.cost_per_m}/m</span> · {ct.type}</p>
                      </div>
                    </button>
                    <button onClick={() => startEditType(ct)} className="p-0.5 text-slate-500 hover:text-white shrink-0"><Edit2 className="w-3 h-3" /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {cables.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { l: 'Routes', v: cables.length, c: 'text-white' },
            { l: 'Total Length', v: `${(totalLength / 1000).toFixed(2)} km`, c: 'text-orange-400' },
            { l: 'Est. Cost', v: `£${(totalCost / 1000).toFixed(0)}k`, c: 'text-yellow-400' },
            { l: 'Avg Length', v: cables.length > 0 ? `${(totalLength / cables.length / 1000).toFixed(2)} km` : '—', c: 'text-slate-300' },
          ].map(({ l, v, c }) => (
            <div key={l} className="bg-slate-800/60 rounded-lg p-2 text-center">
              <p className={cn("text-xs font-bold", c)}>{v}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      )}

      {cables.length === 0 && (
        <div className="text-center py-8 text-slate-600 text-xs">
          <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No cable routes drawn yet.<br />Select "Draw Cable" and click two points on the map.
        </div>
      )}

      <div className="space-y-1">
        {cables.map((c, i) => {
          const ctype = cableTypes.find(t => t.id === c.properties.cable_type_id) || selectedType;
          const len = c.properties.length_m || 0;
          const cost = len * (ctype?.cost_per_m || 0);
          return (
            <div key={c.id} className="bg-slate-800/50 border border-slate-700 rounded-lg px-2.5 py-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded shrink-0" style={{ background: ctype?.color || '#f97316' }} />
                  <span className="text-xs font-semibold text-white">{c.properties.name || `Cable ${i + 1}`}</span>
                </div>
                <button onClick={() => onDeleteCable(c.id)} className="p-0.5 text-slate-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                <span className="text-slate-500">Type: <span className="text-slate-300">{ctype?.name || '—'}</span></span>
                <span className="text-slate-500">Length: <span className="text-orange-400">{(len / 1000).toFixed(2)} km</span></span>
                <span className="text-slate-500">Voltage: <span className="text-slate-300">{ctype?.voltage_kv}kV</span></span>
                <span className="text-slate-500">Cost: <span className="text-yellow-400">£{cost.toFixed(0)}</span></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}