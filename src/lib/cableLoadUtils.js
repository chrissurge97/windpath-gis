/**
 * Cable load calculation utilities for wind farm electrical network analysis
 */

function turbineMW(nodeId, turbines) {
  const t = turbines.find((t) => t.id === nodeId);
  return t?.properties?.rated_power_mw || 0;
}

/**
 * Calculate MW load flowing through a cable, given downstream node/coord
 * Recursively sums power from connected turbines and upstream cable loads
 */
export function calcCableLoad(cableId, cables, turbines, fromNodeId = null, fromCoord = null, visited = new Set()) {
  if (visited.has(cableId)) return 0;
  visited.add(cableId);

  const cable = cables.find((c) => c.id === cableId);
  if (!cable) return 0;

  const start = cable.properties.start_node;
  const end = cable.properties.end_node;
  const coords = cable.geometry.coordinates;
  if (!coords?.length) return 0;

  // Determine upstream direction
  let upstreamNode = null;
  let upstreamCoord = null;

  if (fromNodeId) {
    // Explicit downstream node provided
    if (start?.id === fromNodeId) {
      upstreamNode = end;
      if (!upstreamNode) upstreamCoord = coords[0];
    } else if (end?.id === fromNodeId) {
      upstreamNode = start;
      if (!upstreamNode) upstreamCoord = coords[coords.length - 1];
    } else {
      return 0; // fromNodeId not on this cable
    }
  } else if (fromCoord) {
    // Implicit downstream coordinate provided (for cable strings)
    const eps = 0.00001;
    const match = (a, b) => Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;
    const coordStart = coords[0];
    const coordEnd = coords[coords.length - 1];

    if (match(coordStart, fromCoord)) {
      // Downstream is start, upstream is end
      upstreamNode = end;
      if (!upstreamNode) upstreamCoord = coordEnd;
    } else if (match(coordEnd, fromCoord)) {
      // Downstream is end, upstream is start
      upstreamNode = start;
      if (!upstreamNode) upstreamCoord = coordStart;
    } else {
      return 0; // fromCoord not on this cable
    }
  } else {
    // No direction hint: infer from node types or default
    if (end?.type === 'substation') {
      upstreamNode = start;
      if (!upstreamNode) upstreamCoord = coords[0];
    } else if (start?.type === 'substation') {
      upstreamNode = end;
      if (!upstreamNode) upstreamCoord = coords[coords.length - 1];
    } else {
      // Both implicit or neither is substation; assume start is upstream
      upstreamNode = start;
      if (!upstreamNode) upstreamCoord = coords[0];
    }
  }

  if (!upstreamNode && !upstreamCoord) return 0;

  let total = 0;

  // Add power from turbine at upstream node
  if (upstreamNode?.type === 'turbine') {
    total += turbineMW(upstreamNode.id, turbines);
  }

  // Find feeding cables
  const eps = 0.00001;
  const match = (a, b) => Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;

  const feedingCables = cables.filter((c) => {
    if (c.id === cableId) return false;
    if (!c.geometry?.coordinates?.length) return false;

    // Check node-based: does cable feed INTO upstream node?
    // A cable feeds in if its END NODE is the upstream node (flow: start → end)
    if (upstreamNode && c.properties.end_node?.id === upstreamNode.id) {
      return true;
    }

    // Check coordinate-based: does cable's START (upstream generation) reach upstream coord?
    // This handles implicit strings where nodes aren't fully mapped
    // Match the cable's START coordinate to our upstream coordinate
    if (upstreamCoord) {
      const cStart = c.geometry.coordinates[0];
      return match(cStart, upstreamCoord);
    }

    return false;
  });

  // Recurse: for each feeding cable, pass the upstream node/coord as its downstream
  for (const fc of feedingCables) {
    const nextDownstreamId = upstreamNode?.id || null;
    const nextDownstreamCoord = upstreamCoord || null;
    const load = calcCableLoad(fc.id, cables, turbines, nextDownstreamId, nextDownstreamCoord, new Set(visited));
    total += (typeof load === 'number' ? load : 0);
  }

  return Math.max(0, Number(total) || 0);
}

/**
 * Calculate total MW load feeding into a substation
 */
export function calcSubstationLoad(substationId, cables, turbines) {
  const incomingCables = cables.filter((c) =>
    c.properties.start_node?.id === substationId ||
    c.properties.end_node?.id === substationId
  );
  return incomingCables.reduce((sum, c) => {
    return sum + calcCableLoad(c.id, cables, turbines, substationId, null, new Set());
  }, 0);
}