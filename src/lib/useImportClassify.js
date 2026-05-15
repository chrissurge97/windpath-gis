/**
 * Hook that handles the "classify imported features" flow.
 * Processes point→turbine, line→cable, and polygon-only layers
 */
import { useCallback } from 'react';

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useImportClassify(selectedTurbineType, selectedCableTypeId, setLayers, setImportClassifyLayers) {
  return useCallback((decisions) => {
    const turbineLayer = setLayers.__turbineLayer;
    const cableLayer = setLayers.__cableLayer;
    const layers = setLayers.__layers;
    
    let turbineFeaturesToAdd = [];
    let cableFeaturesToAdd = [];
    const toAdd = [];

    const isPoint = (f) => f.geometry?.type === 'Point';
    const isLine = (f) => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString';

    for (const { layer, classification } of decisions) {
      if (classification === 'keep') {
        toAdd.push(layer);
        continue;
      }

      if (classification === 'turbine') {
        const pts = layer.features?.filter(isPoint) || [];
        const newTurbines = pts.map((f, i) => ({
          ...f,
          id: crypto.randomUUID(),
          properties: {
            name: f.properties?.name || `T${(turbineLayer?.features?.length || 0) + turbineFeaturesToAdd.length + i + 1}`,
            turbine_type_id: selectedTurbineType?.id,
            hub_height: selectedTurbineType?.hub_height_m || 100,
            rotor_diameter: selectedTurbineType?.rotor_diameter_m || 120,
            rated_power_mw: selectedTurbineType?.rated_power_mw || 3.5,
            ...Object.fromEntries(Object.entries(f.properties || {}).filter(([k]) => !['name', 'turbine_type_id'].includes(k))),
          },
        }));
        turbineFeaturesToAdd = [...turbineFeaturesToAdd, ...newTurbines];
        const rest = layer.features?.filter(f => !isPoint(f)) || [];
        if (rest.length > 0) toAdd.push({ ...layer, features: rest });

      } else if (classification === 'cable') {
        const lines = layer.features?.filter(isLine) || [];
        const flattened = lines.flatMap(f => {
          if (f.geometry?.type === 'MultiLineString') {
            return f.geometry.coordinates.map((coords, idx) => ({
              ...f,
              id: crypto.randomUUID(),
              geometry: { type: 'LineString', coordinates: coords },
              properties: {
                name: f.properties?.name ? `${f.properties.name}_${idx + 1}` : `Cable ${cableFeaturesToAdd.length + idx + 1}`,
                cable_type_id: selectedCableTypeId,
                length_m: coords.reduce((sum, p, i, arr) => i === 0 ? 0 : sum + haversineM(arr[i-1][1], arr[i-1][0], p[1], p[0]), 0),
                ...Object.fromEntries(Object.entries(f.properties || {}).filter(([k]) => !['name', 'cable_type_id', 'length_m'].includes(k))),
              },
            }));
          }
          const length_m = f.geometry?.coordinates.reduce((sum, p, i, arr) => i === 0 ? 0 : sum + haversineM(arr[i-1][1], arr[i-1][0], p[1], p[0]), 0);
          return [{
            ...f,
            id: crypto.randomUUID(),
            properties: {
              name: f.properties?.name || `Cable ${cableFeaturesToAdd.length + 1}`,
              cable_type_id: selectedCableTypeId,
              length_m: length_m,
              ...Object.fromEntries(Object.entries(f.properties || {}).filter(([k]) => !['name', 'cable_type_id', 'length_m'].includes(k))),
            },
          }];
        });
        cableFeaturesToAdd = [...cableFeaturesToAdd, ...flattened];
        const rest = layer.features?.filter(f => !isLine(f)) || [];
        if (rest.length > 0) toAdd.push({ ...layer, features: rest });
      }
    }

    setLayers(prev => {
      let next = [...prev];
      if (turbineFeaturesToAdd.length > 0) {
        next = next.map(l => l.type === 'turbine' ? { ...l, features: [...(l.features || []), ...turbineFeaturesToAdd] } : l);
      }
      if (cableFeaturesToAdd.length > 0) {
        next = next.map(l => l.type === 'cable' ? { ...l, features: [...(l.features || []), ...cableFeaturesToAdd] } : l);
      }
      return [...next, ...toAdd];
    });
    setImportClassifyLayers(null);
  }, [selectedTurbineType, selectedCableTypeId, setLayers, setImportClassifyLayers]);
}