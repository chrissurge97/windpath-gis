import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, ArrowUp, ArrowDown, Trash2, ChevronRight, ChevronDown, MapPin, Minus } from 'lucide-react';
import L from 'leaflet';
import LayerBulkMenu from './LayerBulkMenu';

// Approximate polygon area in km² using the shoelace formula with haversine
function polygonAreaKm2(ring) {
  // ring: array of [lng, lat] (GeoJSON order), closing vertex included
  const pts = ring.slice(0, -1); // remove closing duplicate
  if (pts.length < 3) return 0;
  const R = 6371; // km
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [lon1, lat1] = pts[i];
    const [lon2, lat2] = pts[(i + 1) % pts.length];
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const mLat = ((lat1 + lat2) / 2) * Math.PI / 180;
    area += dLon * Math.cos(mLat);
  }
  return Math.abs(area) * R * R / 2;
}

function featureAreaLabel(f) {
  if (f.geometry?.type !== 'Polygon') return null;
  const ring = f.geometry.coordinates?.[0];
  if (!ring || ring.length < 4) return null;
  const km2 = polygonAreaKm2(ring);
  if (km2 < 0.01) return `${(km2 * 100).toFixed(1)} ha`;
  return `${km2.toFixed(2)} km²`;
}

function geomLabel(f) {
  const g = f.geometry;
  if (!g) return '';
  if (g.type === 'Point') {
    const [lng, lat] = g.coordinates;
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
  if (g.type === 'LineString') return `${g.coordinates.length} pts`;
  if (g.type === 'Polygon') {
    const area = featureAreaLabel(f);
    return area || `${(g.coordinates[0]?.length || 0) - 1} verts`;
  }
  return '';
}

export default function LayerList({
  layers,
  selectedLayerId,
  setSelectedLayerId,
  updateLayer,
  setLayers,
  mapRef,
}) {
  const [editingLayerId, setEditingLayerId] = useState(null);
  const [editingLayerName, setEditingLayerName] = useState('');
  const [expandedLayerIds, setExpandedLayerIds] = useState(new Set());

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpandedLayerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-300">Map Layers</span>
      </div>
      <p className="text-[9px] text-slate-600">Higher layers render on top. Use ↑↓ to reorder.</p>
      {layers.map((layer, idx) => {
        const isExpanded = expandedLayerIds.has(layer.id);
        const hasFeatures = layer.features.length > 0;
        return (
          <div key={layer.id}>
            <div
              onClick={() => {
                setSelectedLayerId(layer.id);
                window.__trainingEvent__ = { type: 'layer_selected', payload: { layerName: layer.name }, ts: Date.now() };
                if (mapRef.current && layer.features.length > 0) {
                  const allPts = layer.features.flatMap(f => {
                    const g = f.geometry;
                    if (g.type === 'Point') return [[g.coordinates[1], g.coordinates[0]]];
                    if (g.type === 'LineString') return g.coordinates.map(([lng, lat]) => [lat, lng]);
                    if (g.type === 'Polygon') return g.coordinates[0].map(([lng, lat]) => [lat, lng]);
                    return [];
                  });
                  if (allPts.length > 0) mapRef.current.flyToBounds(L.latLngBounds(allPts), { padding: [60, 60], animate: true, duration: 0.8 });
                }
              }}
              className={cn(
                "flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer transition-all",
                layer.id === selectedLayerId ? "bg-slate-700 border-slate-600" : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
              )}
            >
              {/* Expand toggle */}
              <button
                onClick={e => toggleExpand(layer.id, e)}
                className={cn("p-0.5 text-slate-600 hover:text-slate-300 transition-colors shrink-0", !hasFeatures && "opacity-20 pointer-events-none")}
              >
                {isExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
              </button>

              <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: layer.color }} />
              {editingLayerId === layer.id ? (
                <input
                  autoFocus
                  value={editingLayerName}
                  onChange={e => setEditingLayerName(e.target.value)}
                  onBlur={() => {
                    if (editingLayerName.trim()) updateLayer(layer.id, { name: editingLayerName.trim() });
                    setEditingLayerId(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (editingLayerName.trim()) updateLayer(layer.id, { name: editingLayerName.trim() });
                      setEditingLayerId(null);
                    } else if (e.key === 'Escape') {
                      setEditingLayerId(null);
                    }
                  }}
                  onClick={e => e.stopPropagation()}
                  className="flex-1 bg-slate-700 border border-slate-500 rounded px-2 py-0.5 text-xs text-white outline-none"
                />
              ) : (
                <span
                  className="flex-1 text-xs text-slate-300 truncate cursor-text hover:text-slate-200"
                  onClick={e => {
                    e.stopPropagation();
                    setEditingLayerId(layer.id);
                    setEditingLayerName(layer.name);
                  }}
                >
                  {layer.name}
                </span>
              )}
              {layer.no_turbines && <span className="text-[9px] text-red-400 shrink-0" title="No turbines allowed">⛔</span>}
              {layer.bulkSetbackM > 0 && <span className="text-[9px] text-cyan-600 shrink-0" title={`Setback: ${layer.bulkSetbackM}m`}>📏</span>}
              <span className="text-[10px] text-slate-600 shrink-0">{layer.features.length}</span>

              {/* Z-order controls */}
              <div className="flex flex-col gap-0 shrink-0">
                <button
                  disabled={idx === 0}
                  onClick={e => {
                    e.stopPropagation();
                    setLayers(prev => {
                      const a = [...prev];
                      [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]];
                      return a;
                    });
                  }}
                  className="p-0.5 text-slate-600 hover:text-white disabled:opacity-20"
                >
                  <ArrowUp className="w-2.5 h-2.5" />
                </button>
                <button
                  disabled={idx === layers.length - 1}
                  onClick={e => {
                    e.stopPropagation();
                    setLayers(prev => {
                      const a = [...prev];
                      [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]];
                      return a;
                    });
                  }}
                  className="p-0.5 text-slate-600 hover:text-white disabled:opacity-20"
                >
                  <ArrowDown className="w-2.5 h-2.5" />
                </button>
              </div>

              <button
                onClick={e => {
                  e.stopPropagation();
                  updateLayer(layer.id, { visible: !layer.visible });
                  window.__trainingEvent__ = { type: 'layer_visibility_toggled', payload: { layerId: layer.id }, ts: Date.now() };
                }}
                className="text-slate-500 hover:text-white p-0.5 shrink-0"
              >
                {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </button>

              {!['turbine', 'cable', 'substation'].includes(layer.type) && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setLayers(prev => prev.filter(l => l.id !== layer.id));
                  }}
                  className="text-slate-600 hover:text-red-400 p-0.5 shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}

              <LayerBulkMenu layer={layer} updateLayer={updateLayer} />
            </div>

            {/* Expanded features list */}
            {isExpanded && hasFeatures && (
              <div className="ml-6 mt-0.5 space-y-0.5 border-l border-slate-700 pl-2">
                {layer.features.map(f => {
                  const name = f.properties?.name || f.id?.slice(0, 8) || '—';
                  const geo = geomLabel(f);
                  const area = f.geometry?.type === 'Polygon' ? featureAreaLabel(f) : null;
                  return (
                    <div
                      key={f.id}
                      onClick={() => {
                        if (!mapRef.current) return;
                        const g = f.geometry;
                        if (g.type === 'Point') {
                          const [lng, lat] = g.coordinates;
                          mapRef.current.flyTo([lat, lng], 14, { animate: true, duration: 0.6 });
                        } else if (g.type === 'Polygon') {
                          const pts = g.coordinates[0].map(([lng, lat]) => [lat, lng]);
                          mapRef.current.flyToBounds(L.latLngBounds(pts), { padding: [40, 40], animate: true, duration: 0.6 });
                        } else if (g.type === 'LineString') {
                          const pts = g.coordinates.map(([lng, lat]) => [lat, lng]);
                          mapRef.current.flyToBounds(L.latLngBounds(pts), { padding: [40, 40], animate: true, duration: 0.6 });
                        }
                      }}
                      className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-700/50 cursor-pointer transition-colors group"
                    >
                      <Minus className="w-2 h-2 text-slate-700 shrink-0" />
                      <span className="text-[10px] text-slate-400 group-hover:text-slate-200 flex-1 truncate">{name}</span>
                      {area && <span className="text-[9px] text-cyan-600 shrink-0">{area}</span>}
                      {!area && geo && <span className="text-[9px] text-slate-600 shrink-0">{geo}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}