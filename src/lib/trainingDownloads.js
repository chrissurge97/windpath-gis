/**
 * WindPath Academy — Client-side generated training download files
 * All files are generated as Blob URLs — no backend required.
 */

const LNG = -8.4532;
const LAT = 53.7245;

function makeGeojsonFeatureCollection(features) {
  return JSON.stringify({
    type: 'FeatureCollection',
    features,
  }, null, 2);
}

function polygon(coords, props) {
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: props };
}

function point(lng, lat, props) {
  return { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: props };
}

function lineString(coords, props) {
  return { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: props };
}

// ── File generators ──────────────────────────────────────────────────────────

function genSiteBoundary() {
  const ring = [
    [LNG - 0.06, LAT - 0.03], [LNG - 0.05, LAT + 0.02],
    [LNG - 0.01, LAT + 0.04], [LNG + 0.03, LAT + 0.035],
    [LNG + 0.055, LAT + 0.01], [LNG + 0.05, LAT - 0.025],
    [LNG + 0.02, LAT - 0.045], [LNG - 0.02, LAT - 0.04],
    [LNG - 0.06, LAT - 0.03],
  ];
  return makeGeojsonFeatureCollection([
    polygon(ring, {
      name: 'Glenhaven Gross Site Boundary',
      type: 'site_boundary',
      area_ha: 1800,
      notes: 'Gross study area. Upland grassland and blanket bog. Co. Roscommon.',
      _layerName: 'Site Boundary',
      _layerType: 'polygon',
      _layerColor: '#06b6d4',
    }),
  ]);
}

function genExclusionZones() {
  // Residential buffer SW
  const resRing = [[LNG-0.055,LAT-0.025],[LNG-0.045,LAT-0.01],[LNG-0.03,LAT-0.005],[LNG-0.025,LAT-0.02],[LNG-0.04,LAT-0.03],[LNG-0.055,LAT-0.025]];
  // SAC NE
  const sacRing = [[LNG+0.01,LAT+0.015],[LNG+0.02,LAT+0.03],[LNG+0.04,LAT+0.032],[LNG+0.048,LAT+0.012],[LNG+0.03,LAT+0.005],[LNG+0.01,LAT+0.015]];
  // Watercourse
  const waterRing = [[LNG-0.015,LAT+0.01],[LNG+0.0,LAT+0.022],[LNG+0.01,LAT+0.018],[LNG+0.005,LAT+0.006],[LNG-0.01,LAT+0.004],[LNG-0.015,LAT+0.01]];
  // Archaeological
  const archRing = [[LNG-0.005,LAT-0.035],[LNG+0.01,LAT-0.032],[LNG+0.015,LAT-0.042],[LNG+0.0,LAT-0.048],[LNG-0.01,LAT-0.04],[LNG-0.005,LAT-0.035]];

  return makeGeojsonFeatureCollection([
    polygon(resRing, { name: 'Glenhaven Village — 500m Residential Buffer', type: 'exclusion', constraint_type: 'residential_buffer', no_turbines: true, notes: 'Nearest dwelling 380m from T05. ETSU-R-97 noise assessment required.', _layerName: 'Hard Exclusions', _layerType: 'polygon', _layerColor: '#ef4444' }),
    polygon(sacRing, { name: 'Cuilcagh Blanket Bog SAC', type: 'exclusion', constraint_type: 'natura_2000', no_turbines: true, notes: 'Natura 2000 SAC. Absolute no-turbine zone. Curlew and golden plover habitat.', _layerName: 'Hard Exclusions', _layerType: 'polygon', _layerColor: '#ef4444' }),
    polygon(waterRing, { name: 'Glenhaven Stream — 50m Riparian Buffer', type: 'exclusion', constraint_type: 'watercourse', no_turbines: false, notes: 'EPA registered watercourse. 50m buffer. No excavation within buffer zone.', _layerName: 'Soft Constraints', _layerType: 'polygon', _layerColor: '#f97316' }),
    polygon(archRing, { name: 'Bronze Age Field System — Archaeological Buffer', type: 'exclusion', constraint_type: 'archaeological', no_turbines: true, notes: 'SMR RO046-021. 100m exclusion from SMR monument. Ministerial consent required.', _layerName: 'Hard Exclusions', _layerType: 'polygon', _layerColor: '#ef4444' }),
  ]);
}

