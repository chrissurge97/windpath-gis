import React, { useState } from 'react';
import { X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CableTopologyModal({ cables, turbines, substations, onConfirm, onCancel }) {
  const [topology, setTopology] = useState(() => 
    cables.map(c => ({
      cableId: c.id,
      cableName: c.properties?.name || c.id,
      startNodeId: c.properties?.start_node?.id || '',
      endNodeId: c.properties?.end_node?.id || '',
    }))
  );

  const nodes = [
    ...turbines.map(t => ({ id: t.id, name: t.properties?.name || 'Turbine', type: 'turbine' })),
    ...substations.map(s => ({ id: s.id, name: s.properties?.name || 'Substation', type: 'substation' })),
  ];

  const handleNodeChange = (cableIdx, field, nodeId) => {
    setTopology(prev => {
      const updated = [...prev];
      updated[cableIdx] = { ...updated[cableIdx], [field]: nodeId };
      return updated;
    });
  };

  const handleConfirm = () => {
    const updatedCables = cables.map(cable => {
      const topoEntry = topology.find(t => t.cableId === cable.id);
      if (!topoEntry) return cable;

      const startNode = topoEntry.startNodeId
        ? nodes.find(n => n.id === topoEntry.startNodeId)
        : null;
      const endNode = topoEntry.endNodeId
        ? nodes.find(n => n.id === topoEntry.endNodeId)
        : null;

      return {
        ...cable,
        properties: {
          ...cable.properties,
          start_node: startNode ? { type: startNode.type, id: startNode.id } : null,
          end_node: endNode ? { type: endNode.type, id: endNode.id } : null,
        }
      };
    });

    onConfirm(updatedCables);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-orange-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Cable Topology</h2>
              <p className="text-xs text-slate-400">Select start and end nodes for each cable</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {topology.map((entry, idx) => (
            <div key={entry.cableId} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <p className="text-sm font-semibold text-white mb-3">{entry.cableName}</p>
              <div className="grid grid-cols-2 gap-3">
                {/* Start Node */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">From (Start Node)</label>
                  <select
                    value={entry.startNodeId}
                    onChange={(e) => handleNodeChange(idx, 'startNodeId', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-orange-500/60">
                    <option value="">— Not Connected —</option>
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>
                        {n.name} ({n.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* End Node */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">To (End Node)</label>
                  <select
                    value={entry.endNodeId}
                    onChange={(e) => handleNodeChange(idx, 'endNodeId', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-orange-500/60">
                    <option value="">— Not Connected —</option>
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>
                        {n.name} ({n.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-700 shrink-0">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-slate-600 text-slate-300 hover:text-white">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white">
            Apply Topology
          </Button>
        </div>
      </div>
    </div>
  );
}