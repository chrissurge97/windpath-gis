import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, Polyline, Circle, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, CheckCircle2, Wind, Map, Pentagon } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const turbineIcon = (color = '#10b981') => L.divIcon({
  html: `<div style="width:16px;height:16px;background:${color};border:2px solid rgba(255,255,255,0.7);border-radius:50%;box-shadow:0 0 6px ${color}88;position:relative">
    <div style="width:2px;height:9px;background:white;position:absolute;left:5px;top:1px;"></div>
    <div style="width:7px;height:2px;background:white;position:absolute;transform:rotate(60deg);transform-origin:left center;left:50%;top:3px;"></div>
    <div style="width:7px;height:2px;background:white;position:absolute;transform:rotate(-60deg);transform-origin:left center;left:50%;top:9px;"></div>
  </div>`,
  className: '', iconSize: [16, 16], iconAnchor: [8, 8],
});

const userTurbineIcon = () => L.divIcon({
  html: `<div style="width:18px;height:18px;background:#06b6d4;border:2px solid white;border-radius:50%;box-shadow:0 0 8px #06b6d4;position:relative">
    <div style="width:2px;height:10px;background:white;position:absolute;left:6px;top:1px;"></div>
    <div style="width:8px;height:2px;background:white;position:absolute;transform:rotate(60deg);transform-origin:left center;left:50%;top:3px;"></div>
    <div style="width:8px;height:2px;background:white;position:absolute;transform:rotate(-60deg);transform-origin:left center;left:50%;top:9px;"></div>
  </div>`,
  className: '', iconSize: [18, 18], iconAnchor: [9, 9],
});

function MapInteractionHandler({ mode, onPlace }) {
  useMapEvents({
    click(e) { onPlace(e.latlng); },
  });
  return null;
}

/**
 * MapExample — interactive stepped map scenario.
 *
 * Overlay spec per step:
 *   turbines:   [[lat, lng, label?], ...]
 *   polygons:   { pts:[[lat,lng],...], color?, fillColor?, opacity?, label? }[]
 *   circles:    [[lat, lng, radius_m, label, color?], ...]
 *   lines:      { pts:[[lat,lng],...], color, label? }[]
 *
 * Actions:
 *   'read'          — user reads, clicks Next
 *   'click_turbine' — user places N turbines (required: N)
 *   'draw_polygon'  — user clicks vertices then clicks Finish
 *   'place_radius'  — user clicks to set a radius centre
 */
