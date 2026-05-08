import React, { useState } from 'react';
import { Trash2, Edit2, Check, X, Wind, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TurbineDataTable({ turbines, turbineTypes, selectedTypeId, onSelectType, onDeleteTurbine, onUpdateTurbine, turbineLayer, onFlyTo }) {
  const [editingId, setEditingId] = useState(null);
  const [editVals, setEditVals] = useState({});
  const [showTypeSelect, setShowTypeSelect] = useState(false);

  const selectedType = turbineTypes.find(t => t.id === selectedTypeId) || turbineTypes[0];

  const startEdit = (t) => {
    setEditingId(t.id);
    setEditVals({ name: t.properties.name || '', hub_height: t.properties.hub_height || selectedType.hub_height_m });
  };
  const commitEdit = (t) => {
    onUpdateTurbine(t.id, { ...t.properties, ...editVals });
    setEditingId(null);
  };

  const totalMW = turbines.length * (selectedType?.rated_power_mw || 3.5);
  const totalAEP = turbines.reduce((s, t) => s + (t.properties.aep_mwh || 0), 0);

  return (
    <div className="space-y-3">
      {/* Turbine type selector */}
      <div className="bg-slate-800/60 rounded-xl p-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Active Turbine Type</p>
        <button
          onClick={() => setShowTypeSelect(s => !s)}
          className="w-full flex items-center gap-2 bg-slate-700 hover:bg-slate-600 rounded-lg px-3 py-2 text-left transition-colors"
        >
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: selectedType?.color }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{selectedType?.manufacturer} {selectedType?.model}</p>
            <p className="text-[10px] text-slate-400">{selectedType?.rated_power_mw} MW · {selectedType?.rotor_diameter_m}m rotor · {selectedType?.hub_height_m}m hub</p>
          </div>
          <ChevronDown className={cn("w-3 h-3 text-slate-400 transition-transform shrink-0", showTypeSelect && "rotate-180")} />
        </button>

        {showTypeSelect && (
          <div className="mt-2 space-y-1">
            {turbineTypes.map(tt => (
              <button
                key={tt.id}
                onClick={() => { onSelectType(tt.id); setShowTypeSelect(false); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                  tt.id === selectedTypeId ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-slate-700/50 hover:bg-slate-700"
                )}
              >
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: tt.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white">{tt.manufacturer} {tt.model}</p>
                  <p className="text-[10px] text-slate-400">{tt.rated_power_mw} MW · Ø{tt.rotor_diameter_m}m · H{tt.hub_height_m}m</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary row */}
      {turbines.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: 'Count', v: turbines.length, c: 'text-white' },
            { l: 'Capacity', v: `${totalMW.toFixed(1)} MW`, c: 'text-cyan-400' },
            { l: 'Total AEP', v: totalAEP > 0 ? `${(totalAEP / 1000).toFixed(1)} GWh` : '—', c: 'text-emerald-400' },
          ].map(({ l, v, c }) => (
            <div key={l} className="bg-slate-800/60 rounded-lg p-2 text-center">
              <p className={cn("text-xs font-bold", c)}>{v}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      )}

      {/* Turbine rows */}
      {turbines.length === 0 && (
        <div className="text-center py-8 text-slate-600 text-xs">
          <Wind className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No turbines placed yet.<br />Select "Place Turbine" and click the map.
        </div>
      )}

      <div className="space-y-1">
        {turbines.map((t, i) => {
          const isEditing = editingId === t.id;
          const p = t.properties;
          return (
            <div key={t.id} className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden cursor-pointer hover:border-slate-500 transition-colors" onClick={() => onFlyTo && onFlyTo(t)}>
              <div className="flex items-center gap-2 px-2.5 py-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: selectedType?.color || '#10b981' }} />
                {isEditing ? (
                  <input
                    value={editVals.name}
                    onChange={e => setEditVals(v => ({ ...v, name: e.target.value }))}
                    className="flex-1 text-xs bg-slate-700 text-white rounded px-1.5 py-0.5 outline-none min-w-0"
                  />
                ) : (
                  <span className="flex-1 text-xs font-semibold text-white truncate">{p.name || `T${i + 1}`}</span>
                )}
                <div className="flex items-center gap-0.5 shrink-0">
                  {isEditing ? (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); commitEdit(t); }} className="p-1 text-emerald-400 hover:text-emerald-300"><Check className="w-3 h-3" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="p-1 text-slate-500 hover:text-white"><X className="w-3 h-3" /></button>
                    </>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); startEdit(t); }} className="p-1 text-slate-600 hover:text-slate-300"><Edit2 className="w-3 h-3" /></button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); onDeleteTurbine(t.id); }} className="p-1 text-slate-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              {/* Data rows */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 px-2.5 pb-2 text-[10px]">
                <span className="text-slate-500">Rated Power: <span className="text-slate-300">{selectedType?.rated_power_mw} MW</span></span>
                <span className="text-slate-500">Rotor Ø: <span className="text-slate-300">{selectedType?.rotor_diameter_m}m</span></span>
                {isEditing ? (
                  <span className="text-slate-500 flex items-center gap-1">Hub H: <input
                    type="number"
                    value={editVals.hub_height}
                    onChange={e => setEditVals(v => ({ ...v, hub_height: +e.target.value }))}
                    className="w-14 bg-slate-700 text-white rounded px-1 py-0 outline-none"
                  />m</span>
                ) : (
                  <span className="text-slate-500">Hub H: <span className="text-slate-300">{p.hub_height || selectedType?.hub_height_m}m</span></span>
                )}
                <span className="text-slate-500">Elev: <span className="text-slate-300">{p.elevation_m != null ? `${p.elevation_m}m` : '—'}</span></span>
                <span className="text-slate-500">Wind 10m: <span className="text-cyan-400">{p.wind_speed_ms ? `${p.wind_speed_ms} m/s` : '—'}</span></span>
                <span className="text-slate-500">Hub wind: <span className="text-emerald-400">{p.hub_wind_speed ? `${p.hub_wind_speed} m/s` : '—'}</span></span>
                <span className="text-slate-500 col-span-2">Est. AEP: <span className="text-purple-400">{p.aep_mwh ? `${p.aep_mwh.toLocaleString()} MWh/yr` : '—'}</span></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}