import React from 'react';
import CableTopologyModal from './CableTopologyModal';
import ImportClassifyModal from './ImportClassifyModal';
import NewZoneDialog from './NewZoneDialog';
import DataTablesPanel from './DataTablesPanel';

/**
 * Centralized modal rendering component to reduce Planning.jsx file size
 */
export default function PlanningModals({
  pendingCableTopology,
  setPendingCableTopology,
  handleSwitchProject,
  importClassifyLayers,
  setImportClassifyLayers,
  handleClassifyConfirm,
  showNewZoneDialog,
  setShowNewZoneDialog,
  createLayer,
  setLayers,
  showDataTables,
  setShowDataTables,
}) {
  return (
    <>
      {/* Cable Topology Modal (KML Import) */}
      {pendingCableTopology &&
      <CableTopologyModal
        cables={pendingCableTopology.cables}
        turbines={pendingCableTopology.turbines}
        substations={pendingCableTopology.substations}
        onConfirm={(updatedCables) => {
          const project = { ...pendingCableTopology.project };
          const cableLayer = project.layers.find(l => l.type === 'cable');
          if (cableLayer) {
            cableLayer.features = updatedCables;
          }
          const tempId = '__imported_' + Date.now() + '__';
          handleSwitchProject(tempId, { ...project, id: tempId });
          setPendingCableTopology(null);
        }}
        onCancel={() => setPendingCableTopology(null)}
      />
      }

      {importClassifyLayers &&
      <ImportClassifyModal
        layers={importClassifyLayers}
        onConfirm={handleClassifyConfirm}
        onClose={() => setImportClassifyLayers(null)} />
      }

      {showNewZoneDialog &&
      <NewZoneDialog
        onClose={() => setShowNewZoneDialog(false)}
        onCreate={({ name, color }) => {
          const l = createLayer({ name, type: 'polygon', color });
          setLayers((prev) => [...prev, l]);
        }} />
      }

      {showDataTables &&
      <DataTablesPanel onClose={() => setShowDataTables(false)} />
      }
    </>
  );
}