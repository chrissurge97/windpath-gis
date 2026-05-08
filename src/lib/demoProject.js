// ─────────────────────────────────────────────────────────────────────────────
// Ballycraggan Wind Farm — Full Demo Project
// A realistic Irish onshore wind farm demo set in Co. Galway
// Features: site boundary, exclusion zones, ASSIs, peat bogs, visual impact zones,
//           residential setbacks, 12 turbines in 3 strings, internal 33kV cables,
//           export 132kV cable to ESB substation, access tracks polygon.
// ─────────────────────────────────────────────────────────────────────────────

const BASE_LAT = 53.42;
const BASE_LNG = -8.78;

function uuid() { return crypto.randomUUID(); }

function makeFeature(layerId, geometry, properties = {}) {
  return { id: uuid(), layerId, geometry, properties };
}

function poly(layerId, rings, props) {
  return makeFeature(layerId, { type: 'Polygon', coordinates: rings }, props);
}

function point(layerId, lat, lng, props) {
  return makeFeature(layerId, { type: 'Point', coordinates: [lng, lat] }, props);
}

function line(layerId, points, props) {
  // points: [[lat,lng],...]
  return makeFeature(layerId, { type: 'LineString', coordinates: points.map(([lat, lng]) => [lng, lat]) }, props);
}

function latlngToCoord([lat, lng]) { return [lng, lat]; }
function ring(pts) { const c = pts.map(latlngToCoord); c.push(c[0]); return c; }

// ─────────────────────────────────────────────────────────────────────────────
// LAYER IDs (pre-assigned so features can reference them)
// ─────────────────────────────────────────────────────────────────────────────
const ID = {
  boundary:    uuid(),
  exclusion:   uuid(),
  assi:        uuid(),
  peat:        uuid(),
  visual:      uuid(),
  residential: uuid(),
  access:      uuid(),
  turbine:     uuid(),
  cable:       uuid(),
  substation:  uuid(),
};

// ─────────────────────────────────────────────────────────────────────────────
// TURBINE POSITIONS — 3 strings of 4
// String A (NW ridge), String B (central plateau), String C (SE)
// ─────────────────────────────────────────────────────────────────────────────
const TURBINE_TYPE_ID = 'v136-4.2';
const TURBINE_MW = 4.2;
const TURBINE_HUB = 112;
const TURBINE_ROTOR = 136;

const turbinePositions = [
  // String A — NW ridge
  { name: 'T01', lat: 53.438, lng: -8.810, wind_speed_ms: 8.4, hub_wind_speed: 9.6, aep_mwh: 17800 },
  { name: 'T02', lat: 53.434, lng: -8.805, wind_speed_ms: 8.2, hub_wind_speed: 9.4, aep_mwh: 17200 },
  { name: 'T03', lat: 53.430, lng: -8.800, wind_speed_ms: 8.5, hub_wind_speed: 9.7, aep_mwh: 18100 },
  { name: 'T04', lat: 53.426, lng: -8.795, wind_speed_ms: 8.3, hub_wind_speed: 9.5, aep_mwh: 17600 },
  // String B — central plateau
  { name: 'T05', lat: 53.436, lng: -8.790, wind_speed_ms: 8.1, hub_wind_speed: 9.3, aep_mwh: 16900 },
  { name: 'T06', lat: 53.432, lng: -8.785, wind_speed_ms: 8.6, hub_wind_speed: 9.8, aep_mwh: 18400 },
  { name: 'T07', lat: 53.428, lng: -8.780, wind_speed_ms: 8.4, hub_wind_speed: 9.6, aep_mwh: 17800 },
  { name: 'T08', lat: 53.424, lng: -8.775, wind_speed_ms: 8.0, hub_wind_speed: 9.1, aep_mwh: 16400 },
  // String C — SE slope
  { name: 'T09', lat: 53.434, lng: -8.770, wind_speed_ms: 7.8, hub_wind_speed: 8.9, aep_mwh: 15900 },
  { name: 'T10', lat: 53.430, lng: -8.765, wind_speed_ms: 7.9, hub_wind_speed: 9.0, aep_mwh: 16100 },
  { name: 'T11', lat: 53.426, lng: -8.760, wind_speed_ms: 8.1, hub_wind_speed: 9.2, aep_mwh: 16700 },
  { name: 'T12', lat: 53.422, lng: -8.755, wind_speed_ms: 8.2, hub_wind_speed: 9.4, aep_mwh: 17200 },
];

