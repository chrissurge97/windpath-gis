import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Polyline,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';
import {
  Wind, Zap, Map, MousePointer, Pentagon, Trash2, Download,
  Upload, RefreshCw, Plus, Eye, EyeOff, BarChart2, Target,
  Save, Layers, Settings, X, Satellite, Mountain
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { createLayer, createFeature, geoJSONToLayer, downloadJSON, layersToGeoJSON, DEFAULT_POWER_CURVE, windAtHubHeight, calcTurbineAEP } from '@/lib/gisUtils';
import { fetchElevation, fetchWindData } from '@/lib/planningUtils';
import WindResourceRenderer from '@/components/gis/WindResourceLayer';
import TurbineDataTable from '@/components/planning/TurbineDataTable';
import CableDataTable from '@/components/planning/CableDataTable';
import TurbineTypeEditor from '@/components/planning/TurbineTypeEditor';
import { DEFAULT_TURBINE_TYPES, DEFAULT_CABLE_TYPES } from '@/lib/turbineTypes';
import { exportKML } from '@/lib/exportKMZ';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const turbineIcon = (color = '#10b981', selected = false) => L.divIcon({
  html: `<div style="width:${selected ? 26 : 20}px;height:${selected ? 26 : 20}px;background:${color};border:${selected ? '3px' : '2px'} solid ${selected ? 'white' : 'rgba(255,255,255,0.5)'};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 8px ${color}99">
    <div style="width:2px;height:${selected ? 14 : 10}px;background:white;position:absolute;"></div>
    <div style="width:${selected ? 12 : 9}px;height:2px;background:white;position:absolute;transform:rotate(60deg);transform-origin:left center;left:50%;margin-top:-4px;"></div>
    <div style="width:${selected ? 12 : 9}px;height:2px;background:white;position:absolute;transform:rotate(-60deg);transform-origin:left center;left:50%;margin-top:4px;"></div>
  </div>`,
  className: '',
  iconSize: [selected ? 26 : 20, selected ? 26 : 20],
  iconAnchor: [selected ? 13 : 10, selected ? 13 : 10],
});

// ── Haversine distance ──────────────────────────────────────────────────────
function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function MapClickHandler({ mode, onAddPoint, onFinishPolygon }) {
  const lastClickTime = useRef(0);
  useMapEvents({
    click(e) {
      if (!['place_turbine', 'draw_polygon', 'draw_cable'].includes(mode)) return;
      const now = Date.now();
      // Suppress the spurious single-click that fires just before dblclick
      if (now - lastClickTime.current < 350) {
        // This is the second tap of a double-tap — finish polygon instead
        if (mode === 'draw_polygon') { e.originalEvent.preventDefault(); onFinishPolygon(); }
        lastClickTime.current = 0;
        return;
      }
      lastClickTime.current = now;
      // Delay the single-click action so we can cancel it if dblclick follows
      const latlng = e.latlng;
      setTimeout(() => {
        if (Date.now() - lastClickTime.current >= 300) {
          onAddPoint(latlng);
        }
      }, 300);
    },
    dblclick(e) {
      if (mode === 'draw_polygon') { e.originalEvent.preventDefault(); lastClickTime.current = 0; onFinishPolygon(); }
    },
  });
  return null;
}

const STORAGE_KEY = 'planning_v3_ire';

export default function Planning() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [layers, setLayers] = useState(() => {
    try {
      const d = localStorage.getItem(STORAGE_KEY);
      const parsed = d ? JSON.parse(d) : null;
      if (parsed?.layers) return parsed.layers;
    } catch {}
    return [
      createLayer({ name: 'Site Boundary', type: 'polygon', color: '#06b6d4', fillOpacity: 0.1 }),
      createLayer({ name: 'Turbines', type: 'turbine', color: '#10b981', fillOpacity: 0.8 }),
      createLayer({ name: 'Cables', type: 'cable', color: '#f97316', fillOpacity: 0.8 }),
    ];
  });

  const [turbineTypes, setTurbineTypes] = useState(() => {
    try { const d = localStorage.getItem(STORAGE_KEY); const p = d ? JSON.parse(d) : null; if (p?.turbineTypes) return p.turbineTypes; } catch {}
    return DEFAULT_TURBINE_TYPES;
  });

  const [cableTypes, setCableTypes] = useState(() => {
    try { const d = localStorage.getItem(STORAGE_KEY); const p = d ? JSON.parse(d) : null; if (p?.cableTypes) return p.cableTypes; } catch {}
    return DEFAULT_CABLE_TYPES;
  });

  const [selectedTurbineTypeId, setSelectedTurbineTypeId] = useState(turbineTypes[0]?.id);
  const [selectedCableTypeId, setSelectedCableTypeId] = useState(cableTypes[0]?.id);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [mode, setMode] = useState('select');
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState(null);
  const [rightTab, setRightTab] = useState('turbines');
  const [loadingWind, setLoadingWind] = useState(false);
  const [windFetched, setWindFetched] = useState(false);
  const [projectName, setProjectName] = useState('Wind Farm Project');
  const [savedMsg, setSavedMsg] = useState(false);
  const [windParams, setWindParams] = useState({ k: 2.0, lambda: 8.0 });

  // Map display state
  const [satelliteView, setSatelliteView] = useState(false);
  const [showElevation, setShowElevation] = useState(false);
  const [showWindLayer, setShowWindLayer] = useState(true);
  const [showSubstations, setShowSubstations] = useState(true);
  const [substations, setSubstations] = useState([]);
  const [loadingSubstations, setLoadingSubstations] = useState(false);
  const [substationError, setSubstationError] = useState(false);

  // Turbine popup menu state
  const [turbineMenuFeature, setTurbineMenuFeature] = useState(null);
  const [turbineMenuTypeId, setTurbineMenuTypeId] = useState(null);
  const [turbineMenuName, setTurbineMenuName] = useState('');
  const [turbineMenuRadius, setTurbineMenuRadius] = useState(500);
  const [turbineMenuShowRadius, setTurbineMenuShowRadius] = useState(false);
  const [turbineRadii, setTurbineRadii] = useState({}); // featureId -> { radius, show }

  // Fetch substations from Overpass API
  const fetchSubstations = useCallback(() => {
    setLoadingSubstations(true);
    setSubstationError(false);
    const overpassQuery = `[out:json][timeout:30];(node["power"="substation"](51.2,-10.7,55.5,-5.9);way["power"="substation"](51.2,-10.7,55.5,-5.9);relation["power"="substation"](51.2,-10.7,55.5,-5.9););out center;`;
    fetch(`https://overpass-api.de/api/interpreter`, {
      method: 'POST',
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
      .then(r => r.json())
      .then(data => {
        const pts = (data.elements || []).map(el => ({
          id: el.id,
          lat: el.lat ?? el.center?.lat,
          lng: el.lon ?? el.center?.lon,
          name: el.tags?.name || el.tags?.operator || 'Substation',
          voltage: el.tags?.voltage || '',
          type: el.tags?.substation || '',
        })).filter(p => p.lat && p.lng);
        setSubstations(pts);
      })
      .catch(() => setSubstationError(true))
      .finally(() => setLoadingSubstations(false));
  }, []);

  useEffect(() => {
    if (!showSubstations || substations.length > 0 || loadingSubstations) return;
    fetchSubstations();
  }, [showSubstations]);

  const turbineLayer = layers.find(l => l.type === 'turbine');
  const cableLayer = layers.find(l => l.type === 'cable');
  const turbines = turbineLayer?.features || [];
  const cables = cableLayer?.features || [];

  const selectedTurbineType = turbineTypes.find(t => t.id === selectedTurbineTypeId) || turbineTypes[0];
  const selectedCableType = cableTypes.find(t => t.id === selectedCableTypeId) || cableTypes[0];

  // ── Persist ────────────────────────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ layers, turbineTypes, cableTypes })); } catch {}
  }, [layers, turbineTypes, cableTypes]);

  const updateLayer = useCallback((id, changes) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...changes } : l));
  }, []);

  // ── Map interactions ───────────────────────────────────────────────────────
  const addPoint = async (latlng) => {
    if (mode === 'draw_polygon') {
      setDrawingPoints(prev => [...prev, [latlng.lat, latlng.lng]]);
      return;
    }

    if (mode === 'draw_cable') {
      setDrawingPoints(prev => {
        const next = [...prev, [latlng.lat, latlng.lng]];
        // Auto-finish cable after 2 points
        if (next.length === 2) {
          const len = haversineM(next[0][0], next[0][1], next[1][0], next[1][1]);
          const cLayer = layers.find(l => l.type === 'cable');
          if (!cLayer) return [];
          const f = createFeature(cLayer.id,
            { type: 'LineString', coordinates: next.map(([lat, lng]) => [lng, lat]) },
            {
              name: `Cable ${cLayer.features.length + 1}`,
              cable_type_id: selectedCableTypeId,
              length_m: +len.toFixed(0),
            }
          );
          updateLayer(cLayer.id, { features: [...cLayer.features, f] });
          setMode('draw_cable'); // keep mode for next cable
          return [];
        }
        return next;
      });
      return;
    }

    if (mode === 'place_turbine') {
      setLoadingWind(true);
      let elevation = null;
      let wind_speed_ms = null;

      try { elevation = await fetchElevation(latlng.lat, latlng.lng); } catch {}
      try {
        const windData = await fetchWindData(latlng.lat, latlng.lng);
        wind_speed_ms = windData?.mean_speed;
        if (windData) { setWindParams({ k: windData.k, lambda: windData.lambda }); setWindFetched(true); }
      } catch {}

      const tt = selectedTurbineType;
      const hubHeight = tt.hub_height_m;
      const hubSpeed = wind_speed_ms ? windAtHubHeight(wind_speed_ms, 10, hubHeight) : null;
      const turbLayer = layers.find(l => l.type === 'turbine');
      if (!turbLayer) { setLoadingWind(false); return; }

      // Build a custom power curve based on turbine type specs
      const pc = DEFAULT_POWER_CURVE.map(pt => ({
        v: pt.v,
        p_kw: pt.v >= tt.cut_in_ms && pt.v <= tt.cut_out_ms
          ? Math.min(tt.rated_power_mw * 1000, pt.p_kw * (tt.rated_power_mw / 3.5))
          : 0,
      }));

      const f = createFeature(turbLayer.id,
        { type: 'Point', coordinates: [latlng.lng, latlng.lat] },
        {
          name: `T${turbLayer.features.length + 1}`,
          turbine_type_id: tt.id,
          hub_height: hubHeight,
          rotor_diameter: tt.rotor_diameter_m,
          rated_power_mw: tt.rated_power_mw,
          elevation_m: elevation,
          wind_speed_ms,
          hub_wind_speed: hubSpeed,
        }
      );

      if (hubSpeed) {
        const aep = calcTurbineAEP(hubSpeed, pc);
        if (aep) f.properties.aep_mwh = aep.aep_mwh;
      }

      updateLayer(turbLayer.id, {
        features: [...turbLayer.features, f],
        color: selectedTurbineType.color,
      });
      setLoadingWind(false);
      setRightTab('turbines');
    }
  };

  const finishPolygon = () => {
    if (!selectedLayerId || drawingPoints.length < 3) return;
    const layer = layers.find(l => l.id === selectedLayerId);
    if (!layer) return;
    const f = createFeature(selectedLayerId,
      { type: 'Polygon', coordinates: [drawingPoints.map(([lat, lng]) => [lng, lat])] },
      { name: 'Site Boundary' }
    );
    updateLayer(selectedLayerId, { features: [...layer.features, f] });
    setDrawingPoints([]);
    setMode('select');
  };

  const deleteFeature = (layerId, featureId) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;
    updateLayer(layerId, { features: layer.features.filter(f => f.id !== featureId) });
  };

  const updateTurbineProps = (featureId, props) => {
    if (!turbineLayer) return;
    updateLayer(turbineLayer.id, {
      features: turbineLayer.features.map(f => f.id === featureId ? { ...f, properties: props } : f)
    });
  };

  const openTurbineMenu = (f) => {
    setTurbineMenuFeature(f);
    setTurbineMenuTypeId(f.properties.turbine_type_id || turbineTypes[0]?.id);
    setTurbineMenuName(f.properties.name || '');
    const existing = turbineRadii[f.id];
    setTurbineMenuRadius(existing?.radius || 500);
    setTurbineMenuShowRadius(existing?.show || false);
  };

  const applyTurbineMenu = () => {
    if (!turbineMenuFeature) return;
    const tt = turbineTypes.find(t => t.id === turbineMenuTypeId) || turbineTypes[0];
    updateTurbineProps(turbineMenuFeature.id, {
      ...turbineMenuFeature.properties,
      name: turbineMenuName || turbineMenuFeature.properties.name,
      turbine_type_id: tt.id,
      rated_power_mw: tt.rated_power_mw,
      rotor_diameter: tt.rotor_diameter_m,
      hub_height: tt.hub_height_m,
    });
    setTurbineRadii(prev => ({
      ...prev,
      [turbineMenuFeature.id]: { radius: turbineMenuRadius, show: turbineMenuShowRadius },
    }));
    setTurbineMenuFeature(null);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,.geojson';
    input.onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          const layer = geoJSONToLayer(data, file.name.replace(/\.[^.]+$/, ''));
          setLayers(prev => [...prev, layer]);
        } catch { alert('Invalid file'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // ── Computed stats ─────────────────────────────────────────────────────────
  const totalCapacity_mw = turbines.reduce((s, t) => s + (t.properties.rated_power_mw || selectedTurbineType?.rated_power_mw || 3.5), 0);
  const totalAEP = turbines.reduce((s, t) => s + (t.properties.aep_mwh || 0), 0);
  const avgCapFactor = totalCapacity_mw > 0 ? ((totalAEP / (totalCapacity_mw * 8760)) * 100).toFixed(1) : 0;
  const avgWindSpeed = turbines.length > 0
    ? (turbines.reduce((s, t) => s + (t.properties.hub_wind_speed || 0), 0) / turbines.length).toFixed(1)
    : null;
  const totalCableLength = cables.reduce((s, c) => s + (c.properties.length_m || 0), 0);
  const totalCableCost = cables.reduce((s, c) => {
    const ct = cableTypes.find(t => t.id === c.properties.cable_type_id) || selectedCableType;
    return s + (c.properties.length_m || 0) * (ct?.cost_per_m || 0);
  }, 0);

  const monthlyFactors = [1.25, 1.15, 1.1, 0.95, 0.8, 0.7, 0.72, 0.75, 0.9, 1.05, 1.15, 1.28];
  const monthlyData = ['J','F','M','A','M','J','J','A','S','O','N','D'].map((m, i) => ({
    m, e: totalAEP > 0 ? +((totalAEP / 12) * monthlyFactors[i]).toFixed(0) : 0,
  }));

  const weibullData = Array.from({ length: 25 }, (_, i) => i + 0.5).map(v => {
    const { k, lambda } = windParams;
    const pdf = k > 0 && lambda > 0 ? (k / lambda) * Math.pow(v / lambda, k - 1) * Math.exp(-Math.pow(v / lambda, k)) : 0;
    return { v: v.toFixed(0), f: +(pdf * 100).toFixed(2) };
  });

  const cursorStyle = { select: 'default', draw_polygon: 'crosshair', place_turbine: 'cell', draw_cable: 'crosshair' }[mode] || 'default';

  const TOOLBAR_MODES = [
    { id: 'select', label: 'Select', icon: MousePointer },
    { id: 'draw_polygon', label: 'Boundary', icon: Pentagon },
    { id: 'place_turbine', label: 'Place Turbine', icon: Wind },
    { id: 'draw_cable', label: 'Draw Cable', icon: Zap },
  ];

  const RIGHT_TABS = [
    { id: 'turbines', label: 'Turbines', icon: Wind },
    { id: 'cables', label: 'Cables', icon: Zap },
    { id: 'analysis', label: 'Analysis', icon: BarChart2 },
    { id: 'layers', label: 'Layers', icon: Layers },
    { id: 'types', label: 'Types', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border-b border-slate-800 flex-wrap shrink-0">
        <Map className="w-4 h-4 text-emerald-400 shrink-0" />
        <input
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          className="bg-transparent text-sm font-medium text-white border-none outline-none w-44"
        />
        <div className="h-4 w-px bg-slate-700 mx-1" />

        {TOOLBAR_MODES.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setMode(id); setDrawingPoints([]); setTurbineMenuFeature(null); }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border",
              mode === id ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "bg-slate-800 text-slate-400 hover:text-white border-slate-700"
            )}
          >
            <Icon className="w-3 h-3" /> {label}
          </button>
        ))}

        {mode === 'draw_polygon' && drawingPoints.length >= 2 && (
          <button onClick={finishPolygon}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-cyan-600/20 text-cyan-400 border border-cyan-500/40">
            Finish ({drawingPoints.length} pts)
          </button>
        )}

        {loadingWind && (
          <span className="flex items-center gap-1.5 text-xs text-amber-400">
            <RefreshCw className="w-3 h-3 animate-spin" /> Fetching real data...
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleImport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-400 hover:text-white">
            <Upload className="w-3 h-3" /> Import
          </button>
          <button onClick={() => downloadJSON(layersToGeoJSON(layers), `${projectName}.geojson`)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-400 hover:text-white">
            <Download className="w-3 h-3" /> GeoJSON
          </button>
          <button
            onClick={() => exportKML(layers, turbineTypes, cableTypes, substations, showSubstations, projectName)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-emerald-800/40 border border-emerald-700/50 text-emerald-300 hover:bg-emerald-700/40"
            title="Export as KML — opens in ArcGIS, QGIS, Google Earth (georeferenced)"
          >
            <Download className="w-3 h-3" /> KML
          </button>
          <button
            onClick={() => { localStorage.setItem(STORAGE_KEY, JSON.stringify({ layers, turbineTypes, cableTypes })); setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2000); }}
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
          <MapContainer center={[53.5, -8.0]} zoom={7} style={{ height: '100%', width: '100%' }} zoomControl>
            {satelliteView ? (
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Tiles &copy; Esri"
                maxZoom={19}
              />
            ) : (
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
            )}
            {showElevation && (
              <TileLayer
                url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}"
                attribution="Shaded Relief &copy; Esri"
                opacity={0.5}
              />
            )}
            <MapClickHandler mode={mode} onAddPoint={addPoint} onFinishPolygon={finishPolygon} />

            {layers.map(layer => {
              if (!layer.visible) return null;
              if (layer.type === 'wind_resource') return <WindResourceRenderer key={layer.id} layer={layer} />;

              return layer.features.map(f => {
                const pathOpts = { color: layer.color, fillColor: layer.color, fillOpacity: layer.fillOpacity, weight: layer.strokeWeight || 2, opacity: layer.strokeOpacity || 0.9 };

                if (f.geometry.type === 'Polygon') {
                  const positions = f.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
                  return <Polygon key={f.id} positions={positions} pathOptions={pathOpts}
                    bubblingMouseEvents={false}
                    eventHandlers={{
                      click: (e) => {
                        // In place_turbine / draw_cable / draw_polygon mode, let the click bubble to the map handler
                        if (['place_turbine', 'draw_cable', 'draw_polygon'].includes(mode)) {
                          addPoint(e.latlng);
                        }
                      }
                    }}>
                    {mode === 'select' && <Popup><b>{f.properties.name || layer.name}</b></Popup>}
                  </Polygon>;
                }

                if (f.geometry.type === 'LineString') {
                  const ct = cableTypes.find(t => t.id === f.properties.cable_type_id) || cableTypes[0];
                  const positions = f.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
                  return <Polyline key={f.id} positions={positions}
                    pathOptions={{ color: ct?.color || '#f97316', weight: 3, opacity: 0.85 }}>
                    <Popup>
                      <div className="text-xs min-w-28">
                        <p className="font-bold mb-1">{f.properties.name}</p>
                        <p>Type: {ct?.name}</p>
                        <p>Length: {(f.properties.length_m / 1000).toFixed(2)} km</p>
                        <p>Cost: £{(f.properties.length_m * (ct?.cost_per_m || 0)).toFixed(0)}</p>
                      </div>
                    </Popup>
                  </Polyline>;
                }

                if (f.geometry.type === 'Point') {
                  const [lng, lat] = f.geometry.coordinates;
                  const isSelected = f.id === selectedFeatureId;
                  const tt = turbineTypes.find(t => t.id === f.properties.turbine_type_id) || selectedTurbineType;
                  const icon = layer.type === 'turbine' ? turbineIcon(tt?.color || layer.color, isSelected) : undefined;
                  const radiusConfig = turbineRadii[f.id];
                  return (
                    <React.Fragment key={f.id}>
                      <Marker position={[lat, lng]} icon={icon}
                        eventHandlers={{
                          click: (e) => {
                            if (mode === 'select') {
                              L.DomEvent.stopPropagation(e);
                              setSelectedFeatureId(f.id);
                              openTurbineMenu(f);
                            }
                          }
                        }} />
                      {radiusConfig?.show && (
                        <Circle center={[lat, lng]} radius={radiusConfig.radius}
                          pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.06, weight: 1.5, dashArray: '5 4', opacity: 0.7 }} />
                      )}
                    </React.Fragment>
                  );
                }
                return null;
              });
            })}

            {/* Drawing preview */}
            {drawingPoints.length > 0 && (
              <>
                <Polyline positions={drawingPoints}
                  pathOptions={{ color: mode === 'draw_cable' ? '#f97316' : '#06b6d4', weight: 2, dashArray: '5 5' }} />
                {drawingPoints.map((pt, i) => (
                  <Circle key={i} center={pt} radius={40}
                    pathOptions={{ color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 0.8, weight: 0 }} />
                ))}
              </>
            )}

            {/* Wind speed heatmap circles */}
            {showWindLayer && turbines.map(t => {
              const spd = t.properties.hub_wind_speed;
              if (!spd) return null;
              const [lng, lat] = t.geometry.coordinates;
              const color = spd >= 10 ? '#ef4444' : spd >= 8 ? '#f59e0b' : spd >= 6 ? '#10b981' : '#3b82f6';
              return (
                <Circle key={`wind-${t.id}`} center={[lat, lng]} radius={800}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.18, weight: 0 }}>
                  <Popup><span className="text-xs font-medium">{t.properties.name} — {spd} m/s hub wind</span></Popup>
                </Circle>
              );
            })}

            {/* ESB Substations */}
            {showSubstations && substations.map(s => {
              const substIcon = L.divIcon({
                html: `<div style="width:10px;height:10px;background:#facc15;border:2px solid #fff;border-radius:2px;box-shadow:0 0 4px #facc1599"></div>`,
                className: '', iconSize: [10, 10], iconAnchor: [5, 5],
              });
              return (
                <Marker key={`sub-${s.id}`} position={[s.lat, s.lng]} icon={substIcon}>
                  <Popup>
                    <div className="text-xs">
                      <p className="font-bold">{s.name}</p>
                      {s.voltage && <p className="text-slate-500">{s.voltage} kV</p>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Map layer toggles */}
          <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5">
            <button onClick={() => setSatelliteView(v => !v)}
              className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all shadow-lg",
                satelliteView ? "bg-blue-500/30 text-blue-300 border-blue-500/50" : "bg-slate-900/90 text-slate-400 border-slate-700 hover:text-white"
              )}>
              <Satellite className="w-3 h-3" /> Satellite
            </button>
            <button onClick={() => setShowElevation(v => !v)}
              className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all shadow-lg",
                showElevation ? "bg-amber-500/30 text-amber-300 border-amber-500/50" : "bg-slate-900/90 text-slate-400 border-slate-700 hover:text-white"
              )}>
              <Mountain className="w-3 h-3" /> Elevation
            </button>
            <button onClick={() => setShowWindLayer(v => !v)}
              className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all shadow-lg",
                showWindLayer ? "bg-cyan-500/30 text-cyan-300 border-cyan-500/50" : "bg-slate-900/90 text-slate-400 border-slate-700 hover:text-white"
              )}>
              <Wind className="w-3 h-3" /> Wind
            </button>
            <button onClick={() => {
                if (substationError) { fetchSubstations(); return; }
                setShowSubstations(v => !v);
              }}
              className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all shadow-lg",
                substationError ? "bg-red-500/30 text-red-300 border-red-500/50" :
                showSubstations && substations.length > 0 ? "bg-yellow-500/30 text-yellow-300 border-yellow-500/50" :
                showSubstations ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
                "bg-slate-900/90 text-slate-400 border-slate-700 hover:text-white"
              )}>
              <Zap className="w-3 h-3" />
              {loadingSubstations ? 'Loading…' : substationError ? 'Retry' : `Substations${substations.length > 0 ? ` (${substations.length})` : ''}`}
            </button>
          </div>

          {/* Mode hint */}
          {mode !== 'select' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 backdrop-blur-sm text-white text-xs font-medium px-4 py-2 rounded-full border border-slate-700 pointer-events-none">
              {mode === 'draw_polygon' && `Click to add vertices • Double-click to finish`}
              {mode === 'place_turbine' && `Placing: ${selectedTurbineType?.manufacturer} ${selectedTurbineType?.model} — click map`}
              {mode === 'draw_cable' && `Click two points to draw a cable route (${selectedCableType?.name})`}
            </div>
          )}

          {/* Turbine popup menu */}
          {turbineMenuFeature && (() => {
            const [lng, lat] = turbineMenuFeature.geometry.coordinates;
            const props = turbineMenuFeature.properties;
            const menuTt = turbineTypes.find(t => t.id === turbineMenuTypeId) || turbineTypes[0];
            return (
              <div className="absolute top-14 left-4 z-[1200] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 w-72">
                <div className="flex items-center justify-between mb-3">
                  <input
                    value={turbineMenuName}
                    onChange={e => setTurbineMenuName(e.target.value)}
                    className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-sm font-bold text-white outline-none flex-1 mr-2"
                    placeholder="Turbine name"
                  />
                  <button onClick={() => setTurbineMenuFeature(null)} className="text-slate-500 hover:text-white shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Info row */}
                <div className="grid grid-cols-2 gap-1.5 mb-3 text-[10px]">
                  {props.elevation_m != null && <div className="bg-slate-800 rounded px-2 py-1"><span className="text-slate-500">Elevation</span><br /><span className="text-white font-medium">{props.elevation_m}m</span></div>}
                  {props.hub_wind_speed && <div className="bg-slate-800 rounded px-2 py-1"><span className="text-slate-500">Hub wind</span><br /><span className="text-cyan-400 font-medium">{props.hub_wind_speed} m/s</span></div>}
                  {props.aep_mwh && <div className="bg-slate-800 rounded px-2 py-1"><span className="text-slate-500">AEP</span><br /><span className="text-emerald-400 font-medium">{(props.aep_mwh/1000).toFixed(2)} GWh</span></div>}
                  <div className="bg-slate-800 rounded px-2 py-1"><span className="text-slate-500">Position</span><br /><span className="text-white font-medium">{lat.toFixed(4)}, {lng.toFixed(4)}</span></div>
                </div>

                {/* Turbine type selector */}
                <div className="mb-3">
                  <label className="text-[10px] text-slate-400 block mb-1">Turbine Type</label>
                  <select
                    value={turbineMenuTypeId}
                    onChange={e => setTurbineMenuTypeId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 outline-none"
                  >
                    {turbineTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.manufacturer} {t.model} ({t.rated_power_mw} MW)</option>
                    ))}
                  </select>
                  {menuTt && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Ø{menuTt.rotor_diameter_m}m · {menuTt.hub_height_m}m hub · {menuTt.cut_in_ms}–{menuTt.cut_out_ms} m/s
                    </p>
                  )}
                </div>

                {/* Setback radius */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-slate-400">Setback / Assessment Radius</label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={turbineMenuShowRadius} onChange={e => setTurbineMenuShowRadius(e.target.checked)} className="accent-orange-500 w-3 h-3" />
                      <span className="text-[10px] text-slate-400">Show on map</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="range" min={100} max={5000} step={50} value={turbineMenuRadius}
                      onChange={e => setTurbineMenuRadius(+e.target.value)}
                      className="flex-1 accent-orange-500 h-1" />
                    <span className="text-[10px] text-orange-400 font-medium w-14 text-right">{turbineMenuRadius}m</span>
                  </div>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {[500, 1000, 2000, 3000].map(r => (
                      <button key={r} onClick={() => setTurbineMenuRadius(r)}
                        className={cn("px-2 py-0.5 rounded text-[10px] border transition-colors",
                          turbineMenuRadius === r ? "bg-orange-500/20 border-orange-500/40 text-orange-400" : "bg-slate-800 border-slate-700 text-slate-500 hover:text-white"
                        )}>
                        {r >= 1000 ? `${r/1000}km` : `${r}m`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={applyTurbineMenu}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors">
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      turbineLayer && deleteFeature(turbineLayer.id, turbineMenuFeature.id);
                      setTurbineRadii(prev => { const n = { ...prev }; delete n[turbineMenuFeature.id]; return n; });
                      setTurbineMenuFeature(null);
                    }}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* KPI strip overlay */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex gap-2 flex-wrap justify-center">
            {[
              { label: 'Turbines', value: turbines.length, color: 'text-emerald-400' },
              { label: 'Capacity', value: `${totalCapacity_mw.toFixed(1)} MW`, color: 'text-cyan-400' },
              { label: 'Est. AEP', value: totalAEP > 0 ? `${(totalAEP / 1000).toFixed(1)} GWh` : '—', color: 'text-purple-400' },
              { label: 'Cap. Factor', value: totalAEP > 0 ? `${avgCapFactor}%` : '—', color: 'text-orange-400' },
              { label: 'Cable Cost', value: totalCableCost > 0 ? `€${(totalCableCost / 1000).toFixed(0)}k` : '—', color: 'text-yellow-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-1.5 text-center">
                <p className={cn("text-sm font-bold leading-tight", color)}>{value}</p>
                <p className="text-[10px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-80 shrink-0 flex flex-col bg-slate-900 border-l border-slate-800 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 shrink-0 overflow-x-auto">
            {RIGHT_TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setRightTab(id)}
                className={cn("flex-1 flex items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors whitespace-nowrap px-1 shrink-0",
                  rightTab === id ? "text-white border-b-2 border-emerald-500" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Icon className="w-3 h-3 shrink-0" /> {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {/* TURBINES TAB */}
            {rightTab === 'turbines' && (
              <TurbineDataTable
                turbines={turbines}
                turbineTypes={turbineTypes}
                selectedTypeId={selectedTurbineTypeId}
                onSelectType={setSelectedTurbineTypeId}
                onDeleteTurbine={(id) => turbineLayer && deleteFeature(turbineLayer.id, id)}
                onUpdateTurbine={updateTurbineProps}
                turbineLayer={turbineLayer}
              />
            )}

            {/* CABLES TAB */}
            {rightTab === 'cables' && (
              <CableDataTable
                cables={cables}
                cableTypes={cableTypes}
                selectedCableTypeId={selectedCableTypeId}
                onSelectCableType={setSelectedCableTypeId}
                onDeleteCable={(id) => cableLayer && deleteFeature(cableLayer.id, id)}
                onUpdateCableType={(id, vals) => setCableTypes(prev => prev.map(ct => ct.id === id ? vals : ct))}
              />
            )}

            {/* ANALYSIS TAB */}
            {rightTab === 'analysis' && (
              <div className="space-y-4">
                <div className="bg-slate-800/60 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300">Wind Distribution</span>
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
                          className="w-full accent-cyan-500 h-1" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-slate-500 mb-1.5">Wind Speed Distribution</p>
                  <ResponsiveContainer width="100%" height={90}>
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

                {totalAEP > 0 ? (
                  <>
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1.5">Monthly Energy Profile</p>
                      <ResponsiveContainer width="100%" height={80}>
                        <BarChart data={monthlyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                          <XAxis dataKey="m" tick={{ fill: '#64748b', fontSize: 8 }} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 8 }} />
                          <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '6px', fontSize: 10 }} formatter={v => [`${v} MWh`]} />
                          <Bar dataKey="e" fill="#10b981" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { l: 'Gross AEP', v: `${(totalAEP * 1.1 / 1000).toFixed(1)} GWh`, c: 'text-cyan-400' },
                        { l: 'Net AEP', v: `${(totalAEP / 1000).toFixed(1)} GWh`, c: 'text-emerald-400' },
                        { l: 'Cap. Factor', v: `${avgCapFactor}%`, c: 'text-purple-400' },
                        { l: 'Avg Hub Wind', v: avgWindSpeed ? `${avgWindSpeed} m/s` : '—', c: 'text-orange-400' },
                        { l: 'Cable Length', v: `${(totalCableLength / 1000).toFixed(2)} km`, c: 'text-yellow-400' },
                        { l: 'Cable Cost', v: `€${(totalCableCost / 1000).toFixed(0)}k`, c: 'text-red-400' },
                      ].map(({ l, v, c }) => (
                        <div key={l} className="bg-slate-800/60 rounded-lg p-2 text-center">
                          <p className={cn("text-sm font-bold", c)}>{v}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">{l}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 text-slate-600 text-xs">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Place turbines to see analysis
                  </div>
                )}
              </div>
            )}

            {/* LAYERS TAB */}
            {rightTab === 'layers' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-300">Map Layers</span>
                  <button onClick={() => {
                    const l = createLayer({ name: 'New Zone', type: 'polygon', color: '#8b5cf6' });
                    setLayers(prev => [...prev, l]);
                  }} className="p-1 text-slate-500 hover:text-white text-[10px] flex items-center gap-0.5">
                    <Plus className="w-3 h-3" /> Add Zone
                  </button>
                </div>
                {layers.map(layer => (
                  <div key={layer.id} onClick={() => setSelectedLayerId(layer.id)}
                    className={cn("flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                      layer.id === selectedLayerId ? "bg-slate-700 border-slate-600" : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                    )}>
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: layer.color }} />
                    <span className="flex-1 text-xs text-slate-300 truncate">{layer.name}</span>
                    <span className="text-[10px] text-slate-600 shrink-0">{layer.features.length}</span>
                    <button onClick={e => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                      className="text-slate-500 hover:text-white p-0.5 shrink-0">
                      {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                    {!['turbine','cable'].includes(layer.type) && (
                      <button onClick={e => { e.stopPropagation(); setLayers(prev => prev.filter(l => l.id !== layer.id)); }}
                        className="text-slate-600 hover:text-red-400 p-0.5 shrink-0">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* TYPES TAB */}
            {rightTab === 'types' && (
              <TurbineTypeEditor
                turbineTypes={turbineTypes}
                onUpdate={(id, vals) => setTurbineTypes(prev => prev.map(t => t.id === id ? { ...t, ...vals } : t))}
                onAdd={(tt) => setTurbineTypes(prev => [...prev, tt])}
                onDelete={(id) => setTurbineTypes(prev => prev.filter(t => t.id !== id))}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}