import React, { useState } from 'react';
import { X, Wind, Zap, Layers, ChevronRight, AlertTriangle, Target } from 'lucide-react';
import { cn } from '@/lib/utils';


/**
 * Modal shown after importing layers that contain Point or LineString features.
 * Lets the user classify each imported layer as turbines, cables, or keep as-is.
 *
 * Props:
 *   layers: array of newly imported GeoJSON layers (with .features, .name, .type etc.)
 *   onConfirm(decisions): decisions = array of { layer, classification }
 *                         classification: 'turbine' | 'cable' | 'keep'
 *   onClose()
 */
export default function ImportClassifyModal({ layers, onConfirm, onClose }) {
  // All layers are classifiable — user can pick how each one is imported
  const classifiable = layers;
  const nonClassifiable = [];

  const [decisions, setDecisions] = useState(() =>
    Object.fromEntries(classifiable.map(l => [l.id, 'keep']))
  );

  const setDecision = (id, val) => setDecisions(prev => ({ ...prev, [id]: val }));

  const featureSummary = (layer) => {
    const pts = layer.features?.filter(f => f.geometry?.type === 'Point').length || 0;
    const lines = layer.features?.filter(f => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString').length || 0;
    const polys = layer.features?.filter(f => f.geometry?.type === 'Polygon').length || 0;
    const parts = [];
    if (pts) parts.push(`${pts} point${pts !== 1 ? 's' : ''}`);
    if (lines) parts.push(`${lines} line${lines !== 1 ? 's' : ''}`);
    if (polys) parts.push(`${polys} polygon${polys !== 1 ? 's' : ''}`);
    return parts.join(', ');
  };

  // Check if any features in a layer have non-WGS84 coords (projected CRS)
  const hasProjectedCoords = (layer) => {
    return layer.features?.some(f => {
      const coords = f.geometry?.coordinates;
      if (!coords) return false;
      const flat = [coords].flat(Infinity);
      for (let i = 0; i < flat.length - 1; i += 2) {
        if (Math.abs(flat[i]) > 180 || Math.abs(flat[i + 1]) > 90) return true;
      }
      return false;
    }) || false;
  };

  const suggestClass = (layer) => {
    const pts = layer.features?.filter(f => f.geometry?.type === 'Point').length || 0;
    const lines = layer.features?.filter(f => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString').length || 0;
    if (pts > 0 && lines === 0) return 'turbine';
    if (lines > 0 && pts === 0) return 'cable';
    return 'keep';
  };

  const handleConfirm = () => {
    const result = classifiable.map(l => ({ layer: l, classification: decisions[l.id] }));
    // Also pass non-classifiable layers as 'keep'
    const nonResult = nonClassifiable.map(l => ({ layer: l, classification: 'keep' }));
    onConfirm([...result, ...nonResult]);
  };

  const OPTS = [
    { id: 'turbine',    label: 'Turbines',    icon: Wind,   color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/40', hint: 'Points → turbine markers' },
    { id: 'cable',      label: 'Cables',      icon: Zap,    color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/40', hint: 'Lines → cable routes' },
    { id: 'substation', label: 'Substations', icon: Target, color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/40', hint: 'Points → substation markers' },
    { id: 'keep',       label: 'Polygon Layer', icon: Layers, color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/40', hint: 'Add as a standard map layer' },
  ];

  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[520px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-white">Classify Imported Layers</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Choose how to import each layer — classify points as turbines or lines as cables to enable full interactive behaviour.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white ml-3 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Layer list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {classifiable.map(layer => {
            const suggested = suggestClass(layer);
            const current = decisions[layer.id];
            const projectedWarning = hasProjectedCoords(layer);
            return (
              <div key={layer.id} className={cn("bg-slate-800/60 border rounded-xl p-4", projectedWarning ? "border-amber-600/40" : "border-slate-700")}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-3 h-3 rounded-sm mt-1 shrink-0" style={{ background: layer.color || '#8b5cf6' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{layer.name}</p>
                    <p className="text-[11px] text-slate-500">{featureSummary(layer)}</p>
                    {suggested !== 'keep' && !projectedWarning && (
                      <p className="text-[10px] text-slate-600 mt-0.5">
                        Suggested: <span className={suggested === 'turbine' ? 'text-emerald-500' : 'text-orange-500'}>{suggested}</span>
                      </p>
                    )}
                  </div>
                </div>
                {projectedWarning && (
                  <div className="flex items-start gap-2 bg-amber-900/30 border border-amber-600/40 rounded-lg px-3 py-2 mb-3">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-semibold text-amber-300">Projected coordinates detected</p>
                      <p className="text-[10px] text-amber-500 mt-0.5">
                        This layer appears to use a projected CRS (e.g. Irish Grid, ITM) rather than WGS84/GPS. Features cannot be placed on the map until re-exported as WGS84. You can still import as a layer for reference, but turbine/cable classification will skip invalid features.
                      </p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-4 gap-2">
                  {OPTS.map(opt => {
                    const Icon = opt.icon;
                    const active = current === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setDecision(layer.id, opt.id)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg border text-center transition-all',
                          active ? opt.bg : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                        )}
                      >
                        <Icon className={cn('w-4 h-4', active ? opt.color : 'text-slate-500')} />
                        <span className={cn('text-[10px] font-semibold leading-tight', active ? 'text-white' : 'text-slate-400')}>
                          {opt.label}
                        </span>
                        <span className={cn('text-[9px] leading-tight', active ? 'text-slate-400' : 'text-slate-600')}>
                          {opt.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {nonClassifiable.length > 0 && (
            <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider">Polygon layers (added as-is)</p>
              {nonClassifiable.map(l => (
                <div key={l.id} className="flex items-center gap-2 py-1">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: l.color || '#8b5cf6' }} />
                  <span className="text-xs text-slate-400">{l.name}</span>
                  <span className="text-[10px] text-slate-600 ml-auto">{l.features?.length || 0} features</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-800 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Import <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}