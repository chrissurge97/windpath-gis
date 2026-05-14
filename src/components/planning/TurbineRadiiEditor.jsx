/**
 * Inline editor for turbine-specific separation radii.
 * Shown inside the turbine popup menu.
 */
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESET_COLORS = ['#facc15', '#f97316', '#ef4444', '#06b6d4', '#10b981', '#8b5cf6'];

export default function TurbineRadiiEditor({ radii, onChange }) {
  const addRadius = () => {
    const used = new Set(radii.map(r => r.dMultiple));
    let d = 3;
    while (used.has(d)) d++;
    const newR = {
      id: crypto.randomUUID(),
      dMultiple: d,
      label: `${d}D`,
      color: PRESET_COLORS[radii.length % PRESET_COLORS.length],
      enabled: true,
      blockPlacement: false,
    };
    onChange([...radii, newR]);
  };

  const update = (id, changes) => {
    onChange(radii.map(r => r.id === id ? { ...r, ...changes } : r));
  };

  const remove = (id) => onChange(radii.filter(r => r.id !== id));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Separation Radii</span>
        <button
          onClick={addRadius}
          className="flex items-center gap-0.5 text-[10px] text-emerald-400 hover:text-emerald-300"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      {radii.length === 0 && (
        <p className="text-[10px] text-slate-600 italic">No radii configured. Click Add to create one.</p>
      )}

      {radii.map(r => {
        return (
          <div key={r.id} className="bg-slate-800/60 border border-slate-700 rounded-lg px-2.5 py-2 space-y-1.5">
            <div className="flex items-center gap-2">
              {/* On/off toggle */}
              <button
                onClick={() => update(r.id, { enabled: !r.enabled })}
                className={cn(
                  "w-7 h-3.5 rounded-full transition-colors relative shrink-0",
                  r.enabled ? "bg-emerald-500" : "bg-slate-600"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-transform",
                  r.enabled ? "translate-x-3.5" : "translate-x-0.5"
                )} />
              </button>

              {/* D-multiple input */}
              <div className="flex items-center gap-0.5">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={r.dMultiple}
                  onChange={e => {
                    const d = Math.max(1, parseInt(e.target.value) || 1);
                    update(r.id, { dMultiple: d, label: `${d}D` });
                  }}
                  className="w-10 bg-slate-700 border border-slate-600 text-white text-xs text-center rounded px-1 py-0.5 outline-none"
                />
                <span className="text-[10px] text-slate-400">D</span>
              </div>

              {/* Color dot picker */}
              <div className="flex gap-0.5">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => update(r.id, { color: c })}
                    style={{ background: c }}
                    className={cn(
                      "w-3.5 h-3.5 rounded-full border transition-transform",
                      r.color === c ? "border-white scale-110" : "border-transparent"
                    )}
                  />
                ))}
              </div>

              <button onClick={() => remove(r.id)} className="ml-auto text-slate-600 hover:text-red-400 shrink-0">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              {/* Block placement toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <div
                  onClick={() => update(r.id, { blockPlacement: !r.blockPlacement })}
                  className={cn(
                    "w-6 h-3 rounded-full transition-colors relative shrink-0",
                    r.blockPlacement ? "bg-red-500" : "bg-slate-600"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-2 h-2 rounded-full bg-white shadow transition-transform",
                    r.blockPlacement ? "translate-x-3" : "translate-x-0.5"
                  )} />
                </div>
                <span className={cn("text-[10px] font-medium", r.blockPlacement ? "text-red-400" : "text-slate-500")}>
                  {r.blockPlacement ? "⛔ Blocks placement" : "Allow inside"}
                </span>
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}