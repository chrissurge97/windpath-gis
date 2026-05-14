import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { usePlanningProject } from '@/lib/PlanningContext';
import { loadProjectIndex, loadProject, saveProject } from '@/components/planning/ProjectManager';
import { ChevronDown, Wind, Zap, Target, FileText, Pentagon, Map, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

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

function rawVal(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// Serialize a property value for TSV output
function serializeProp(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    // For node refs like {type:'turbine', id:'...'}, make readable
    if (v.type && v.id) return `${v.type}:${v.id.slice(0, 8)}`;
    return JSON.stringify(v);
  }
  return String(v);
}

// Build TSV matching the CSV import schema: name, lat, lng, notes, ...extra props
// All geometry types handled: Point (1 row), Polygon/LineString (1 row per vertex)
function buildTSV(layer, propKeys) {
  const features = layer.features || [];

  // Fixed columns always come first; extra = everything else that isn't internal
  const fixedSkip = new Set(['name', 'notes', 'lat', 'lng', 'layerId', '_featureType']);
  const extraKeys = propKeys.filter(k => !fixedSkip.has(k));

  const headers = ['name', 'lat', 'lng', 'notes', ...extraKeys];
  const rows = [headers];

  const propsRow = (p, nameOverride, lat, lng, isFirst = true) => [
    nameOverride,
    lat,
    lng,
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
      <input
        autoFocus
        type={type === 'number' ? 'number' : 'text'}
        value={draft}
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
    <span
      onClick={() => { setDraft(String(value ?? '')); setEditing(true); }}
      className="cursor-pointer hover:bg-slate-700/60 rounded px-1 py-0.5 transition-colors group"
      title="Click to edit"
    >
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
    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const updateProp = (featureId, key, value) => {
    onUpdateFeature(layer.id, featureId, key, value);
  };

  // Coord display
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
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/60 border-b border-slate-700">
        <Icon className={cn("w-4 h-4 shrink-0", colorClass)} />
        <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: layer.color }} />
        <h2 className="text-sm font-semibold text-white flex-1">
          {layer.name} <span className="text-slate-500 font-normal">({features.length})</span>
        </h2>
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{layer.type}</span>
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-colors ml-1",
            copied
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
              : "bg-slate-700 border-slate-600 text-slate-400 hover:text-white hover:border-slate-500"
          )}
          title="Copy table as TSV (paste into Excel)"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button onClick={() => setVisible(v => !v)} className="text-slate-500 hover:text-white ml-1">
          {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>

      {visible && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-slate-300 whitespace-nowrap">
            <thead className="bg-slate-800/80 border-b border-slate-700">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-400 w-8">#</th>
                <th className="px-3 py-2 text-left font-medium text-slate-400">Geom</th>
                <th className="px-3 py-2 text-left font-medium text-slate-400">Coords</th>
                {propKeys.map(k => (
                  <th key={k} className="px-3 py-2 text-left font-medium text-slate-400 capitalize">
                    {k.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {features.map((f, i) => (
                <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-3 py-2 text-slate-600">{i + 1}</td>
                  <td className="px-3 py-2 text-slate-500 text-[10px]">{f.geometry?.type || '—'}</td>
                  <td className="px-3 py-2 text-slate-400 font-mono text-[10px]">{coordDisplay(f)}</td>
                  {propKeys.map(k => {
                    const raw = f.properties?.[k];
                    // Skip editable for object fields (start_node, end_node etc)
                    if (typeof raw === 'object' && raw !== null) {
                      const display = k === 'start_node' || k === 'end_node'
                        ? (raw.type ? `${raw.type} ${raw.id?.slice(0, 6)}` : '—')
                        : JSON.stringify(raw);
                      return <td key={k} className="px-3 py-2 text-slate-500 text-[10px]">{display}</td>;
                    }
                    const num = isNumeric(k);
                    const highlight = ['rated_power_mw', 'aep_mwh', 'hub_wind_speed', 'length_m'].includes(k);
                    return (
                      <td key={k} className={cn("px-3 py-2", highlight ? colorClass : 'text-slate-300')}>
                        <EditableCell
                          value={raw}
                          type={num ? 'number' : 'text'}
                          onSave={v => updateProp(f.id, k, v)}
                        />
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

export default function DataTables() {
  const { currentProjectId, currentProject, switchProject } = usePlanningProject();
  const [selectedProjectId, setSelectedProjectId] = useState(currentProjectId || '');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [localLayers, setLocalLayers] = useState(null);

  const project = useMemo(() => {
    if (!selectedProjectId) return null;
    if (selectedProjectId === currentProjectId && currentProject) return currentProject;
    return loadProject(selectedProjectId);
  }, [selectedProjectId, currentProjectId, currentProject]);

  const projectsList = useMemo(() => {
    const index = loadProjectIndex();
    return index.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, []);

  useEffect(() => {
    if (!selectedProjectId && currentProjectId) setSelectedProjectId(currentProjectId);
  }, [currentProjectId]);

  // Sync local layers from project
  useEffect(() => {
    if (project?.layers) setLocalLayers(project.layers);
  }, [project]);

  const layers = localLayers || project?.layers || [];
  const totalFeatures = layers.reduce((s, l) => s + (l.features?.length || 0), 0);

  const handleUpdateFeature = useCallback((layerId, featureId, key, value) => {
    setLocalLayers(prev => {
      const next = prev.map(l => {
        if (l.id !== layerId) return l;
        return {
          ...l,
          features: l.features.map(f =>
            f.id !== featureId ? f : { ...f, properties: { ...f.properties, [key]: value } }
          )
        };
      });
      // Persist to localStorage
      const proj = loadProject(selectedProjectId);
      if (proj) saveProject(selectedProjectId, { ...proj, layers: next });
      return next;
    });
  }, [selectedProjectId]);

  if (!selectedProjectId && !currentProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-950 gap-4">
        <FileText className="w-12 h-12 text-slate-600" />
        <p className="text-slate-400 text-center max-w-sm">No project selected. Open a project in the Planning Tool first.</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-950 gap-4">
        <FileText className="w-12 h-12 text-slate-600" />
        <p className="text-slate-400">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white">{project.name}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {layers.length} layer{layers.length !== 1 ? 's' : ''} · {totalFeatures} features · <span className="text-slate-600">Click any cell to edit</span>
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowProjectDropdown(v => !v)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:text-white transition-colors"
          >
            <FileText className="w-4 h-4" />
            Switch Project
            <ChevronDown className={cn("w-4 h-4 transition-transform", showProjectDropdown && "rotate-180")} />
          </button>
          {showProjectDropdown && (
            <div className="absolute top-full right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden min-w-[220px] max-h-72 overflow-y-auto">
              {projectsList.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500">No saved projects</div>
              ) : projectsList.map(p => (
                <button key={p.id}
                  onClick={() => { setSelectedProjectId(p.id); setLocalLayers(null); setShowProjectDropdown(false); }}
                  className={cn('w-full text-left px-3 py-2 text-xs transition-colors border-l-2',
                    selectedProjectId === p.id ? 'bg-emerald-500/20 border-l-emerald-500 text-emerald-300' : 'border-l-transparent text-slate-300 hover:bg-slate-800'
                  )}>
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{new Date(p.updatedAt || p.createdAt).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Layer badges */}
      <div className="flex gap-2 px-6 py-3 border-b border-slate-800/60 overflow-x-auto shrink-0">
        {layers.map(l => (
          <div key={l.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/60 border border-slate-700 rounded-full text-[11px] shrink-0">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: l.color }} />
            <span className="text-slate-300">{l.name}</span>
            <span className="text-slate-500">{l.features?.length || 0}</span>
          </div>
        ))}
      </div>

      {/* Tables */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {layers.filter(l => l.type !== 'wind_resource').map(l => (
          <LayerTable key={l.id} layer={l} onUpdateFeature={handleUpdateFeature} />
        ))}
        {totalFeatures === 0 && (
          <div className="flex items-center justify-center py-16 text-slate-600">
            <p>No features in this project yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}