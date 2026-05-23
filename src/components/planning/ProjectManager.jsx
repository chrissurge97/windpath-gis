import React, { useState, useRef, useEffect } from 'react';
import { FolderOpen, Plus, Save, FileText, ChevronDown, Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createLayer } from '@/lib/gisUtils';
import { DEFAULT_TURBINE_TYPES, DEFAULT_CABLE_TYPES } from '@/lib/turbineTypes';
import { loadProject as serverLoadProject, saveProject as serverSaveProject, createNewProject as serverCreateNewProject, listProjects } from '@/lib/projectStorage';
import { importProjectGeoJSON, importKML } from '@/lib/projectExport';
import FileExplorer from '@/components/planning/FileExplorer';

const DEMO_ID = '__demo__';

// ── File explorer modal is now in FileExplorer.jsx ────────────────────────────

function emptyProject(name = 'New Project') {
  return {
    name,
    layers: [
      createLayer({ name: 'Site Boundary', type: 'polygon', color: '#06b6d4', fillOpacity: 0.1 }),
      createLayer({ name: 'Turbines', type: 'turbine', color: '#10b981', fillOpacity: 0.8 }),
      createLayer({ name: 'Cables', type: 'cable', color: '#f97316', fillOpacity: 0.8 }),
      createLayer({ name: 'Substations', type: 'substation', color: '#facc15', fillOpacity: 1 }),
    ],
    turbineTypes: DEFAULT_TURBINE_TYPES,
    cableTypes: DEFAULT_CABLE_TYPES,
    windParams: { k: 2.0, lambda: 7.0 },
  };
}

// ── Open Project Modal (standalone) ─────────────────────────────────────────

export function OpenProjectModal({ onOpen, onClose }) {
  return (
    <FileExplorer
      mode="open"
      currentProjectId={null}
      currentProjectName=""
      currentData={{}}
      onClose={onClose}
      onOpen={onOpen}
      onSaved={() => {}}
    />
  );
}

// ── Import project from file (GeoJSON / KML / Shapefile) ─────────────────────

export function setupProjectImport(onProjectLoaded) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.geojson,.json,.kml,.kmz,.shp,.zip';

  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fname = file.name.toLowerCase();

    try {
      if (fname.endsWith('.kml') || fname.endsWith('.kmz')) {
        const text = await file.text();
        const project = importKML(text);
        if (!project.turbineTypes?.length) project.turbineTypes = DEFAULT_TURBINE_TYPES;
        if (!project.cableTypes?.length) project.cableTypes = DEFAULT_CABLE_TYPES;
        onProjectLoaded(project);
        return;
      }

      if (fname.endsWith('.json') || fname.endsWith('.geojson')) {
        const text = await file.text();
        const data = JSON.parse(text);
        const isProject = data.properties?.format === 'eagleview-wind-farm-project' ||
                          data.properties?.format === 'base44-wind-farm-project';
        if (isProject) {
          const project = importProjectGeoJSON(data);
          if (!project.turbineTypes?.length) project.turbineTypes = DEFAULT_TURBINE_TYPES;
          if (!project.cableTypes?.length) project.cableTypes = DEFAULT_CABLE_TYPES;
          onProjectLoaded(project);
          return;
        }
        // Plain GeoJSON with embedded layer metadata — reconstruct as project
        const { geoJSONToLayers } = await import('@/lib/gisUtils');
        const hasLayerMeta = data.features?.some(f => f.properties?._layerId);
        if (hasLayerMeta) {
          const layers = geoJSONToLayers(data);
          onProjectLoaded({ name: file.name.replace(/\.[^.]+$/, ''), layers, turbineTypes: DEFAULT_TURBINE_TYPES, cableTypes: DEFAULT_CABLE_TYPES, windParams: { k: 2.0, lambda: 7.0 } });
          return;
        }
        alert('This file does not appear to be an EagleView project export.\nUse the "Project (GeoJSON)" export option to create a portable project file.');
        return;
      }

      if (fname.endsWith('.shp') || fname.endsWith('.zip')) {
        const { importShapefile } = await import('@/lib/shapefileUtils');
        const { geoJSONToLayers, geoJSONToLayer } = await import('@/lib/gisUtils');
        const buf = await file.arrayBuffer();
        const result = await importShapefile(buf, file.name);
        const toProcess = Array.isArray(result) ? result : [result];
        const layers = [];
        for (const geojson of toProcess) {
          const hasLayerMeta = geojson.features?.some(f => f.properties?._layerId);
          if (hasLayerMeta) {
            geoJSONToLayers(geojson).forEach(l => layers.push(l));
          } else {
            layers.push(geoJSONToLayer(geojson, geojson._layerName || file.name.replace(/\.[^.]+$/, '')));
          }
        }
        const baseName = file.name.replace(/\.[^.]+$/, '');
        onProjectLoaded({ name: baseName, layers, turbineTypes: DEFAULT_TURBINE_TYPES, cableTypes: DEFAULT_CABLE_TYPES, windParams: { k: 2.0, lambda: 7.0 } });
        return;
      }

      alert('Unsupported file type. Supported formats: GeoJSON, KML, Shapefile (.shp/.zip)');
    } catch (err) {
      console.error('Import error:', err);
      alert('Failed to import file: ' + err.message);
    }
  };

  return input;
}

