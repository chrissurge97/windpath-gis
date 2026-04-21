import React, { useState } from 'react';
import { Trash2, Wind, Zap, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { windAtHubHeight, calcTurbineAEP, sampleWindSpeed } from '@/lib/gisUtils';

function FeatureProps({ feature, schema, onChange }) {
  return (
    <div className="space-y-2 mt-2">
      {schema.map(field => (
        <div key={field.key} className="flex flex-col gap-0.5">
          <label className="text-[10px] text-slate-500">{field.label}</label>
          {field.type === 'boolean' ? (
            <select
              value={feature.properties[field.key] ?? ''}
              onChange={e => onChange(field.key, e.target.value === 'true')}
              className="text-[11px] bg-slate-800 text-white rounded px-2 py-1 border border-slate-700 outline-none"
            >
              <option value="">—</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : (
            <input
              type={field.type === 'number' ? 'number' : 'text'}
              value={feature.properties[field.key] ?? ''}
              onChange={e => onChange(field.key, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
              className="text-[11px] bg-slate-800 text-white rounded px-2 py-1 border border-slate-700 outline-none focus:border-slate-500"
            />
          )}
        </div>
      ))}
    </div>
  );
}

function TurbineInfo({ feature, windLayers }) {
  // Sample wind from any wind_resource layer
  const windLayer = windLayers.find(l => l.type === 'wind_resource' && l.visible);
  const rawSpeed = sampleWindSpeed(windLayer, feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
  const hubHeight = feature.properties.hub_height || 100;
  const hubSpeed = rawSpeed ? windAtHubHeight(rawSpeed, 10, hubHeight) : feature.properties.hub_wind_speed;
  const powerCurve = feature.properties._powerCurve;
  const aep = hubSpeed && powerCurve ? calcTurbineAEP(hubSpeed, powerCurve) : null;

  return (
    <div className="mt-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2 space-y-1 text-[11px]">
      {rawSpeed && <p className="text-slate-400">Ref wind (10m): <span className="text-cyan-400 font-medium">{rawSpeed} m/s</span></p>}
      {hubSpeed && <p className="text-slate-400">Hub wind ({hubHeight}m): <span className="text-emerald-400 font-medium">{hubSpeed} m/s</span></p>}
      {aep && <p className="text-slate-400">Est. Power: <span className="text-yellow-400 font-medium">{aep.power_kw} kW</span></p>}
      {aep && <p className="text-slate-400">Est. AEP: <span className="text-purple-400 font-medium">{aep.aep_mwh} MWh/yr</span></p>}
      {!rawSpeed && <p className="text-slate-600">Add a Wind Resource layer to compute yield</p>}
    </div>
  );
}

export default function FeaturePanel({ layer, features, allLayers, onUpdateFeature, onDeleteFeature }) {
  const [expanded, setExpanded] = useState({});
  const windLayers = allLayers.filter(l => l.type === 'wind_resource');

  if (!layer || features.length === 0) {
    return (
      <div className="p-3 text-[11px] text-slate-600 text-center">
        {layer ? 'No features. Draw on the map.' : 'Select a layer.'}
      </div>
    );
  }

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="flex-1 overflow-y-auto">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider px-3 py-2">
        Features ({features.length})
      </p>
      {features.map((f, i) => {
        const isTurbine = layer.type === 'turbine';
        const isOpen = expanded[f.id];
        return (
          <div key={f.id} className="border-b border-slate-800/60">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-800/40 cursor-pointer"
              onClick={() => toggle(f.id)}
            >
              {isTurbine ? <Wind className="w-3 h-3 text-emerald-400 shrink-0" /> : <Info className="w-3 h-3 text-slate-500 shrink-0" />}
              <span className="flex-1 text-xs truncate text-slate-300">
                {f.properties.name || f.properties.Name || (isTurbine ? `Turbine ${i + 1}` : `Feature ${i + 1}`)}
              </span>
              <button
                onClick={e => { e.stopPropagation(); onDeleteFeature(f.id); }}
                className="p-0.5 text-slate-600 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              {isOpen ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
            </div>

            {isOpen && (
              <div className="px-3 pb-3">
                {isTurbine && <TurbineInfo feature={f} windLayers={windLayers} />}
                <FeatureProps
                  feature={f}
                  schema={layer.schema}
                  onChange={(key, val) => onUpdateFeature(f.id, { properties: { ...f.properties, [key]: val } })}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}