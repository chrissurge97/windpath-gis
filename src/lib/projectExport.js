// Comprehensive project export with full data preservation

/**
 * Export entire project as GeoJSON with embedded metadata
 */
export function exportProjectGeoJSON(project) {
  const geojson = {
    type: 'FeatureCollection',
    features: [],
    properties: {
      projectName: project.name,
      projectDescription: project.description || '',
      turbineTypes: project.turbineTypes || [],
      cableTypes: project.cableTypes || [],
      windParams: project.windParams || { k: 2.0, lambda: 7.0 },
      exportDate: new Date().toISOString(),
      format: 'base44-wind-farm-project',
      version: '1.0',
    },
  };

  // Add all features from all layers
  if (project.layers) {
    for (const layer of project.layers) {
      for (const feature of layer.features || []) {
        geojson.features.push({
          ...feature,
          properties: {
            ...feature.properties,
            _layerId: layer.id,
            _layerName: layer.name,
            _layerType: layer.type,
            _layerColor: layer.color,
            _layerFillOpacity: layer.fillOpacity,
            _layerStrokeWeight: layer.strokeWeight,
            _layerStrokeOpacity: layer.strokeOpacity,
            _layerNoTurbines: layer.no_turbines || false,
          },
        });
      }
    }
  }

  return geojson;
}

/**
 * Import GeoJSON project file
 */
export function importProjectGeoJSON(geojson) {
  if (!geojson.properties || geojson.properties.format !== 'base44-wind-farm-project') {
    throw new Error('Invalid project file format. Expected Base44 wind farm project.');
  }

  const props = geojson.properties;
  const layers = {};

  // Reconstruct layers from features
  for (const feature of geojson.features || []) {
    const layerId = feature.properties._layerId;
    const layerName = feature.properties._layerName;
    const layerType = feature.properties._layerType;

    if (!layers[layerId]) {
      layers[layerId] = {
        id: layerId,
        name: layerName,
        type: layerType,
        color: feature.properties._layerColor || '#06b6d4',
        fillOpacity: feature.properties._layerFillOpacity ?? 0.1,
        strokeWeight: feature.properties._layerStrokeWeight || 2,
        strokeOpacity: feature.properties._layerStrokeOpacity || 0.9,
        visible: true,
        no_turbines: feature.properties._layerNoTurbines || false,
        features: [],
      };
    }

    // Remove layer metadata from properties
    const cleanProps = { ...feature.properties };
    delete cleanProps._layerId;
    delete cleanProps._layerName;
    delete cleanProps._layerType;
    delete cleanProps._layerColor;
    delete cleanProps._layerFillOpacity;
    delete cleanProps._layerStrokeWeight;
    delete cleanProps._layerStrokeOpacity;
    delete cleanProps._layerNoTurbines;

    layers[layerId].features.push({
      ...feature,
      properties: cleanProps,
    });
  }

  return {
    name: props.projectName || 'Imported Project',
    description: props.projectDescription || '',
    layers: Object.values(layers),
    turbineTypes: props.turbineTypes || [],
    cableTypes: props.cableTypes || [],
    windParams: props.windParams || { k: 2.0, lambda: 7.0 },
  };
}

/**
 * Export project as KMZ (compressed KML)
 */
export async function exportProjectKMZ(project) {
  // For now, just export as KML string - KMZ requires zip library
  // User can save as .kml or .kmz
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(project.name)}</name>
    <description>${escapeXml(project.description || '')}</description>
`;

  // Add placemarks for all features
  if (project.layers) {
    for (const layer of project.layers) {
      kml += `    <Folder><name>${escapeXml(layer.name)}</name>`;

      for (const feature of layer.features || []) {
        const props = feature.properties;
        const geom = feature.geometry;

        if (geom.type === 'Point') {
          const [lng, lat] = geom.coordinates;
          kml += `
      <Placemark>
        <name>${escapeXml(props.name || 'Point')}</name>
        <description>${escapeXml(props.notes || props.description || '')}</description>
        <Point><coordinates>${lng},${lat}</coordinates></Point>
      </Placemark>`;
        } else if (geom.type === 'LineString') {
          const coords = geom.coordinates.map(([lng, lat]) => `${lng},${lat},0`).join(' ');
          kml += `
      <Placemark>
        <name>${escapeXml(props.name || 'Line')}</name>
        <description>${escapeXml(props.notes || '')}</description>
        <LineString><coordinates>${coords}</coordinates></LineString>
      </Placemark>`;
        } else if (geom.type === 'Polygon') {
          const coords = geom.coordinates[0].map(([lng, lat]) => `${lng},${lat},0`).join(' ');
          kml += `
      <Placemark>
        <name>${escapeXml(props.name || 'Polygon')}</name>
        <description>${escapeXml(props.notes || '')}</description>
        <Polygon><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon>
      </Placemark>`;
        }
      }

      kml += `    </Folder>`;
    }
  }

  kml += `
  </Document>
</kml>`;

  return kml;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Download file helper
 */
export function downloadFile(content, filename, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}