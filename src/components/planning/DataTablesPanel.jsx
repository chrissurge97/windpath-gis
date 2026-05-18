/**
 * DataTablesPanel — same functionality as the DataTables page but rendered
 * as an overlay panel within the Planning tool right panel.
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { usePlanningProject } from '@/lib/PlanningContext';
import { loadProjectIndex, loadProject, saveProject } from '@/components/planning/ProjectManager';
import { ChevronDown, Wind, Zap, Target, FileText, Pentagon, Map, Eye, EyeOff, Copy, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import TurbineLibraryEditor from '@/components/planning/TurbineLibraryEditor';
import CableLibraryEditor from '@/components/planning/CableLibraryEditor';

const LAYER_ICONS = { turbine: Wind, cable: Zap, substation: Target, polygon: Pentagon };
const LAYER_COLORS = { turbine: 'text-emerald-400', cable: 'text-orange-400', substation: 'text-yellow-400', polygon: 'text-cyan-400' };

function getPropertyKeys(features) {
  const skip = new Set(['layerId', '_featureType']);
  const keys = new Set();
  for (const f of features) {
    for (const k of Object.keys(f.properties || {})) {
      if (!skip.has(k)) keys.add(k);
    }
  }
  return [...keys];
}

function serializeProp(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (v.type && v.id) return `${v.type}:${v.id.slice(0, 8)}`;
    return JSON.stringify(v);
  }
  return String(v);
}

function buildTSV(layer, propKeys) {
  const features = layer.features || [];
  const fixedSkip = new Set(['name', 'notes', 'lat', 'lng', 'layerId', '_featureType']);
  const extraKeys = propKeys.filter(k => !fixedSkip.has(k));
  const headers = ['name', 'lat', 'lng', 'notes', ...extraKeys];
  const rows = [headers];
  const propsRow = (p, nameOverride, lat, lng, isFirst = true) => [
    nameOverride, lat, lng,
    isFirst ? (p.notes || '') : '',
    ...extraKeys.map(k => isFirst ? serializeProp(p[k]) : ''),
  ];
  features.forEach(f => {
    const p = f.properties || {};
    const geomType = f.geometry?.type;
    const baseName = p.name || f.id?.slice(0, 8) || '';
    if (geomType === 'Point') {
      const [lng, lat] = f.geometry.coordinates;
      rows.push(propsRow(p, baseName, lat.toFixed(6), lng.toFixed(6), true));
    } else if (geomType === 'Polygon') {
      const ring = f.geometry.coordinates?.[0] || [];
      ring.slice(0, -1).forEach((coord, vi) => {
        const [lng, lat] = coord;
        rows.push(propsRow(p, `${baseName}_v${vi + 1}`, lat.toFixed(6), lng.toFixed(6), vi === 0));
      });
    } else if (geomType === 'LineString') {
      const coords = f.geometry.coordinates || [];
      coords.forEach((coord, vi) => {
        const [lng, lat] = coord;
        rows.push(propsRow(p, `${baseName}_v${vi + 1}`, lat.toFixed(6), lng.toFixed(6), vi === 0));
      });
    }
  });
  return rows.map(r => r.join('\t')).join('\n');
}

function EditableCell({ value, onSave, type = 'text' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));
  const commit = () => {
    setEditing(false);
    const parsed = type === 'number' ? parseFloat(draft) : draft;
    if (parsed !== value) onSave(isNaN(parsed) && type === 'number' ? value : parsed);
  };
  if (editing) {
    return (
      <input autoFocus type={type === 'number' ? 'number' : 'text'} value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        className="w-full min-w-[80px] bg-slate-700 border border-emerald-500/60 rounded px-1.5 py-0.5 text-white outline-none text-xs"
      />
    );
  }
  const display = value === null || value === undefined || value === '' ? (
    <span className="text-slate-600 italic text-[10px]">—</span>
  ) : (
    <span>{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(3) : String(value)}</span>
  );
  return (
    <span onClick={() => { setDraft(String(value ?? '')); setEditing(true); }}
      className="cursor-pointer hover:bg-slate-700/60 rounded px-1 py-0.5 transition-colors group" title="Click to edit">
      {display}
      <span className="ml-1 opacity-0 group-hover:opacity-40 text-[9px] text-slate-400">✎</span>
    </span>
  );
}

function LayerTable({ layer, onUpdateFeature }) {
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const features = layer.features || [];
  if (features.length === 0) return null;
  const Icon = LAYER_ICONS[layer.type] || Map;
  const colorClass = LAYER_COLORS[layer.type] || 'text-slate-400';
  const propKeys = getPropertyKeys(features);
  const isNumeric = (k) => {
    for (const f of features) {
      const v = f.properties?.[k];
      if (v !== undefined && v !== null && v !== '') return typeof v === 'number';
    }
    return false;
  };
  const handleCopy = () => {
    const tsv = buildTSV(layer, propKeys);
    navigator.clipboard.writeText(tsv).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  const coordDisplay = (f) => {
    const g = f.geometry;
    if (!g) return '—';
    if (g.type === 'Point') return `${g.coordinates[1].toFixed(5)}, ${g.coordinates[0].toFixed(5)}`;
    if (g.type === 'LineString') return `${g.coordinates.length} pts`;
    if (g.type === 'Polygon') return `${(g.coordinates[0]?.length || 0) - 1} verts`;
    return '—';
  };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 border-b border-slate-700">
        <Icon className={cn("w-3.5 h-3.5 shrink-0", colorClass)} />
        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: layer.color }} />
        <h2 className="text-xs font-semibold text-white flex-1 truncate">{layer.name} <span className="text-slate-500 font-normal">({features.length})</span></h2>
        <button onClick={handleCopy} className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-colors", copied ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-slate-700 border-slate-600 text-slate-400 hover:text-white")}>
          {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
        </button>
        <button onClick={() => setVisible(v => !v)} className="text-slate-500 hover:text-white">
          {visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
      </div>
      {visible && (
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] text-slate-300 whitespace-nowrap">
            <thead className="bg-slate-800/80 border-b border-slate-700">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium text-slate-400 w-6">#</th>
                <th className="px-2 py-1.5 text-left font-medium text-slate-400">Coords</th>
                {propKeys.map(k => (
                  <th key={k} className="px-2 py-1.5 text-left font-medium text-slate-400 capitalize">{k.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {features.map((f, i) => (
                <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-2 py-1.5 text-slate-600">{i + 1}</td>
                  <td className="px-2 py-1.5 text-slate-400 font-mono text-[9px]">{coordDisplay(f)}</td>
                  {propKeys.map(k => {
                    const raw = f.properties?.[k];
                    if (typeof raw === 'object' && raw !== null) {
                      const display = (k === 'start_node' || k === 'end_node') ? (raw.type ? `${raw.type} ${raw.id?.slice(0, 6)}` : '—') : JSON.stringify(raw);
                      return <td key={k} className="px-2 py-1.5 text-slate-500 text-[9px]">{display}</td>;
                    }
                    const num = isNumeric(k);
                    const highlight = ['rated_power_mw', 'aep_mwh', 'hub_wind_speed', 'length_m'].includes(k);
                    return (
                      <td key={k} className={cn("px-2 py-1.5", highlight ? colorClass : 'text-slate-300')}>
                        <EditableCell value={raw} type={num ? 'number' : 'text'} onSave={v => onUpdateFeature(layer.id, f.id, k, v)} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function DataTablesPanel({ onClose }) {
  const { currentProjectId, currentProject } = usePlanningProject();
  const [localLayers, setLocalLayers] = useState(null);
  const [activeLayerId, setActiveLayerId] = useState('all');
  const [activeTab, setActiveTab] = useState('layers');
  const [localTurbineTypes, setLocalTurbineTypes] = useState(null);
  const [localCableTypes, setLocalCableTypes] = useState(null);

  useEffect(() => {
    if (currentProject) {
      if (currentProject.layers) setLocalLayers(currentProject.layers);
      if (currentProject.turbineTypes) setLocalTurbineTypes(currentProject.turbineTypes);
      if (currentProject.cableTypes) setLocalCableTypes(currentProject.cableTypes);
    }
  }, [currentProject]);

  const layers = localLayers || currentProject?.layers || [];
  const totalFeatures = layers.reduce((s, l) => s + (l.features?.length || 0), 0);
  const turbineTypes = localTurbineTypes || currentProject?.turbineTypes || [];
  const cableTypes = localCableTypes || currentProject?.cableTypes || [];

  const handleTurbineTypesChange = useCallback((next) => {
    setLocalTurbineTypes(next);
    const proj = loadProject(currentProjectId);
    if (proj) saveProject(currentProjectId, { ...proj, turbineTypes: next });
  }, [currentProjectId]);

  const handleCableTypesChange = useCallback((next) => {
    setLocalCableTypes(next);
    const proj = loadProject(currentProjectId);
    if (proj) saveProject(currentProjectId, { ...proj, cableTypes: next });
  }, [currentProjectId]);

  const handleUpdateFeature = useCallback((layerId, featureId, key, value) => {
    setLocalLayers(prev => {
      const next = (prev || layers).map(l => {
        if (l.id !== layerId) return l;
        return { ...l, features: l.features.map(f => f.id !== featureId ? f : { ...f, properties: { ...f.properties, [key]: value } }) };
      });
      const proj = loadProject(currentProjectId);
      if (proj) saveProject(currentProjectId, { ...proj, layers: next });
      return next;
    });
  }, [currentProjectId, layers]);

  return (
    <div className="fixed inset-0 z-[3500] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ width: '90vw', maxWidth: 1100, height: '85vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 shrink-0">
          <div>
            <h1 className="text-base font-bold text-white">{currentProject?.name || 'Project'} — Data Tables</h1>
            <p className="text-[10px] text-slate-500">{layers.length} layers · {totalFeatures} features · click any cell to edit</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Top tabs */}
        <div className="flex gap-1 px-5 pt-2 pb-0 border-b border-slate-800/60 shrink-0">
          {[{ id: 'layers', label: 'Layer Data' }, { id: 'turbine_library', label: 'Turbine Library' }, { id: 'cable_library', label: 'Cable Library' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-t-lg border-x border-t transition-colors -mb-px',
                activeTab === tab.id ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-800/40 border-transparent text-slate-500 hover:text-slate-300'
              )}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Layer filter tabs */}
        <div className={cn("flex gap-1.5 px-5 py-2 border-b border-slate-800/60 overflow-x-auto shrink-0", activeTab !== 'layers' && 'hidden')}>
          <button onClick={() => setActiveLayerId('all')}
            className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors shrink-0',
              activeLayerId === 'all' ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white')}>
            All <span className="text-slate-500">{totalFeatures}</span>
          </button>
          {layers.filter(l => l.type !== 'wind_resource').map(l => {
            const Icon = LAYER_ICONS[l.type] || Map;
            return (
              <button key={l.id} onClick={() => setActiveLayerId(l.id)}
                className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors shrink-0',
                  activeLayerId === l.id ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white')}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: l.color }} />
                <Icon className="w-2.5 h-2.5 shrink-0" />
                <span>{l.name}</span>
                <span className="text-slate-500">{l.features?.length || 0}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'layers' && (
            <>
              {layers.filter(l => l.type !== 'wind_resource' && (activeLayerId === 'all' || activeLayerId === l.id)).map(l => (
                <LayerTable key={l.id} layer={l} onUpdateFeature={handleUpdateFeature} />
              ))}
              {totalFeatures === 0 && (
                <div className="flex items-center justify-center py-16 text-slate-600 text-xs">No features in this project yet.</div>
              )}
            </>
          )}
          {activeTab === 'turbine_library' && <TurbineLibraryEditor turbineTypes={turbineTypes} onChange={handleTurbineTypesChange} />}
          {activeTab === 'cable_library' && <CableLibraryEditor cableTypes={cableTypes} onChange={handleCableTypesChange} />}
        </div>
      </div>
    </div>
  );
}