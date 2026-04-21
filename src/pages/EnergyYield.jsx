import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ComposedChart, Line } from 'recharts';
import { cn } from '@/lib/utils';
import { Zap, Wind, TrendingUp, Target, Info } from 'lucide-react';

// Power curve for generic 3.5MW turbine
function getPowerCurve() {
  const curve = [];
  for (let v = 0; v <= 30; v += 0.5) {
    let p = 0;
    if (v < 3) p = 0;
    else if (v < 12) p = 3500 * Math.pow((v - 3) / 9, 3);
    else if (v <= 25) p = 3500;
    else p = 0;
    curve.push({ v: v.toFixed(1), p: Math.min(3500, Math.round(p)) });
  }
  return curve;
}

function weibullPDF(v, k, lambda) {
  if (v <= 0) return 0;
  return (k / lambda) * Math.pow(v / lambda, k - 1) * Math.exp(-Math.pow(v / lambda, k));
}

function calcAEP(nTurbines, k, lambda, wakeLoss, availLoss, electricalLoss) {
  const powerCurve = getPowerCurve();
  let grossAEP_kWh = 0;
  for (const { v, p } of powerCurve) {
    const freq = weibullPDF(parseFloat(v), k, lambda);
    grossAEP_kWh += p * freq * 0.5 * 8760; // 0.5 step
  }
  grossAEP_kWh *= nTurbines;

  const totalLoss = 1 - (1 - wakeLoss / 100) * (1 - availLoss / 100) * (1 - electricalLoss / 100);
  const netAEP_kWh = grossAEP_kWh * (1 - totalLoss);
  const ratedPower_kW = 3500 * nTurbines;
  const cf = (netAEP_kWh / (ratedPower_kW * 8760)) * 100;

  return {
    gross: grossAEP_kWh / 1e6,  // GWh
    net: netAEP_kWh / 1e6,
    cf: cf.toFixed(1),
    lossTotal: (totalLoss * 100).toFixed(1),
  };
}

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0', fontSize: 11 },
  labelStyle: { color: '#94a3b8' },
};

