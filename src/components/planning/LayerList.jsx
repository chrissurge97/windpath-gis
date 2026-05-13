import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import L from 'leaflet';

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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-300">Map Layers</span>
      </div>
      <p className="text-[9px] text-slate-600">Higher layers render on top. Use ↑↓ to reorder.</p>
      {layers.map((layer, idx) => (
        <div
          key={layer.id}
          onClick={() => {
            setSelectedLayerId(layer.id);
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
        </div>
      ))}
    </div>
  );
}