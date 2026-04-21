import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { Wind, Zap, BarChart2, Info } from 'lucide-react';

// Weibull distribution PDF
function weibullPDF(v, k, lambda) {
  if (v <= 0) return 0;
  return (k / lambda) * Math.pow(v / lambda, k - 1) * Math.exp(-Math.pow(v / lambda, k));
}

function weibullMean(k, lambda) {
  // Gamma(1 + 1/k) approximation
  const x = 1 + 1 / k;
  const gamma = Math.sqrt(2 * Math.PI / x) * Math.pow(x / Math.E, x);
  return lambda * gamma;
}

// Power shear
function shearSpeed(v_ref, h_ref, h, alpha) {
  return v_ref * Math.pow(h / h_ref, alpha);
}

const WIND_DIRECTIONS = [
  { dir: 'N', freq: 8, speed: 7.2 },
  { dir: 'NE', freq: 5, speed: 6.1 },
  { dir: 'E', freq: 4, speed: 5.8 },
  { dir: 'SE', freq: 6, speed: 6.4 },
  { dir: 'S', freq: 10, speed: 7.8 },
  { dir: 'SW', freq: 22, speed: 9.2 },
  { dir: 'W', freq: 18, speed: 8.8 },
  { dir: 'NW', freq: 15, speed: 8.1 },
];

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0', fontSize: 11 },
  labelStyle: { color: '#94a3b8' },
};

export default function WindAnalysis() {
  const [k, setK] = useState(2.0);
  const [lambda, setLambda] = useState(8.5);
  const [hubHeight, setHubHeight] = useState(100);
  const [alpha, setAlpha] = useState(0.143);

  const speeds = Array.from({ length: 30 }, (_, i) => i + 0.5);
  const weibullData = speeds.map(v => ({
    v: v.toFixed(1),
    freq: (weibullPDF(v, k, lambda) * 100).toFixed(3),
    freqN: weibullPDF(v, k, lambda),
  }));

  const meanWind = (lambda * Math.exp(Math.log(1 + 1 / k) * 0.5 + 0.5 * Math.log(2 * Math.PI / (1 + 1 / k)) - (1 + 1 / k))).toFixed(2);
  const adjustedSpeed = shearSpeed(lambda * 0.9, 10, hubHeight, alpha).toFixed(2);

  // Shear profile
  const heights = [10, 20, 40, 60, 80, 100, 120, 140, 160];
  const shearData = heights.map(h => ({
    height: h,
    speed: shearSpeed(lambda * 0.9, 10, h, alpha).toFixed(2),
  }));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Wind className="w-5 h-5 text-cyan-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Wind Resource Analysis</h1>
          <p className="text-xs text-slate-500">Interactive Weibull distribution & wind shear modeling</p>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Shape k', value: k, set: setK, min: 1, max: 4, step: 0.1, unit: '', info: 'Wind consistency' },
          { label: 'Scale λ (m/s)', value: lambda, set: setLambda, min: 3, max: 15, step: 0.5, unit: 'm/s', info: 'Related to mean speed' },
          { label: 'Hub Height', value: hubHeight, set: setHubHeight, min: 60, max: 180, step: 10, unit: 'm', info: 'Turbine hub height' },
          { label: 'Shear α', value: alpha, set: setAlpha, min: 0.05, max: 0.4, step: 0.01, unit: '', info: 'Wind shear exponent' },
        ].map(({ label, value, set, min, max, step, unit, info }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">{label}</span>
              <span className="text-sm font-bold text-cyan-400">{value}{unit}</span>
            </div>
            <input
              type="range" min={min} max={max} step={step}
              value={value}
              onChange={e => set(parseFloat(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <p className="text-[10px] text-slate-600 mt-1">{info}</p>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Scale λ', value: `${lambda} m/s`, color: 'text-cyan-400' },
          { label: 'Hub Wind Speed', value: `${adjustedSpeed} m/s`, color: 'text-emerald-400' },
          { label: 'Shape k', value: k.toFixed(1), color: 'text-purple-400' },
          { label: 'Shear Gain', value: `+${((adjustedSpeed / (lambda * 0.9) - 1) * 100).toFixed(0)}%`, color: 'text-orange-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <p className={cn("text-xl font-bold", color)}>{value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Weibull chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-1">Weibull Wind Speed Distribution</h3>
        <p className="text-xs text-slate-500 mb-4">Probability density by wind speed at hub height</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={weibullData} margin={{ top: 0, right: 10, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="v" tick={{ fill: '#64748b', fontSize: 10 }} label={{ value: 'Wind Speed (m/s)', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 10 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${(v * 100).toFixed(2)}%`, 'Probability']} />
            <ReferenceLine x={adjustedSpeed} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Hub', fill: '#10b981', fontSize: 9 }} />
            <Area type="monotone" dataKey="freqN" stroke="#06b6d4" strokeWidth={2} fill="url(#windGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Wind shear profile */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-1">Wind Shear Profile</h3>
          <p className="text-xs text-slate-500 mb-4">Speed vs height using power law (α = {alpha})</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={shearData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" dataKey="speed" tick={{ fill: '#64748b', fontSize: 10 }} domain={['auto', 'auto']} label={{ value: 'm/s', fill: '#64748b', fontSize: 10 }} />
              <YAxis type="category" dataKey="height" tick={{ fill: '#64748b', fontSize: 10 }} label={{ value: 'Height (m)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
              <Tooltip {...TOOLTIP_STYLE} formatter={v => [`${v} m/s`, 'Wind Speed']} />
              <ReferenceLine y={hubHeight} stroke="#10b981" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="speed" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Wind rose */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-1">Wind Rose</h3>
          <p className="text-xs text-slate-500 mb-4">Directional frequency (%) — typical UK midlands</p>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={WIND_DIRECTIONS}>
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis dataKey="dir" tick={{ fill: '#64748b', fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 8 }} />
              <Radar dataKey="freq" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} strokeWidth={1.5} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Learning note */}
      <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 text-xs text-slate-400 leading-relaxed">
        <span className="text-cyan-400 font-semibold">📚 Key concept: </span>
        The Weibull shape parameter k controls the width of the distribution. A higher k (≥2.5) means more consistent winds near the mean — typical of trade wind zones. Lower k (~1.5) indicates highly variable winds. The scale parameter λ is closely related to mean wind speed, approximately λ ≈ mean / Γ(1 + 1/k).
      </div>
    </div>
  );
}