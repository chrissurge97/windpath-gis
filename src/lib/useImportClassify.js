/**
 * Hook that handles the "classify imported features" flow.
 * Returns { handleClassifyConfirm, calcLineLength } ready to use in Planning.
 */
import { useCallback, useRef, useEffect } from 'react';

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcLineLength(coords) {
  let len = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    len += haversineM(coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
  }
  return +len.toFixed(0);
}

export function useImportClassify({ layers, selectedTurbineTypeId, selectedTurbineType, selectedCableTypeId, setLayers, setImportClassifyLayers }) {
  // Use refs so the callback never goes stale and doesn't trigger re-renders
  const layersRef = useRef(layers);
  const turbineTypeIdRef = useRef(selectedTurbineTypeId);
  const turbineTypeRef = useRef(selectedTurbineType);
  const cableTypeIdRef = useRef(selectedCableTypeId);
  useEffect(() => { layersRef.current = layers; }, [layers]);
  useEffect(() => { turbineTypeIdRef.current = selectedTurbineTypeId; }, [selectedTurbineTypeId]);
  useEffect(() => { turbineTypeRef.current = selectedTurbineType; }, [selectedTurbineType]);
  useEffect(() => { cableTypeIdRef.current = selectedCableTypeId; }, [selectedCableTypeId]);

  const handleClassifyConfirm = useCallback((decisions) => {
    const layers = layersRef.current;
    const selectedTurbineTypeId = turbineTypeIdRef.current;
    const selectedTurbineType = turbineTypeRef.current;
    const selectedCableTypeId = cableTypeIdRef.current;
    const turbLayer = layers.find(l => l.type === 'turbine');
    const cableLayerRef = layers.find(l => l.type === 'cable');
    const toAdd = [];
    let turbineFeaturesToAdd = [];
    let cableFeaturesToAdd = [];

    const isPoint = (f) => f.geometry?.type === 'Point';
    const isLine = (f) => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString';

    for (const { layer, classification } of decisions) {
      if (classification === 'keep') { toAdd.push(layer); continue; }

      if (classification === 'turbine' && turbLayer) {
        const pts = layer.features.filter(isPoint);
        const newTurbines = pts.map((f, i) => ({
          ...f,
          id: crypto.randomUUID(),
          properties: {
            name: f.properties?.name || `T${turbLayer.features.length + turbineFeaturesToAdd.length + i + 1}`,
            turbine_type_id: selectedTurbineTypeId,
            hub_height: selectedTurbineType?.hub_height_m || 100,
            rotor_diameter: selectedTurbineType?.rotor_diameter_m || 120,
            rated_power_mw: selectedTurbineType?.rated_power_mw || 3.5,
            ...Object.fromEntries(Object.entries(f.properties || {}).filter(([k]) => k !== 'name')),
          },
        }));
        turbineFeaturesToAdd = [...turbineFeaturesToAdd, ...newTurbines];
        const rest = layer.features.filter(f => !isPoint(f));
        if (rest.length > 0) toAdd.push({ ...layer, features: rest });

      } else if (classification === 'cable' && cableLayerRef) {
        const lines = layer.features.filter(isLine);
        const flattened = lines.flatMap(f => {
          if (f.geometry?.type === 'MultiLineString') {
            return f.geometry.coordinates.map((coords, idx) => ({
              ...f,
              id: crypto.randomUUID(),
              geometry: { type: 'LineString', coordinates: coords },
              properties: {
                ...f.properties,
                name: f.properties?.name ? `${f.properties.name}_${idx + 1}` : `Cable ${cableFeaturesToAdd.length + idx + 1}`,
              },
            }));
          }
          return [{
            ...f,
            id: crypto.randomUUID(),
            properties: {
              ...f.properties,
              name: f.properties?.name || `Cable ${cableFeaturesToAdd.length + 1}`,
              cable_type_id: selectedCableTypeId,
              length_m: calcLineLength(f.geometry.coordinates),
            },
          }];
        });
        cableFeaturesToAdd = [...cableFeaturesToAdd, ...flattened];
        const rest = layer.features.filter(f => !isLine(f));
        if (rest.length > 0) toAdd.push({ ...layer, features: rest });

      } else {
        toAdd.push(layer);
      }
    }

    setLayers(prev => {
      let next = [...prev];
      if (turbineFeaturesToAdd.length > 0) {
        next = next.map(l => l.type === 'turbine' ? { ...l, features: [...l.features, ...turbineFeaturesToAdd] } : l);
      }
      if (cableFeaturesToAdd.length > 0) {
        next = next.map(l => l.type === 'cable' ? { ...l, features: [...l.features, ...cableFeaturesToAdd] } : l);
      }
      return [...next, ...toAdd];
    });
    setImportClassifyLayers(null);
  }, [setLayers, setImportClassifyLayers]);

  return { handleClassifyConfirm };
}