export default function EnergyYield() {
  const [nTurbines, setNTurbines] = useState(8);
  const [k, setK] = useState(2.0);
  const [lambda, setLambda] = useState(8.5);
  const [wakeLoss, setWakeLoss] = useState(8);
  const [availLoss, setAvailLoss] = useState(4);
  const [electricalLoss, setElectricalLoss] = useState(1.5);

  const result = useMemo(() =>
    calcAEP(nTurbines, k, lambda, wakeLoss, availLoss, electricalLoss),
    [nTurbines, k, lambda, wakeLoss, availLoss, electricalLoss]
  );

  const powerCurve = useMemo(() => getPowerCurve(), []);

  // Monthly variation (simulated)
  const monthlyData = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => {
    const seasonal = [1.25, 1.15, 1.1, 0.95, 0.8, 0.7, 0.72, 0.75, 0.9, 1.05, 1.15, 1.28][i];
    const monthly = (result.net / 12) * seasonal;
    return { month: m, energy: monthly.toFixed(3), p90: (monthly * 0.88).toFixed(3) };
  });

  // Loss waterfall data
  const lossData = [
    { name: 'Gross AEP', value: result.gross.toFixed(3), fill: '#06b6d4' },
    { name: 'Wake Loss', value: -(result.gross * wakeLoss / 100).toFixed(3), fill: '#ef4444' },
    { name: 'Avail. Loss', value: -(result.gross * availLoss / 100).toFixed(3), fill: '#f97316' },
    { name: 'Elec. Loss', value: -(result.gross * electricalLoss / 100).toFixed(3), fill: '#eab308' },
    { name: 'Net AEP', value: result.net.toFixed(3), fill: '#10b981' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Zap className="w-5 h-5 text-emerald-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Energy Yield Assessment</h1>
          <p className="text-xs text-slate-500">AEP calculation with Weibull distribution & loss modelling</p>
        </div>
      </div>

      {/* Input controls */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'No. of Turbines', value: nTurbines, set: setNTurbines, min: 1, max: 30, step: 1, unit: '' },
          { label: 'Weibull k', value: k, set: setK, min: 1, max: 4, step: 0.1, unit: '' },
          { label: 'Weibull λ (m/s)', value: lambda, set: setLambda, min: 4, max: 14, step: 0.5, unit: 'm/s' },
          { label: 'Wake Loss (%)', value: wakeLoss, set: setWakeLoss, min: 0, max: 25, step: 0.5, unit: '%' },
          { label: 'Availability (%)', value: availLoss, set: setAvailLoss, min: 0, max: 15, step: 0.5, unit: '%' },
          { label: 'Electrical Loss (%)', value: electricalLoss, set: setElectricalLoss, min: 0, max: 5, step: 0.5, unit: '%' },
        ].map(({ label, value, set, min, max, step, unit }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">{label}</span>
              <span className="text-sm font-bold text-emerald-400">{value}{unit}</span>
            </div>
            <input
              type="range" min={min} max={max} step={step} value={value}
              onChange={e => set(parseFloat(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
        ))}
      </div>

      {/* Results KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Gross AEP', value: `${result.gross.toFixed(1)} GWh`, sub: 'before losses', color: 'text-cyan-400' },
          { label: 'Net AEP (P50)', value: `${result.net.toFixed(1)} GWh`, sub: 'after all losses', color: 'text-emerald-400' },
          { label: 'Net AEP (P90)', value: `${(result.net * 0.88).toFixed(1)} GWh`, sub: '~12% conservative', color: 'text-purple-400' },
          { label: 'Capacity Factor', value: `${result.cf}%`, sub: `${result.lossTotal}% total loss`, color: 'text-orange-400' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className={cn("text-2xl font-bold", color)}>{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Power curve */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-1">Turbine Power Curve (3.5 MW)</h3>
          <p className="text-xs text-slate-500 mb-3">Power output vs. wind speed</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={powerCurve} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="v" tick={{ fill: '#64748b', fontSize: 9 }} label={{ value: 'Speed (m/s)', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 9 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={v => `${v/1000}MW`} />
              <Tooltip {...TOOLTIP_STYLE} formatter={v => [`${(v/1000).toFixed(2)} MW`, 'Power']} />
              <Area type="monotone" dataKey="p" stroke="#10b981" strokeWidth={2} fill="url(#powerGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly energy */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-1">Monthly Energy Profile</h3>
          <p className="text-xs text-slate-500 mb-3">P50 (blue) and P90 (outline) estimates</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 9 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={v => `${v}GWh`} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v, n) => [`${v} GWh`, n === 'energy' ? 'P50' : 'P90']} />
              <Bar dataKey="energy" fill="#10b981" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
              <Bar dataKey="p90" fill="none" stroke="#6366f1" strokeWidth={1.5} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Loss breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Loss Breakdown</h3>
        <div className="flex items-end gap-2 h-16">
          {lossData.map(({ name, value, fill }) => (
            <div key={name} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-medium" style={{ color: fill }}>{value}</span>
              <div
                className="w-full rounded-t transition-all duration-500"
                style={{
                  height: `${Math.abs(parseFloat(value)) / result.gross * 100 * 0.6}px`,
                  minHeight: 4,
                  background: fill,
                  opacity: value < 0 ? 0.7 : 1,
                }}
              />
              <span className="text-[9px] text-slate-500 text-center leading-tight">{name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-xs text-slate-400 leading-relaxed">
        <span className="text-emerald-400 font-semibold">📚 Key concept: </span>
        Gross AEP is calculated by integrating the product of the power curve P(v) and the Weibull frequency distribution f(v) over all wind speeds, multiplied by 8,760 hours/year. Net AEP applies losses from wake effects, availability, and electrical transmission. P90 represents the production level that will be exceeded with 90% probability, used by lenders for conservative financial modelling.
      </div>
    </div>
  );
}