import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Plus, Trash2, Zap, RotateCcw } from 'lucide-react';
import { DEFAULT_POWER_CURVE } from '@/lib/gisUtils';

export default function PowerCurveEditor({ layer, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const curve = layer?.powerCurve || DEFAULT_POWER_CURVE;

  const updatePoint = (i, field, val) => {
    const updated = curve.map((p, j) => j === i ? { ...p, [field]: parseFloat(val) || 0 } : p);
    onUpdate(layer.id, { powerCurve: updated });
  };

  const addPoint = () => {
    const maxV = Math.max(...curve.map(p => p.v));
    onUpdate(layer.id, { powerCurve: [...curve, { v: maxV + 1, p_kw: 0 }] });
  };

  const removePoint = (i) => {
    onUpdate(layer.id, { powerCurve: curve.filter((_, j) => j !== i) });
  };

  const reset = () => onUpdate(layer.id, { powerCurve: DEFAULT_POWER_CURVE });

  if (!layer || layer.type !== 'turbine') return null;

  return (
    <div className="border-t border-slate-800 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-3 h-3" /> Power Curve
        </p>
        <div className="flex gap-1">
          <button onClick={reset} title="Reset to default" className="p-1 text-slate-500 hover:text-yellow-400 transition-colors">
            <RotateCcw className="w-3 h-3" />
          </button>
          <button onClick={() => setEditing(e => !e)} className="text-[10px] text-slate-500 hover:text-white px-1.5 py-0.5 rounded border border-slate-700 hover:border-slate-500 transition-colors">
            {editing ? 'Chart' : 'Edit'}
          </button>
        </div>
      </div>

      {!editing ? (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={curve} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="v" tick={{ fill: '#64748b', fontSize: 9 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={v => `${(v/1000).toFixed(1)}MW`} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', fontSize: 10 }}
              formatter={v => [`${(v/1000).toFixed(2)} MW`]}
              labelFormatter={v => `${v} m/s`}
            />
            <Line type="monotone" dataKey="p_kw" stroke="#10b981" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          <div className="grid grid-cols-3 text-[10px] text-slate-500 px-1">
            <span>Speed (m/s)</span><span>Power (kW)</span><span></span>
          </div>
          {curve.map((pt, i) => (
            <div key={i} className="grid grid-cols-3 gap-1 items-center">
              <input
                type="number" value={pt.v}
                onChange={e => updatePoint(i, 'v', e.target.value)}
                className="text-[11px] bg-slate-800 text-white rounded px-1.5 py-0.5 border border-slate-700 outline-none w-full"
              />
              <input
                type="number" value={pt.p_kw}
                onChange={e => updatePoint(i, 'p_kw', e.target.value)}
                className="text-[11px] bg-slate-800 text-white rounded px-1.5 py-0.5 border border-slate-700 outline-none w-full"
              />
              <button onClick={() => removePoint(i)} className="text-slate-600 hover:text-red-400 justify-self-center">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button onClick={addPoint} className="w-full text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1 py-1 border border-dashed border-slate-700 hover:border-emerald-500/50 rounded mt-1 transition-colors">
            <Plus className="w-3 h-3" /> Add point
          </button>
        </div>
      )}
    </div>
  );
}