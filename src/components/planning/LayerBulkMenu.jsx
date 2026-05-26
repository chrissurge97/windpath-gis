import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Per-layer "⋯" context menu.
 * Lets users bulk-apply setback radius and no-turbines flag to all features in a layer,
 * and toggle visibility and the constraint themselves on/off.
 */
export default function LayerBulkMenu({ layer, updateLayer }) {
  const [open, setOpen] = useState(false);
  const [setbackInput, setSetbackInput] = useState('');
  const ref = useRef(null);

  // Derive current bulk state from layer properties
  const layerSetbackM = layer.bulkSetbackM ?? 0;
  const layerNoTurbines = !!layer.no_turbines;
  const setbackActive = layerSetbackM > 0;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Sync input when menu opens
  useEffect(() => {
    if (open) setSetbackInput(layerSetbackM > 0 ? String(layerSetbackM) : '');
  }, [open, layerSetbackM]);

  const applySetback = (m) => {
    updateLayer(layer.id, {
      bulkSetbackM: m,
      features: layer.features.map(f => ({
        ...f,
        properties: { ...f.properties, setback_m: m > 0 ? m : undefined }
      }))
    });
  };

  const applyNoTurbines = (val) => {
    updateLayer(layer.id, {
      no_turbines: val,
      features: layer.features.map(f => ({
        ...f,
        properties: { ...f.properties, no_turbines: val || undefined }
      }))
    });
  };

  const toggleVisible = () => updateLayer(layer.id, { visible: !layer.visible });

  return (
    <div ref={ref} className="relative shrink-0" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'p-0.5 rounded transition-colors',
          open ? 'text-white bg-slate-600' : 'text-slate-500 hover:text-white'
        )}
        title="Layer options"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-6 z-[2000] w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Layer Options</span>
            <button onClick={() => setOpen(false)} className="text-slate-600 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Visibility toggle */}
          <Row
            label="Visible"
            active={layer.visible !== false}
            onToggle={toggleVisible}
          />

          {/* No-turbines toggle */}
          <Row
            label="Block turbines"
            description="No turbines within this layer's zones"
            active={layerNoTurbines}
            onToggle={() => applyNoTurbines(!layerNoTurbines)}
          />

          {/* Setback radius */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-slate-300">Setback radius</p>
                <p className="text-[9px] text-slate-600">Applied to all features in this layer</p>
              </div>
              <button
                onClick={() => { applySetback(0); setSetbackInput(''); }}
                className={cn(
                  'shrink-0 transition-colors',
                  setbackActive ? 'text-emerald-400 hover:text-red-400' : 'text-slate-600'
                )}
                title={setbackActive ? 'Clear setback' : 'No setback set'}
              >
                {setbackActive
                  ? <ToggleRight className="w-5 h-5" />
                  : <ToggleLeft className="w-5 h-5" />}
              </button>
            </div>
            <div className="flex gap-1.5">
              <input
                type="number"
                min="0"
                value={setbackInput}
                onChange={e => setSetbackInput(e.target.value)}
                placeholder="metres"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => {
                  const m = parseInt(setbackInput, 10);
                  if (!isNaN(m) && m >= 0) applySetback(m);
                }}
                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded-lg font-medium transition-colors"
              >
                Apply
              </button>
            </div>
            {setbackActive && (
              <p className="text-[9px] text-cyan-400">Active: {layerSetbackM}m on all features</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, description, active, onToggle }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <p className="text-[10px] font-medium text-slate-300">{label}</p>
        {description && <p className="text-[9px] text-slate-600">{description}</p>}
      </div>
      <button onClick={onToggle} className="shrink-0 transition-colors">
        {active
          ? <ToggleRight className="w-5 h-5 text-emerald-400" />
          : <ToggleLeft className="w-5 h-5 text-slate-600" />}
      </button>
    </div>
  );
}