function genLandParcels() {
  const leasedRing = [[LNG-0.025,LAT-0.005],[LNG-0.01,LAT+0.0],[LNG+0.01,LAT-0.003],[LNG+0.008,LAT-0.02],[LNG-0.02,LAT-0.022],[LNG-0.025,LAT-0.005]];
  const negotiatingRing = [[LNG+0.01,LAT+0.0],[LNG+0.025,LAT+0.005],[LNG+0.04,LAT-0.002],[LNG+0.038,LAT-0.018],[LNG+0.02,LAT-0.02],[LNG+0.01,LAT+0.0]];
  const unavailableRing = [[LNG-0.045,LAT+0.005],[LNG-0.03,LAT+0.015],[LNG-0.015,LAT+0.008],[LNG-0.02,LAT-0.005],[LNG-0.04,LAT-0.002],[LNG-0.045,LAT+0.005]];

  return makeGeojsonFeatureCollection([
    polygon(leasedRing, { name: 'Murphy Family Farm — Signed Lease', status: 'leased', landowner: 'Murphy Family', area_ha: 245, lease_term_years: 25, notes: 'Annual lease signed 2023. Full access rights.', _layerName: 'Leased Land', _layerType: 'polygon', _layerColor: '#10b981' }),
    polygon(negotiatingRing, { name: 'O\'Brien Farm — Negotiating', status: 'negotiating', landowner: 'O\'Brien Family', area_ha: 310, notes: 'Active negotiations. Heads of terms agreed. Solicitor review ongoing.', _layerName: 'Negotiating Land', _layerType: 'polygon', _layerColor: '#f59e0b' }),
    polygon(unavailableRing, { name: 'Connolly Land — Not Pursuing', status: 'unavailable', landowner: 'Connolly Estate', area_ha: 180, notes: 'Landowner declined in writing (June 2023). No further contact.', _layerName: 'Unavailable Land', _layerType: 'polygon', _layerColor: '#ef4444' }),
  ]);
}

function genTurbineCandidatesCSV() {
  const candidates = [
    { id: 'TC01', lat: (LAT - 0.015).toFixed(6), lng: (LNG - 0.01).toFixed(6), elevation_m: 312, notes: 'Ridge crest. Excellent wind exposure. Clear of all constraints.', priority: 'High' },
    { id: 'TC02', lat: (LAT - 0.005).toFixed(6), lng: (LNG + 0.008).toFixed(6), elevation_m: 298, notes: 'Secondary ridgeline. Good wind. Check 500m from TC01.', priority: 'High' },
    { id: 'TC03', lat: (LAT + 0.008).toFixed(6), lng: (LNG + 0.0).toFixed(6), elevation_m: 285, notes: 'N-facing slope. Moderate wind. Buffer check vs SAC required.', priority: 'Medium' },
    { id: 'TC04', lat: (LAT + 0.015).toFixed(6), lng: (LNG - 0.012).toFixed(6), elevation_m: 276, notes: 'Sheltered valley position. Low priority. Include for sensitivity only.', priority: 'Low' },
    { id: 'TC05', lat: (LAT - 0.01).toFixed(6), lng: (LNG + 0.02).toFixed(6), elevation_m: 321, notes: 'Highest point in study area. Best wind. Access road required.', priority: 'High' },
    { id: 'TC06', lat: (LAT + 0.005).toFixed(6), lng: (LNG + 0.025).toFixed(6), elevation_m: 308, notes: 'E ridge. Good wind. 450m from peat SAC boundary — confirm clearance.', priority: 'High' },
    { id: 'TC07', lat: (LAT - 0.022).toFixed(6), lng: (LNG + 0.015).toFixed(6), elevation_m: 294, notes: 'SW slope. Adjacent to leased land. Noise receptor 720m — likely OK.', priority: 'Medium' },
  ];

  const headers = ['id', 'lat', 'lng', 'elevation_m', 'notes', 'priority'];
  const rows = [headers.join(','), ...candidates.map(c => headers.map(h => `"${c[h]}"`).join(','))];
  return rows.join('\n');
}

