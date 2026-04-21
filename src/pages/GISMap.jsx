import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMapEvents, LayersControl } from 'react-leaflet';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Wind, Plus, Trash2, Save, Layers, Map, ZoomIn, ZoomOut,
  Eye, EyeOff, Info, AlertTriangle, CircleDot
} from 'lucide-react';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const turbineIcon = L.divIcon({
  html: `<div style="width:20px;height:20px;background:#10b981;border:2px solid #059669;border-radius:50%;display:flex;align-items:center;justify-content:center;">
    <div style="width:6px;height:6px;background:white;border-radius:50%;"></div>
  </div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const CONSTRAINT_LAYERS = [
  { id: 'wind_resource', label: 'Wind Resource', color: '#06b6d4', opacity: 0.3 },
  { id: 'protected_areas', label: 'Protected Areas', color: '#ef4444', opacity: 0.4 },
  { id: 'setback_zones', label: 'Setback Zones', color: '#f97316', opacity: 0.25 },
];

// Simulated constraint data
const MOCK_PROTECTED_AREAS = [
  [[52.05, -1.6], [52.05, -1.4], [51.95, -1.4], [51.95, -1.6]],
  [[52.15, -1.3], [52.15, -1.15], [52.05, -1.15], [52.05, -1.3]],
];

const MOCK_SETBACK_CIRCLES = [
  { lat: 52.02, lng: -1.52, radius: 600 },
  { lat: 52.08, lng: -1.35, radius: 500 },
  { lat: 51.98, lng: -1.4, radius: 550 },
];

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

function LayerPanel({ layers, onToggle }) {
  return (
    <div className="absolute top-4 right-4 z-[1000] bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl p-3 w-48">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Layers className="w-3 h-3" /> Layers
      </p>
      <div className="space-y-2">
        {CONSTRAINT_LAYERS.map(layer => (
          <button
            key={layer.id}
            onClick={() => onToggle(layer.id)}
            className="w-full flex items-center gap-2 text-xs text-left hover:text-white transition-colors"
          >
            <div className={cn(
              "w-5 h-5 rounded border flex items-center justify-center transition-all",
              layers[layer.id] ? "border-transparent" : "border-slate-600 bg-transparent"
            )} style={layers[layer.id] ? { background: layer.color } : {}}>
              {layers[layer.id] && <Eye className="w-2.5 h-2.5 text-white" />}
            </div>
            <span className={layers[layer.id] ? "text-slate-200" : "text-slate-500"}>{layer.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function InfoPanel({ turbines, onClear }) {
  const spacing = turbines.length > 1 ? 'Place turbines 7-10 rotor diameters apart' : null;

  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl p-3 w-52">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Info className="w-3 h-3" /> Site Info
      </p>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">Turbines placed</span>
          <span className="text-emerald-400 font-medium">{turbines.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Est. capacity</span>
          <span className="text-white font-medium">{(turbines.length * 3.5).toFixed(1)} MW</span>
        </div>
        {spacing && (
          <div className="mt-2 flex items-start gap-1.5 text-yellow-400/80 bg-yellow-500/10 rounded-lg p-2">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{spacing}</span>
          </div>
        )}
      </div>
      {turbines.length > 0 && (
        <button
          onClick={onClear}
          className="mt-3 w-full text-xs text-red-400 hover:text-red-300 transition-colors flex items-center justify-center gap-1"
        >
          <Trash2 className="w-3 h-3" /> Clear all turbines
        </button>
      )}
    </div>
  );
}

export default function GISMap() {
  const [turbines, setTurbines] = useState([]);
  const [mode, setMode] = useState('view'); // 'view' | 'place'
  const [visibleLayers, setVisibleLayers] = useState({
    wind_resource: true,
    protected_areas: true,
    setback_zones: false,
  });
  const [projectName, setProjectName] = useState('My Wind Project');
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ['windProjects'],
    queryFn: () => base44.entities.WindFarmProject.list(),
    initialData: [],
  });

  const saveProject = useMutation({
    mutationFn: (data) => projects.length > 0
      ? base44.entities.WindFarmProject.update(projects[0].id, data)
      : base44.entities.WindFarmProject.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['windProjects'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  });

  // Load saved turbines
  useEffect(() => {
    if (projects.length > 0 && projects[0].turbines?.length > 0) {
      setTurbines(projects[0].turbines);
    }
  }, [projects.length]);

  const handleMapClick = (latlng) => {
    if (mode !== 'place') return;
    setTurbines(prev => [...prev, {
      lat: latlng.lat,
      lng: latlng.lng,
      name: `T${prev.length + 1}`,
      hub_height: 100,
      rotor_diameter: 130,
      rated_power: 3.5,
    }]);
  };

  const toggleLayer = (id) => setVisibleLayers(prev => ({ ...prev, [id]: !prev[id] }));

  const handleSave = () => {
    saveProject.mutate({
      name: projectName,
      turbines,
      center_lat: 52.04,
      center_lng: -1.5,
      zoom: 11,
      status: 'in_progress',
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <Map className="w-4 h-4 text-emerald-400" />
        <input
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          className="bg-transparent text-sm font-medium text-white border-none outline-none flex-1"
        />
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setMode(m => m === 'place' ? 'view' : 'place')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              mode === 'place'
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
            )}
          >
            <CircleDot className="w-3 h-3" />
            {mode === 'place' ? 'Placing turbines...' : 'Place Turbine'}
          </button>
          <button
            onClick={handleSave}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              saved
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-slate-700 hover:bg-slate-600 text-white border border-slate-600"
            )}
          >
            <Save className="w-3 h-3" />
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ cursor: mode === 'place' ? 'crosshair' : 'default' }}>
        <MapContainer
          center={[52.04, -1.5]}
          zoom={11}
          style={{ height: '100%', width: '100%', background: '#0f172a' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
          />

          <MapClickHandler onMapClick={handleMapClick} />

          {/* Wind resource heatmap simulation */}
          {visibleLayers.wind_resource && [
            { lat: 52.05, lng: -1.55, r: 8000, color: '#06b6d4' },
            { lat: 52.02, lng: -1.48, r: 6000, color: '#0891b2' },
            { lat: 52.08, lng: -1.42, r: 7000, color: '#0e7490' },
          ].map((c, i) => (
            <Circle key={i} center={[c.lat, c.lng]} radius={c.r}
              pathOptions={{ color: c.color, fillColor: c.color, fillOpacity: 0.15, weight: 1, opacity: 0.4 }} />
          ))}

          {/* Protected areas */}
          {visibleLayers.protected_areas && MOCK_PROTECTED_AREAS.map((coords, i) => (
            <Polygon key={i} positions={coords}
              pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.25, weight: 1.5 }} />
          ))}

          {/* Setback zones */}
          {visibleLayers.setback_zones && MOCK_SETBACK_CIRCLES.map((c, i) => (
            <Circle key={i} center={[c.lat, c.lng]} radius={c.radius}
              pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.15, weight: 1, dashArray: '5,5' }} />
          ))}

          {/* Turbines */}
          {turbines.map((t, i) => (
            <Marker key={i} position={[t.lat, t.lng]} icon={turbineIcon}>
              <Popup className="dark-popup">
                <div className="bg-slate-900 text-white p-2 rounded-lg text-xs min-w-32">
                  <p className="font-bold text-emerald-400 mb-1">{t.name}</p>
                  <p>Hub: {t.hub_height}m</p>
                  <p>Rotor: {t.rotor_diameter}m</p>
                  <p>Rated: {t.rated_power} MW</p>
                  <button
                    onClick={() => setTurbines(prev => prev.filter((_, j) => j !== i))}
                    className="mt-2 text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <LayerPanel layers={visibleLayers} onToggle={toggleLayer} />
        <InfoPanel turbines={turbines} onClear={() => setTurbines([])} />

        {mode === 'place' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-emerald-600/90 backdrop-blur-sm text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg">
            Click on the map to place turbines
          </div>
        )}
      </div>
    </div>
  );
}