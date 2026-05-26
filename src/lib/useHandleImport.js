import { startTransition } from 'react';
import { openImportFilePicker } from '@/lib/importHandler';

function deserializeProps(props) {
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('_layer')) continue;
    if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
      try { out[k] = JSON.parse(v); continue; } catch {}
    }
    out[k] = v;
  }
  return out;
}

function calcLineLength(coords) {
  const R = 6371000;
  let len = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const dLat = (coords[i+1][1] - coords[i][1]) * Math.PI / 180;
    const dLng = (coords[i+1][0] - coords[i][0]) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(coords[i][1]*Math.PI/180) * Math.cos(coords[i+1][1]*Math.PI/180) * Math.sin(dLng/2)**2;
    len += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  return +len.toFixed(0);
}

/**
 * Merge typed layers into existing project layers.
 * Reassigns fresh IDs to all typed features, builds an ID map,
 * then spatially snaps cable endpoints to the nearest turbine/substation —
 * matching the behaviour of the manual classify path so load flow works correctly.
 */
function mergeIntoLayers(prev, importedLayers) {
  const next = prev.map(l => ({ ...l }));
  const idMap = new Map(); // original id → new id

  // Separate typed vs non-typed (point layers are added as-is, like polygon layers)
  const TYPED = ['turbine', 'cable', 'substation'];
  const typedLayers = importedLayers.filter(l => TYPED.includes(l.type));
  const plainLayers = importedLayers.filter(l => !TYPED.includes(l.type));

  // ── Phase 1: Assign new IDs to turbines & substations, build idMap ──────
  const newTurbineFeatures = [];
  const newSubstationFeatures = [];
  const newCableFeatures = [];

  for (const imp of typedLayers) {
    if (imp.type === 'turbine') {
      for (const f of imp.features || []) {
        const origId = f.id || f.properties?.id || f.properties?.ID;
        const newId = crypto.randomUUID();
        if (origId) idMap.set(origId, newId);
        const props = deserializeProps(f.properties || {});
        newTurbineFeatures.push({ ...f, id: newId, properties: props });
      }
    } else if (imp.type === 'substation') {
      for (const f of imp.features || []) {
        const origId = f.id || f.properties?.id || f.properties?.ID;
        const newId = crypto.randomUUID();
        if (origId) idMap.set(origId, newId);
        const props = deserializeProps(f.properties || {});
        newSubstationFeatures.push({ ...f, id: newId, properties: props });
      }
    } else if (imp.type === 'cable') {
      for (const f of imp.features || []) {
        const props = deserializeProps(f.properties || {});
        newCableFeatures.push({ ...f, id: crypto.randomUUID(), properties: props });
      }
    }
  }

  // ── Phase 2: Snap cable endpoints to nearest turbine/substation ──────────
  const allNodes = [
    ...newTurbineFeatures.map(f => ({ id: f.id, type: 'turbine', coords: f.geometry.coordinates })),
    ...newSubstationFeatures.map(f => ({ id: f.id, type: 'substation', coords: f.geometry.coordinates })),
  ];

  const snapNode = (lng, lat) => {
    let best = null, bestDist = Infinity;
    for (const n of allNodes) {
      const d = Math.hypot(lng - n.coords[0], lat - n.coords[1]);
      if (d < bestDist) { bestDist = d; best = n; }
    }
    return bestDist < 0.01 ? { type: best.type, id: best.id } : null;
  };

  const resolvedCables = newCableFeatures.map(cable => {
    const coords = cable.geometry?.coordinates;
    if (!coords || coords.length < 2) return cable;
    const [startLng, startLat] = coords[0];
    const [endLng, endLat] = coords[coords.length - 1];

    // Try remapping existing node IDs first, then fall back to spatial snap
    const remapNode = (node) => {
      if (node?.id && idMap.has(node.id)) return { ...node, id: idMap.get(node.id) };
      return null;
    };

    const startNode = remapNode(cable.properties.start_node) || snapNode(startLng, startLat);
    const endNode   = remapNode(cable.properties.end_node)   || snapNode(endLng, endLat);

    return {
      ...cable,
      properties: {
        ...cable.properties,
        length_m: cable.properties.length_m || calcLineLength(coords),
        start_node: startNode,
        end_node: endNode,
      },
    };
  });

  // ── Phase 3: Merge into existing typed layers ────────────────────────────
  const mergeInto = (type, features) => {
    if (!features.length) return;
    const existing = next.find(l => l.type === type);
    if (existing) {
      existing.features = [...existing.features, ...features];
    } else {
      next.push({ id: crypto.randomUUID(), name: type.charAt(0).toUpperCase() + type.slice(1) + 's', type, features });
    }
  };

  mergeInto('turbine', newTurbineFeatures);
  mergeInto('substation', newSubstationFeatures);
  mergeInto('cable', resolvedCables);

  // Non-typed layers added as-is
  for (const l of plainLayers) next.push(l);

  return next;
}

export function useHandleImport({
  selectedTurbineType,
  selectedCableTypeId,
  setImportLoading,
  setImportClassifyLayers,
  handleSwitchProject,
  setTurbineTypes,
  setCableTypes,
  setLayers,
  onCableTopology,
  onImportComplete,
  onCSVMap,
}) {
  return function handleImport() {
    openImportFilePicker({
      onLoading: (loading) => setImportLoading(loading),
      defaultTurbineType: selectedTurbineType,
      defaultCableTypeId: selectedCableTypeId,
      onCSVMap,
      onClassify: (rawLayers) => {
        setImportLoading(false);
        setImportClassifyLayers(rawLayers);
      },
      onClassifyMode: (rawLayers) => {
        setImportLoading(false);
        setImportClassifyLayers(rawLayers);
      },
      onProject: (project) => {
        const tempId = '__imported_' + Date.now() + '__';
        handleSwitchProject(tempId, { ...project, id: tempId });
        if (onImportComplete) onImportComplete();
      },
      onTypesUpdate: ({ turbineTypes: tt, cableTypes: ct }) => {
        if (tt?.length) setTurbineTypes(tt);
        if (ct?.length) setCableTypes(ct);
      },
      onCableTopology,
      onLayers: (importedLayers) => {
        startTransition(() => {
          setLayers(prev => mergeIntoLayers(prev, importedLayers));
          if (onImportComplete) onImportComplete();
        });
      },
    });
  };
}