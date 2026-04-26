import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Polyline,
  useMapEvents, LayersControl
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';
import {
  Wind, Zap, Map, MousePointer, Pentagon, Trash2, Download,
  Upload, RefreshCw, ChevronDown, ChevronUp, Info, Plus, Eye, EyeOff,
  BarChart2, Target, AlertTriangle, Save, Layers
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { createLayer, createFeature, geoJSONToLayer, downloadJSON, layersToGeoJSON, DEFAULT_POWER_CURVE, sampleWindSpeed, windAtHubHeight, calcTurbineAEP } from '@/lib/gisUtils';
import { fetchElevation, fetchWindData, weibullFromMeanSpeed } from '@/lib/planningUtils';
import WindResourceRenderer from '@/components/gis/WindResourceLayer';

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const turbineIcon = (color = '#10b981', selected = false) => L.divIcon({
  html: `<div style="width:${selected ? 26 : 20}px;height:${selected ? 26 : 20}px;background:${color};border:${selected ? '3px' : '2px'} solid ${selected ? 'white' : 'rgba(255,255,255,0.5)'};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 8px ${color}99;position:relative">
    <div style="width:2px;height:${selected ? 14 : 10}px;background:white;position:absolute;"></div>
    <div style="width:${selected ? 12 : 9}px;height:2px;background:white;position:absolute;transform:rotate(60deg);transform-origin:left center;left:50%;margin-top:-4px;"></div>
    <div style="width:${selected ? 12 : 9}px;height:2px;background:white;position:absolute;transform:rotate(-60deg);transform-origin:left center;left:50%;margin-top:4px;"></div>
  </div>`,
  className: '',
  iconSize: [selected ? 26 : 20, selected ? 26 : 20],
  iconAnchor: [selected ? 13 : 10, selected ? 13 : 10],
});

function MapClickHandler({ mode, onAddPoint, onFinishPolygon }) {
  useMapEvents({
    click(e) {
      if (mode === 'place_turbine' || mode === 'draw_polygon' || mode === 'draw_point') {
        onAddPoint(e.latlng);
      }
    },
    dblclick(e) {
      if (mode === 'draw_polygon') {
        e.originalEvent.preventDefault();
        onFinishPolygon();
      }
    },
  });
  return null;
}

const STORAGE_KEY = 'planning_v1';

function calcProjectAEP(turbines, k, lambda) {
  // Weibull-based AEP for all turbines
  const powerCurve = DEFAULT_POWER_CURVE;
  let totalAEP = 0;
  for (const t of turbines) {
    const speed = t.properties.hub_wind_speed || (t.properties.wind_speed_ms ? windAtHubHeight(t.properties.wind_speed_ms, 10, t.properties.hub_height || 100) : null);
    if (speed) {
      const result = calcTurbineAEP(speed, powerCurve);
      totalAEP += result?.aep_mwh || 0;
    }
  }
  return totalAEP;
}

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0', fontSize: 11 },
};

