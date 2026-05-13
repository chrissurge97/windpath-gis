import React, { useState, useMemo } from 'react';
import { usePlanningProject } from '@/lib/PlanningContext';
import { loadProjectIndex, loadProject } from '@/components/planning/ProjectManager';
import { ChevronDown, Wind, Zap, Target, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DataTables() {
  const { currentProjectId, currentProject } = usePlanningProject();
  const [selectedProjectId, setSelectedProjectId] = useState(currentProjectId);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  // Load the selected project
  const project = useMemo(() => {
    if (!selectedProjectId) return null;
    if (selectedProjectId === currentProjectId && currentProject) return currentProject;
    return loadProject(selectedProjectId);
  }, [selectedProjectId, currentProjectId, currentProject]);

  const projectsList = useMemo(() => {
    const index = loadProjectIndex();
    return index.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, []);

  if (!selectedProjectId && !currentProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-950 gap-4">
        <FileText className="w-12 h-12 text-slate-600" />
        <p className="text-slate-400 text-center max-w-sm">
          No project selected. Open or create a project in the Planning Tool to view its data tables.
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

  const turbineLayer = project.layers?.find(l => l.type === 'turbine');
  const cableLayer = project.layers?.find(l => l.type === 'cable');
  const substationLayer = project.layers?.find(l => l.type === 'substation');

  const turbines = turbineLayer?.features || [];
  const cables = cableLayer?.features || [];
  const substations = substationLayer?.features || [];

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {turbines.length} turbine{turbines.length !== 1 ? 's' : ''} • {cables.length} cable{cables.length !== 1 ? 's' : ''} • {substations.length} substation{substations.length !== 1 ? 's' : ''}
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
            <div className="absolute top-full right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-[1000] overflow-hidden min-w-[220px] max-h-[300px] overflow-y-auto">
              {projectsList.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500">No saved projects</div>
              ) : (
                projectsList.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProjectId(p.id);
                      setShowProjectDropdown(false);
                    }}
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

      {/* Tables */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Turbines Table */}
        {turbines.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/60 border-b border-slate-700">
              <Wind className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Turbines ({turbines.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300">
                <thead className="bg-slate-800 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-right">Lat</th>
                    <th className="px-4 py-2 text-right">Lng</th>
                    <th className="px-4 py-2 text-right">Hub Height (m)</th>
                    <th className="px-4 py-2 text-right">Rotor Ø (m)</th>
                    <th className="px-4 py-2 text-right">Capacity (MW)</th>
                    <th className="px-4 py-2 text-right">Elevation (m)</th>
                    <th className="px-4 py-2 text-right">Wind Speed (m/s)</th>
                    <th className="px-4 py-2 text-right">AEP (MWh)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {turbines.map(t => (
                    <tr key={t.id} className="hover:bg-slate-800/50">
                      <td className="px-4 py-2 font-medium">{t.properties.name || '—'}</td>
                      <td className="px-4 py-2 text-slate-400">{t.properties.turbine_type_id || '—'}</td>
                      <td className="px-4 py-2 text-right">{t.geometry.coordinates[1].toFixed(4)}</td>
                      <td className="px-4 py-2 text-right">{t.geometry.coordinates[0].toFixed(4)}</td>
                      <td className="px-4 py-2 text-right">{t.properties.hub_height || '—'}</td>
                      <td className="px-4 py-2 text-right">{t.properties.rotor_diameter || '—'}</td>
                      <td className="px-4 py-2 text-right text-emerald-400 font-semibold">{t.properties.rated_power_mw || '—'}</td>
                      <td className="px-4 py-2 text-right text-slate-400">{t.properties.elevation_m || '—'}</td>
                      <td className="px-4 py-2 text-right text-cyan-400">{t.properties.hub_wind_speed?.toFixed(2) || '—'}</td>
                      <td className="px-4 py-2 text-right text-emerald-400">{t.properties.aep_mwh ? (t.properties.aep_mwh / 1000).toFixed(2) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cables Table */}
        {cables.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/60 border-b border-slate-700">
              <Zap className="w-4 h-4 text-orange-400" />
              <h2 className="text-sm font-semibold text-white">Cables ({cables.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300">
                <thead className="bg-slate-800 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Cable Type</th>
                    <th className="px-4 py-2 text-right">Length (km)</th>
                    <th className="px-4 py-2 text-left">From</th>
                    <th className="px-4 py-2 text-left">To</th>
                    <th className="px-4 py-2 text-right">Cost (£)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {cables.map(c => {
                    const startNode = c.properties.start_node;
                    const endNode = c.properties.end_node;
                    const startLabel = startNode ? `${startNode.type} ${startNode.id.slice(0, 6)}` : 'Free';
                    const endLabel = endNode ? `${endNode.type} ${endNode.id.slice(0, 6)}` : 'Free';
                    const cost = (c.properties.length_m || 0) * (project.cableTypes?.find(ct => ct.id === c.properties.cable_type_id)?.cost_per_m || 0);
                    return (
                      <tr key={c.id} className="hover:bg-slate-800/50">
                        <td className="px-4 py-2 font-medium">{c.properties.name || '—'}</td>
                        <td className="px-4 py-2 text-slate-400">{c.properties.cable_type_id || '—'}</td>
                        <td className="px-4 py-2 text-right text-orange-400 font-semibold">
                          {((c.properties.length_m || 0) / 1000).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-slate-400 text-[10px]">{startLabel}</td>
                        <td className="px-4 py-2 text-slate-400 text-[10px]">{endLabel}</td>
                        <td className="px-4 py-2 text-right text-yellow-400">{cost.toFixed(0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Substations Table */}
        {substations.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/60 border-b border-slate-700">
              <Target className="w-4 h-4 text-yellow-400" />
              <h2 className="text-sm font-semibold text-white">Substations ({substations.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300">
                <thead className="bg-slate-800 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-right">Lat</th>
                    <th className="px-4 py-2 text-right">Lng</th>
                    <th className="px-4 py-2 text-right">Transformer (MVA)</th>
                    <th className="px-4 py-2 text-right">Gen Capacity (MW)</th>
                    <th className="px-4 py-2 text-right">Demand Capacity (MW)</th>
                    <th className="px-4 py-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {substations.map(s => (
                    <tr key={s.id} className="hover:bg-slate-800/50">
                      <td className="px-4 py-2 font-medium">{s.properties.name || '—'}</td>
                      <td className="px-4 py-2 text-right">{s.geometry.coordinates[1].toFixed(4)}</td>
                      <td className="px-4 py-2 text-right">{s.geometry.coordinates[0].toFixed(4)}</td>
                      <td className="px-4 py-2 text-right">{s.properties.transformer_mva || '—'}</td>
                      <td className="px-4 py-2 text-right text-emerald-400">{s.properties.capacity_generation_mw || '—'}</td>
                      <td className="px-4 py-2 text-right text-emerald-400">{s.properties.capacity_demand_mw || '—'}</td>
                      <td className="px-4 py-2 text-slate-500 text-[10px]">{s.properties.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {turbines.length === 0 && cables.length === 0 && substations.length === 0 && (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <p>No turbines, cables, or substations in this project.</p>
          </div>
        )}
      </div>
    </div>
  );
}