function genCableCorridor() {
  const corridors = [
    [[LNG-0.01,LAT-0.015],[LNG-0.005,LAT-0.01],[LNG+0.0,LAT-0.005],[LNG+0.005,LAT+0.0]],
    [[LNG+0.008,LAT+0.0],[LNG+0.01,LAT-0.008],[LNG+0.008,LAT-0.015]],
    [[LNG+0.005,LAT+0.0],[LNG+0.015,LAT+0.005],[LNG+0.025,LAT+0.003]],
  ];

  return makeGeojsonFeatureCollection(
    corridors.map((coords, i) => lineString(coords, {
      name: `Cable Corridor ${String.fromCharCode(65 + i)}`,
      type: 'cable_corridor',
      voltage_kv: 33,
      notes: `Preferred underground cable route. Follows existing farm track. Civil cost estimate: €${(85000 + i * 20000).toLocaleString()}.`,
      _layerName: 'Cable Corridors',
      _layerType: 'polygon',
      _layerColor: '#f97316',
    }))
  );
}

// ── File manifest ────────────────────────────────────────────────────────────

export const TRAINING_FILES = [
  {
    id: 'glenhaven-site-boundary',
    name: 'glenhaven-site-boundary.geojson',
    label: 'Glenhaven Site Boundary',
    description: 'Gross site boundary polygon for the Glenhaven Wind Farm study area. Import and classify as a polygon layer.',
    expectedFeatures: 1,
    featureType: 'polygon',
    mimeType: 'application/json',
    generate: genSiteBoundary,
  },
  {
    id: 'glenhaven-exclusion-zones',
    name: 'glenhaven-exclusion-zones.geojson',
    label: 'Glenhaven Exclusion Zones',
    description: '4 constraint polygons: residential buffer, SAC, watercourse buffer, and archaeological zone. Should be classified as exclusion/polygon layers.',
    expectedFeatures: 4,
    featureType: 'polygon',
    mimeType: 'application/json',
    generate: genExclusionZones,
  },
  {
    id: 'glenhaven-land-parcels',
    name: 'glenhaven-land-parcels.geojson',
    label: 'Glenhaven Land Parcels',
    description: '3 land ownership polygons: leased, negotiating, and unavailable. Colour-coded by status.',
    expectedFeatures: 3,
    featureType: 'polygon',
    mimeType: 'application/json',
    generate: genLandParcels,
  },
  {
    id: 'glenhaven-turbine-candidates',
    name: 'glenhaven-turbine-candidates.csv',
    label: 'Glenhaven Turbine Candidates CSV',
    description: '7 candidate turbine positions identified from terrain analysis. CSV with lat, lng, elevation, notes, and priority.',
    expectedFeatures: 7,
    featureType: 'point',
    mimeType: 'text/csv',
    generate: genTurbineCandidatesCSV,
  },
  {
    id: 'glenhaven-cable-corridor',
    name: 'glenhaven-cable-corridor.geojson',
    label: 'Glenhaven Cable Corridors',
    description: '3 preferred cable corridor line features following existing farm tracks. Import for cable routing reference.',
    expectedFeatures: 3,
    featureType: 'line',
    mimeType: 'application/json',
    generate: genCableCorridor,
  },
];

export function downloadTrainingFile(fileId) {
  const file = TRAINING_FILES.find(f => f.id === fileId);
  if (!file) return;
  const content = file.generate();
  const blob = new Blob([content], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
  return file;
}