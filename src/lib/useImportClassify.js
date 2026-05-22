/**
 * Hook that handles the "classify imported features" flow.
 * Now with proper ID mapping to preserve cable-to-turbine/substation references.
 */
import { useCallback } from 'react';

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function deserializeProps(props) {
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    // Skip all layer metadata fields
    if (k.startsWith('_layer')) continue;
    if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
      try { out[k] = JSON.parse(v); continue; } catch {}
    }
    out[k] = v;
  }
  return out;
}

function calcLineLength(coords) {
  let len = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    len += haversineM(coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
  }
  return +len.toFixed(0);
}

function coordsAreWGS84(coords) {
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

function getOriginalFeatureId(feature) {
  return feature.id || feature.properties?.id || feature.properties?.ID || crypto.randomUUID();
}

export function useImportClassify(layers, selectedTurbineType, selectedCableTypeId, setLayers, setImportClassifyLayers) {
  return useCallback((decisions) => {
    const idMap = new Map(); // Map of originalId -> newId
    const warnings = [];

    const isPoint = (f) => f.geometry?.type === 'Point';
    const isLine = (f) => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString';
    const isPoly = (f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon';

    let turbineFeaturesToAdd = [];
    let cableFeaturesToProcess = [];
    let substationFeaturesToAdd = [];
    const layersToAdd = [];

    // ── Phase 1: Process turbines and substations, build ID map ───────────────
    for (const { layer, classification } of decisions) {
      if (classification === 'turbine') {
        const pts = layer.features?.filter(isPoint) || [];
        const validPts = pts.filter(featureCoordsValid);
        if (pts.length > validPts.length) {
          warnings.push(`"${layer.name}": ${pts.length - validPts.length} point feature(s) skipped — coordinates not WGS84.`);
        }

        const newTurbines = validPts.map((f, i) => {
          const originalId = getOriginalFeatureId(f);
          const newId = crypto.randomUUID();
          idMap.set(originalId, newId);

          const restoredProps = deserializeProps(f.properties || {});
          const tt = selectedTurbineType;
          return {
            ...f,
            id: newId,
            properties: {
              name: restoredProps.name || `T${i + 1}`,
              turbine_type_id: restoredProps.turbine_type_id || tt?.id,
              hub_height: restoredProps.hub_height || tt?.hub_height_m || 100,
              rotor_diameter: restoredProps.rotor_diameter || tt?.rotor_diameter_m || 120,
              rated_power_mw: restoredProps.rated_power_mw || tt?.rated_power_mw || 3.5,
              elevation_m: restoredProps.elevation_m || null,
              wind_speed_ms: restoredProps.wind_speed_ms || null,
              hub_wind_speed: restoredProps.hub_wind_speed || null,
              aep_mwh: restoredProps.aep_mwh || null,
              ...Object.fromEntries(Object.entries(restoredProps).filter(([k]) => !['name', 'turbine_type_id', 'hub_height', 'rotor_diameter', 'rated_power_mw', 'elevation_m', 'wind_speed_ms', 'hub_wind_speed', 'aep_mwh'].includes(k))),
            },
          };
        });
        turbineFeaturesToAdd = [...turbineFeaturesToAdd, ...newTurbines];
        const rest = layer.features?.filter(f => !isPoint(f)) || [];
        if (rest.length > 0) layersToAdd.push({ ...layer, features: rest });

      } else if (classification === 'substation') {
        const pts = layer.features?.filter(isPoint) || [];
        const validPts = pts.filter(featureCoordsValid);
        if (pts.length > validPts.length) {
          warnings.push(`"${layer.name}": ${pts.length - validPts.length} point feature(s) skipped — coordinates not WGS84.`);
        }

        const newSubs = validPts.map((f, i) => {
          const originalId = getOriginalFeatureId(f);
          const newId = crypto.randomUUID();
          idMap.set(originalId, newId);

          const restoredProps = deserializeProps(f.properties || {});
          return {
            ...f,
            id: newId,
            properties: {
              name: restoredProps.name || `Substation ${i + 1}`,
              transformer_mva: restoredProps.transformer_mva || 60,
              capacity_demand_mw: restoredProps.capacity_demand_mw || 30,
              capacity_generation_mw: restoredProps.capacity_generation_mw || 30,
              notes: restoredProps.notes || '',
              ...Object.fromEntries(Object.entries(restoredProps).filter(([k]) => !['name', 'transformer_mva', 'capacity_demand_mw', 'capacity_generation_mw', 'notes'].includes(k))),
            },
          };
        });
        substationFeaturesToAdd = [...substationFeaturesToAdd, ...newSubs];

      } else if (classification === 'cable') {
        cableFeaturesToProcess = [...cableFeaturesToProcess, ...(layer.features?.filter(isLine) || [])];
        const rest = layer.features?.filter(f => !isLine(f)) || [];
        if (rest.length > 0) layersToAdd.push({ ...layer, features: rest });

      } else if (classification === 'keep') {
        layersToAdd.push(layer);
      }
    }

    // ── Phase 2: Process cables with updated node references ──────────────────
    const validLines = cableFeaturesToProcess.filter(f => {
      if (f.geometry?.type === 'MultiLineString') {
        return f.geometry.coordinates.some(ring => coordsAreWGS84(ring));
      }
      return featureCoordsValid(f);
    });
    if (cableFeaturesToProcess.length > validLines.length) {
      warnings.push(`${cableFeaturesToProcess.length - validLines.length} cable feature(s) skipped — coordinates not WGS84.`);
    }

    let cableFeaturesToAdd = [];
    validLines.forEach((f, fi) => {
      const restoredProps = deserializeProps(f.properties || {});
      const originalStartId = restoredProps.start_node?.id;
      const originalEndId = restoredProps.end_node?.id;

      // Map old IDs to new IDs using idMap
      const newStartNode = originalStartId ? { ...restoredProps.start_node, id: idMap.get(originalStartId) || originalStartId } : (restoredProps.start_node || null);
      const newEndNode = originalEndId ? { ...restoredProps.end_node, id: idMap.get(originalEndId) || originalEndId } : (restoredProps.end_node || null);

      if (f.geometry?.type === 'MultiLineString') {
        const validRings = f.geometry.coordinates.filter(ring => coordsAreWGS84(ring));
        validRings.forEach((coords, idx) => {
          cableFeaturesToAdd.push({
            ...f,
            id: crypto.randomUUID(),
            geometry: { type: 'LineString', coordinates: coords },
            properties: {
              name: restoredProps.name ? `${restoredProps.name}_${idx + 1}` : `Cable ${fi + idx + 1}`,
              cable_type_id: restoredProps.cable_type_id || selectedCableTypeId,
              length_m: calcLineLength(coords),
              start_node: newStartNode,
              end_node: newEndNode,
              ...Object.fromEntries(Object.entries(restoredProps).filter(([k]) => !['name', 'cable_type_id', 'length_m', 'start_node', 'end_node', '_layerId', '_layerName', '_layerType', '_layerColor', '_layerFillOpacity', '_layerStrokeWeight', '_layerStrokeOpacity', '_layerNoTurbines', '_layerVisible'].includes(k))),
            },
          });
        });
      } else {
        const coords = f.geometry.coordinates;
        cableFeaturesToAdd.push({
          ...f,
          id: crypto.randomUUID(),
          properties: {
            name: restoredProps.name || `Cable ${fi + 1}`,
            cable_type_id: restoredProps.cable_type_id || selectedCableTypeId,
            length_m: restoredProps.length_m || calcLineLength(coords),
            start_node: newStartNode,
            end_node: newEndNode,
            ...Object.fromEntries(Object.entries(restoredProps).filter(([k]) => !['name', 'cable_type_id', 'length_m', 'start_node', 'end_node', '_layerId', '_layerName', '_layerType', '_layerColor', '_layerFillOpacity', '_layerStrokeWeight', '_layerStrokeOpacity', '_layerNoTurbines', '_layerVisible'].includes(k))),
          },
        });
      }
    });

    // ── Phase 3: Rebuild cable node references via proximity matching ────────
    // Snap cables to nearest turbine/substation at cable endpoints
    const allTurbines = turbineFeaturesToAdd.map(t => ({ ...t, assetType: 'turbine' }));
    const allSubs = substationFeaturesToAdd.map(s => ({ ...s, assetType: 'substation' }));
    const allAssets = [...allTurbines, ...allSubs];
    
    const resolvedCables = cableFeaturesToAdd.map(cable => {
      if (!cable.geometry?.coordinates || cable.geometry.coordinates.length < 2) {
        return cable;
      }
      
      const [startLng, startLat] = cable.geometry.coordinates[0];
      const [endLng, endLat] = cable.geometry.coordinates[cable.geometry.coordinates.length - 1];
      
      const findNearestAsset = (lng, lat) => {
        let best = null, bestDist = Infinity;
        for (const asset of allAssets) {
          const [assetLng, assetLat] = asset.geometry.coordinates;
          const d = Math.hypot(lng - assetLng, lat - assetLat);
          if (d < bestDist) {
            bestDist = d;
            best = { type: asset.assetType, id: asset.id };
          }
        }
        return bestDist < 0.01 ? best : null; // Only snap if within ~1km
      };
      
      const newStartNode = findNearestAsset(startLng, startLat);
      const newEndNode = findNearestAsset(endLng, endLat);
      
      return {
        ...cable,
        properties: {
          ...cable.properties,
          start_node: newStartNode || cable.properties.start_node,
          end_node: newEndNode || cable.properties.end_node
        }
      };
    });

    // ── Phase 4: Merge into existing typed layers ────────────────────────────
    setLayers(prev => {
      let turbineLayer = prev.find(l => l.type === 'turbine');
      let cableLayer = prev.find(l => l.type === 'cable');
      let substationLayer = prev.find(l => l.type === 'substation');

      // Create missing typed layers if they don't exist
      if (turbineFeaturesToAdd.length > 0 && !turbineLayer) {
        turbineLayer = { id: crypto.randomUUID(), name: 'Turbines', type: 'turbine', color: '#10b981', fillOpacity: 0.8, features: [] };
      }
      if (resolvedCables.length > 0 && !cableLayer) {
        cableLayer = { id: crypto.randomUUID(), name: 'Cables', type: 'cable', color: '#f97316', fillOpacity: 0.8, features: [] };
      }
      if (substationFeaturesToAdd.length > 0 && !substationLayer) {
        substationLayer = { id: crypto.randomUUID(), name: 'Substations', type: 'substation', color: '#facc15', fillOpacity: 1, features: [] };
      }

      let next = [...prev];

      if (turbineFeaturesToAdd.length > 0 && turbineLayer) {
        const existing = next.find(l => l.id === turbineLayer.id);
        if (existing) {
          next = next.map(l => l.id === turbineLayer.id ? { ...l, features: [...(l.features || []), ...turbineFeaturesToAdd] } : l);
        } else {
          next.push({ ...turbineLayer, features: turbineFeaturesToAdd });
        }
      }

      if (resolvedCables.length > 0 && cableLayer) {
        const existing = next.find(l => l.id === cableLayer.id);
        if (existing) {
          next = next.map(l => l.id === cableLayer.id ? { ...l, features: [...(l.features || []), ...resolvedCables] } : l);
        } else {
          next.push({ ...cableLayer, features: resolvedCables });
        }
      }

      if (substationFeaturesToAdd.length > 0 && substationLayer) {
        const existing = next.find(l => l.id === substationLayer.id);
        if (existing) {
          next = next.map(l => l.id === substationLayer.id ? { ...l, features: [...(l.features || []), ...substationFeaturesToAdd] } : l);
        } else {
          next.push({ ...substationLayer, features: substationFeaturesToAdd });
        }
      }

      return [...next, ...layersToAdd];
    });

    if (warnings.length > 0) {
      setTimeout(() => {
        alert(`Import completed with warnings:\n\n${warnings.join('\n\n')}`);
      }, 100);
    }

    window.__importCount__ = (window.__importCount__ || 0) + 1;
    window.__trainingEvent__ = { type: 'import_completed', payload: {}, ts: Date.now() };

    setImportClassifyLayers(null);
  }, [layers, selectedTurbineType, selectedCableTypeId, setLayers, setImportClassifyLayers]);
}