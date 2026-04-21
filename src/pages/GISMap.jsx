import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Polyline,
  useMapEvents, LayersControl, GeoJSON
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';
import {
  Map, Save, Download, ChevronLeft, ChevronRight, Settings,
  MousePointer, Pentagon, Trash2, Wind, Layers, AlertTriangle, Info
} from 'lucide-react';

import LayerPanel from '@/components/gis/LayerPanel';
import LayerStyleEditor from '@/components/gis/LayerStyleEditor';
import SchemaEditor from '@/components/gis/SchemaEditor';
import FeaturePanel from '@/components/gis/FeaturePanel';
import PowerCurveEditor from '@/components/gis/PowerCurveEditor';
import AddLayerDialog from '@/components/gis/AddLayerDialog';
import WindResourceRenderer from '@/components/gis/WindResourceLayer';
import { createLayer, createFeature, geoJSONToLayer, downloadJSON, layersToGeoJSON, DEFAULT_POWER_CURVE, sampleWindSpeed, windAtHubHeight } from '@/lib/gisUtils';

// ── Leaflet icon fix ──────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const turbineIcon = (color = '#10b981') => L.divIcon({
  html: `<div style="width:22px;height:22px;background:${color};border:2px solid rgba(255,255,255,0.6);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 6px ${color}88">
    <div style="width:2px;height:12px;background:white;position:absolute;"></div>
    <div style="width:10px;height:2px;background:white;position:absolute;transform:rotate(60deg);transform-origin:left center;left:50%;margin-top:-4px;"></div>
    <div style="width:10px;height:2px;background:white;position:absolute;transform:rotate(-60deg);transform-origin:left center;left:50%;margin-top:4px;"></div>
  </div>`,
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const pointIcon = (color = '#06b6d4') => L.divIcon({
  html: `<div style="width:12px;height:12px;background:${color};border:2px solid rgba(255,255,255,0.7);border-radius:50%;"></div>`,
  className: '',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

// ── Drawing handler ───────────────────────────────────────────────────────
function MapInteraction({ mode, onAddPoint, onFinishPolygon, drawingPoints }) {
  useMapEvents({
    click(e) {
      if (mode === 'draw_polygon' || mode === 'draw_point' || mode === 'place_turbine') {
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

const STORAGE_KEY = 'gis_layers_v2';

function saveLayers(layers) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layers)); } catch {}
}
function loadLayers() {
  try { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : null; } catch { return null; }
}

export default function GISMap() {
  const [layers, setLayers] = useState(() => loadLayers() || [
    createLayer({ name: 'Wind Resource', type: 'wind_resource', color: '#06b6d4', fillOpacity: 0.35 }),
  ]);
  const [selectedLayerId, setSelectedLayerId] = useState(layers[0]?.id || null);
  const [mode, setMode] = useState('select'); // 'select' | 'draw_polygon' | 'draw_point' | 'place_turbine'
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [showAddLayer, setShowAddLayer] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState('features'); // 'features' | 'style' | 'schema'
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [projectName, setProjectName] = useState('My GIS Project');
  const [savedMsg, setSavedMsg] = useState(false);

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  // Auto-initialise first wind resource layer with demo cells
  useEffect(() => {
    const windLayer = layers.find(l => l.type === 'wind_resource');
    if (windLayer && windLayer.features.length === 0) {
      const cells = [];
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          const lat = 52.0 + i * 0.08;
          const lng = -1.6 + j * 0.1;
          cells.push(createFeature(windLayer.id,
            { type: 'Point', center: [lat, lng], coordinates: [lng, lat] },
            { wind_speed_ms: +(6 + Math.random() * 5).toFixed(1), elevation_m: Math.round(50 + Math.random() * 150), cell_radius_m: 4500 }
          ));
        }
      }
      updateLayer(windLayer.id, { features: cells });
    }
  }, []);

  useEffect(() => { saveLayers(layers); }, [layers]);

  const updateLayer = (id, changes) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...changes } : l));
  };

  const addLayer = (type, name, extras = {}) => {
    const layer = createLayer({ type, name, ...extras });
    if (type === 'turbine' && !layer.powerCurve) layer.powerCurve = DEFAULT_POWER_CURVE;
    // fix feature layerIds
    layer.features = (layer.features || []).map(f => ({ ...f, layerId: layer.id }));
    setLayers(prev => [...prev, layer]);
    setSelectedLayerId(layer.id);
  };

  const deleteLayer = (id) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(layers.find(l => l.id !== id)?.id || null);
  };

  const handleImport = (data, name) => {
    const layer = geoJSONToLayer(data, name);
    layer.features = layer.features.map(f => ({ ...f, layerId: layer.id }));
    setLayers(prev => [...prev, layer]);
    setSelectedLayerId(layer.id);
  };

  const addPoint = (latlng) => {
    if (!selectedLayer) return;

    if (mode === 'place_turbine') {
      const windLayer = layers.find(l => l.type === 'wind_resource' && l.visible);
      const rawSpeed = sampleWindSpeed(windLayer, latlng.lat, latlng.lng);
      const hubHeight = 100;
      const hubSpeed = rawSpeed ? windAtHubHeight(rawSpeed, 10, hubHeight) : null;
      const f = createFeature(selectedLayerId,
        { type: 'Point', coordinates: [latlng.lng, latlng.lat] },
        {
          name: `T${selectedLayer.features.length + 1}`,
          hub_height: hubHeight,
          rotor_diameter: 130,
          rated_power_mw: 3.5,
          hub_wind_speed: hubSpeed || '',
          _powerCurve: selectedLayer.powerCurve || DEFAULT_POWER_CURVE,
        }
      );
      updateLayer(selectedLayerId, { features: [...selectedLayer.features, f] });
      return;
    }

    if (mode === 'draw_point') {
      const f = createFeature(selectedLayerId,
        { type: 'Point', coordinates: [latlng.lng, latlng.lat] },
        {}
      );
      updateLayer(selectedLayerId, { features: [...selectedLayer.features, f] });
      return;
    }

    if (mode === 'draw_polygon') {
      setDrawingPoints(prev => [...prev, [latlng.lat, latlng.lng]]);
    }
  };

  const finishPolygon = () => {
    if (!selectedLayer || drawingPoints.length < 3) return;
    const coords = [...drawingPoints, drawingPoints[0]];
    const f = createFeature(selectedLayerId,
      { type: 'Polygon', coordinates: [coords.map(([lat, lng]) => [lng, lat])] },
      {}
    );
    updateLayer(selectedLayerId, { features: [...selectedLayer.features, f] });
    setDrawingPoints([]);
    setMode('select');
  };

  const deleteFeature = (featureId) => {
    if (!selectedLayer) return;
    updateLayer(selectedLayerId, { features: selectedLayer.features.filter(f => f.id !== featureId) });
  };

  const updateFeature = (featureId, changes) => {
    if (!selectedLayer) return;
    updateLayer(selectedLayerId, {
      features: selectedLayer.features.map(f => f.id === featureId ? { ...f, ...changes } : f)
    });
  };

  const handleSave = () => {
    saveLayers(layers);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const handleExportAll = () => downloadJSON(layersToGeoJSON(layers), `${projectName}.geojson`);

  const cursorStyle = {
    select: 'default',
    draw_polygon: 'crosshair',
    draw_point: 'crosshair',
    place_turbine: 'cell',
  }[mode] || 'default';

  const modeButtons = [
    { id: 'select', label: 'Select', icon: MousePointer },
    { id: 'draw_polygon', label: 'Polygon', icon: Pentagon },
    { id: 'draw_point', label: 'Point', icon: Layers },
    ...(selectedLayer?.type === 'turbine' ? [{ id: 'place_turbine', label: 'Turbine', icon: Wind }] : []),
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border-b border-slate-800 shrink-0 flex-wrap gap-y-1">
        <Map className="w-4 h-4 text-emerald-400 shrink-0" />
        <input
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          className="bg-transparent text-sm font-medium text-white border-none outline-none w-36"
        />

        <div className="h-4 w-px bg-slate-700 mx-1" />

        {/* Mode buttons */}
        {modeButtons.map(({ id, label, icon: Icon }) => (
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

        {mode === 'draw_polygon' && drawingPoints.length > 0 && (
          <>
            <button
              onClick={finishPolygon}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-cyan-600/20 text-cyan-400 border border-cyan-500/40"
            >
              Finish ({drawingPoints.length} pts)
            </button>
            <button
              onClick={() => setDrawingPoints([])}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-3 h-3" /> Cancel
            </button>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleExportAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <Download className="w-3 h-3" /> Export All
          </button>
          <button
            onClick={handleSave}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all",
              savedMsg ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "bg-slate-800 text-white border-slate-600 hover:bg-slate-700"
            )}
          >
            <Save className="w-3 h-3" /> {savedMsg ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 min-h-0">

        {/* Left panel — layers */}
        <div className={cn("flex transition-all duration-200 shrink-0", leftCollapsed ? "w-0 overflow-hidden" : "w-56")}>
          <div className="flex flex-col w-56 h-full">
            <LayerPanel
              layers={layers}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onToggleLayer={id => updateLayer(id, { visible: !layers.find(l => l.id === id)?.visible })}
              onDeleteLayer={deleteLayer}
              onAddLayer={() => setShowAddLayer(true)}
              onUpdateLayer={updateLayer}
              onImport={handleImport}
            />
          </div>
        </div>
        <button
          onClick={() => setLeftCollapsed(c => !c)}
          className="w-4 bg-slate-800 border-r border-slate-700 flex items-center justify-center text-slate-600 hover:text-white hover:bg-slate-700 transition-colors shrink-0 z-10"
        >
          {leftCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        {/* Map */}
        <div className="flex-1 relative min-w-0" style={{ cursor: cursorStyle }}>
          <MapContainer
            center={[52.04, -1.5]}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; CARTO'
            />

            <MapInteraction
              mode={mode}
              onAddPoint={addPoint}
              onFinishPolygon={finishPolygon}
              drawingPoints={drawingPoints}
            />

            {/* Render all layers */}
            {layers.map(layer => {
              if (!layer.visible) return null;

              if (layer.type === 'wind_resource') {
                return <WindResourceRenderer key={layer.id} layer={layer} />;
              }

              return layer.features.map((f, fi) => {
                const pathOpts = {
                  color: layer.color,
                  fillColor: layer.color,
                  fillOpacity: layer.fillOpacity,
                  weight: layer.strokeWeight,
                  opacity: layer.strokeOpacity,
                };

                if (f.geometry.type === 'Polygon') {
                  const positions = f.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
                  return (
                    <Polygon key={f.id} positions={positions} pathOptions={pathOpts}>
                      <Popup>
                        <div className="text-xs min-w-32">
                          <p className="font-bold text-slate-700 mb-1">{layer.name}</p>
                          {Object.entries(f.properties).map(([k, v]) => (
                            !k.startsWith('_') && <p key={k}><span className="text-slate-500">{k}:</span> {String(v)}</p>
                          ))}
                        </div>
                      </Popup>
                    </Polygon>
                  );
                }

                if (f.geometry.type === 'Point') {
                  const [lng, lat] = f.geometry.coordinates;
                  const icon = layer.type === 'turbine' ? turbineIcon(layer.color) : pointIcon(layer.color);
                  return (
                    <Marker key={f.id} position={[lat, lng]} icon={icon}>
                      <Popup>
                        <div className="text-xs min-w-36">
                          <p className="font-bold mb-1" style={{ color: layer.color }}>{f.properties.name || layer.name}</p>
                          {Object.entries(f.properties).filter(([k]) => !k.startsWith('_')).map(([k, v]) => (
                            <p key={k}><span className="text-slate-500">{k}:</span> {String(v)}</p>
                          ))}
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
                <Polyline
                  positions={drawingPoints}
                  pathOptions={{ color: '#06b6d4', weight: 2, dashArray: '5 5' }}
                />
                {drawingPoints.map((pt, i) => (
                  <Circle key={i} center={pt} radius={30}
                    pathOptions={{ color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 0.8, weight: 0 }} />
                ))}
              </>
            )}
          </MapContainer>

          {/* Mode hint */}
          {mode !== 'select' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 backdrop-blur-sm text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg border border-slate-700 pointer-events-none">
              {mode === 'draw_polygon' && `Click to add vertices • Double-click to finish${drawingPoints.length > 0 ? ` (${drawingPoints.length} pts)` : ''}`}
              {mode === 'draw_point' && 'Click to place point'}
              {mode === 'place_turbine' && 'Click to place turbine — wind speed sampled automatically'}
            </div>
          )}
        </div>

        {/* Right panel — properties */}
        <button
          onClick={() => setRightCollapsed(c => !c)}
          className="w-4 bg-slate-800 border-l border-slate-700 flex items-center justify-center text-slate-600 hover:text-white hover:bg-slate-700 transition-colors shrink-0 z-10"
        >
          {rightCollapsed ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        <div className={cn("flex flex-col transition-all duration-200 shrink-0 bg-slate-900 border-l border-slate-800", rightCollapsed ? "w-0 overflow-hidden" : "w-64")}>
          {/* Tabs */}
          <div className="flex border-b border-slate-800 shrink-0">
            {['features', 'style', 'schema'].map(tab => (
              <button
                key={tab}
                onClick={() => setRightPanelTab(tab)}
                className={cn(
                  "flex-1 py-2 text-[11px] font-medium capitalize transition-colors",
                  rightPanelTab === tab ? "text-white border-b-2 border-emerald-500" : "text-slate-500 hover:text-slate-300"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {rightPanelTab === 'features' && (
              <FeaturePanel
                layer={selectedLayer}
                features={selectedLayer?.features || []}
                allLayers={layers}
                onUpdateFeature={updateFeature}
                onDeleteFeature={deleteFeature}
              />
            )}
            {rightPanelTab === 'style' && (
              <LayerStyleEditor layer={selectedLayer} onUpdate={updateLayer} />
            )}
            {rightPanelTab === 'schema' && (
              <>
                <SchemaEditor layer={selectedLayer} onUpdate={updateLayer} />
                {selectedLayer?.type === 'turbine' && (
                  <PowerCurveEditor layer={selectedLayer} onUpdate={updateLayer} />
                )}
              </>
            )}
          </div>

          {/* Layer info footer */}
          {selectedLayer && (
            <div className="shrink-0 px-3 py-2 border-t border-slate-800 text-[10px] text-slate-600">
              {selectedLayer.name} · {selectedLayer.features.length} features · {selectedLayer.type}
            </div>
          )}
        </div>
      </div>

      {showAddLayer && (
        <AddLayerDialog
          onAdd={addLayer}
          onClose={() => setShowAddLayer(false)}
        />
      )}
    </div>
  );
}