export default function MapExample({ steps, center = [52.04, -1.5], zoom = 11, onComplete }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [placedTurbines, setPlacedTurbines] = useState([]);
  const [drawingPts, setDrawingPts] = useState([]);
  const [drawnPolygons, setDrawnPolygons] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [stepDone, setStepDone] = useState(false);

  const step = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;

  const handleMapClick = (latlng) => {
    if (step.action === 'click_turbine') {
      const next = [...placedTurbines, [latlng.lat, latlng.lng]];
      setPlacedTurbines(next);
      if (next.length >= (step.required || 1)) setStepDone(true);
    } else if (step.action === 'draw_polygon') {
      setDrawingPts(prev => [...prev, [latlng.lat, latlng.lng]]);
    }
  };

  const finishPolygon = () => {
    if (drawingPts.length >= 3) {
      setDrawnPolygons(prev => [...prev, drawingPts]);
      setDrawingPts([]);
      setStepDone(true);
    }
  };

  const advance = () => {
    if (isLast) {
      setCompleted(true);
      onComplete?.();
    } else {
      setStepIdx(i => i + 1);
      setStepDone(false);
      // Don't reset placed turbines — persist across steps so earlier turbines remain visible
    }
  };

  const canAdvance = step.action === 'read' || stepDone;

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-400" />
        <p className="text-white font-bold text-lg">Scenario Complete!</p>
        <p className="text-slate-400 text-sm">Well done — you've completed all steps. Take the quiz when ready.</p>
      </div>
    );
  }

  const actionIcon = {
    read: Map,
    click_turbine: Wind,
    draw_polygon: Pentagon,
  }[step.action] || Map;
  const ActionIcon = actionIcon;

  return (
    <div className="flex flex-col gap-3">
      {/* Step progress bar */}
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-all',
            i < stepIdx ? 'bg-emerald-500' : i === stepIdx ? 'bg-cyan-500' : 'bg-slate-800'
          )} />
        ))}
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-slate-700" style={{ height: 300 }}>
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; CARTO"
          />
          <MapInteractionHandler mode={step.action} onPlace={handleMapClick} />

          {/* ── Static overlay turbines ── */}
          {step.overlays?.turbines?.map(([lat, lng, label], i) => (
            <Marker key={`ot-${i}`} position={[lat, lng]} icon={turbineIcon()}>
              <Popup><span className="text-xs font-medium">{label || `Turbine ${i + 1}`}</span></Popup>
            </Marker>
          ))}

          {/* ── Static overlay polygons ── */}
          {step.overlays?.polygons?.map((poly, i) => {
            const color = poly.color || '#06b6d4';
            const fill = poly.fillColor || color;
            return (
              <Polygon key={`op-${i}`} positions={poly.pts}
                pathOptions={{ color, fillColor: fill, fillOpacity: poly.opacity ?? 0.15, weight: 2, opacity: 0.8 }}>
                {poly.label && <Popup><span className="text-xs">{poly.label}</span></Popup>}
              </Polygon>
            );
          })}

          {/* ── Static overlay circles ── */}
          {step.overlays?.circles?.map(([lat, lng, r, label, color], i) => (
            <Circle key={`oc-${i}`} center={[lat, lng]} radius={r}
              pathOptions={{ color: color || '#f97316', fillColor: color || '#f97316', fillOpacity: 0.1, weight: 1.5, opacity: 0.7 }}>
              {label && <Popup><span className="text-xs">{label}</span></Popup>}
            </Circle>
          ))}

          {/* ── Static overlay lines ── */}
          {step.overlays?.lines?.map((line, i) => (
            <Polyline key={`ol-${i}`} positions={line.pts}
              pathOptions={{ color: line.color || '#facc15', weight: 2.5, opacity: 0.85, dashArray: '6 3' }}>
              {line.label && <Popup><span className="text-xs">{line.label}</span></Popup>}
            </Polyline>
          ))}

          {/* ── User placed turbines ── */}
          {placedTurbines.map(([lat, lng], i) => (
            <Marker key={`ut-${i}`} position={[lat, lng]} icon={userTurbineIcon()}>
              <Popup><span className="text-xs text-cyan-400 font-medium">Your turbine {i + 1}</span></Popup>
            </Marker>
          ))}

          {/* ── Drawing in progress (polygon vertices) ── */}
          {drawingPts.length > 0 && (
            <>
              {drawingPts.map((pt, i) => (
                <Circle key={`dp-${i}`} center={pt} radius={50}
                  pathOptions={{ color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 1, weight: 0 }} />
              ))}
              {drawingPts.length >= 2 && (
                <Polyline positions={drawingPts}
                  pathOptions={{ color: '#06b6d4', weight: 2, dashArray: '5 5', opacity: 0.8 }} />
              )}
            </>
          )}

          {/* ── Completed user-drawn polygons ── */}
          {drawnPolygons.map((pts, i) => (
            <Polygon key={`dp2-${i}`} positions={pts}
              pathOptions={{ color: '#8b5cf6', fillColor: '#8b5cf6', fillOpacity: 0.25, weight: 2 }}>
              <Popup><span className="text-xs text-purple-400">Your polygon {i + 1}</span></Popup>
            </Polygon>
          ))}
        </MapContainer>
      </div>

      {/* Step instruction card */}
      <div className={cn('rounded-xl border p-4 space-y-2 transition-all',
        stepDone ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800/60 border-slate-700'
      )}>
        <div className="flex items-start gap-2.5">
          <ActionIcon className={cn('w-4 h-4 shrink-0 mt-0.5',
            step.action === 'click_turbine' ? 'text-emerald-400' :
            step.action === 'draw_polygon' ? 'text-purple-400' : 'text-cyan-400'
          )} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white leading-snug">{step.instruction}</p>
            {step.hint && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.hint}</p>}

            {step.action === 'click_turbine' && (
              <p className={cn('text-[11px] mt-1.5 font-medium',
                stepDone ? 'text-emerald-400' : 'text-cyan-400'
              )}>
                Turbines placed: {placedTurbines.length} / {step.required || 1}
              </p>
            )}

            {step.action === 'draw_polygon' && !stepDone && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] text-purple-400">
                  Vertices: {drawingPts.length} {drawingPts.length < 3 ? `(need ${3 - drawingPts.length} more)` : '— ready to finish'}
                </span>
                {drawingPts.length >= 3 && (
                  <button
                    onClick={finishPolygon}
                    className="px-3 py-1 rounded-lg text-[11px] font-medium bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:bg-purple-600/50 transition-colors"
                  >
                    Finish Polygon
                  </button>
                )}
              </div>
            )}
            {step.action === 'draw_polygon' && stepDone && (
              <p className="text-[11px] text-emerald-400 mt-1 font-medium">✓ Polygon drawn successfully</p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setStepIdx(i => Math.max(0, i - 1)); setStepDone(false); setDrawingPts([]); }}
          disabled={stepIdx === 0}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <span className="text-[10px] text-slate-600">Step {stepIdx + 1} of {steps.length}</span>
        <button
          onClick={advance}
          disabled={!canAdvance}
          className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all',
            canAdvance ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
          )}
        >
          {isLast ? 'Complete' : 'Next'} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}