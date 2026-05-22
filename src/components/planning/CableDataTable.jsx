import React, { useState } from 'react';
import { Trash2, Edit2, Check, X, Zap, ChevronDown, AlertTriangle, CheckCircle2, Link } from 'lucide-react';
import { cn } from '@/lib/utils';

function cableMVA(ct) {
  if (!ct) return 0;
  return +(Math.sqrt(3) * ct.voltage_kv * ct.ampacity_a / 1000).toFixed(1);
}

// Returns the cheapest cable type that can carry requiredMw at the given voltage
function cheapestViableType(cableTypes, requiredMw, voltageKv) {
  // Filter to same voltage, sort by cost ascending, pick first that fits
  const candidates = cableTypes
    .filter(ct => ct.voltage_kv === voltageKv)
    .sort((a, b) => a.cost_per_m - b.cost_per_m);
  for (const ct of candidates) {
    const capacityMw = +(Math.sqrt(3) * ct.voltage_kv * ct.ampacity_a / 1000);
    if (capacityMw >= requiredMw) return ct;
  }
  // If nothing fits, return highest capacity
  return candidates[candidates.length - 1] || cableTypes[0];
}

function calcCableLoad(cableId, cables, turbines, fromNodeId = null, visited = new Set()) {
  if (visited.has(cableId)) return 0;
  visited.add(cableId);

  const cable = cables.find(c => c.id === cableId);
  if (!cable) return 0;

  const start = cable.properties.start_node;
  const end = cable.properties.end_node;

  // If neither end is connected, no load can flow
  if (!start && !end) return 0;

  let upstreamNode = null;
  if (fromNodeId !== null) {
    if (start?.id === fromNodeId) upstreamNode = end;
    else if (end?.id === fromNodeId) upstreamNode = start;
    else return 0;
  } else {
    if (end?.type === 'substation') upstreamNode = start;
    else if (start?.type === 'substation') upstreamNode = end;
    else upstreamNode = start || end;
  }

  if (!upstreamNode) return 0;

  let total = 0;
  if (upstreamNode.type === 'turbine') {
    const t = turbines.find(t => t.id === upstreamNode.id);
    total += t?.properties?.rated_power_mw || 0;
  }

  const feedingCables = cables.filter(c =>
    c.id !== cableId && (
      c.properties.start_node?.id === upstreamNode.id ||
      c.properties.end_node?.id === upstreamNode.id
    )
  );
  for (const fc of feedingCables) {
    const load = calcCableLoad(fc.id, cables, turbines, upstreamNode.id, new Set(visited));
    total += (typeof load === 'number' ? load : 0);
  }

  return Math.max(0, Number(total) || 0);
}

