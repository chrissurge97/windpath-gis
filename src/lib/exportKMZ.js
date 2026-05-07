/**
 * Export wind farm project data as KMZ (zipped KML).
 * KMZ is directly openable in ArcGIS, QGIS, and Google Earth.
 * It is a proper georeferenced vector format with WGS84 coordinates.
 *
 * We use JSZip to create the zip — it's bundled via CDN-free approach
 * by encoding the KML directly and downloading as .kml (ArcGIS accepts .kml too).
 * For a true .kmz we'd need JSZip, but .kml is equally georeferenced and ArcGIS-compatible.
 */

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function colorToKML(hex, opacity = 1) {
  // KML uses AABBGGRR
  const r = hex.slice(1, 3);
  const g = hex.slice(3, 5);
  const b = hex.slice(5, 7);
  const a = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return `${a}${b}${g}${r}`.toLowerCase();
}

export function exportKML(layers, turbineTypes, cableTypes, substations, showSubstations, projectName) {
  const styles = [];
  const placemarks = [];

  // ── Turbine style ──────────────────────────────────────────────────────────
  styles.push(`
    <Style id="turbineStyle">
      <IconStyle>
        <color>ff4bde10</color>
        <scale>1.2</scale>
        <Icon><href>https://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon>
      </IconStyle>
      <LabelStyle><scale>0.8</scale></LabelStyle>
      <BalloonStyle>
        <text>$[description]</text>
      </BalloonStyle>
    </Style>`);

  // ── Cable style ────────────────────────────────────────────────────────────
  styles.push(`
    <Style id="cableStyle">
      <LineStyle><color>ff0080f9</color><width>3</width></LineStyle>
    </Style>`);

  // ── Substation style ───────────────────────────────────────────────────────
  styles.push(`
    <Style id="substationStyle">
      <IconStyle>
        <color>ff15ccfa</color>
        <scale>0.9</scale>
        <Icon><href>https://maps.google.com/mapfiles/kml/shapes/square.png</href></Icon>
      </IconStyle>
      <LabelStyle><scale>0.7</scale></LabelStyle>
    </Style>`);

  // ── Polygon styles ─────────────────────────────────────────────────────────
  layers.forEach(layer => {
    if (layer.type === 'turbine' || layer.type === 'cable') return;
    const fillColor = colorToKML(layer.color || '#06b6d4', layer.fillOpacity || 0.15);
    const lineColor = colorToKML(layer.color || '#06b6d4', 0.9);
    styles.push(`
    <Style id="layer_${layer.id}">
      <LineStyle><color>${lineColor}</color><width>2</width></LineStyle>
      <PolyStyle><color>${fillColor}</color><fill>1</fill><outline>1</outline></PolyStyle>
    </Style>`);
  });

  // ── Turbines folder ────────────────────────────────────────────────────────
  const turbineLayer = layers.find(l => l.type === 'turbine');
  if (turbineLayer) {
    const turbinePMs = turbineLayer.features.map(f => {
      const [lng, lat] = f.geometry.coordinates;
      const p = f.properties;
      const tt = turbineTypes.find(t => t.id === p.turbine_type_id);
      const desc = [
        tt ? `${tt.manufacturer} ${tt.model}` : '',
        p.rated_power_mw ? `Rated Power: ${p.rated_power_mw} MW` : '',
        p.hub_height ? `Hub Height: ${p.hub_height} m` : '',
        p.rotor_diameter ? `Rotor Diameter: ${p.rotor_diameter} m` : '',
        p.elevation_m != null ? `Ground Elevation: ${p.elevation_m} m` : '',
        p.hub_wind_speed ? `Hub Wind Speed: ${p.hub_wind_speed} m/s` : '',
        p.aep_mwh ? `AEP: ${(p.aep_mwh / 1000).toFixed(2)} GWh/yr` : '',
      ].filter(Boolean).join('&#10;');
      return `
      <Placemark>
        <name>${escapeXml(p.name || 'Turbine')}</name>
        <description>${escapeXml(desc)}</description>
        <styleUrl>#turbineStyle</styleUrl>
        <Point><coordinates>${lng},${lat},0</coordinates></Point>
      </Placemark>`;
    });
    if (turbinePMs.length > 0) {
      placemarks.push(`
  <Folder>
    <name>Turbines</name>
    ${turbinePMs.join('')}
  </Folder>`);
    }
  }

  // ── Cables folder ──────────────────────────────────────────────────────────
  const cableLayer = layers.find(l => l.type === 'cable');
  if (cableLayer) {
    const cablePMs = cableLayer.features.map(f => {
      const coords = f.geometry.coordinates.map(([lng, lat]) => `${lng},${lat},0`).join(' ');
      const ct = cableTypes.find(t => t.id === f.properties.cable_type_id);
      const desc = [
        ct ? `Type: ${ct.name}` : '',
        f.properties.length_m ? `Length: ${(f.properties.length_m / 1000).toFixed(2)} km` : '',
        ct && f.properties.length_m ? `Est. Cost: €${(f.properties.length_m * ct.cost_per_m).toFixed(0)}` : '',
      ].filter(Boolean).join('&#10;');
      return `
      <Placemark>
        <name>${escapeXml(f.properties.name || 'Cable')}</name>
        <description>${escapeXml(desc)}</description>
        <styleUrl>#cableStyle</styleUrl>
        <LineString><tessellate>1</tessellate><coordinates>${coords}</coordinates></LineString>
      </Placemark>`;
    });
    if (cablePMs.length > 0) {
      placemarks.push(`
  <Folder>
    <name>Cables</name>
    ${cablePMs.join('')}
  </Folder>`);
    }
  }

  // ── Site boundary / zone layers ────────────────────────────────────────────
  layers.filter(l => !['turbine', 'cable', 'wind_resource'].includes(l.type)).forEach(layer => {
    const pms = layer.features.map(f => {
      if (f.geometry.type !== 'Polygon') return '';
      const coords = f.geometry.coordinates[0].map(([lng, lat]) => `${lng},${lat},0`).join(' ');
      return `
      <Placemark>
        <name>${escapeXml(f.properties.name || layer.name)}</name>
        <styleUrl>#layer_${layer.id}</styleUrl>
        <Polygon>
          <tessellate>1</tessellate>
          <outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs>
        </Polygon>
      </Placemark>`;
    }).filter(Boolean);
    if (pms.length > 0) {
      placemarks.push(`
  <Folder>
    <name>${escapeXml(layer.name)}</name>
    ${pms.join('')}
  </Folder>`);
    }
  });

  // ── Substations ────────────────────────────────────────────────────────────
  if (showSubstations && substations.length > 0) {
    const subPMs = substations.map(s => `
      <Placemark>
        <name>${escapeXml(s.name)}</name>
        <description>${s.voltage ? `Voltage: ${s.voltage} kV` : ''}</description>
        <styleUrl>#substationStyle</styleUrl>
        <Point><coordinates>${s.lng},${s.lat},0</coordinates></Point>
      </Placemark>`);
    placemarks.push(`
  <Folder>
    <name>Substations</name>
    ${subPMs.join('')}
  </Folder>`);
  }

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(projectName)}</name>
    <description>Wind Farm GIS Export — ${new Date().toISOString().slice(0, 10)}</description>
    ${styles.join('\n')}
    ${placemarks.join('\n')}
  </Document>
</kml>`;

  const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName.replace(/\s+/g, '_')}.kml`;
  a.click();
  URL.revokeObjectURL(url);
}