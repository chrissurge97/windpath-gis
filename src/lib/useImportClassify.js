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

function calcLineLength(coords) {
  let len = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    len += haversineM(coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
  }
  return +len.toFixed(0);
}

/**
 * Validates that coordinates are in WGS84 (lon: -180..180, lat: -90..90).
 * Returns true if ALL coords in the feature look like WGS84.
 */
function coordsAreWGS84(coords) {
  // coords can be [lng, lat] or [[lng,lat], ...] or [[[lng,lat],...],...]
  const flat = coords.flat(Infinity);
  for (let i = 0; i < flat.length - 1; i += 2) {
    const lng = flat[i], lat = flat[i + 1];
    if (typeof lng !== 'number' || typeof lat !== 'number') return false;
    if (Math.abs(lng) > 180 || Math.abs(lat) > 90) return false;
  }
  return true;
}

function featureCoordsValid(f) {
  if (!f.geometry?.coordinates) return false;
  return coordsAreWGS84(f.geometry.coordinates);
}

export function useImportClassify(layers, selectedTurbineType, selectedCableTypeId, setLayers, setImportClassifyLayers) {
  return useCallback((decisions) => {
    const turbineLayer = layers.find(l => l.type === 'turbine');
    const cableLayer = layers.find(l => l.type === 'cable');

    let turbineFeaturesToAdd = [];
    let cableFeaturesToAdd = [];
    const layersToAdd = [];

    const warnings = [];

    const isPoint = (f) => f.geometry?.type === 'Point';
    const isLine = (f) => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString';

    for (const { layer, classification } of decisions) {
      if (classification === 'keep') {
        layersToAdd.push(layer);
        continue;
      }

      if (classification === 'turbine' && turbineLayer) {
        const pts = layer.features?.filter(isPoint) || [];

        // Separate valid vs invalid coords
        const validPts = pts.filter(featureCoordsValid);
        const invalidCount = pts.length - validPts.length;
        if (invalidCount > 0) {
          warnings.push(`"${layer.name}": ${invalidCount} point feature(s) skipped — coordinates appear to be in a projected CRS (not WGS84/GPS). Re-export as WGS84 to include them.`);
        }

        const startIdx = (turbineLayer.features?.length || 0) + turbineFeaturesToAdd.length;
        const newTurbines = validPts.map((f, i) => ({
          ...f,
          id: crypto.randomUUID(),
          properties: {
            name: f.properties?.name || `T${startIdx + i + 1}`,
            turbine_type_id: selectedTurbineType?.id,
            hub_height: selectedTurbineType?.hub_height_m || 100,
            rotor_diameter: selectedTurbineType?.rotor_diameter_m || 120,
            rated_power_mw: selectedTurbineType?.rated_power_mw || 3.5,
            ...Object.fromEntries(Object.entries(f.properties || {}).filter(([k]) => !['name', 'turbine_type_id'].includes(k))),
          },
        }));
        turbineFeaturesToAdd = [...turbineFeaturesToAdd, ...newTurbines];

        const rest = layer.features?.filter(f => !isPoint(f)) || [];
        if (rest.length > 0) layersToAdd.push({ ...layer, features: rest });

      } else if (classification === 'cable' && cableLayer) {
        const lines = layer.features?.filter(isLine) || [];

        const validLines = lines.filter(f => {
          // For MultiLineString, check each ring
          if (f.geometry?.type === 'MultiLineString') {
            return f.geometry.coordinates.some(ring => coordsAreWGS84(ring));
          }
          return featureCoordsValid(f);
        });
        const invalidCount = lines.length - validLines.length;
        if (invalidCount > 0) {
          warnings.push(`"${layer.name}": ${invalidCount} line feature(s) skipped — coordinates appear to be in a projected CRS (not WGS84/GPS). Re-export as WGS84 to include them.`);
        }

        const startIdx = (cableLayer.features?.length || 0) + cableFeaturesToAdd.length;
        const flattened = validLines.flatMap((f, fi) => {
          if (f.geometry?.type === 'MultiLineString') {
            // Only keep rings that pass WGS84 check
            const validRings = f.geometry.coordinates.filter(ring => coordsAreWGS84(ring));
            return validRings.map((coords, idx) => ({
              ...f,
              id: crypto.randomUUID(),
              geometry: { type: 'LineString', coordinates: coords },
              properties: {
                name: f.properties?.name
                  ? `${f.properties.name}_${idx + 1}`
                  : `Cable ${startIdx + fi + idx + 1}`,
                cable_type_id: selectedCableTypeId,
                length_m: calcLineLength(coords),
                start_node: null,
                end_node: null,
                ...Object.fromEntries(Object.entries(f.properties || {}).filter(([k]) => !['name', 'cable_type_id', 'length_m', 'start_node', 'end_node'].includes(k))),
              },
            }));
          }
          const coords = f.geometry.coordinates;
          const len = calcLineLength(coords);
          return [{
            ...f,
            id: crypto.randomUUID(),
            properties: {
              name: f.properties?.name || `Cable ${startIdx + fi + 1}`,
              cable_type_id: selectedCableTypeId,
              length_m: len,
              start_node: null,
              end_node: null,
              ...Object.fromEntries(Object.entries(f.properties || {}).filter(([k]) => !['name', 'cable_type_id', 'length_m', 'start_node', 'end_node'].includes(k))),
            },
          }];
        });

        cableFeaturesToAdd = [...cableFeaturesToAdd, ...flattened];

        const rest = layer.features?.filter(f => !isLine(f)) || [];
        if (rest.length > 0) layersToAdd.push({ ...layer, features: rest });

      } else {
        layersToAdd.push(layer);
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
      return [...next, ...layersToAdd];
    });

    if (warnings.length > 0) {
      // Show after state update so modal is gone first
      setTimeout(() => {
        alert(`Import completed with warnings:\n\n${warnings.join('\n\n')}`);
      }, 100);
    }

    setImportClassifyLayers(null);
  }, [layers, selectedTurbineType, selectedCableTypeId, setLayers, setImportClassifyLayers]);
}