import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Table2, Wind, Zap, Pentagon, RefreshCw, Plus, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'planning_v3_ire';

function parseNumber(v) {
  const n = parseFloat(v);
  return isNaN(n) ? undefined : n;
}

// Editable cell
function Cell({ value, onChange, type = 'text', className }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));

  useEffect(() => { setDraft(String(value ?? '')); }, [value]);

  const commit = () => {
    setEditing(false);
    const v = type === 'number' ? parseNumber(draft) : draft;
    if (v !== value) onChange(v);
  };

  if (editing) {
    return (
      <td className={cn("px-2 py-0", className)}>
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(String(value ?? '')); setEditing(false); } }}
          className="w-full bg-slate-700 text-white text-xs px-1 py-0.5 rounded outline-none border border-slate-500 min-w-[60px]"
        />
      </td>
    );
  }

  return (
    <td
      className={cn("px-2 py-1.5 text-xs text-slate-300 cursor-pointer hover:bg-slate-700/50 whitespace-nowrap", className)}
      onClick={() => setEditing(true)}
    >
      {value ?? <span className="text-slate-600 italic">—</span>}
    </td>
  );
}

function DataSection({ title, icon: Icon, headers, rows, onCellChange, emptyMsg, onAddRow, onDeleteRow }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-emerald-400" />
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <span className="text-[10px] text-slate-500 ml-1">({rows.length} rows) · click any cell to edit</span>
        {onAddRow && (
          <button onClick={onAddRow} className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-slate-400 hover:text-white">
            <Plus className="w-3 h-3" /> Add Row
          </button>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-800">
              {headers.map(h => (
                <th key={h.key} className="px-2 py-2 text-left text-[10px] uppercase tracking-wider text-slate-400 font-medium whitespace-nowrap">
                  {h.label}
                </th>
              ))}
              {onDeleteRow && <th className="px-2 py-2 w-6" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length + (onDeleteRow ? 1 : 0)} className="px-4 py-6 text-center text-slate-600 italic text-xs">
                  {emptyMsg}
                </td>
              </tr>
            ) : rows.map((row, ri) => (
              <tr key={row.id || ri} className={cn("border-t border-slate-800/60", ri % 2 === 0 ? "bg-slate-900" : "bg-slate-900/50")}>
                {headers.map(h => (
                  <Cell
                    key={h.key}
                    value={row[h.key]}
                    type={h.type || 'text'}
                    onChange={val => onCellChange(ri, h.key, val)}
                  />
                ))}
                {onDeleteRow && (
                  <td className="px-1">
                    <button onClick={() => onDeleteRow(ri)} className="p-0.5 text-slate-700 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 0 && (
        <p className="text-[10px] text-slate-600 mt-1.5">
          💡 Tip: click a cell to edit. Changes sync to the map in real time. Select all → Ctrl+C to copy to Excel.
        </p>
      )}
    </div>
  );
}

export default function DataTables() {
  const [data, setData] = useState(null);
  const [saved, setSaved] = useState(false);

  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const save = (newData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {}
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        No project data found. Open the Planning page and place some turbines first.
      </div>
    );
  }

  const turbineLayer = data.layers?.find(l => l.type === 'turbine');
  const cableLayer = data.layers?.find(l => l.type === 'cable');
  const substationLayer = data.layers?.find(l => l.type === 'substation');
  const polygonLayers = data.layers?.filter(l => !['turbine', 'cable', 'wind_resource', 'substation'].includes(l.type)) || [];

  const turbines = turbineLayer?.features || [];
  const cables = cableLayer?.features || [];

  // ── Turbine row shape ────────────────────────────────────────────────────
  const turbineRows = turbines.map(t => ({
    id: t.id,
    name: t.properties.name,
    lat: typeof t.geometry.coordinates[1] === 'number' ? t.geometry.coordinates[1].toFixed(6) : '',
    lng: typeof t.geometry.coordinates[0] === 'number' ? t.geometry.coordinates[0].toFixed(6) : '',
    turbine_type_id: t.properties.turbine_type_id,
    rated_power_mw: t.properties.rated_power_mw,
    hub_height: t.properties.hub_height,
    rotor_diameter: t.properties.rotor_diameter,
    elevation_m: t.properties.elevation_m,
    hub_wind_speed: t.properties.hub_wind_speed,
    aep_gwh: t.properties.aep_mwh ? (t.properties.aep_mwh / 1000).toFixed(3) : undefined,
  }));

  const TURBINE_HEADERS = [
    { key: 'name', label: 'Name' },
    { key: 'lat', label: 'Lat', type: 'number' },
    { key: 'lng', label: 'Lng', type: 'number' },
    { key: 'turbine_type_id', label: 'Type ID' },
    { key: 'rated_power_mw', label: 'Power (MW)', type: 'number' },
    { key: 'hub_height', label: 'Hub Ht (m)', type: 'number' },
    { key: 'rotor_diameter', label: 'Rotor Ø (m)', type: 'number' },
    { key: 'elevation_m', label: 'Elevation (m)', type: 'number' },
    { key: 'hub_wind_speed', label: 'Hub Wind (m/s)', type: 'number' },
    { key: 'aep_gwh', label: 'AEP (GWh)', type: 'number' },
  ];

  const updateTurbineCell = (rowIdx, key, val) => {
    const newData = JSON.parse(JSON.stringify(data));
    const tLayer = newData.layers.find(l => l.type === 'turbine');
    if (!tLayer) return;
    const f = tLayer.features[rowIdx];
    if (!f) return;
    if (key === 'name') f.properties.name = val;
    else if (key === 'lat') f.geometry.coordinates[1] = parseFloat(val) || f.geometry.coordinates[1];
    else if (key === 'lng') f.geometry.coordinates[0] = parseFloat(val) || f.geometry.coordinates[0];
    else if (key === 'aep_gwh') f.properties.aep_mwh = val ? parseFloat(val) * 1000 : undefined;
    else if (key === 'turbine_type_id') f.properties.turbine_type_id = val;
    else if (typeof val === 'number') f.properties[key] = val;
    setData(newData);
    save(newData);
  };

  // ── Cable rows ────────────────────────────────────────────────────────────
  const cableRows = cables.map(c => ({
    id: c.id,
    name: c.properties.name,
    cable_type_id: c.properties.cable_type_id,
    length_km: c.properties.length_m ? (c.properties.length_m / 1000).toFixed(3) : undefined,
    from_lat: typeof c.geometry.coordinates[0]?.[1] === 'number' ? c.geometry.coordinates[0][1].toFixed(6) : '',
    from_lng: typeof c.geometry.coordinates[0]?.[0] === 'number' ? c.geometry.coordinates[0][0].toFixed(6) : '',
    to_lat: typeof c.geometry.coordinates[1]?.[1] === 'number' ? c.geometry.coordinates[1][1].toFixed(6) : '',
    to_lng: typeof c.geometry.coordinates[1]?.[0] === 'number' ? c.geometry.coordinates[1][0].toFixed(6) : '',
  }));

  const CABLE_HEADERS = [
    { key: 'name', label: 'Name' },
    { key: 'cable_type_id', label: 'Type ID' },
    { key: 'length_km', label: 'Length (km)', type: 'number' },
    { key: 'from_lat', label: 'From Lat', type: 'number' },
    { key: 'from_lng', label: 'From Lng', type: 'number' },
    { key: 'to_lat', label: 'To Lat', type: 'number' },
    { key: 'to_lng', label: 'To Lng', type: 'number' },
  ];

  const updateCableCell = (rowIdx, key, val) => {
    const newData = JSON.parse(JSON.stringify(data));
    const cLayer = newData.layers.find(l => l.type === 'cable');
    if (!cLayer) return;
    const f = cLayer.features[rowIdx];
    if (!f) return;
    if (key === 'name') f.properties.name = val;
    else if (key === 'cable_type_id') f.properties.cable_type_id = val;
    else if (key === 'length_km') f.properties.length_m = val ? parseFloat(val) * 1000 : f.properties.length_m;
    else if (key === 'from_lat') f.geometry.coordinates[0][1] = parseFloat(val) || f.geometry.coordinates[0][1];
    else if (key === 'from_lng') f.geometry.coordinates[0][0] = parseFloat(val) || f.geometry.coordinates[0][0];
    else if (key === 'to_lat') f.geometry.coordinates[1][1] = parseFloat(val) || f.geometry.coordinates[1][1];
    else if (key === 'to_lng') f.geometry.coordinates[1][0] = parseFloat(val) || f.geometry.coordinates[1][0];
    setData(newData);
    save(newData);
  };

  // ── Substation rows ───────────────────────────────────────────────────────
  const substationFeatures = substationLayer?.features || [];
  const substationRows = substationFeatures.map(s => ({
    id: s.id,
    name: s.properties.name,
    lat: typeof s.geometry.coordinates[1] === 'number' ? s.geometry.coordinates[1].toFixed(6) : '',
    lng: typeof s.geometry.coordinates[0] === 'number' ? s.geometry.coordinates[0].toFixed(6) : '',
    transformer_mva: s.properties.transformer_mva,
    capacity_generation_mw: s.properties.capacity_generation_mw,
    capacity_demand_mw: s.properties.capacity_demand_mw,
    notes: s.properties.notes || '',
  }));

  const SUBSTATION_HEADERS = [
    { key: 'name', label: 'Name' },
    { key: 'lat', label: 'Lat', type: 'number' },
    { key: 'lng', label: 'Lng', type: 'number' },
    { key: 'transformer_mva', label: 'Transformer (MVA)', type: 'number' },
    { key: 'capacity_generation_mw', label: 'Gen Capacity (MW)', type: 'number' },
    { key: 'capacity_demand_mw', label: 'Demand Capacity (MW)', type: 'number' },
    { key: 'notes', label: 'Notes' },
  ];

  const updateSubstationCell = (rowIdx, key, val) => {
    const newData = JSON.parse(JSON.stringify(data));
    const sLayer = newData.layers.find(l => l.type === 'substation');
    if (!sLayer) return;
    const f = sLayer.features[rowIdx];
    if (!f) return;
    if (key === 'lat') f.geometry.coordinates[1] = parseFloat(val) || f.geometry.coordinates[1];
    else if (key === 'lng') f.geometry.coordinates[0] = parseFloat(val) || f.geometry.coordinates[0];
    else if (['transformer_mva', 'capacity_generation_mw', 'capacity_demand_mw'].includes(key)) f.properties[key] = parseFloat(val) || 0;
    else f.properties[key] = val;
    setData(newData);
    save(newData);
  };

  const addSubstationRow = () => {
    const newData = JSON.parse(JSON.stringify(data));
    let sLayer = newData.layers.find(l => l.type === 'substation');
    if (!sLayer) {
      sLayer = { id: crypto.randomUUID(), name: 'Substations', type: 'substation', color: '#facc15', fillOpacity: 1, visible: true, features: [] };
      newData.layers.push(sLayer);
    }
    sLayer.features.push({
      id: crypto.randomUUID(),
      layer_id: sLayer.id,
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { name: `Substation ${sLayer.features.length + 1}`, transformer_mva: 60, capacity_generation_mw: 30, capacity_demand_mw: 30, notes: '' },
    });
    setData(newData);
    save(newData);
  };

  const deleteSubstationRow = (rowIdx) => {
    const newData = JSON.parse(JSON.stringify(data));
    const sLayer = newData.layers.find(l => l.type === 'substation');
    if (!sLayer) return;
    sLayer.features.splice(rowIdx, 1);
    setData(newData);
    save(newData);
  };

  // ── Polygon rows ──────────────────────────────────────────────────────────
  const polygonRows = polygonLayers.flatMap(layer =>
    layer.features.filter(f => f.geometry.type === 'Polygon').map(f => ({
      id: f.id,
      _layerId: layer.id,
      layer_name: layer.name,
      name: f.properties.name,
      colour: layer.color,
      fill_opacity: layer.fillOpacity,
      notes: f.properties.notes || '',
      vertices: f.geometry.coordinates[0]?.length || 0,
    }))
  );

  const POLYGON_HEADERS = [
    { key: 'layer_name', label: 'Layer' },
    { key: 'name', label: 'Name' },
    { key: 'colour', label: 'Colour' },
    { key: 'fill_opacity', label: 'Fill Opacity', type: 'number' },
    { key: 'notes', label: 'Notes' },
    { key: 'vertices', label: 'Vertices' },
  ];

  const updatePolygonCell = (rowIdx, key, val) => {
    const row = polygonRows[rowIdx];
    if (!row) return;
    const newData = JSON.parse(JSON.stringify(data));
    const layer = newData.layers.find(l => l.id === row._layerId);
    if (!layer) return;
    const f = layer.features.find(f => f.id === row.id);
    if (!f) return;
    if (key === 'name') f.properties.name = val;
    else if (key === 'notes') f.properties.notes = val;
    else if (key === 'colour') layer.color = val;
    else if (key === 'fill_opacity') layer.fillOpacity = parseFloat(val) || layer.fillOpacity;
    else if (key === 'layer_name') layer.name = val;
    setData(newData);
    save(newData);
  };

  return (
    <div className="p-6 bg-slate-950 min-h-full">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Table2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h1 className="text-lg font-bold text-white">Project Data Tables</h1>
              <p className="text-xs text-slate-500">Click any cell to edit • Changes sync to map in real time</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-emerald-400 font-medium">✓ Saved</span>}
            <button
              onClick={load}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
        </div>

        <DataSection
          title="Turbines"
          icon={Wind}
          headers={TURBINE_HEADERS}
          rows={turbineRows}
          onCellChange={updateTurbineCell}
          emptyMsg="No turbines placed yet — go to the Planning page and place some turbines."
        />

        <DataSection
          title="Cables"
          icon={Zap}
          headers={CABLE_HEADERS}
          rows={cableRows}
          onCellChange={updateCableCell}
          emptyMsg="No cables drawn yet — go to the Planning page and draw cable routes."
        />

        <DataSection
          title="Substations"
          icon={Zap}
          headers={SUBSTATION_HEADERS}
          rows={substationRows}
          onCellChange={updateSubstationCell}
          onAddRow={addSubstationRow}
          onDeleteRow={deleteSubstationRow}
          emptyMsg="No substations placed yet — go to the Planning page and use the Substation tool, or click Add Row."
        />

        <DataSection
          title="Polygons"
          icon={Pentagon}
          headers={POLYGON_HEADERS}
          rows={polygonRows}
          onCellChange={updatePolygonCell}
          emptyMsg="No polygons drawn yet — go to the Planning page and draw polygon boundaries."
        />
      </div>
    </div>
  );
}