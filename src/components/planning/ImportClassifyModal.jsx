import React, { useState, useMemo } from 'react';
import { X, Wind, Zap, Layers, ChevronRight, ChevronLeft, AlertTriangle, Target, MapPin, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── helpers ──────────────────────────────────────────────────────────────────
const isPoint = (f) => f.geometry?.type === 'Point';
const isLine  = (f) => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString';
const isPoly  = (f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon';

function hasProjectedCoords(layer) {
  return layer.features?.some(f => {
    const flat = [f.geometry?.coordinates].flat(Infinity);
    for (let i = 0; i < flat.length - 1; i += 2) {
      if (Math.abs(flat[i]) > 180 || Math.abs(flat[i + 1]) > 90) return true;
    }
    return false;
  }) || false;
}

function featureLabel(f, index) {
  return f.properties?.name || f.properties?.Name || f.properties?.id || `Feature ${index + 1}`;
}

const POINT_OPTS = [
  { id: 'turbine',    label: 'Turbine',    icon: Wind,   color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/40' },
  { id: 'substation', label: 'Substation', icon: Target, color: 'text-yellow-400',  bg: 'bg-yellow-500/15 border-yellow-500/40' },
  { id: 'keep',       label: 'Point Layer', icon: MapPin, color: 'text-cyan-400',   bg: 'bg-cyan-500/15 border-cyan-500/40' },
];

const LINE_OPTS = [
  { id: 'cable', label: 'Cable',      icon: Zap,    color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/40' },
  { id: 'keep',  label: 'Line Layer', icon: Layers, color: 'text-cyan-400',   bg: 'bg-cyan-500/15 border-cyan-500/40' },
];

// ── Sub-component: feature-level classify row ─────────────────────────────────
function FeatureRow({ feature, index, classification, opts, onChange }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-slate-800/60 last:border-0">
      <span className="flex-1 text-xs text-slate-300 truncate min-w-0">{featureLabel(feature, index)}</span>
      <div className="flex gap-1 shrink-0">
        {opts.map(opt => {
          const Icon = opt.icon;
          const active = classification === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              title={opt.label}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border transition-all',
                active ? opt.bg + ' ' + opt.color : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
              )}
            >
              <Icon className="w-3 h-3" />
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
/**
 * 3-step wizard:
 *   Step 0 — Points: classify each point feature as Turbine / Substation / Point Layer
 *   Step 1 — Lines:  classify each line feature as Cable / Line Layer
 *   Step 2 — Layers: see all polygon layers and any "keep" groups, confirm import
 *
 * onConfirm receives the same decisions array that useImportClassify expects:
 *   [{ layer, classification: 'turbine'|'cable'|'substation'|'keep' }]
 */
export default function ImportClassifyModal({ layers, onConfirm, onClose }) {
  const [step, setStep] = useState(0);

  // Flatten all features from all layers, tagged with their source layer
  const allFeatures = useMemo(() => {
    const result = [];
    for (const layer of layers) {
      for (const f of layer.features || []) {
        result.push({ feature: f, layerId: layer.id, layer });
      }
    }
    return result;
  }, [layers]);

  const pointItems = useMemo(() => allFeatures.filter(x => isPoint(x.feature)), [allFeatures]);
  const lineItems  = useMemo(() => allFeatures.filter(x => isLine(x.feature)),  [allFeatures]);
  const polyItems  = useMemo(() => allFeatures.filter(x => isPoly(x.feature)),  [allFeatures]);

  // Per-feature classification state — default from restored ev_type if available
  const [pointClass, setPointClass] = useState(() =>
    Object.fromEntries(pointItems.map(x => {
      const t = x.layer.type;
      const def = (t === 'substation') ? 'substation' : (t === 'turbine') ? 'turbine' : 'turbine';
      return [x.feature.id || x.feature.properties?.id || Math.random(), def];
    }))
  );
  const [lineClass, setLineClass] = useState(() =>
    Object.fromEntries(lineItems.map(x => {
      const def = x.layer.type === 'cable' ? 'cable' : 'keep';
      return [x.feature.id || Math.random(), def];
    }))
  );
  // Polygon layers — kept as-is but shown for review; user can rename or remove
  const polyLayerIds = useMemo(() => [...new Set(polyItems.map(x => x.layerId))], [polyItems]);

  // Helper: get stable key for a feature item
  const fKey = (x) => x.feature.id ?? (x.layerId + '_' + x.feature.properties?.name ?? '');

  const setPointClassAll = (val) => {
    setPointClass(prev => Object.fromEntries(Object.keys(prev).map(k => [k, val])));
  };
  const setLineClassAll = (val) => {
    setLineClass(prev => Object.fromEntries(Object.keys(prev).map(k => [k, val])));
  };

  const steps = [
    { label: 'Points', count: pointItems.length },
    { label: 'Lines',  count: lineItems.length },
    { label: 'Layers', count: polyLayerIds.length + (Object.values(pointClass).filter(v => v === 'keep').length > 0 ? 1 : 0) + (Object.values(lineClass).filter(v => v === 'keep').length > 0 ? 1 : 0) },
  ];

  const handleConfirm = () => {
    // Build synthetic layers per classification group
    const layerId = () => `lyr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const decisions = [];

    // Group point features by (source layer name + classification) so each
    // source shapefile / layer keeps its own identity even after classification.
    const pointGroups = {};
    pointItems.forEach((x, i) => {
      const key = fKey(x) || String(i);
      const cls = pointClass[key] || 'turbine';
      const groupKey = `${x.layerId}::${cls}`;
      if (!pointGroups[groupKey]) pointGroups[groupKey] = { cls, srcLayer: x.layer, features: [] };
      pointGroups[groupKey].features.push(x.feature);
    });
    for (const { cls, srcLayer, features } of Object.values(pointGroups)) {
      const name = cls === 'turbine'
        ? `${srcLayer.name} (Turbines)`
        : cls === 'substation'
          ? `${srcLayer.name} (Substations)`
          : srcLayer.name;
      decisions.push({
        layer: {
          id: layerId(),
          name,
          type: cls === 'turbine' ? 'turbine' : cls === 'substation' ? 'substation' : 'polygon',
          visible: true,
          color: cls === 'turbine' ? '#10b981' : cls === 'substation' ? '#facc15' : '#8b5cf6',
          fillOpacity: 0.8, strokeWeight: 2, strokeOpacity: 0.9, no_turbines: false,
          features,
        },
        classification: cls,
      });
    }

    // Group line features by (source layer + classification)
    const lineGroups = {};
    lineItems.forEach((x, i) => {
      const key = fKey(x) || String(i);
      const cls = lineClass[key] || 'cable';
      const groupKey = `${x.layerId}::${cls}`;
      if (!lineGroups[groupKey]) lineGroups[groupKey] = { cls, srcLayer: x.layer, features: [] };
      lineGroups[groupKey].features.push(x.feature);
    });
    for (const { cls, srcLayer, features } of Object.values(lineGroups)) {
      const name = cls === 'cable' ? `${srcLayer.name} (Cables)` : srcLayer.name;
      decisions.push({
        layer: {
          id: layerId(),
          name,
          type: cls === 'cable' ? 'cable' : 'polygon',
          visible: true,
          color: cls === 'cable' ? '#f97316' : '#8b5cf6',
          fillOpacity: 0.8, strokeWeight: 2, strokeOpacity: 0.9, no_turbines: false,
          features,
        },
        classification: cls,
      });
    }

    // Polygon layers — each source layer becomes its own separate layer (not merged),
    // preserving the restored color/opacity/visibility/no_turbines from ev_* fields.
    for (const layer of layers) {
      const polyFeatures = (layer.features || []).filter(isPoly);
      if (polyFeatures.length > 0) {
        decisions.push({
          layer: {
            id: layerId(),
            name: layer.name,
            type: layer.type || 'polygon',
            visible: layer.visible !== false,
            color: layer.color || '#06b6d4',
            fillOpacity: layer.fillOpacity ?? 0.15,
            strokeWeight: layer.strokeWeight ?? 2,
            strokeOpacity: layer.strokeOpacity ?? 0.9,
            no_turbines: layer.no_turbines || false,
            features: polyFeatures,
          },
          classification: 'keep',
        });
      }
    }

    onConfirm(decisions);
  };

  const projWarn = layers.some(hasProjectedCoords);

  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[560px] max-h-[88vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-white">Classify Imported Features</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Assign each feature to the correct layer type before importing.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white ml-3 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step tabs */}
        <div className="flex border-b border-slate-800 shrink-0">
          {steps.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setStep(i)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors border-b-2',
                step === i
                  ? 'text-white border-emerald-500'
                  : i < step
                    ? 'text-slate-400 border-transparent hover:text-white'
                    : 'text-slate-600 border-transparent cursor-default'
              )}
              disabled={i > step}
            >
              {i < step ? <Check className="w-3 h-3 text-emerald-400" /> : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[9px]">{i + 1}</span>}
              {s.label}
              {s.count > 0 && <span className="ml-0.5 text-slate-600 font-normal">({s.count})</span>}
            </button>
          ))}
        </div>

        {/* Projected CRS warning */}
        {projWarn && (
          <div className="flex items-start gap-2 bg-amber-900/30 border-b border-amber-600/30 px-4 py-2.5 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-400">Some features may use a projected CRS (not WGS84). Invalid coordinates will be skipped on import.</p>
          </div>
        )}

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">

          {/* ── STEP 0: Points ─────────────────────────────────────────────── */}
          {step === 0 && (
            <div>
              {pointItems.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No point features found in this import.</p>
              ) : (
                <>
                  {/* Bulk actions */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider mr-auto">
                      {pointItems.length} point{pointItems.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-[10px] text-slate-600">Mark all as:</span>
                    {POINT_OPTS.map(opt => {
                      const Icon = opt.icon;
                      return (
                        <button key={opt.id} onClick={() => setPointClassAll(opt.id)}
                          className={cn('flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border transition-all', opt.bg, opt.color)}>
                          <Icon className="w-3 h-3" /> {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="bg-slate-800/40 rounded-xl px-3 py-1">
                    {pointItems.map((x, i) => {
                      const key = fKey(x) || String(i);
                      return (
                        <FeatureRow
                          key={key}
                          feature={x.feature}
                          index={i}
                          classification={pointClass[key] || 'turbine'}
                          opts={POINT_OPTS}
                          onChange={(val) => setPointClass(prev => ({ ...prev, [key]: val }))}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── STEP 1: Lines ──────────────────────────────────────────────── */}
          {step === 1 && (
            <div>
              {lineItems.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No line features found in this import.</p>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider mr-auto">
                      {lineItems.length} line{lineItems.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-[10px] text-slate-600">Mark all as:</span>
                    {LINE_OPTS.map(opt => {
                      const Icon = opt.icon;
                      return (
                        <button key={opt.id} onClick={() => setLineClassAll(opt.id)}
                          className={cn('flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border transition-all', opt.bg, opt.color)}>
                          <Icon className="w-3 h-3" /> {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="bg-slate-800/40 rounded-xl px-3 py-1">
                    {lineItems.map((x, i) => {
                      const key = fKey(x) || String(i);
                      return (
                        <FeatureRow
                          key={key}
                          feature={x.feature}
                          index={i}
                          classification={lineClass[key] || 'cable'}
                          opts={LINE_OPTS}
                          onChange={(val) => setLineClass(prev => ({ ...prev, [key]: val }))}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── STEP 2: Layers summary ─────────────────────────────────────── */}
          {step === 2 && (() => {
            // Summarise what will be imported
            const summary = [];
            const turbCount = Object.values(pointClass).filter(v => v === 'turbine').length;
            const subCount  = Object.values(pointClass).filter(v => v === 'substation').length;
            const ptKeep    = Object.values(pointClass).filter(v => v === 'keep').length;
            const cableCount = Object.values(lineClass).filter(v => v === 'cable').length;
            const lineKeep   = Object.values(lineClass).filter(v => v === 'keep').length;

            if (turbCount > 0)  summary.push({ icon: Wind,   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', label: `${turbCount} turbine${turbCount !== 1 ? 's' : ''}`, sub: '→ Turbines layer' });
            if (subCount > 0)   summary.push({ icon: Target, color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30',  label: `${subCount} substation${subCount !== 1 ? 's' : ''}`, sub: '→ Substations layer' });
            if (ptKeep > 0)     summary.push({ icon: MapPin, color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/30',      label: `${ptKeep} point feature${ptKeep !== 1 ? 's' : ''}`, sub: '→ New polygon layer' });
            if (cableCount > 0) summary.push({ icon: Zap,    color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30',  label: `${cableCount} cable${cableCount !== 1 ? 's' : ''}`, sub: '→ Cables layer' });
            if (lineKeep > 0)   summary.push({ icon: Layers, color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/30',      label: `${lineKeep} line feature${lineKeep !== 1 ? 's' : ''}`, sub: '→ New polygon layer' });

            for (const layer of layers) {
              const pf = (layer.features || []).filter(isPoly);
              if (pf.length > 0) {
                summary.push({ icon: Layers, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30', label: `${layer.name}`, sub: `${pf.length} polygon${pf.length !== 1 ? 's' : ''} → new layer` });
              }
            }

            return (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 mb-4">Review what will be imported. Click <span className="text-white font-semibold">Import</span> to confirm.</p>
                {summary.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-8">Nothing to import — all features were skipped.</p>
                )}
                {summary.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className={cn('flex items-center gap-3 px-4 py-3 rounded-xl border', s.bg)}>
                      <Icon className={cn('w-4 h-4 shrink-0', s.color)} />
                      <div>
                        <p className="text-sm font-semibold text-white">{s.label}</p>
                        <p className="text-[10px] text-slate-500">{s.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-slate-800 shrink-0">
          <button
            onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            {step === 0 ? 'Cancel' : <><ChevronLeft className="w-3.5 h-3.5" /> Back</>}
          </button>

          {step < 2 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Import <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}