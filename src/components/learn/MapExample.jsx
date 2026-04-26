import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, Circle, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, CheckCircle2, Wind, Map } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const turbineIcon = () => L.divIcon({
  html: `<div style="width:18px;height:18px;background:#10b981;border:2px solid rgba(255,255,255,0.7);border-radius:50%;box-shadow:0 0 6px #10b98188;position:relative">
    <div style="width:2px;height:10px;background:white;position:absolute;left:7px;top:2px;"></div>
    <div style="width:8px;height:2px;background:white;position:absolute;transform:rotate(60deg);transform-origin:left center;left:50%;top:4px;"></div>
    <div style="width:8px;height:2px;background:white;position:absolute;transform:rotate(-60deg);transform-origin:left center;left:50%;top:10px;"></div>
  </div>`,
  className: '', iconSize: [18, 18], iconAnchor: [9, 9],
});

function ClickToPlace({ active, onPlace }) {
  useMapEvents({
    click(e) { if (active) onPlace(e.latlng); },
  });
  return null;
}

/**
 * MapExample — an interactive stepped map lesson component.
 *
 * steps: Array of {
 *   instruction: string,            // shown in sidebar
 *   hint: string,                   // smaller hint text
 *   action: 'read'|'click_turbine'|'draw_zone', // what user must do
 *   validate?: (state) => boolean,  // optional validation
 *   overlays?: {                    // static overlays to show
 *     turbines?: [[lat,lng],...],
 *     polygons?: [[lat,lng],...][],
 *     circles?: [[lat,lng,radius,label],...],
 *   },
 * }
 * center: [lat, lng]
 * zoom: number
 * onComplete: () => void
 */
export default function MapExample({ steps, center = [52.04, -1.5], zoom = 11, onComplete }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [placedTurbines, setPlacedTurbines] = useState([]);
  const [drawnZones, setDrawnZones] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [stepDone, setStepDone] = useState(false);

  const step = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;

  const handlePlace = (latlng) => {
    if (step.action === 'click_turbine') {
      const newTurbines = [...placedTurbines, [latlng.lat, latlng.lng]];
      setPlacedTurbines(newTurbines);
      const required = step.required || 1;
      if (newTurbines.length >= required) setStepDone(true);
    }
  };

  const advance = () => {
    if (isLast) {
      setCompleted(true);
      onComplete?.();
    } else {
      setStepIdx(i => i + 1);
      setStepDone(false);
    }
  };

  const canAdvance = step.action === 'read' || stepDone;

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-400" />
        <p className="text-white font-bold text-lg">Map Exercise Complete!</p>
        <p className="text-slate-400 text-sm">Great work — you completed all steps.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Step progress */}
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={cn("h-1 flex-1 rounded-full transition-all",
            i < stepIdx ? "bg-emerald-500" : i === stepIdx ? "bg-cyan-500" : "bg-slate-800"
          )} />
        ))}
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-slate-700" style={{ height: 280 }}>
        <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} zoomControl={false} scrollWheelZoom={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
          <ClickToPlace active={step.action === 'click_turbine'} onPlace={handlePlace} />

          {/* Static overlays */}
          {step.overlays?.turbines?.map(([lat, lng], i) => (
            <Marker key={i} position={[lat, lng]} icon={turbineIcon()}>
              <Popup><span className="text-xs">Existing turbine</span></Popup>
            </Marker>
          ))}
          {step.overlays?.polygons?.map((pts, i) => (
            <Polygon key={i} positions={pts} pathOptions={{ color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 0.15, weight: 2 }} />
          ))}
          {step.overlays?.circles?.map(([lat, lng, r, label], i) => (
            <Circle key={i} center={[lat, lng]} radius={r}
              pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.1, weight: 1.5 }}>
              {label && <Popup><span className="text-xs">{label}</span></Popup>}
            </Circle>
          ))}

          {/* User placed turbines */}
          {placedTurbines.map(([lat, lng], i) => (
            <Marker key={`user-${i}`} position={[lat, lng]} icon={turbineIcon()}>
              <Popup><span className="text-xs text-emerald-600 font-medium">Your turbine {i + 1}</span></Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Step instruction */}
      <div className={cn("rounded-xl border p-4 space-y-1.5 transition-all",
        stepDone ? "bg-emerald-500/10 border-emerald-500/30" : "bg-slate-800/60 border-slate-700"
      )}>
        <div className="flex items-start gap-2">
          {step.action === 'click_turbine' ? <Wind className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <Map className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />}
          <div>
            <p className="text-sm font-medium text-white">{step.instruction}</p>
            {step.hint && <p className="text-xs text-slate-400 mt-0.5">{step.hint}</p>}
            {step.action === 'click_turbine' && (
              <p className="text-[11px] text-emerald-400 mt-1">
                Placed: {placedTurbines.length} / {step.required || 1} turbine{(step.required || 1) > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setStepIdx(i => Math.max(0, i - 1)); setStepDone(false); }}
          disabled={stepIdx === 0}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <span className="text-[10px] text-slate-600">Step {stepIdx + 1} of {steps.length}</span>
        <button
          onClick={advance}
          disabled={!canAdvance}
          className={cn("flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all",
            canAdvance ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-slate-800 text-slate-600 cursor-not-allowed"
          )}
        >
          {isLast ? 'Complete' : 'Next'} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}