import React, { useState } from 'react';
import { X, Map, Wind, Layers, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const LAYER_TYPES = [
  { id: 'polygon', label: 'Polygon Layer', desc: 'Draw and annotate polygon features', icon: Map },
  { id: 'turbine', label: 'Turbine Layer', desc: 'Place wind turbines with power curves', icon: Wind },
  { id: 'wind_resource', label: 'Wind Resource', desc: 'Wind speed grid (import or auto-fill)', icon: BarChart2 },
  { id: 'point', label: 'Point Layer', desc: 'General point features', icon: Layers },
];

const DEFAULT_WIND_CELLS = () => {
  // Generate a simple 5x5 grid around a UK location as demo data
  const cells = [];
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      const lat = 52.0 + i * 0.08;
      const lng = -1.6 + j * 0.1;
      cells.push({
        id: `w_${i}_${j}`,
        layerId: null,
        geometry: { type: 'Point', center: [lat, lng], coordinates: [lng, lat] },
        properties: {
          wind_speed_ms: +(6 + Math.random() * 5).toFixed(1),
          elevation_m: Math.round(50 + Math.random() * 150),
          cell_radius_m: 4500,
        },
      });
    }
  }
  return cells;
};

export default function AddLayerDialog({ onAdd, onClose }) {
  const [type, setType] = useState('polygon');
  const [name, setName] = useState('');

  const handleAdd = () => {
    const layerName = name.trim() || LAYER_TYPES.find(t => t.id === type)?.label || 'New Layer';
    const extras = {};
    if (type === 'wind_resource') {
      extras.features = DEFAULT_WIND_CELLS();
      extras.schema = [
        { key: 'wind_speed_ms', label: 'Wind Speed (m/s)', type: 'number' },
        { key: 'elevation_m', label: 'Elevation (m)', type: 'number' },
        { key: 'cell_radius_m', label: 'Cell Radius (m)', type: 'number' },
      ];
    }
    if (type === 'turbine') {
      extras.schema = [
        { key: 'name', label: 'Name', type: 'string' },
        { key: 'hub_height', label: 'Hub Height (m)', type: 'number' },
        { key: 'rotor_diameter', label: 'Rotor Diameter (m)', type: 'number' },
        { key: 'rated_power_mw', label: 'Rated Power (MW)', type: 'number' },
        { key: 'hub_wind_speed', label: 'Hub Wind Speed (m/s)', type: 'number' },
      ];
    }
    onAdd(type, layerName, extras);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-80 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Add Layer</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-2 mb-4">
          {LAYER_TYPES.map(lt => {
            const Icon = lt.icon;
            return (
              <button
                key={lt.id}
                onClick={() => setType(lt.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                  type === lt.id ? "bg-emerald-500/10 border-emerald-500/40 text-white" : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", type === lt.id ? "text-emerald-400" : "text-slate-500")} />
                <div>
                  <p className="text-sm font-medium">{lt.label}</p>
                  <p className="text-[10px] text-slate-500">{lt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Layer name (optional)"
          className="w-full text-sm bg-slate-800 text-white rounded-lg px-3 py-2 border border-slate-700 outline-none focus:border-slate-500 mb-3 placeholder:text-slate-600"
        />

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleAdd} className="flex-1 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors">Add Layer</button>
        </div>
      </div>
    </div>
  );
}