import { startTransition } from 'react';
import { openImportFilePicker } from '@/lib/importHandler';

/**
 * Merge typed layers (turbine, cable, substation) from importedLayers into
 * the existing project layers. Non-typed layers are added as new layers.
 * This ensures imported turbines/cables appear in the Turbines/Cables tabs
 * and their topology (start_node/end_node) IDs remain intact.
 */
function mergeIntoLayers(prev, importedLayers) {
  // Deep-copy the array (but not feature arrays — we'll replace those)
  const next = prev.map(l => ({ ...l }));

  for (const imp of importedLayers) {
    const TYPED = ['turbine', 'cable', 'substation'];
    if (TYPED.includes(imp.type)) {
      const existing = next.find(l => l.type === imp.type);
      if (existing) {
        existing.features = [...existing.features, ...imp.features];
        continue;
      }
    }
    // No matching typed layer — add as new layer
    next.push(imp);
  }
  return next;
}

export function useHandleImport({
  selectedTurbineType,
  selectedCableTypeId,
  setImportLoading,
  addImportLog,
  setImportClassifyLayers,
  handleSwitchProject,
  setTurbineTypes,
  setCableTypes,
  setLayers,
  setShowImportConsole,
  setImportLogs,
  onCableTopology,
}) {
  return function handleImport() {
    setImportLogs([]);
    setShowImportConsole(true);
    openImportFilePicker({
      onLoading: (loading) => setImportLoading(loading),
      onLog: addImportLog,
      defaultTurbineType: selectedTurbineType,
      defaultCableTypeId: selectedCableTypeId,
      onClassifyMode: (rawLayers) => {
        setImportLoading(false);
        setImportClassifyLayers(rawLayers);
      },
      onProject: (project) => {
        const tempId = '__imported_' + Date.now() + '__';
        handleSwitchProject(tempId, { ...project, id: tempId });
      },
      onTypesUpdate: ({ turbineTypes: tt, cableTypes: ct }) => {
        if (tt?.length) setTurbineTypes(tt);
        if (ct?.length) setCableTypes(ct);
      },
      onCableTopology,
      onLayers: (importedLayers) => {
        startTransition(() => {
          setLayers(prev => mergeIntoLayers(prev, importedLayers));
        });
      },
    });
  };
}