// ─────────────────────────────────────────────────────────────────────────────
// SUBSTATION POSITION — ESB Maam Cross 110/38kV  (east of site)
// ─────────────────────────────────────────────────────────────────────────────
const SUB_LAT = 53.422, SUB_LNG = -8.720;
const ONSITE_SUB_LAT = 53.428, ONSITE_SUB_LNG = -8.768;

// ─────────────────────────────────────────────────────────────────────────────
// LAYER DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
export function buildDemoProject() {

  // ── Site Boundary ─────────────────────────────────────────────────────────
  const boundaryLayer = {
    id: ID.boundary,
    name: 'Site Boundary',
    type: 'polygon',
    visible: true,
    color: '#06b6d4',
    fillOpacity: 0.08,
    strokeOpacity: 1,
    strokeWeight: 2.5,
    schema: [{ key: 'name', label: 'Name', type: 'string' }, { key: 'area_ha', label: 'Area (ha)', type: 'number' }],
    features: [
      poly(ID.boundary, [ring([
        [53.442, -8.820], [53.442, -8.748], [53.418, -8.748],
        [53.418, -8.820],
      ])], { name: 'Ballycraggan Wind Farm — Application Boundary', area_ha: 1620, notes: 'Submitted planning boundary per DECC EIS 2024-387' }),
    ],
  };

  // ── Exclusion Zones ───────────────────────────────────────────────────────
  const exclusionLayer = {
    id: ID.exclusion,
    name: 'Exclusion Zones',
    type: 'polygon',
    visible: true,
    color: '#ef4444',
    fillOpacity: 0.25,
    strokeOpacity: 0.9,
    strokeWeight: 2,
    schema: [{ key: 'name', label: 'Name', type: 'string' }, { key: 'reason', label: 'Reason', type: 'string' }, { key: 'setback_m', label: 'Setback (m)', type: 'number' }],
    features: [
      // 500m residential setback polygon (village of Ballycraggan)
      poly(ID.exclusion, [ring([
        [53.4185, -8.798], [53.4185, -8.786], [53.4115, -8.786],
        [53.4115, -8.798],
      ])], { name: 'Ballycraggan Village — 500m Residential Setback', reason: '500m setback from nearest dwelling per Wind Energy Guidelines 2006', setback_m: 500 }),
      // Bog road / watercourse buffer
      poly(ID.exclusion, [ring([
        [53.436, -8.818], [53.436, -8.812], [53.420, -8.812],
        [53.420, -8.818],
      ])], { name: 'River Suck Riparian Buffer', reason: '50m watercourse buffer — EPA Guidance Note', setback_m: 50 }),
      // Overhead line buffer
      poly(ID.exclusion, [ring([
        [53.442, -8.756], [53.442, -8.752], [53.418, -8.752],
        [53.418, -8.756],
      ])], { name: 'ESB 38kV Overhead Line Buffer', reason: '2× blade length technical exclusion from active OHL', setback_m: 272 }),
    ],
  };

  // ── ASSIs (Areas of Special Scientific Interest) ──────────────────────────
  const assiLayer = {
    id: ID.assi,
    name: 'ASSIs / NHAs',
    type: 'polygon',
    visible: true,
    color: '#84cc16',
    fillOpacity: 0.22,
    strokeOpacity: 0.85,
    strokeWeight: 2,
    schema: [{ key: 'name', label: 'Name', type: 'string' }, { key: 'designation', label: 'Designation', type: 'string' }, { key: 'species', label: 'Key Species', type: 'string' }],
    features: [
      poly(ID.assi, [ring([
        [53.441, -8.816], [53.441, -8.804], [53.434, -8.804],
        [53.434, -8.816],
      ])], { name: 'Cloonfree Bog Complex NHA', designation: 'National Heritage Area', species: 'Sphagnum moss, Curlew, Golden Plover', notes: 'Site Code: 000297 — Turbine-free buffer maintained' }),
      poly(ID.assi, [ring([
        [53.424, -8.775], [53.424, -8.762], [53.419, -8.762],
        [53.419, -8.775],
      ])], { name: 'Ballycraggan Lake pSAC', designation: 'proposed Special Area of Conservation', species: 'Freshwater Pearl Mussel, Otter', notes: 'Article 6 Appropriate Assessment required' }),
    ],
  };

  // ── Peat / Bog Depth Constraint ───────────────────────────────────────────
  const peatLayer = {
    id: ID.peat,
    name: 'Deep Peat (>0.5m)',
    type: 'polygon',
    visible: true,
    color: '#92400e',
    fillOpacity: 0.30,
    strokeOpacity: 0.7,
    strokeWeight: 1.5,
    schema: [{ key: 'name', label: 'Name', type: 'string' }, { key: 'depth_m', label: 'Max Depth (m)', type: 'number' }, { key: 'volume_m3', label: 'Est. Volume (m³)', type: 'number' }],
    features: [
      poly(ID.peat, [ring([
        [53.440, -8.808], [53.440, -8.796], [53.433, -8.796],
        [53.433, -8.808],
      ])], { name: 'Northern Blanket Bog — Deep Peat Zone A', depth_m: 3.8, volume_m3: 420000, notes: 'Micro-siting constraint — avoid direct foundation contact. Peat Management Plan required.' }),
      poly(ID.peat, [ring([
        [53.430, -8.802], [53.430, -8.793], [53.424, -8.793],
        [53.424, -8.802],
      ])], { name: 'Central Bog — Deep Peat Zone B', depth_m: 2.1, volume_m3: 185000, notes: 'Floating road construction required. See CivilEng Report §4.2' }),
    ],
  };

  // ── Visual Impact Assessment Zones ────────────────────────────────────────
  const visualLayer = {
    id: ID.visual,
    name: 'Visual Impact Zones',
    type: 'polygon',
    visible: true,
    color: '#a855f7',
    fillOpacity: 0.12,
    strokeOpacity: 0.7,
    strokeWeight: 1.5,
    schema: [{ key: 'name', label: 'Name', type: 'string' }, { key: 'distance_km', label: 'Distance (km)', type: 'number' }, { key: 'impact', label: 'Impact Level', type: 'string' }],
    features: [
      poly(ID.visual, [ring([
        [53.448, -8.830], [53.448, -8.740], [53.412, -8.740],
        [53.412, -8.830],
      ])], { name: 'Zone of Theoretical Visibility — 5km Buffer', distance_km: 5, impact: 'Moderate', notes: 'Based on 150m tip height DEM analysis. 3 designated viewpoints within ZTV.' }),
      poly(ID.visual, [ring([
        [53.454, -8.845], [53.454, -8.725], [53.406, -8.725],
        [53.406, -8.845],
      ])], { name: 'Zone of Theoretical Visibility — 15km Buffer', distance_km: 15, impact: 'Low', notes: 'Cumulative impact assessment with Aughrim Wind Farm required.' }),
    ],
  };

  // ── Residential Properties Setback ───────────────────────────────────────
  const residentialLayer = {
    id: ID.residential,
    name: 'Residential Setbacks',
    type: 'polygon',
    visible: true,
    color: '#f59e0b',
    fillOpacity: 0.20,
    strokeOpacity: 0.8,
    strokeWeight: 1.5,
    schema: [{ key: 'name', label: 'Name', type: 'string' }, { key: 'dwelling_count', label: 'Dwellings', type: 'number' }, { key: 'nearest_turbine_m', label: 'Nearest Turbine (m)', type: 'number' }],
    features: [
      poly(ID.residential, [ring([
        [53.4185, -8.798], [53.4185, -8.790], [53.4145, -8.790],
        [53.4145, -8.798],
      ])], { name: 'Ballycraggan Village', dwelling_count: 47, nearest_turbine_m: 612, notes: 'Nearest turbine: T08 at 612m — compliant with 500m guideline' }),
      poly(ID.residential, [ring([
        [53.426, -8.760], [53.426, -8.754], [53.421, -8.754],
        [53.421, -8.760],
      ])], { name: 'Clooneen Townland', dwelling_count: 8, nearest_turbine_m: 780, notes: 'Isolated rural dwellings. Noise assessment NNL <45dB compliant.' }),
      poly(ID.residential, [ring([
        [53.440, -8.812], [53.440, -8.806], [53.435, -8.806],
        [53.435, -8.812],
      ])], { name: 'Mullaghmore Farm Complex', dwelling_count: 3, nearest_turbine_m: 530, notes: 'Farm buildings included. Shadow flicker: <30hrs/yr at closest receptor.' }),
    ],
  };

  // ── Access Tracks ─────────────────────────────────────────────────────────
  const accessLayer = {
    id: ID.access,
    name: 'Access Tracks & Hardstanding',
    type: 'polygon',
    visible: true,
    color: '#d97706',
    fillOpacity: 0.45,
    strokeOpacity: 0.8,
    strokeWeight: 1,
    schema: [{ key: 'name', label: 'Name', type: 'string' }, { key: 'width_m', label: 'Width (m)', type: 'number' }, { key: 'length_m', label: 'Length (m)', type: 'number' }],
    features: [
      // Main access track running N-S through site
      poly(ID.access, [ring([
        [53.438, -8.792], [53.422, -8.792],
        [53.422, -8.789], [53.438, -8.789],
      ])], { name: 'Main Site Access Track', width_m: 6, length_m: 1800, notes: 'Type 1 hardcore construction. 40-tonne axle load capacity for turbine delivery.' }),
      // East-west spur to String C
      poly(ID.access, [ring([
        [53.430, -8.785], [53.430, -8.756],
        [53.428, -8.756], [53.428, -8.785],
      ])], { name: 'String C Spur Track', width_m: 5, length_m: 2100, notes: 'Secondary track. Float road construction over peat sections.' }),
      // Crane hardstanding pads (represented as small squares near turbines)
      poly(ID.access, [ring([
        [53.439, -8.811], [53.439, -8.809],
        [53.437, -8.809], [53.437, -8.811],
      ])], { name: 'T01 Crane Hardstanding', width_m: 40, length_m: 50, notes: '2000m² hardstanding for main erection crane.' }),
      poly(ID.access, [ring([
        [53.427, -8.781], [53.427, -8.779],
        [53.425, -8.779], [53.425, -8.781],
      ])], { name: 'T07 Crane Hardstanding', width_m: 40, length_m: 50, notes: '2000m² hardstanding for main erection crane.' }),
    ],
  };

  // ── Turbine Layer ─────────────────────────────────────────────────────────
  const turbineLayer = {
    id: ID.turbine,
    name: 'Turbines',
    type: 'turbine',
    visible: true,
    color: '#10b981',
    fillOpacity: 0.8,
    strokeOpacity: 0.9,
    strokeWeight: 2,
    schema: [],
    features: turbinePositions.map(t => point(ID.turbine, t.lat, t.lng, {
      name: t.name,
      turbine_type_id: TURBINE_TYPE_ID,
      hub_height: TURBINE_HUB,
      rotor_diameter: TURBINE_ROTOR,
      rated_power_mw: TURBINE_MW,
      elevation_m: Math.round(200 + Math.random() * 80),
      wind_speed_ms: t.wind_speed_ms,
      hub_wind_speed: t.hub_wind_speed,
      aep_mwh: t.aep_mwh,
    })),
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SUBSTATIONS (built separately, used to create cables)
  // ─────────────────────────────────────────────────────────────────────────
  const onSiteSubId = uuid();
  const esbSubId = uuid();

  const substationLayer = {
    id: ID.substation,
    name: 'Substations',
    type: 'substation',
    visible: true,
    color: '#facc15',
    fillOpacity: 1,
    strokeOpacity: 1,
    strokeWeight: 2,
    schema: [],
    features: [
      {
        id: onSiteSubId,
        layerId: ID.substation,
        geometry: { type: 'Point', coordinates: [ONSITE_SUB_LNG, ONSITE_SUB_LAT] },
        properties: {
          name: 'Ballycraggan On-Site 33/0.69kV',
          transformer_mva: 60,
          capacity_generation_mw: 50.4,
          capacity_demand_mw: 5,
          notes: '2× 30MVA transformers (N+1 redundancy). Step-up from turbine LV to 33kV collector.',
        },
      },
      {
        id: esbSubId,
        layerId: ID.substation,
        geometry: { type: 'Point', coordinates: [SUB_LNG, SUB_LAT] },
        properties: {
          name: 'ESB Maam Cross 110/38kV Grid Substation',
          transformer_mva: 120,
          capacity_generation_mw: 100,
          capacity_demand_mw: 80,
          notes: 'Point of Connection (POC). Grid connection offer accepted June 2024. Export capacity 50.4MW.',
        },
      },
    ],
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CABLES
  // String A: T01→T02→T03→T04→OnSite Sub (33kV 240mm²)
  // String B: T05→T06→T07→T08→OnSite Sub (33kV 240mm²)
  // String C: T09→T10→T11→T12→OnSite Sub (33kV 150mm²)
  // Export:   OnSite Sub → ESB Maam Cross (132kV overhead)
  // ─────────────────────────────────────────────────────────────────────────

  const tPos = {}; // name→{lat,lng}
  turbinePositions.forEach(t => { tPos[t.name] = t; });
  const tFeats = {}; // name→feature
  turbineLayer.features.forEach(f => { tFeats[f.properties.name] = f; });

  function haversineM(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function segLen(pts) {
    let l = 0;
    for (let i = 0; i < pts.length - 1; i++) l += haversineM(pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1]);
    return l;
  }

  const cableFeatures = [];

  // ── String A cables (T01→T02, T02→T03, T03→T04, T04→OnSite)
  const stringA = [
    { from: 'T01', to: 'T02', typeId: 'mv33-240' },
    { from: 'T02', to: 'T03', typeId: 'mv33-240' },
    { from: 'T03', to: 'T04', typeId: 'mv33-240' },
  ];
  stringA.forEach(({ from, to, typeId }, i) => {
    const a = tPos[from], b = tPos[to];
    const pts = [[a.lat, a.lng], [b.lat, b.lng]];
    const startFeat = tFeats[from], endFeat = tFeats[to];
    cableFeatures.push(makeFeature(ID.cable, { type: 'LineString', coordinates: pts.map(([lat,lng])=>[lng,lat]) }, {
      name: `${from}→${to} (String A)`,
      cable_type_id: typeId,
      length_m: +segLen(pts).toFixed(0),
      start_node: { type: 'turbine', id: startFeat.id },
      end_node: { type: 'turbine', id: endFeat.id },
    }));
  });
  // T04 → OnSite Sub
  {
    const a = tPos['T04'];
    const pts = [[a.lat, a.lng], [ONSITE_SUB_LAT, ONSITE_SUB_LNG]];
    cableFeatures.push(makeFeature(ID.cable, { type: 'LineString', coordinates: pts.map(([lat,lng])=>[lng,lat]) }, {
      name: 'T04→On-Site Sub (String A feeder)',
      cable_type_id: 'mv33-240',
      length_m: +segLen(pts).toFixed(0),
      start_node: { type: 'turbine', id: tFeats['T04'].id },
      end_node: { type: 'substation', id: onSiteSubId },
    }));
  }

  // ── String B cables (T05→T06, T06→T07, T07→T08, T08→OnSite)
  const stringB = [
    { from: 'T05', to: 'T06', typeId: 'mv33-240' },
    { from: 'T06', to: 'T07', typeId: 'mv33-240' },
    { from: 'T07', to: 'T08', typeId: 'mv33-240' },
  ];
  stringB.forEach(({ from, to, typeId }) => {
    const a = tPos[from], b = tPos[to];
    const pts = [[a.lat, a.lng], [b.lat, b.lng]];
    cableFeatures.push(makeFeature(ID.cable, { type: 'LineString', coordinates: pts.map(([lat,lng])=>[lng,lat]) }, {
      name: `${from}→${to} (String B)`,
      cable_type_id: typeId,
      length_m: +segLen(pts).toFixed(0),
      start_node: { type: 'turbine', id: tFeats[from].id },
      end_node: { type: 'turbine', id: tFeats[to].id },
    }));
  });
  {
    const a = tPos['T08'];
    const pts = [[a.lat, a.lng], [ONSITE_SUB_LAT, ONSITE_SUB_LNG]];
    cableFeatures.push(makeFeature(ID.cable, { type: 'LineString', coordinates: pts.map(([lat,lng])=>[lng,lat]) }, {
      name: 'T08→On-Site Sub (String B feeder)',
      cable_type_id: 'mv33-240',
      length_m: +segLen(pts).toFixed(0),
      start_node: { type: 'turbine', id: tFeats['T08'].id },
      end_node: { type: 'substation', id: onSiteSubId },
    }));
  }

  // ── String C cables (T09→T10, T10→T11, T11→T12, T12→OnSite)
  const stringC = [
    { from: 'T09', to: 'T10', typeId: 'mv33-150' },
    { from: 'T10', to: 'T11', typeId: 'mv33-150' },
    { from: 'T11', to: 'T12', typeId: 'mv33-150' },
  ];
  stringC.forEach(({ from, to, typeId }) => {
    const a = tPos[from], b = tPos[to];
    const pts = [[a.lat, a.lng], [b.lat, b.lng]];
    cableFeatures.push(makeFeature(ID.cable, { type: 'LineString', coordinates: pts.map(([lat,lng])=>[lng,lat]) }, {
      name: `${from}→${to} (String C)`,
      cable_type_id: typeId,
      length_m: +segLen(pts).toFixed(0),
      start_node: { type: 'turbine', id: tFeats[from].id },
      end_node: { type: 'turbine', id: tFeats[to].id },
    }));
  });
  {
    const a = tPos['T12'];
    const pts = [[a.lat, a.lng], [ONSITE_SUB_LAT, ONSITE_SUB_LNG]];
    cableFeatures.push(makeFeature(ID.cable, { type: 'LineString', coordinates: pts.map(([lat,lng])=>[lng,lat]) }, {
      name: 'T12→On-Site Sub (String C feeder)',
      cable_type_id: 'mv33-150',
      length_m: +segLen(pts).toFixed(0),
      start_node: { type: 'turbine', id: tFeats['T12'].id },
      end_node: { type: 'substation', id: onSiteSubId },
    }));
  }

  // ── Export cable: On-Site Sub → ESB Maam Cross 132kV overhead
  {
    // Route via waypoint to avoid constraint zones
    const pts = [
      [ONSITE_SUB_LAT, ONSITE_SUB_LNG],
      [53.427, -8.750],
      [53.424, -8.735],
      [SUB_LAT, SUB_LNG],
    ];
    cableFeatures.push(makeFeature(ID.cable, { type: 'LineString', coordinates: pts.map(([lat,lng])=>[lng,lat]) }, {
      name: 'Grid Export — On-Site Sub → ESB Maam Cross (132kV OHL)',
      cable_type_id: 'ol132',
      length_m: +segLen(pts).toFixed(0),
      start_node: { type: 'substation', id: onSiteSubId },
      end_node: { type: 'substation', id: esbSubId },
    }));
  }

  const cableLayer = {
    id: ID.cable,
    name: 'Cables',
    type: 'cable',
    visible: true,
    color: '#f97316',
    fillOpacity: 0.8,
    strokeOpacity: 0.9,
    strokeWeight: 2,
    schema: [],
    features: cableFeatures,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ASSEMBLE LAYERS in render order (bottom → top)
  // ─────────────────────────────────────────────────────────────────────────
  const layers = [
    visualLayer,
    boundaryLayer,
    assiLayer,
    peatLayer,
    exclusionLayer,
    residentialLayer,
    accessLayer,
    turbineLayer,
    cableLayer,
    substationLayer,
  ];

  return {
    projectName: 'Ballycraggan Wind Farm — Co. Galway',
    center: [53.430, -8.785],
    zoom: 13,
    layers,
    windParams: { k: 2.1, lambda: 9.2 },
  };
}