export default function Planning() {
  const [layers, setLayers] = useState(() => {
    try {
      const d = localStorage.getItem(STORAGE_KEY);
      const parsed = d ? JSON.parse(d) : null;
      if (parsed) return parsed;
    } catch {}
    return [
      createLayer({ name: 'Site Boundary', type: 'polygon', color: '#06b6d4', fillOpacity: 0.1 }),
      createLayer({ name: 'Turbines', type: 'turbine', color: '#10b981', fillOpacity: 0.8, powerCurve: DEFAULT_POWER_CURVE }),
    ];
  });
  const [selectedLayerId, setSelectedLayerId] = useState(layers.find(l => l.type === 'turbine')?.id || layers[0]?.id);
  const [mode, setMode] = useState('select');
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState(null);
  const [rightTab, setRightTab] = useState('analysis'); // 'analysis' | 'turbines' | 'layers'
  const [loadingWind, setLoadingWind] = useState(false);
  const [windFetched, setWindFetched] = useState(false);
  const [projectName, setProjectName] = useState('Wind Farm Project');
  const [savedMsg, setSavedMsg] = useState(false);
  const [windParams, setWindParams] = useState({ k: 2.0, lambda: 8.0 });
  const [panelOpen, setPanelOpen] = useState(true);

  const selectedLayer = layers.find(l => l.id === selectedLayerId);
  const turbineLayer = layers.find(l => l.type === 'turbine');
  const turbines = turbineLayer?.features || [];

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layers)); } catch {}
  }, [layers]);

  const updateLayer = useCallback((id, changes) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...changes } : l));
  }, []);

  const addLayer = (type, name) => {
    const layer = createLayer({ type, name, color: type === 'turbine' ? '#10b981' : '#06b6d4' });
    if (type === 'turbine') layer.powerCurve = DEFAULT_POWER_CURVE;
    setLayers(prev => [...prev, layer]);
    setSelectedLayerId(layer.id);
  };

  const addPoint = async (latlng) => {
    if (!selectedLayer) return;

    if (mode === 'draw_polygon') {
      setDrawingPoints(prev => [...prev, [latlng.lat, latlng.lng]]);
      return;
    }

    if (mode === 'draw_point') {
      const f = createFeature(selectedLayerId, { type: 'Point', coordinates: [latlng.lng, latlng.lat] }, {});
      updateLayer(selectedLayerId, { features: [...selectedLayer.features, f] });
      return;
    }

    if (mode === 'place_turbine') {
      // Fetch real elevation + wind data
      setLoadingWind(true);
      let elevation = null;
      let wind_speed_ms = null;

      try {
        elevation = await fetchElevation(latlng.lat, latlng.lng);
      } catch {}

      try {
        const windData = await fetchWindData(latlng.lat, latlng.lng);
        wind_speed_ms = windData?.mean_speed;
        if (windData) {
          setWindParams({ k: windData.k, lambda: windData.lambda });
          setWindFetched(true);
        }
      } catch {}

      const hubHeight = 100;
      const hubSpeed = wind_speed_ms ? windAtHubHeight(wind_speed_ms, 10, hubHeight) : null;
      const turbLayer = layers.find(l => l.type === 'turbine');
      if (!turbLayer) { setLoadingWind(false); return; }

      const f = createFeature(turbLayer.id,
        { type: 'Point', coordinates: [latlng.lng, latlng.lat] },
        {
          name: `T${turbLayer.features.length + 1}`,
          hub_height: hubHeight,
          rotor_diameter: 130,
          rated_power_mw: 3.5,
          elevation_m: elevation,
          wind_speed_ms,
          hub_wind_speed: hubSpeed,
        }
      );

      const aep = hubSpeed ? calcTurbineAEP(hubSpeed, turbLayer.powerCurve || DEFAULT_POWER_CURVE) : null;
      if (aep) f.properties.aep_mwh = aep.aep_mwh;

      updateLayer(turbLayer.id, { features: [...turbLayer.features, f] });
      setLoadingWind(false);
      setRightTab('turbines');
    }
  };

  const finishPolygon = () => {
    if (!selectedLayer || drawingPoints.length < 3) return;
    const coords = [...drawingPoints, drawingPoints[0]];
    const f = createFeature(selectedLayerId,
      { type: 'Polygon', coordinates: [coords.map(([lat, lng]) => [lng, lat])] },
      { name: 'Site Boundary' }
    );
    updateLayer(selectedLayerId, { features: [...selectedLayer.features, f] });
    setDrawingPoints([]);
    setMode('select');
  };

  const deleteFeature = (layerId, featureId) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;
    updateLayer(layerId, { features: layer.features.filter(f => f.id !== featureId) });
    if (selectedFeatureId === featureId) setSelectedFeatureId(null);
  };

  const handleImportWind = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.geojson,.csv';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          const layer = geoJSONToLayer(data, file.name.replace(/\.[^.]+$/, ''));
          layer.type = 'wind_resource';
          layer.features = layer.features.map(f => ({ ...f, layerId: layer.id }));
          setLayers(prev => [...prev, layer]);
        } catch {
          alert('Invalid file format');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const fetchSiteWind = async () => {
    if (turbines.length === 0) return;
    setLoadingWind(true);
    const center = turbines[0];
    const [lng, lat] = center.geometry.coordinates;
    try {
      const windData = await fetchWindData(lat, lng);
      if (windData) setWindParams({ k: windData.k, lambda: windData.lambda });
      setWindFetched(true);
    } catch {}
    setLoadingWind(false);
  };

  // Computed stats
  const totalCapacity_mw = turbines.length * 3.5;
  const totalAEP = turbines.reduce((sum, t) => sum + (t.properties.aep_mwh || 0), 0);
  const avgCapFactor = totalCapacity_mw > 0 ? ((totalAEP / (totalCapacity_mw * 8760)) * 100).toFixed(1) : 0;
  const avgWindSpeed = turbines.length > 0
    ? (turbines.reduce((s, t) => s + (t.properties.hub_wind_speed || t.properties.wind_speed_ms || 0), 0) / turbines.length).toFixed(1)
    : null;

  // Monthly profile for chart
  const monthlyFactors = [1.25, 1.15, 1.1, 0.95, 0.8, 0.7, 0.72, 0.75, 0.9, 1.05, 1.15, 1.28];
  const monthlyData = ['J','F','M','A','M','J','J','A','S','O','N','D'].map((m, i) => ({
    m,
    e: totalAEP > 0 ? +((totalAEP / 12) * monthlyFactors[i]).toFixed(0) : 0,
  }));

  // Weibull chart data
  const weibullData = Array.from({ length: 25 }, (_, i) => i + 0.5).map(v => {
    const { k, lambda } = windParams;
    const pdf = k > 0 && lambda > 0
      ? (k / lambda) * Math.pow(v / lambda, k - 1) * Math.exp(-Math.pow(v / lambda, k))
      : 0;
    return { v: v.toFixed(0), f: +(pdf * 100).toFixed(2) };
  });

  const cursorStyle = { select: 'default', draw_polygon: 'crosshair', draw_point: 'crosshair', place_turbine: 'cell' }[mode] || 'default';

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Top toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border-b border-slate-800 flex-wrap gap-y-1 shrink-0">
        <Map className="w-4 h-4 text-emerald-400 shrink-0" />
        <input
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          className="bg-transparent text-sm font-medium text-white border-none outline-none w-44"
        />
        <div className="h-4 w-px bg-slate-700 mx-1" />

        {/* Mode buttons */}
        {[
          { id: 'select', label: 'Select', icon: MousePointer },
          { id: 'draw_polygon', label: 'Boundary', icon: Pentagon },
          { id: 'place_turbine', label: 'Place Turbine', icon: Wind },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setMode(id); setDrawingPoints([]); }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border",
              mode === id
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                : "bg-slate-800 text-slate-400 hover:text-white border-slate-700"
            )}
          >
            <Icon className="w-3 h-3" /> {label}
          </button>
        ))}

        {mode === 'draw_polygon' && drawingPoints.length >= 2 && (
          <button onClick={finishPolygon} className="px-2.5 py-1.5 rounded-lg text-xs bg-cyan-600/20 text-cyan-400 border border-cyan-500/40">
            Finish ({drawingPoints.length} pts)
          </button>
        )}

        {loadingWind && (
          <span className="flex items-center gap-1.5 text-xs text-amber-400">
            <RefreshCw className="w-3 h-3 animate-spin" /> Fetching real data...
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleImportWind} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-400 hover:text-white">
            <Upload className="w-3 h-3" /> Import Wind
          </button>
          <button onClick={() => downloadJSON(layersToGeoJSON(layers), `${projectName}.geojson`)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-400 hover:text-white">
            <Download className="w-3 h-3" /> Export
          </button>
          <button
            onClick={() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(layers)); setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2000); }}
            className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all",
              savedMsg ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "bg-slate-800 text-white border-slate-600 hover:bg-slate-700"
            )}
          >
            <Save className="w-3 h-3" /> {savedMsg ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        {/* Map */}
        <div className="flex-1 relative min-w-0" style={{ cursor: cursorStyle }}>
          <MapContainer center={[52.04, -1.5]} zoom={10} style={{ height: '100%', width: '100%' }} zoomControl>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
            <MapClickHandler mode={mode} onAddPoint={addPoint} onFinishPolygon={finishPolygon} />

            {layers.map(layer => {
              if (!layer.visible) return null;
              if (layer.type === 'wind_resource') return <WindResourceRenderer key={layer.id} layer={layer} />;

              return layer.features.map(f => {
                const pathOpts = { color: layer.color, fillColor: layer.color, fillOpacity: layer.fillOpacity, weight: layer.strokeWeight || 1.5, opacity: layer.strokeOpacity || 0.8 };

                if (f.geometry.type === 'Polygon') {
                  const positions = f.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
                  return <Polygon key={f.id} positions={positions} pathOptions={pathOpts}><Popup><b>{f.properties.name || layer.name}</b></Popup></Polygon>;
                }

                if (f.geometry.type === 'Point') {
                  const [lng, lat] = f.geometry.coordinates;
                  const isSelected = f.id === selectedFeatureId;
                  const icon = layer.type === 'turbine' ? turbineIcon(layer.color, isSelected) : undefined;
                  return (
                    <Marker key={f.id} position={[lat, lng]} icon={icon}
                      eventHandlers={{ click: () => { setSelectedFeatureId(f.id); setRightTab('turbines'); } }}
                    >
                      <Popup>
                        <div className="text-xs min-w-36">
                          <p className="font-bold mb-1" style={{ color: layer.color }}>{f.properties.name || layer.name}</p>
                          {f.properties.elevation_m != null && <p>Elevation: {f.properties.elevation_m}m</p>}
                          {f.properties.wind_speed_ms && <p>Wind (10m): {f.properties.wind_speed_ms} m/s</p>}
                          {f.properties.hub_wind_speed && <p>Wind (hub): {f.properties.hub_wind_speed} m/s</p>}
                          {f.properties.aep_mwh && <p>Est. AEP: {f.properties.aep_mwh} MWh/yr</p>}
                        </div>
                      </Popup>
                    </Marker>
                  );
                }
                return null;
              });
            })}

            {/* Drawing preview */}
            {drawingPoints.length > 0 && (
              <>
                <Polyline positions={drawingPoints} pathOptions={{ color: '#06b6d4', weight: 2, dashArray: '5 5' }} />
                {drawingPoints.map((pt, i) => (
                  <Circle key={i} center={pt} radius={40} pathOptions={{ color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 0.8, weight: 0 }} />
                ))}
              </>
            )}
          </MapContainer>

          {/* Mode hint */}
          {mode !== 'select' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 backdrop-blur-sm text-white text-xs font-medium px-4 py-2 rounded-full border border-slate-700 pointer-events-none">
              {mode === 'draw_polygon' && `Click to add vertices • Double-click to finish`}
              {mode === 'place_turbine' && 'Click map — real elevation & wind data fetched automatically'}
            </div>
          )}

          {/* KPI strip overlay */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex gap-3">
            {[
              { label: 'Turbines', value: turbines.length, color: 'text-emerald-400' },
              { label: 'Capacity', value: `${totalCapacity_mw.toFixed(1)} MW`, color: 'text-cyan-400' },
              { label: 'Est. AEP', value: totalAEP > 0 ? `${(totalAEP / 1000).toFixed(1)} GWh` : '—', color: 'text-purple-400' },
              { label: 'Cap. Factor', value: totalAEP > 0 ? `${avgCapFactor}%` : '—', color: 'text-orange-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-1.5 text-center">
                <p className={cn("text-sm font-bold leading-tight", color)}>{value}</p>
                <p className="text-[10px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right analysis panel */}
        <div className="w-72 shrink-0 flex flex-col bg-slate-900 border-l border-slate-800 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 shrink-0">
            {[
              { id: 'analysis', label: 'Analysis', icon: BarChart2 },
              { id: 'turbines', label: 'Turbines', icon: Wind },
              { id: 'layers', label: 'Layers', icon: Layers },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setRightTab(id)}
                className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors",
                  rightTab === id ? "text-white border-b-2 border-emerald-500" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Icon className="w-3 h-3" /> {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* ANALYSIS TAB */}
            {rightTab === 'analysis' && (
              <div className="p-3 space-y-4">
                {/* Wind params */}
                <div className="bg-slate-800/60 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300">Wind Distribution</span>
                    {!windFetched && (
                      <button onClick={fetchSiteWind} disabled={loadingWind || turbines.length === 0}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                        <RefreshCw className={cn("w-3 h-3", loadingWind && "animate-spin")} />
                        Fetch real
                      </button>
                    )}
                    {windFetched && <span className="text-[10px] text-emerald-400">✓ Real data</span>}
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Shape k', key: 'k', min: 1, max: 4, step: 0.1 },
                      { label: 'Scale λ (m/s)', key: 'lambda', min: 3, max: 15, step: 0.5 },
                    ].map(({ label, key, min, max, step }) => (
                      <div key={key}>
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="text-slate-500">{label}</span>
                          <span className="text-cyan-400 font-medium">{windParams[key]}</span>
                        </div>
                        <input type="range" min={min} max={max} step={step} value={windParams[key]}
                          onChange={e => setWindParams(p => ({ ...p, [key]: parseFloat(e.target.value) }))}
                          className="w-full accent-cyan-500 h-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weibull chart */}
                <div>
                  <p className="text-[10px] text-slate-500 mb-1.5">Wind Speed Distribution</p>
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={weibullData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="v" tick={{ fill: '#64748b', fontSize: 8 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 8 }} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '6px', fontSize: 10 }} formatter={v => [`${v}%`]} />
                      <Area type="monotone" dataKey="f" stroke="#06b6d4" strokeWidth={1.5} fill="url(#wg)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* AEP summary */}
                {totalAEP > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-500 mb-1.5">Monthly Energy Profile (est.)</p>
                    <ResponsiveContainer width="100%" height={80}>
                      <BarChart data={monthlyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                        <XAxis dataKey="m" tick={{ fill: '#64748b', fontSize: 8 }} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 8 }} />
                        <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '6px', fontSize: 10 }} formatter={v => [`${v} MWh`]} />
                        <Bar dataKey="e" fill="#10b981" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {[
                        { l: 'Gross AEP', v: `${(totalAEP * 1.1 / 1000).toFixed(1)} GWh`, c: 'text-cyan-400' },
                        { l: 'Net AEP', v: `${(totalAEP / 1000).toFixed(1)} GWh`, c: 'text-emerald-400' },
                        { l: 'Cap. Factor', v: `${avgCapFactor}%`, c: 'text-purple-400' },
                        { l: 'Avg Wind', v: avgWindSpeed ? `${avgWindSpeed} m/s` : '—', c: 'text-orange-400' },
                      ].map(({ l, v, c }) => (
                        <div key={l} className="bg-slate-800/60 rounded-lg p-2 text-center">
                          <p className={cn("text-sm font-bold", c)}>{v}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">{l}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {turbines.length === 0 && (
                  <div className="text-center py-6 text-slate-600 text-xs">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Place turbines on the map to see analysis
                  </div>
                )}
              </div>
            )}

            {/* TURBINES TAB */}
            {rightTab === 'turbines' && (
              <div className="p-3 space-y-2">
                {turbines.length === 0 && (
                  <div className="text-center py-6 text-slate-600 text-xs">
                    <Wind className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No turbines placed yet.<br />Select "Place Turbine" mode and click the map.
                  </div>
                )}
                {turbines.map((t, i) => {
                  const isSelected = t.id === selectedFeatureId;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedFeatureId(isSelected ? null : t.id)}
                      className={cn(
                        "rounded-xl border p-3 cursor-pointer transition-all",
                        isSelected ? "bg-emerald-500/10 border-emerald-500/30" : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-white">{t.properties.name || `T${i + 1}`}</span>
                        <button onClick={e => { e.stopPropagation(); deleteFeature(turbineLayer.id, t.id); }}
                          className="p-0.5 text-slate-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                        {t.properties.elevation_m != null && <span className="text-slate-500">Elev: <span className="text-slate-300">{t.properties.elevation_m}m</span></span>}
                        {t.properties.wind_speed_ms && <span className="text-slate-500">Wind 10m: <span className="text-cyan-400">{t.properties.wind_speed_ms} m/s</span></span>}
                        {t.properties.hub_wind_speed && <span className="text-slate-500">Hub wind: <span className="text-emerald-400">{t.properties.hub_wind_speed} m/s</span></span>}
                        {t.properties.aep_mwh && <span className="text-slate-500">AEP: <span className="text-purple-400">{t.properties.aep_mwh} MWh</span></span>}
                      </div>
                    </div>
                  );
                })}

                {turbines.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-1">
                    <div className="flex justify-between"><span>Total capacity:</span><span className="text-white font-medium">{totalCapacity_mw.toFixed(1)} MW</span></div>
                    <div className="flex justify-between"><span>Total AEP:</span><span className="text-emerald-400 font-medium">{(totalAEP / 1000).toFixed(2)} GWh/yr</span></div>
                    <div className="flex justify-between"><span>Capacity factor:</span><span className="text-purple-400 font-medium">{avgCapFactor}%</span></div>
                  </div>
                )}
              </div>
            )}

            {/* LAYERS TAB */}
            {rightTab === 'layers' && (
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-300">Layers</span>
                  <div className="flex gap-1">
                    <button onClick={() => addLayer('polygon', 'New Zone')} className="p-1 text-slate-500 hover:text-white text-[10px] flex items-center gap-0.5">
                      <Plus className="w-3 h-3" /> Zone
                    </button>
                    <button onClick={() => addLayer('turbine', 'Turbines')} className="p-1 text-slate-500 hover:text-emerald-400 text-[10px] flex items-center gap-0.5">
                      <Plus className="w-3 h-3" /> Turbine Layer
                    </button>
                  </div>
                </div>
                {layers.map(layer => (
                  <div
                    key={layer.id}
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                      layer.id === selectedLayerId ? "bg-slate-700 border-slate-600" : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                    )}
                  >
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: layer.color }} />
                    <span className="flex-1 text-xs text-slate-300 truncate">{layer.name}</span>
                    <span className="text-[10px] text-slate-600">{layer.features.length}</span>
                    <button onClick={e => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                      className="text-slate-500 hover:text-white p-0.5">
                      {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                    <button onClick={e => { e.stopPropagation(); setLayers(prev => prev.filter(l => l.id !== layer.id)); }}
                      className="text-slate-600 hover:text-red-400 p-0.5">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}