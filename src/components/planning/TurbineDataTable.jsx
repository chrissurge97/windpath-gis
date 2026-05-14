import React, { useState } from 'react';
import { Trash2, Edit2, Check, X, Wind, Eye, EyeOff, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import TurbineRadiiEditor from '@/components/planning/TurbineRadiiEditor';
import { getRadiusMetres } from '@/components/planning/TurbineRadiiOverlay';

export default function TurbineDataTable({ turbines, turbineTypes, onDeleteTurbine, onUpdateTurbine, onFlyTo, globalRadii, onRadiiChange, showRadii, onToggleRadii }) {
  const [editingId, setEditingId] = useState(null);
  const [editVals, setEditVals] = useState({});
  const [showRadiiConfig, setShowRadiiConfig] = useState(false);

  const startEdit = (t) => {
    const tt = turbineTypes.find(ty => ty.id === t.properties.turbine_type_id) || turbineTypes[0];
    setEditingId(t.id);
    setEditVals({ name: t.properties.name || '', hub_height: t.properties.hub_height || tt?.hub_height_m });
  };
  const commitEdit = (t) => {
    onUpdateTurbine(t.id, { ...t.properties, ...editVals });
    setEditingId(null);
  };

  const totalMW = turbines.reduce((s, t) => {
    const tt = turbineTypes.find(ty => ty.id === t.properties.turbine_type_id) || turbineTypes[0];
    return s + (tt?.rated_power_mw || 0);
  }, 0);
  const totalAEP = turbines.reduce((s, t) => s + (t.properties.aep_mwh || 0), 0);

  // Enabled radii from global config
  const enabledRadii = (globalRadii || []).filter(r => r.enabled);

  return (
    <div className="space-y-3">
      {/* Setback Config + Visibility row */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowRadiiConfig(v => !v)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-medium border transition-colors",
            showRadiiConfig
              ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
              : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
          )}
        >
          <SlidersHorizontal className="w-3 h-3" />
          Turbine Setback Config
        </button>
        <button
          onClick={onToggleRadii}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-colors shrink-0",
            showRadii
              ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-300"
              : "bg-slate-800 border-slate-700 text-slate-500 hover:text-white"
          )}
          title={showRadii ? "Hide radii on map" : "Show radii on map"}
        >
          {showRadii ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {showRadii ? "Visible" : "Hidden"}
        </button>
      </div>

      {/* Radii config panel */}
      {showRadiiConfig && globalRadii && (
        <div className="bg-slate-800/60 border border-purple-500/20 rounded-xl p-3">
          <p className="text-[10px] text-slate-400 mb-2">
            These setbacks apply globally. Individual turbines use their own type's rotor diameter.
          </p>
          <TurbineRadiiEditor
            radii={globalRadii}
            onChange={onRadiiChange}
          />
        </div>
      )}

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
          const tt = turbineTypes.find(ty => ty.id === p.turbine_type_id) || turbineTypes[0];
          const rotorD = tt?.rotor_diameter_m || 130;

          return (
            <div key={t.id} className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden cursor-pointer hover:border-slate-500 transition-colors" onClick={() => onFlyTo && onFlyTo(t)}>
              <div className="flex items-center gap-2 px-2.5 py-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: tt?.color || '#10b981' }} />
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
                <span className="text-slate-500">Type: <span className="text-slate-300">{tt ? `${tt.manufacturer} ${tt.model}` : '—'}</span></span>
                <span className="text-slate-500">Power: <span className="text-slate-300">{tt?.rated_power_mw ?? '—'} MW</span></span>
                <span className="text-slate-500">Rotor Ø: <span className="text-slate-300">{tt?.rotor_diameter_m ?? '—'}m</span></span>
                {isEditing ? (
                  <span className="text-slate-500 flex items-center gap-1">Hub H: <input
                    type="number"
                    value={editVals.hub_height}
                    onChange={e => setEditVals(v => ({ ...v, hub_height: +e.target.value }))}
                    className="w-14 bg-slate-700 text-white rounded px-1 py-0 outline-none"
                  />m</span>
                ) : (
                  <span className="text-slate-500">Hub H: <span className="text-slate-300">{p.hub_height || tt?.hub_height_m || '—'}m</span></span>
                )}
                <span className="text-slate-500">Elev: <span className="text-slate-300">{p.elevation_m != null ? `${p.elevation_m}m` : '—'}</span></span>
                <span className="text-slate-500">Wind 10m: <span className="text-cyan-400">{p.wind_speed_ms ? `${p.wind_speed_ms} m/s` : '—'}</span></span>
                <span className="text-slate-500">Hub wind: <span className="text-emerald-400">{p.hub_wind_speed ? `${p.hub_wind_speed} m/s` : '—'}</span></span>
                <span className="text-slate-500 col-span-2">Est. AEP: <span className="text-purple-400">{p.aep_mwh ? `${p.aep_mwh.toLocaleString()} MWh/yr` : '—'}</span></span>
              </div>

              {/* Setback radii badges */}
              {enabledRadii.length > 0 && (
                <div className="flex flex-wrap gap-1 px-2.5 pb-2">
                  {enabledRadii.map(r => {
                    const radiusM = getRadiusMetres(rotorD, r.dMultiple);
                    return (
                      <span
                        key={r.id}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border"
                        style={{ borderColor: r.color + '60', background: r.color + '18', color: r.color }}
                      >
                        {r.label}: {radiusM >= 1000 ? `${(radiusM / 1000).toFixed(2)} km` : `${Math.round(radiusM)} m`}
                        {r.blockPlacement && <span className="opacity-60">⛔</span>}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}