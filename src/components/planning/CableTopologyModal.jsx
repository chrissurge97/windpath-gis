import React, { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CableTopologyModal({ cables, turbines, substations, onConfirm, onCancel }) {
  const [nodeSelections, setNodeSelections] = useState(() => {
    const init = {};
    cables.forEach(c => {
      init[c.id] = {
        start_node: c.properties?.start_node?.name || c.properties?.start_node || null,
        end_node: c.properties?.end_node?.name || c.properties?.end_node || null,
      };
    });
    return init;
  });

  const allNodes = [
    ...turbines.map(t => ({ id: t.id, name: t.properties?.name, type: 'turbine' })),
    ...substations.map(s => ({ id: s.id, name: s.properties?.name, type: 'substation' })),
  ];

  const handleNodeChange = (cableId, side, nodeId) => {
    const node = allNodes.find(n => n.id === nodeId);
    setNodeSelections(prev => ({
      ...prev,
      [cableId]: {
        ...prev[cableId],
        [side]: nodeId ? { type: node.type, id: node.id, name: node.name } : null,
      }
    }));
  };

  const handleConfirm = () => {
    const updatedCables = cables.map(c => ({
      ...c,
      properties: {
        ...c.properties,
        start_node: nodeSelections[c.id]?.start_node || null,
        end_node: nodeSelections[c.id]?.end_node || null,
      }
    }));
    onConfirm(updatedCables);
  };

  const allSelected = cables.every(c => nodeSelections[c.id]?.start_node && nodeSelections[c.id]?.end_node);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
          <h2 className="text-lg font-bold text-white">Assign Cable Nodes</h2>
          <button onClick={onCancel} className="text-slate-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <p className="text-sm text-slate-400 mb-4">Select start and end nodes for each cable to establish topology:</p>
          
          {cables.map(cable => (
            <div key={cable.id} className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
              <p className="text-sm font-semibold text-white mb-3">{cable.properties?.name || `Cable ${cables.indexOf(cable) + 1}`}</p>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Start Node */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Start Node</label>
                  <select
                    value={nodeSelections[cable.id]?.start_node?.id || ''}
                    onChange={(e) => handleNodeChange(cable.id, 'start_node', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-cyan-500"
                  >
                    <option value="">— Select node —</option>
                    {allNodes.map(node => (
                      <option key={node.id} value={node.id}>
                        {node.name} ({node.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* End Node */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">End Node</label>
                  <select
                    value={nodeSelections[cable.id]?.end_node?.id || ''}
                    onChange={(e) => handleNodeChange(cable.id, 'end_node', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-cyan-500"
                  >
                    <option value="">— Select node —</option>
                    {allNodes.map(node => (
                      <option key={node.id} value={node.id}>
                        {node.name} ({node.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status */}
              {nodeSelections[cable.id]?.start_node && nodeSelections[cable.id]?.end_node ? (
                <p className="text-xs text-emerald-400 mt-2">
                  ✓ {nodeSelections[cable.id].start_node.name} → {nodeSelections[cable.id].end_node.name}
                </p>
              ) : (
                <p className="text-xs text-amber-400 mt-2">⚠ Both nodes required</p>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-700 shrink-0">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!allSelected}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              allSelected
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
            )}
          >
            Confirm Topology
          </button>
        </div>
      </div>
    </div>
  );
}