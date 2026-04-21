import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Layers, Eye, EyeOff, Trash2, Plus, ChevronDown, ChevronRight,
  Edit2, Check, X, Download, Upload, Wind
} from 'lucide-react';
import { downloadJSON, layerToGeoJSON, exportSchema } from '@/lib/gisUtils';

export default function LayerPanel({
  layers, selectedLayerId, onSelectLayer, onToggleLayer,
  onDeleteLayer, onAddLayer, onUpdateLayer, onImport
}) {
  const [expanded, setExpanded] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const startEdit = (layer) => { setEditingId(layer.id); setEditName(layer.name); };
  const commitEdit = (layer) => {
    onUpdateLayer(layer.id, { name: editName });
    setEditingId(null);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.geojson';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          onImport(data, file.name.replace(/\.[^.]+$/, ''));
        } catch (err) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 w-56 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3 h-3" /> Layers
        </span>
        <div className="flex gap-1">
          <button onClick={handleImport} title="Import GeoJSON" className="p-1 text-slate-500 hover:text-emerald-400 transition-colors">
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => downloadJSON(exportSchema(layers), 'layer-schema.json')}
            title="Export Schema"
            className="p-1 text-slate-500 hover:text-cyan-400 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onAddLayer}
            title="Add layer"
            className="p-1 text-slate-500 hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto py-1">
        {layers.length === 0 && (
          <p className="text-[11px] text-slate-600 text-center py-6">No layers yet.<br />Click + to add one.</p>
        )}
        {layers.map(layer => {
          const isSelected = layer.id === selectedLayerId;
          const isExpanded = expanded[layer.id];
          return (
            <div key={layer.id}>
              <div
                onClick={() => onSelectLayer(layer.id)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1.5 cursor-pointer group transition-all",
                  isSelected ? "bg-slate-800" : "hover:bg-slate-800/60"
                )}
              >
                {/* Color swatch */}
                <div
                  className="w-3 h-3 rounded-sm shrink-0 border border-white/10"
                  style={{ background: layer.color, opacity: layer.fillOpacity + 0.4 }}
                />

                {/* Name */}
                {editingId === layer.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(layer); if (e.key === 'Escape') setEditingId(null); }}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 text-xs bg-slate-700 text-white rounded px-1 py-0.5 outline-none"
                  />
                ) : (
                  <span className="flex-1 text-xs truncate text-slate-300">{layer.name}</span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {editingId === layer.id ? (
                    <>
                      <button onClick={e => { e.stopPropagation(); commitEdit(layer); }} className="p-0.5 text-emerald-400"><Check className="w-3 h-3" /></button>
                      <button onClick={e => { e.stopPropagation(); setEditingId(null); }} className="p-0.5 text-slate-500"><X className="w-3 h-3" /></button>
                    </>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); startEdit(layer); }} className="p-0.5 text-slate-500 hover:text-white"><Edit2 className="w-3 h-3" /></button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); onToggleLayer(layer.id); }}
                    className="p-0.5 text-slate-500 hover:text-white"
                  >
                    {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); downloadJSON(layerToGeoJSON(layer), `${layer.name}.geojson`); }}
                    className="p-0.5 text-slate-500 hover:text-cyan-400"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onDeleteLayer(layer.id); }}
                    className="p-0.5 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); toggle(layer.id); }} className="p-0.5 text-slate-500">
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Feature count */}
              {isExpanded && (
                <div className="ml-6 py-1 text-[10px] text-slate-600 space-y-0.5 border-l border-slate-800 pl-2">
                  <p>{layer.features.length} feature{layer.features.length !== 1 ? 's' : ''}</p>
                  {layer.type === 'turbine' && <p className="flex items-center gap-1"><Wind className="w-2.5 h-2.5" />{layer.features.length * 3.5} MW total</p>}
                  {layer.schema.length > 0 && (
                    <p>{layer.schema.length} attribute{layer.schema.length !== 1 ? 's' : ''}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}