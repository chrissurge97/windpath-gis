import React from 'react';
import { Plus, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import RightPanelTabs from '@/components/planning/RightPanelTabs';
import TurbineDataTable from '@/components/planning/TurbineDataTable';
import CableDataTable from '@/components/planning/CableDataTable';
import TurbineTypeEditor from '@/components/planning/TurbineTypeEditor';
import LayerImportExport from '@/components/planning/LayerImportExport';
import LayerList from '@/components/planning/LayerList';

export default function PlanningRightPanel({
  rightTab, setRightTab, features, rightPanelOpen,
  turbines, turbineTypes, selectedTurbineTypeId, setSelectedTurbineTypeId,
  turbineLayer, deleteFeature, updateTurbineProps, flyToFeature,
  cables, cableTypes, selectedCableTypeId, setSelectedCableTypeId,
  cableLayer, setCableTypes, updateLayer, calcCableLoad,
  substations, windParams, setWindParams, windFetched,
  totalAEP_live, liveCapFactor, avgWindSpeed, totalCableLength, totalCableCost,
  monthlyData, weibullData, layers, selectedLayerId, setSelectedLayerId,
  setLayers, mapRef, setShowNewZoneDialog, setTurbineTypes,
  globalRadii, onRadiiChange, showRadii, onToggleRadii,
}) {
  return (
    <div className={cn("shrink-0 flex flex-col bg-slate-900 border-l border-slate-800 overflow-hidden transition-all duration-200", rightPanelOpen ? "w-80" : "w-0 border-l-0")}>
      <RightPanelTabs rightTab={rightTab} setRightTab={setRightTab} features={features} highlights={[]} rightPanelOpen={rightPanelOpen} />
      <div className="flex-1 overflow-y-auto p-3">

        {rightTab === 'turbines' && (
          <TurbineDataTable
            turbines={turbines}
            turbineTypes={turbineTypes}
            selectedTypeId={selectedTurbineTypeId}
            onSelectType={setSelectedTurbineTypeId}
            onDeleteTurbine={(id) => turbineLayer && deleteFeature(turbineLayer.id, id)}
            onUpdateTurbine={updateTurbineProps}
            turbineLayer={turbineLayer}
            onFlyTo={flyToFeature}
            globalRadii={globalRadii}
            onRadiiChange={onRadiiChange}
            showRadii={showRadii}
            onToggleRadii={onToggleRadii}
          />
        )}

        {rightTab === 'cables' && (
          <CableDataTable
            cables={cables}
            cableTypes={cableTypes}
            selectedCableTypeId={selectedCableTypeId}
            onSelectCableType={setSelectedCableTypeId}
            onDeleteCable={(id) => cableLayer && deleteFeature(cableLayer.id, id)}
            onUpdateCableType={(id, vals) => setCableTypes(prev => prev.map(ct => ct.id === id ? vals : ct))}
            onUpdateCable={(id, props) => {
              if (!cableLayer) return;
              updateLayer(cableLayer.id, {
                features: cableLayer.features.map(f => f.id === id ? { ...f, properties: props } : f)
              });
            }}
            onOptimiseCables={() => {
              if (!cableLayer) return;
              const currentVoltageKv = (cableTypes.find(ct => ct.id === selectedCableTypeId) || cableTypes[0])?.voltage_kv || 33;
              const optimisedFeatures = cableLayer.features.map(f => {
                const requiredMw = calcCableLoad(f.id, cables, turbines);
                const sorted = [...cableTypes].filter(ct => ct.voltage_kv === currentVoltageKv).sort((a, b) => a.cost_per_m - b.cost_per_m);
                const capacityMw = (ct) => +(Math.sqrt(3) * ct.voltage_kv * ct.ampacity_a / 1000);
                const best = sorted.find(ct => capacityMw(ct) >= requiredMw) || sorted[sorted.length - 1];
                return best ? { ...f, properties: { ...f.properties, cable_type_id: best.id } } : f;
              });
              updateLayer(cableLayer.id, { features: optimisedFeatures });
            }}
            turbines={turbines}
            substations={substations}
            onFlyTo={flyToFeature}
          />
        )}

        {rightTab === 'analysis' && (
          <div className="space-y-4">
            <div className="bg-slate-800/60 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">Wind Distribution</span>
                {windFetched && <span className="text-[10px] text-emerald-400">✓ Real data</span>}
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Shape k', key: 'k', min: 1, max: 4, step: 0.1 },
                  { label: 'Scale λ (m/s)', key: 'lambda', min: 3, max: 15, step: 0.5 },
                ].map(({ label, key, min, max, step }) => (
                  <div key={key}>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-slate-500">{label}</span>
                      <span className="text-cyan-400 font-medium">{windParams[key]}</span>
                    </div>
                    <input type="range" min={min} max={max} step={step} value={windParams[key]}
                      onChange={e => setWindParams(p => ({ ...p, [key]: parseFloat(e.target.value) }))}
                      className="w-full accent-cyan-500 h-1" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-slate-500 mb-1.5">Wind Speed Distribution</p>
              <ResponsiveContainer width="100%" height={90}>
                <AreaChart data={weibullData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="v" tick={{ fill: '#64748b', fontSize: 8 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 8 }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '6px', fontSize: 10 }} formatter={v => [`${v}%`]} />
                  <Area type="monotone" dataKey="f" stroke="#06b6d4" strokeWidth={1.5} fill="url(#wg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {totalAEP_live > 0 ? (
              <>
                <div>
                  <p className="text-[10px] text-slate-500 mb-1.5">Monthly Energy Profile</p>
                  <ResponsiveContainer width="100%" height={80}>
                    <BarChart data={monthlyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                      <XAxis dataKey="m" tick={{ fill: '#64748b', fontSize: 8 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 8 }} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '6px', fontSize: 10 }} formatter={v => [`${v} MWh`]} />
                      <Bar dataKey="e" fill="#10b981" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { l: 'Gross AEP', v: `${(totalAEP_live * 1.1 / 1000).toFixed(1)} GWh`, c: 'text-cyan-400' },
                    { l: 'Net AEP', v: `${(totalAEP_live / 1000).toFixed(1)} GWh`, c: 'text-emerald-400' },
                    { l: 'Cap. Factor', v: `${liveCapFactor}%`, c: 'text-purple-400' },
                    { l: 'Avg Hub Wind', v: avgWindSpeed ? `${avgWindSpeed} m/s` : '—', c: 'text-orange-400' },
                    { l: 'Cable Length', v: `${(totalCableLength / 1000).toFixed(2)} km`, c: 'text-yellow-400' },
                    { l: 'Cable Cost', v: `€${((totalCableCost * 1.17) / 1000).toFixed(0)}k`, c: 'text-red-400' },
                  ].map(({ l, v, c }) => (
                    <div key={l} className="bg-slate-800/60 rounded-lg p-2 text-center">
                      <p className={cn("text-sm font-bold", c)}>{v}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">{l}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-slate-600 text-xs">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Place turbines to see analysis
              </div>
            )}
          </div>
        )}

        {rightTab === 'layers' && (
          <div className="space-y-3">
            <button onClick={() => setShowNewZoneDialog(true)} className="w-full py-2 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Zone
            </button>
            <LayerImportExport layers={layers} onAddLayer={(layer) => setLayers(prev => [...prev, layer])} projectName="project" />
            <LayerList layers={layers} selectedLayerId={selectedLayerId} setSelectedLayerId={setSelectedLayerId} updateLayer={updateLayer} setLayers={setLayers} mapRef={mapRef} />
          </div>
        )}

        {rightTab === 'types' && (
          <TurbineTypeEditor
            turbineTypes={turbineTypes}
            onUpdate={(id, vals) => setTurbineTypes(prev => prev.map(t => t.id === id ? { ...t, ...vals } : t))}
            onAdd={(tt) => setTurbineTypes(prev => [...prev, tt])}
            onDelete={(id) => setTurbineTypes(prev => prev.filter(t => t.id !== id))}
          />
        )}
      </div>
    </div>
  );
}