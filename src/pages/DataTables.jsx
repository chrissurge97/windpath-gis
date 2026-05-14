import React, { useState, useMemo, useEffect } from 'react';
import { usePlanningProject } from '@/lib/PlanningContext';
import { loadProjectIndex, loadProject } from '@/components/planning/ProjectManager';
import { ChevronDown, Wind, Zap, Target, FileText, Pentagon, Map, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const LAYER_ICONS = {
  turbine: Wind,
  cable: Zap,
  substation: Target,
  polygon: Pentagon,
};

const LAYER_COLORS = {
  turbine: 'text-emerald-400',
  cable: 'text-orange-400',
  substation: 'text-yellow-400',
  polygon: 'text-cyan-400',
};

function formatCoord(v) {
  return typeof v === 'number' ? v.toFixed(5) : '—';
}

function getFeatureCoords(feature) {
  const g = feature.geometry;
  if (!g) return '—';
  if (g.type === 'Point') return `${formatCoord(g.coordinates[1])}, ${formatCoord(g.coordinates[0])}`;
  if (g.type === 'LineString') return `${g.coordinates.length} vertices`;
  if (g.type === 'Polygon') return `${(g.coordinates[0]?.length || 0) - 1} vertices`;
  return '—';
}

function getGeomType(feature) {
  return feature.geometry?.type || '—';
}

// Gather all property keys from a set of features (excluding internal ones)
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

function formatVal(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(3);
  return String(v);
}

function LayerTable({ layer, cableTypes, turbineTypes }) {
  const [visible, setVisible] = useState(true);
  const features = layer.features || [];
  if (features.length === 0) return null;

  const Icon = LAYER_ICONS[layer.type] || Map;
  const colorClass = LAYER_COLORS[layer.type] || 'text-slate-400';

  // Build columns based on layer type
  const propKeys = getPropertyKeys(features);

  // For cables, resolve names
  const resolveNode = (node, layers) => {
    if (!node) return null;
    if (node.type === 'turbine') {
      const tl = layers?.find(l => l.type === 'turbine');
      return tl?.features.find(f => f.id === node.id)?.properties?.name || `Turbine ${node.id.slice(0,6)}`;
    }
    if (node.type === 'substation') {
      const sl = layers?.find(l => l.type === 'substation');
      return sl?.features.find(f => f.id === node.id)?.properties?.name || `Substation ${node.id.slice(0,6)}`;
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/60 border-b border-slate-700">
        <Icon className={cn("w-4 h-4 shrink-0", colorClass)} />
        <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: layer.color }} />
        <h2 className="text-sm font-semibold text-white flex-1">
          {layer.name} <span className="text-slate-500 font-normal">({features.length} feature{features.length !== 1 ? 's' : ''})</span>
        </h2>
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{layer.type}</span>
        <button onClick={() => setVisible(v => !v)} className="text-slate-500 hover:text-white ml-2">
          {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>

      {visible && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-slate-300 whitespace-nowrap">
            <thead className="bg-slate-800/80 border-b border-slate-700">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-400">#</th>
                <th className="px-3 py-2 text-left font-medium text-slate-400">Geometry</th>
                <th className="px-3 py-2 text-left font-medium text-slate-400">Coordinates</th>
                {propKeys.map(k => (
                  <th key={k} className="px-3 py-2 text-left font-medium text-slate-400 capitalize">
                    {k.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {features.map((f, i) => (
                <tr key={f.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-3 py-2 text-slate-600">{i + 1}</td>
                  <td className="px-3 py-2 text-slate-500">{getGeomType(f)}</td>
                  <td className="px-3 py-2 text-slate-400 font-mono text-[10px]">{getFeatureCoords(f)}</td>
                  {propKeys.map(k => {
                    let val = f.properties?.[k];
                    // Resolve node references for cables
                    if (k === 'start_node' || k === 'end_node') {
                      val = resolveNode(val) || (val ? `${val.type} ${val.id?.slice(0,6)}` : null);
                    }
                    // Format AEP in GWh
                    const display = k === 'aep_mwh' && typeof val === 'number'
                      ? `${(val / 1000).toFixed(3)} GWh`
                      : k === 'length_m' && typeof val === 'number'
                        ? `${(val / 1000).toFixed(3)} km`
                        : formatVal(val);
                    const isHighlight = ['rated_power_mw', 'aep_mwh', 'hub_wind_speed', 'length_m'].includes(k);
                    return (
                      <td key={k} className={cn("px-3 py-2", isHighlight ? colorClass + ' font-medium' : 'text-slate-300')}>
                        {display}
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
  const { currentProjectId, currentProject } = usePlanningProject();
  const [selectedProjectId, setSelectedProjectId] = useState(currentProjectId || '');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  const project = useMemo(() => {
    if (!selectedProjectId) return null;
    if (selectedProjectId === currentProjectId && currentProject) return currentProject;
    return loadProject(selectedProjectId);
  }, [selectedProjectId, currentProjectId, currentProject]);

  const projectsList = useMemo(() => {
    const index = loadProjectIndex();
    return index.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, []);

  // Auto-select current project if none selected
  useEffect(() => {
    if (!selectedProjectId && currentProjectId) setSelectedProjectId(currentProjectId);
  }, [currentProjectId]);

  const layers = project?.layers || [];
  const totalFeatures = layers.reduce((s, l) => s + (l.features?.length || 0), 0);

  if (!selectedProjectId && !currentProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-950 gap-4">
        <FileText className="w-12 h-12 text-slate-600" />
        <p className="text-slate-400 text-center max-w-sm">
          No project selected. Open a project in the Planning Tool first.
        </p>
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
            {layers.length} layer{layers.length !== 1 ? 's' : ''} &nbsp;·&nbsp; {totalFeatures} total feature{totalFeatures !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Project selector */}
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
              ) : (
                projectsList.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProjectId(p.id); setShowProjectDropdown(false); }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-xs transition-colors border-l-2',
                      selectedProjectId === p.id
                        ? 'bg-emerald-500/20 border-l-emerald-500 text-emerald-300'
                        : 'border-l-transparent text-slate-300 hover:bg-slate-800'
                    )}
                  >
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(p.updatedAt || p.createdAt).toLocaleDateString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Layer summary badges */}
      <div className="flex gap-2 px-6 py-3 border-b border-slate-800/60 overflow-x-auto shrink-0">
        {layers.map(l => {
          const Icon = LAYER_ICONS[l.type] || Map;
          const colorClass = LAYER_COLORS[l.type] || 'text-slate-400';
          return (
            <div key={l.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/60 border border-slate-700 rounded-full text-[11px] shrink-0">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: l.color }} />
              <span className="text-slate-300">{l.name}</span>
              <span className="text-slate-500">{l.features?.length || 0}</span>
            </div>
          );
        })}
      </div>

      {/* Tables */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {layers.filter(l => l.type !== 'wind_resource').map(l => (
          <LayerTable
            key={l.id}
            layer={l}
            cableTypes={project.cableTypes}
            turbineTypes={project.turbineTypes}
          />
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