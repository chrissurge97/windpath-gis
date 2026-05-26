import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, X, PlusCircle, Shield, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_RADIUS_COLORS = ['#06b6d4', '#f97316', '#ef4444', '#a855f7', '#10b981'];

function makeRadius(idx) {
  return {
    id: `r${Date.now()}_${idx}`,
    label: `Radius ${idx + 1}`,
    radiusM: 500,
    color: DEFAULT_RADIUS_COLORS[idx % DEFAULT_RADIUS_COLORS.length],
    blockPlacement: false,
  };
}

export default function LayerBulkMenu({ layer, updateLayer }) {
  const [open, setOpen] = useState(false);
  const [radii, setRadii] = useState([]);
  const ref = useRef(null);

  const layerNoTurbines = !!layer.no_turbines;

  useEffect(() => {
    if (!open) return;
    // Load from layer.bulkRadii, fallback to single bulkSetbackM for back-compat
    if (layer.bulkRadii && layer.bulkRadii.length > 0) {
      setRadii(layer.bulkRadii);
    } else if (layer.bulkSetbackM > 0) {
      setRadii([{ id: 'r0', label: 'Radius 1', radiusM: layer.bulkSetbackM, color: '#06b6d4', blockPlacement: layerNoTurbines }]);
    } else {
      setRadii([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const addRadius = () => setRadii(prev => [...prev, makeRadius(prev.length)]);
  const updateRadius = (i, changes) => setRadii(prev => prev.map((r, idx) => idx === i ? { ...r, ...changes } : r));
  const removeRadius = (i) => setRadii(prev => prev.filter((_, idx) => idx !== i));

  const applyAll = () => {
    const firstBlock = radii.find(r => r.blockPlacement);
    const firstAny = radii[0];
    const bulkSetbackM = (firstBlock || firstAny)?.radiusM || 0;
    const hasBlock = radii.some(r => r.blockPlacement);
    updateLayer(layer.id, {
      bulkRadii: radii,
      bulkSetbackM,
      no_turbines: hasBlock,
      features: layer.features.map(f => ({
        ...f,
        properties: {
          ...f.properties,
          radii: radii.length > 0 ? radii : undefined,
          setback_m: bulkSetbackM || undefined,
          no_turbines: hasBlock || undefined,
        }
      }))
    });
    setOpen(false);
  };

  const clearAll = () => {
    updateLayer(layer.id, {
      bulkRadii: [],
      bulkSetbackM: 0,
      no_turbines: false,
      features: layer.features.map(f => ({
        ...f,
        properties: { ...f.properties, radii: undefined, setback_m: undefined, no_turbines: undefined }
      }))
    });
    setRadii([]);
    setOpen(false);
  };

  const hasActive = layer.bulkRadii?.length > 0 || layer.bulkSetbackM > 0;

  return (
    <div ref={ref} className="relative shrink-0" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        className={cn('p-0.5 rounded transition-colors', open ? 'text-white bg-slate-600' : 'text-slate-500 hover:text-white')}
        title="Layer options"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-6 z-[2000] w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800">
            <span className="text-[11px] font-semibold text-slate-200">{layer.name}</span>
            <button onClick={() => setOpen(false)} className="text-slate-600 hover:text-white transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3 space-y-3">
            {/* Layer colour */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-slate-400 shrink-0">Layer colour</label>
              <input
                type="color"
                value={layer.color || '#8b5cf6'}
                onChange={e => updateLayer(layer.id, { color: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border border-slate-600 p-0 shrink-0"
                title="Change layer colour"
              />
              <span className="text-[10px] text-slate-500 flex-1">{layer.features.length} feature{layer.features.length !== 1 ? 's' : ''}</span>
              {hasActive && <span className="text-[10px] text-cyan-400 font-medium shrink-0">Radii active</span>}
            </div>

            {/* No-turbines toggle */}
            <div className="flex items-center gap-2 py-1.5 px-2 bg-slate-800/60 rounded-lg">
              <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
              <span className="text-[10px] text-slate-300 flex-1">Block turbines in this layer</span>
              <button
                onClick={() => updateLayer(layer.id, { no_turbines: !layerNoTurbines, features: layer.features.map(f => ({ ...f, properties: { ...f.properties, no_turbines: !layerNoTurbines || undefined } })) })}
                className={cn('w-8 h-4 rounded-full transition-colors relative shrink-0', layerNoTurbines ? 'bg-red-500' : 'bg-slate-700')}
              >
                <div className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform', layerNoTurbines ? 'translate-x-4' : 'translate-x-0.5')} />
              </button>
            </div>

            {/* Radii section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-medium text-slate-300">Buffer Radii</span>
                </div>
                <button onClick={addRadius} className="flex items-center gap-0.5 text-[10px] text-slate-500 hover:text-cyan-400 transition-colors">
                  <PlusCircle className="w-3 h-3" /> Add
                </button>
              </div>

              {radii.length === 0 && (
                <p className="text-[9px] text-slate-600 italic mb-1">No radii configured. Click + to add one.</p>
              )}

              <div className="space-y-2">
                {radii.map((r, i) => (
                  <div key={r.id} className="bg-slate-800 rounded-lg p-2 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <input type="color" value={r.color} onChange={e => updateRadius(i, { color: e.target.value })}
                        className="w-4 h-4 rounded cursor-pointer bg-transparent border-0 p-0 shrink-0" />
                      <input value={r.label} onChange={e => updateRadius(i, { label: e.target.value })}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-[10px] text-white outline-none" placeholder="Label" />
                      <button onClick={() => removeRadius(i)} className="text-slate-600 hover:text-red-400 transition-colors shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input type="number" value={r.radiusM} min={0} onChange={e => updateRadius(i, { radiusM: parseFloat(e.target.value) || 0 })}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-[10px] text-white outline-none" placeholder="Radius (m)" />
                      <span className="text-[9px] text-slate-500 shrink-0">m</span>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={r.blockPlacement} onChange={e => updateRadius(i, { blockPlacement: e.target.checked })}
                        className="accent-red-500 w-3 h-3" />
                      <span className="text-[10px] text-slate-400">Block turbine placement</span>
                      {r.blockPlacement && <span className="text-[9px] text-red-400 ml-auto">⛔</span>}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1 border-t border-slate-800">
              <button onClick={applyAll}
                className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold rounded-lg transition-colors">
                Apply to all features
              </button>
              {hasActive && (
                <button onClick={clearAll}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-[11px] rounded-lg border border-slate-700 hover:border-red-500/30 transition-colors">
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}