export default function CableDataTable({
  cables, cableTypes, selectedCableTypeId, onSelectCableType,
  onDeleteCable, onUpdateCableType, onUpdateCable, turbines = [], substations = [], onFlyTo,
  onOptimiseCables,
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

  const changeCableType = (cable, newTypeId) => {
    onUpdateCable(cable.id, { ...cable.properties, cable_type_id: newTypeId });
  };

  const nodeLabel = (n) => {
    if (!n) return null;
    if (n.type === 'turbine') return turbines.find(t => t.id === n.id)?.properties?.name || 'Turbine';
    if (n.type === 'substation') return substations.find(s => s.id === n.id)?.properties?.name || 'Substation';
    return null;
  };

  const nodeColor = (n) => {
    if (!n) return '#64748b';
    return n.type === 'turbine' ? '#10b981' : '#facc15';
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

      {/* Optimise button */}
      {cables.length > 0 && (
        <button
          onClick={() => { onOptimiseCables(); window.__trainingEvent__ = { type: 'cables_optimised', payload: {}, ts: Date.now() }; }}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium hover:bg-emerald-600/30 transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          Optimise All Cable Sizes
        </button>
      )}

      {/* Snap hint */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg px-3 py-2 text-[10px] text-slate-500 flex items-start gap-1.5">
        <Link className="w-3 h-3 text-yellow-400 shrink-0 mt-0.5" />
        <span>Hover near a turbine or substation while drawing to <span className="text-yellow-300">snap & connect</span> automatically. Load is calculated from the connected topology.</span>
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
          const usedMw = calcCableLoad(c.id, cables, turbines);
          const usedA = ctype?.voltage_kv ? +(usedMw * 1000 / (Math.sqrt(3) * ctype.voltage_kv)).toFixed(0) : 0;
          const loadPct = capacityA > 0 ? (usedA / capacityA) * 100 : 0;
          const isOverloaded = usedMw > 0 && usedA > capacityA;
          const isExpanded = expandedCableId === c.id;
          const startN = c.properties.start_node;
          const endN = c.properties.end_node;
          const hasConnections = startN || endN;

          return (
            <div key={c.id} className={cn(
              "border rounded-lg overflow-hidden cursor-pointer hover:border-slate-500 transition-colors",
              isOverloaded ? "border-red-500/50 bg-red-500/5" : "border-slate-700 bg-slate-800/50"
            )} onClick={() => onFlyTo && onFlyTo(c)}>
              {/* Header row */}
              <div className="flex items-center gap-2 px-2.5 py-2">
                <div className="w-2 h-2 rounded shrink-0" style={{ background: ctype?.color || '#f97316' }} />
                <span className="text-xs font-semibold text-white flex-1 truncate">{c.properties.name || `Cable ${i + 1}`}</span>
                {isOverloaded && <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                {usedMw > 0 && !isOverloaded && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                {hasConnections && <Link className="w-3 h-3 text-yellow-400 shrink-0" />}
                <button onClick={(e) => { e.stopPropagation(); setExpandedCableId(isExpanded ? null : c.id); }}
                  className="p-0.5 text-slate-500 hover:text-white">
                  <ChevronDown className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDeleteCable(c.id); }} className="p-0.5 text-slate-600 hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Connection labels */}
              {hasConnections && (
                <div className="flex items-center gap-1 px-2.5 pb-1.5 text-[9px]">
                  <span style={{ color: nodeColor(startN) }} className="font-medium">{nodeLabel(startN) || 'Free end'}</span>
                  <span className="text-slate-600">→</span>
                  <span style={{ color: nodeColor(endN) }} className="font-medium">{nodeLabel(endN) || 'Free end'}</span>
                </div>
              )}

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-x-2 px-2.5 pb-2 text-[10px]">
                <span className="text-slate-500">Length: <span className="text-orange-400">{(len / 1000).toFixed(2)} km</span></span>
                <span className="text-slate-500">Cost: <span className="text-yellow-400">£{cost.toFixed(0)}</span></span>
                <span className="text-slate-500">Capacity: <span className="text-cyan-400">{capacityA}A</span> / <span className="text-purple-400">{capacityMVA} MVA</span></span>
                <span className="text-slate-500">Load: <span className={cn(isOverloaded ? "text-red-400 font-bold" : usedMw > 0 ? "text-emerald-400" : "text-slate-600")}>{usedA}A ({usedMw.toFixed(1)} MW)</span></span>
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

                  {/* Topology connections */}
                  <div>
                    <p className="text-[9px] text-slate-500 mb-1 uppercase tracking-wider">Connected Nodes</p>
                    {!hasConnections ? (
                      <p className="text-[10px] text-slate-600">No turbines or substations snapped. Draw a new cable and hover near a turbine/substation at each endpoint to connect.</p>
                    ) : (
                      <div className="space-y-1">
                        {[{ label: 'Start', node: startN }, { label: 'End', node: endN }].map(({ label, node }) => (
                          <div key={label} className="flex items-center gap-2 text-[10px]">
                            <span className="text-slate-600 w-8">{label}:</span>
                            {node ? (
                              <span className="font-medium" style={{ color: nodeColor(node) }}>
                                {node.type === 'turbine' ? '🔵' : '⚡'} {nodeLabel(node)}
                              </span>
                            ) : (
                              <span className="text-slate-600 italic">unconnected</span>
                            )}
                          </div>
                        ))}
                        {usedMw > 0 && (
                          <p className="text-[9px] text-slate-500 mt-1 pt-1 border-t border-slate-700">
                            Cumulative string load: <span className={isOverloaded ? 'text-red-400 font-bold' : 'text-emerald-400'}>{usedMw.toFixed(1)} MW ({usedA}A)</span>
                          </p>
                        )}
                      </div>
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