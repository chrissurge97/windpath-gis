import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SubstationMenu({ feature, layers, cables, turbines, calcSubstationLoad, updateLayer, onClose, onDelete }) {
  const [lng, lat] = feature.geometry.coordinates;
  const p = feature.properties;
  const subLayer = layers.find(l => l.type === 'substation');
  const connectedMw = calcSubstationLoad(feature.id, cables, turbines);
  const capMw = p.capacity_generation_mw || 0;
  const subOver = connectedMw > 0 && connectedMw > capMw + 0.01;
  const connectedCables = cables.filter(c =>
    c.properties.start_node?.id === feature.id || c.properties.end_node?.id === feature.id
  );

  const updateSubProps = (newProps) => {
    if (!subLayer) return;
    updateLayer(subLayer.id, {
      features: subLayer.features.map(f =>
        f.id === feature.id ? { ...f, properties: { ...f.properties, ...newProps } } : f
      )
    });
  };

  return (
    <div className="absolute top-14 left-4 z-[1200] bg-slate-900 border border-yellow-500/40 rounded-xl shadow-2xl p-4 w-72">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-yellow-400 uppercase tracking-wider font-medium">⚡ Substation</span>
        <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      {connectedCables.length > 0 && (
        <div className={cn("rounded-lg px-3 py-2 mb-3 text-[10px]", subOver ? "bg-red-500/10 border border-red-500/30" : "bg-emerald-500/10 border border-emerald-500/20")}>
          <p className={cn("font-bold", subOver ? "text-red-400" : "text-emerald-400")}>
            {subOver ? '⚠ OVER CAPACITY' : '✓ Within capacity'}
          </p>
          <p className="text-slate-400">{connectedCables.length} cable{connectedCables.length !== 1 ? 's' : ''} connected · {connectedMw.toFixed(1)} / {capMw} MW</p>
        </div>
      )}

      <div className="space-y-2 mb-3">
        {[
          { label: 'Name', key: 'name', type: 'text' },
          { label: 'Transformer (MVA)', key: 'transformer_mva', type: 'number' },
          { label: 'Available Gen Capacity (MW)', key: 'capacity_generation_mw', type: 'number' },
          { label: 'Available Demand Capacity (MW)', key: 'capacity_demand_mw', type: 'number' },
          { label: 'Notes', key: 'notes', type: 'text' },
        ].map(({ label, key, type }) => (
          <div key={key}>
            <label className="text-[10px] text-slate-500 block mb-0.5">{label}</label>
            <input
              type={type}
              defaultValue={p[key] ?? ''}
              onBlur={e => updateSubProps({ [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-yellow-500/60"
            />
          </div>
        ))}
      </div>

      <div className="text-[10px] text-slate-600 mb-3">{lat.toFixed(5)}, {lng.toFixed(5)}</div>

      <div className="flex gap-2">
        <button
          onClick={() => { onClose(); window.__trainingEvent__ = { type: 'substation_configured', payload: {}, ts: Date.now() }; }}
          className="flex-1 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 text-xs font-medium rounded-lg border border-yellow-600/30 transition-colors"
        >
          Done
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