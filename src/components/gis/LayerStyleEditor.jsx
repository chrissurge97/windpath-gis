import React from 'react';
import { Palette } from 'lucide-react';

const PRESET_COLORS = [
  '#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#ec4899','#3b82f6','#84cc16','#f97316','#ffffff',
];

export default function LayerStyleEditor({ layer, onUpdate }) {
  if (!layer) return null;

  return (
    <div className="space-y-3 p-3 border-t border-slate-800">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <Palette className="w-3 h-3" /> Style
      </p>

      {/* Color presets */}
      <div>
        <p className="text-[10px] text-slate-500 mb-1.5">Fill Color</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => onUpdate(layer.id, { color: c })}
              className="w-5 h-5 rounded border-2 transition-all"
              style={{
                background: c,
                borderColor: layer.color === c ? '#fff' : 'transparent',
              }}
            />
          ))}
        </div>
        <input
          type="color"
          value={layer.color}
          onChange={e => onUpdate(layer.id, { color: e.target.value })}
          className="w-full h-7 rounded cursor-pointer bg-transparent border border-slate-700"
        />
      </div>

      {/* Fill opacity */}
      <div>
        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
          <span>Fill Opacity</span>
          <span className="text-slate-300">{Math.round(layer.fillOpacity * 100)}%</span>
        </div>
        <input
          type="range" min="0" max="1" step="0.05"
          value={layer.fillOpacity}
          onChange={e => onUpdate(layer.id, { fillOpacity: parseFloat(e.target.value) })}
          className="w-full accent-cyan-500"
        />
      </div>

      {/* Stroke opacity */}
      <div>
        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
          <span>Border Opacity</span>
          <span className="text-slate-300">{Math.round(layer.strokeOpacity * 100)}%</span>
        </div>
        <input
          type="range" min="0" max="1" step="0.05"
          value={layer.strokeOpacity}
          onChange={e => onUpdate(layer.id, { strokeOpacity: parseFloat(e.target.value) })}
          className="w-full accent-cyan-500"
        />
      </div>

      {/* Stroke weight */}
      <div>
        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
          <span>Border Width</span>
          <span className="text-slate-300">{layer.strokeWeight}px</span>
        </div>
        <input
          type="range" min="0" max="6" step="0.5"
          value={layer.strokeWeight}
          onChange={e => onUpdate(layer.id, { strokeWeight: parseFloat(e.target.value) })}
          className="w-full accent-cyan-500"
        />
      </div>
    </div>
  );
}