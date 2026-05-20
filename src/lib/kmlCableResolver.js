/**
 * KML-specific cable network resolver.
 * Post-processes imported KML cables to establish proper start_node/end_node connections
 * based on cable endpoints snapping to nearest turbines/substations.
 * This ensures load calculations work correctly for cable strings.
 */

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find nearest turbine or substation to a coordinate within a distance threshold.
 */
function findNearestNode(lng, lat, turbines, substations, maxDistM = 500) {
  let best = null;
  let bestDist = maxDistM;

  for (const t of turbines) {
    const [tLng, tLat] = t.geometry.coordinates;
    const d = haversineM(lat, lng, tLat, tLng);
    if (d < bestDist) {
      bestDist = d;
      best = { type: 'turbine', id: t.id, lat: tLat, lng: tLng };
    }
  }

  for (const s of substations) {
    const [sLng, sLat] = s.geometry.coordinates;
    const d = haversineM(lat, lng, sLat, sLng);
    if (d < bestDist) {
      bestDist = d;
      best = { type: 'substation', id: s.id, lat: sLat, lng: sLng };
    }
  }

  return best;
}

/**
 * Resolve cable string topology: each cable's start/end nodes point to the nearest
 * turbine/substation at that coordinate. Then order cables from turbine → substation.
 */
export function resolveKMLCableNetwork(cableLayer, turbineLayer, substationLayer) {
  if (!cableLayer || !substationLayer) return cableLayer;

  const turbines = turbineLayer?.features || [];
  const substations = substationLayer?.features || [];
  const cables = cableLayer.features || [];

  // Step 1: Snap each cable endpoint to nearest node
  const cableNodeMap = new Map(); // cableId → { startNode, endNode }
  for (const cable of cables) {
    const coords = cable.geometry.coordinates;
    if (!coords || coords.length < 2) continue;

    const [startLng, startLat] = coords[0];
    const [endLng, endLat] = coords[coords.length - 1];

    const startNode = findNearestNode(startLng, startLat, turbines, substations);
    const endNode = findNearestNode(endLng, endLat, turbines, substations);

    cableNodeMap.set(cable.id, { startNode, endNode });
  }

  // Step 2: Update cables with snapped nodes, but preserve existing named nodes (resolve names to IDs)
  const updatedFeatures = cables.map(cable => {
    const nodes = cableNodeMap.get(cable.id);
    if (!nodes) return cable;

    let startNode = cable.properties.start_node || nodes.startNode;
    let endNode = cable.properties.end_node || nodes.endNode;

    // If start/end nodes are strings (turbine/substation names), resolve to actual IDs
    if (typeof startNode === 'string') {
      const match = turbines.find(t => t.properties?.name === startNode) || substations.find(s => s.properties?.name === startNode);
      if (match) {
        const isSubstation = match.geometry?.type === 'Point' && !turbines.find(t => t.id === match.id);
        startNode = { type: isSubstation ? 'substation' : 'turbine', id: match.id, name: startNode };
      }
    }
    if (typeof endNode === 'string') {
      const match = turbines.find(t => t.properties?.name === endNode) || substations.find(s => s.properties?.name === endNode);
      if (match) {
        const isSubstation = match.geometry?.type === 'Point' && !turbines.find(t => t.id === match.id);
        endNode = { type: isSubstation ? 'substation' : 'turbine', id: match.id, name: endNode };
      }
    }

    return {
      ...cable,
      properties: {
        ...cable.properties,
        start_node: startNode,
        end_node: endNode,
      }
    };
  });

  return {
    ...cableLayer,
    features: updatedFeatures,
  };
}