import React, { useState } from 'react';
import { Trash2, Edit2, Check, X, Zap, ChevronDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// MVA capacity = √3 × voltage_kv × ampacity_a / 1000
function cableMVA(ct) {
  if (!ct) return 0;
  return +(Math.sqrt(3) * ct.voltage_kv * ct.ampacity_a / 1000).toFixed(1);
}

// Sum of rated MW for turbines assigned to this cable
function usedMW(cable, turbines) {
  const ids = cable.properties.turbine_ids || [];
  return ids.reduce((s, tid) => {
    const t = turbines.find(t => t.id === tid);
    return s + (t?.properties?.rated_power_mw || 0);
  }, 0);
}

// Used amps = usedMW × 1000 / (√3 × voltage_kv)
function usedAmps(usedMw, voltage_kv) {
  if (!voltage_kv) return 0;
  return +(usedMw * 1000 / (Math.sqrt(3) * voltage_kv)).toFixed(0);
}

export default function CableDataTable({
  cables, cableTypes, selectedCableTypeId, onSelectCableType,
  onDeleteCable, onUpdateCableType, onUpdateCable, turbines = []
}) {
  const [showTypeSelect, setShowTypeSelect] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [editTypeVals, setEditTypeVals] = useState({});
  const [expandedCableId, setExpandedCableId] = useState(null);

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

  const toggleTurbine = (cable, turbineId) => {
    const ids = cable.properties.turbine_ids || [];
    const newIds = ids.includes(turbineId) ? ids.filter(i => i !== turbineId) : [...ids, turbineId];
    onUpdateCable(cable.id, { ...cable.properties, turbine_ids: newIds });
  };

  const changeCableType = (cable, newTypeId) => {
    onUpdateCable(cable.id, { ...cable.properties, cable_type_id: newTypeId });
  };

  return (
    <div className="space-y-3">
      {/* Active cable type selector */}
      <div className="bg-slate-800/60 rounded-xl p-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Active Cable Type (for new cables)</p>
        <button
          onClick={() => setShowTypeSelect(s => !s)}
          className="w-full flex items-center gap-2 bg-slate-700 hover:bg-slate-600 rounded-lg px-3 py-2 text-left transition-colors"
        >
          <div className="w-3 h-3 rounded shrink-0" style={{ background: selectedType?.color }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{selectedType?.name}</p>
            <p className="text-[10px] text-slate-400">
              {selectedType?.voltage_kv}kV · {selectedType?.ampacity_a}A · {cableMVA(selectedType)} MVA · £{selectedType?.cost_per_m}/m
            </p>
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
                        <p className="text-[10px] text-slate-400">
                          {ct.voltage_kv}kV · <span className="text-cyan-400">{ct.ampacity_a}A</span> · <span className="text-purple-400">{cableMVA(ct)} MVA</span> · <span className="text-orange-400 font-semibold">£{ct.cost_per_m}/m</span>
                        </p>
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
          No cable routes drawn yet.<br />Select "Draw Cable" and click points on the map.
        </div>
      )}

      {/* Cable list */}
      <div className="space-y-2">
        {cables.map((c, i) => {
          const ctype = cableTypes.find(t => t.id === c.properties.cable_type_id) || selectedType;
          const len = c.properties.length_m || 0;
          const cost = len * (ctype?.cost_per_m || 0);
          const capacityMVA = cableMVA(ctype);
          const capacityA = ctype?.ampacity_a || 0;
          const usedMw = usedMW(c, turbines);
          const usedA = usedAmps(usedMw, ctype?.voltage_kv);
          const loadPct = capacityA > 0 ? (usedA / capacityA) * 100 : 0;
          const isOverloaded = usedMw > 0 && usedA > capacityA;
          const isExpanded = expandedCableId === c.id;
          const assignedTurbines = (c.properties.turbine_ids || []).map(tid => turbines.find(t => t.id === tid)).filter(Boolean);

          return (
            <div key={c.id} className={cn(
              "border rounded-lg overflow-hidden",
              isOverloaded ? "border-red-500/50 bg-red-500/5" : "border-slate-700 bg-slate-800/50"
            )}>
              {/* Header row */}
              <div className="flex items-center gap-2 px-2.5 py-2">
                <div className="w-2 h-2 rounded shrink-0" style={{ background: ctype?.color || '#f97316' }} />
                <span className="text-xs font-semibold text-white flex-1 truncate">{c.properties.name || `Cable ${i + 1}`}</span>
                {isOverloaded && <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                {usedMw > 0 && !isOverloaded && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                <button onClick={() => setExpandedCableId(isExpanded ? null : c.id)}
                  className="p-0.5 text-slate-500 hover:text-white">
                  <ChevronDown className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
                </button>
                <button onClick={() => onDeleteCable(c.id)} className="p-0.5 text-slate-600 hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-x-2 px-2.5 pb-2 text-[10px]">
                <span className="text-slate-500">Length: <span className="text-orange-400">{(len / 1000).toFixed(2)} km</span></span>
                <span className="text-slate-500">Cost: <span className="text-yellow-400">£{cost.toFixed(0)}</span></span>
                <span className="text-slate-500">Capacity: <span className="text-cyan-400">{capacityA}A</span> / <span className="text-purple-400">{capacityMVA} MVA</span></span>
                <span className="text-slate-500">Used: <span className={cn(isOverloaded ? "text-red-400 font-bold" : "text-emerald-400")}>{usedA}A ({usedMw.toFixed(1)} MW)</span></span>
              </div>

              {/* Load bar */}
              {usedMw > 0 && (
                <div className="px-2.5 pb-2">
                  <div className="flex justify-between text-[9px] mb-0.5">
                    <span className="text-slate-600">Load</span>
                    <span className={isOverloaded ? "text-red-400 font-bold" : "text-slate-400"}>{loadPct.toFixed(0)}%{isOverloaded ? ' ⚠ OVERLOADED' : ''}</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", isOverloaded ? "bg-red-500" : loadPct > 80 ? "bg-amber-400" : "bg-emerald-500")}
                      style={{ width: `${Math.min(100, loadPct)}%` }} />
                  </div>
                </div>
              )}

              {/* Expanded panel */}
              {isExpanded && (
                <div className="border-t border-slate-700 px-2.5 py-2 space-y-2">
                  {/* Change cable type */}
                  <div>
                    <p className="text-[9px] text-slate-500 mb-1 uppercase tracking-wider">Cable Type</p>
                    <select
                      value={c.properties.cable_type_id || selectedCableTypeId}
                      onChange={e => changeCableType(c, e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 text-white text-[10px] rounded px-2 py-1 outline-none"
                    >
                      {cableTypes.map(ct => (
                        <option key={ct.id} value={ct.id}>{ct.name} — {ct.ampacity_a}A / {cableMVA(ct)} MVA</option>
                      ))}
                    </select>
                  </div>

                  {/* Assign turbines */}
                  <div>
                    <p className="text-[9px] text-slate-500 mb-1 uppercase tracking-wider">Assign Turbines</p>
                    {turbines.length === 0 ? (
                      <p className="text-[10px] text-slate-600">No turbines placed yet.</p>
                    ) : (
                      <div className="space-y-0.5 max-h-32 overflow-y-auto">
                        {turbines.map(t => {
                          const checked = (c.properties.turbine_ids || []).includes(t.id);
                          return (
                            <label key={t.id} className={cn(
                              "flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-[10px] transition-colors",
                              checked ? "bg-emerald-500/10 text-emerald-300" : "hover:bg-slate-700 text-slate-400"
                            )}>
                              <input type="checkbox" checked={checked} onChange={() => toggleTurbine(c, t.id)}
                                className="accent-emerald-500 w-3 h-3 shrink-0" />
                              <span className="font-medium">{t.properties.name}</span>
                              <span className="ml-auto text-slate-500">{t.properties.rated_power_mw} MW</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {assignedTurbines.length > 0 && (
                      <p className="text-[9px] text-slate-500 mt-1">
                        {assignedTurbines.length} turbine{assignedTurbines.length !== 1 ? 's' : ''} · {usedMw.toFixed(1)} MW total
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}