// ── Main ProjectFileButtons component ────────────────────────────────────────

export default function ProjectFileButtons({
  currentProjectId,
  currentProjectName,
  currentData,
  onNewProject,
  onSwitchProject,
  onSaved,
}) {
  const [modal, setModal] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNew = async () => {
    setDropdownOpen(false);
    if (!window.confirm('Create a new empty project? Unsaved changes will be lost.')) return;
    const name = window.prompt('New project name:', 'New Wind Farm Project');
    if (!name?.trim()) return;
    const data = emptyProject(name.trim());
    setSaving(true);
    const id = await serverSaveProject(null, data);
    setSaving(false);
    onNewProject(id, { ...data, id });
  };

  const handleImportProject = () => {
    setDropdownOpen(false);
    const input = setupProjectImport(async (project) => {
      setSaving(true);
      const id = await serverSaveProject(null, project);
      setSaving(false);
      onNewProject(id, { ...project, id });
    });
    input.click();
  };

  const handleQuickSave = async () => {
    if (!currentProjectId || currentProjectId === DEMO_ID) {
      setModal('save');
      return;
    }
    setSaving(true);
    await serverSaveProject(currentProjectId, currentData);
    setSaving(false);
  };

  const MENU_ITEMS = [
    { label: 'New Project', icon: Plus, action: handleNew },
    { label: 'Save Project', icon: Save, action: () => { setDropdownOpen(false); setModal('save'); } },
    { label: 'Open Project', icon: FolderOpen, action: () => { setDropdownOpen(false); setModal('open'); } },
    { label: 'Import Project', icon: Upload, action: handleImportProject },
  ];

  return (
    <>
      <div className="relative shrink-0 flex items-center gap-1" ref={dropdownRef}>
        <button
          onClick={() => { setDropdownOpen(v => !v); window.__trainingEvent__ = { type: 'file_menu_opened', payload: {}, ts: Date.now() }; }}
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all"
        >
          <FileText className="w-3 h-3" /> File <ChevronDown className={cn("w-3 h-3 transition-transform", dropdownOpen && "rotate-180")} />
        </button>
        {/* Quick save indicator */}
        {saving && <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />}
        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-[9999] overflow-hidden min-w-[140px]">
            {MENU_ITEMS.map(({ label, icon: Icon, action }) => (
              <button key={label} onClick={action}
                className="flex items-center gap-2 w-full px-3 py-2 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left">
                <Icon className="w-3 h-3" /> {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <FileExplorer
          mode={modal}
          currentProjectId={currentProjectId}
          currentProjectName={currentProjectName}
          currentData={currentData}
          onClose={() => setModal(null)}
          onOpen={(id, proj) => onSwitchProject(id, proj)}
          onSaved={(name, id) => onSaved(name, id)}
        />
      )}
    </>
  );
}

// ── Re-export helpers for backward compat ────────────────────────────────────
export { serverSaveProject as saveProject, serverLoadProject as loadProject, serverCreateNewProject as createNewProject, listProjects as loadProjectIndex };