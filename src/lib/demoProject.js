// ─────────────────────────────────────────────────────────────────────────────
// Ballycraggan Wind Farm — Full Demo Project
// Realistic Irish onshore wind farm demo set in Co. Galway
// Includes: site-level constraints + all-Ireland national constraint layers
// ─────────────────────────────────────────────────────────────────────────────

function uuid() { return crypto.randomUUID(); }

function makeFeature(layerId, geometry, properties = {}) {
  return { id: uuid(), layerId, geometry, properties };
}

function point(layerId, lat, lng, props) {
  return makeFeature(layerId, { type: 'Point', coordinates: [lng, lat] }, props);
}

function latlngToCoord([lat, lng]) { return [lng, lat]; }
function ring(pts) { const c = pts.map(latlngToCoord); c.push(c[0]); return c; }

function poly(layerId, rings, props) {
  return makeFeature(layerId, { type: 'Polygon', coordinates: rings }, props);
}

function line(layerId, pts, props) {
  return makeFeature(layerId, { type: 'LineString', coordinates: pts.map(([lat, lng]) => [lng, lat]) }, props);
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER IDs
// ─────────────────────────────────────────────────────────────────────────────
const ID = {
  boundary:      uuid(),
  exclusion:     uuid(),
  assi:          uuid(),
  peat:          uuid(),
  visual:        uuid(),
  residential:   uuid(),
  access:        uuid(),
  turbine:       uuid(),
  cable:         uuid(),
  substation:    uuid(),
  // All-Ireland layers
  flood:         uuid(),
  towns:         uuid(),
  nobuild:       uuid(),
  natura:        uuid(),
  forestry:      uuid(),
  military:      uuid(),
  aviation:      uuid(),
  heritage:      uuid(),
};

// ─────────────────────────────────────────────────────────────────────────────
// TURBINE POSITIONS — 3 strings of 4  (Co. Galway)
// ─────────────────────────────────────────────────────────────────────────────
const BASE_LAT = 53.42;
const BASE_LNG = -8.78;
const TURBINE_TYPE_ID = 'v136-4.2';
const TURBINE_MW = 4.2;
const TURBINE_HUB = 112;
const TURBINE_ROTOR = 136;

const turbinePositions = [
  { name: 'T01', lat: 53.438, lng: -8.810, wind_speed_ms: 8.4, hub_wind_speed: 9.6, aep_mwh: 17800 },
  { name: 'T02', lat: 53.434, lng: -8.805, wind_speed_ms: 8.2, hub_wind_speed: 9.4, aep_mwh: 17200 },
  { name: 'T03', lat: 53.430, lng: -8.800, wind_speed_ms: 8.5, hub_wind_speed: 9.7, aep_mwh: 18100 },
  { name: 'T04', lat: 53.426, lng: -8.795, wind_speed_ms: 8.3, hub_wind_speed: 9.5, aep_mwh: 17600 },
  { name: 'T05', lat: 53.436, lng: -8.790, wind_speed_ms: 8.1, hub_wind_speed: 9.3, aep_mwh: 16900 },
  { name: 'T06', lat: 53.432, lng: -8.785, wind_speed_ms: 8.6, hub_wind_speed: 9.8, aep_mwh: 18400 },
  { name: 'T07', lat: 53.428, lng: -8.780, wind_speed_ms: 8.4, hub_wind_speed: 9.6, aep_mwh: 17800 },
  { name: 'T08', lat: 53.424, lng: -8.775, wind_speed_ms: 8.0, hub_wind_speed: 9.1, aep_mwh: 16400 },
  { name: 'T09', lat: 53.434, lng: -8.770, wind_speed_ms: 7.8, hub_wind_speed: 8.9, aep_mwh: 15900 },
  { name: 'T10', lat: 53.430, lng: -8.765, wind_speed_ms: 7.9, hub_wind_speed: 9.0, aep_mwh: 16100 },
  { name: 'T11', lat: 53.426, lng: -8.760, wind_speed_ms: 8.1, hub_wind_speed: 9.2, aep_mwh: 16700 },
  { name: 'T12', lat: 53.422, lng: -8.755, wind_speed_ms: 8.2, hub_wind_speed: 9.4, aep_mwh: 17200 },
];

const SUB_LAT = 53.422, SUB_LNG = -8.720;
const ONSITE_SUB_LAT = 53.428, ONSITE_SUB_LNG = -8.768;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function segLen(pts) {
  let l = 0;
  for (let i = 0; i < pts.length - 1; i++) l += haversineM(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
  return l;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function buildDemoProject() {

  // ── Site Boundary — irregular 9-vertex polygon ────────────────────────────
  const boundaryLayer = {
    id: ID.boundary, name: 'Site Boundary', type: 'polygon', visible: true,
    color: '#06b6d4', fillOpacity: 0.07, strokeOpacity: 1, strokeWeight: 2.5,
    features: [
      poly(ID.boundary, [ring([
        [53.443, -8.822], [53.445, -8.806], [53.441, -8.792],
        [53.437, -8.780], [53.433, -8.768], [53.420, -8.752],
        [53.416, -8.769], [53.415, -8.797], [53.419, -8.818],
        [53.428, -8.826],
      ])], { name: 'Ballycraggan Wind Farm — Application Boundary', area_ha: 1620, notes: 'EIS 2024-387' }),
    ],
  };

  // ── Exclusion Zones — irregular shapes ────────────────────────────────────
  const exclusionLayer = {
    id: ID.exclusion, name: 'Exclusion Zones', type: 'polygon', visible: true,
    color: '#ef4444', fillOpacity: 0.25, strokeOpacity: 0.9, strokeWeight: 2,
    features: [
      poly(ID.exclusion, [ring([
        [53.4195, -8.800], [53.4210, -8.793], [53.4185, -8.787],
        [53.4160, -8.789], [53.4148, -8.796], [53.4165, -8.803],
      ])], { name: 'Ballycraggan Village — 500m Residential Setback', reason: '500m setback per Wind Energy Guidelines 2006', setback_m: 500 }),
      poly(ID.exclusion, [ring([
        [53.4365, -8.820], [53.4380, -8.814], [53.4370, -8.810],
        [53.4345, -8.811], [53.4335, -8.817], [53.4350, -8.822],
      ])], { name: 'River Suck Riparian Buffer', reason: '50m watercourse buffer — EPA Guidance', setback_m: 50 }),
      poly(ID.exclusion, [ring([
        [53.4425, -8.758], [53.4440, -8.754], [53.4430, -8.750],
        [53.4190, -8.751], [53.4175, -8.755], [53.4195, -8.759],
      ])], { name: 'ESB 38kV Overhead Line Buffer', reason: '2× blade length technical exclusion from active OHL', setback_m: 272 }),
    ],
  };

  // ── ASSIs / NHAs — irregular blobs ────────────────────────────────────────
  const assiLayer = {
    id: ID.assi, name: 'ASSIs / NHAs', type: 'polygon', visible: true,
    color: '#84cc16', fillOpacity: 0.22, strokeOpacity: 0.85, strokeWeight: 2,
    features: [
      poly(ID.assi, [ring([
        [53.4420, -8.818], [53.4435, -8.810], [53.4428, -8.802],
        [53.4410, -8.800], [53.4395, -8.805], [53.4385, -8.814],
        [53.4400, -8.820],
      ])], { name: 'Cloonfree Bog Complex NHA', designation: 'National Heritage Area', species: 'Sphagnum moss, Curlew, Golden Plover', notes: 'Site Code: 000297' }),
      poly(ID.assi, [ring([
        [53.4255, -8.777], [53.4270, -8.770], [53.4260, -8.762],
        [53.4238, -8.760], [53.4220, -8.765], [53.4228, -8.775],
      ])], { name: 'Ballycraggan Lake pSAC', designation: 'proposed Special Area of Conservation', species: 'Freshwater Pearl Mussel, Otter', notes: 'Article 6 AA required' }),
    ],
  };

  // ── Deep Peat ──────────────────────────────────────────────────────────────
  const peatLayer = {
    id: ID.peat, name: 'Deep Peat (>0.5m)', type: 'polygon', visible: true,
    color: '#92400e', fillOpacity: 0.30, strokeOpacity: 0.7, strokeWeight: 1.5,
    features: [
      poly(ID.peat, [ring([
        [53.4408, -8.810], [53.4420, -8.803], [53.4415, -8.795],
        [53.4395, -8.793], [53.4378, -8.798], [53.4380, -8.808],
        [53.4395, -8.813],
      ])], { name: 'Northern Blanket Bog — Zone A', depth_m: 3.8, volume_m3: 420000 }),
      poly(ID.peat, [ring([
        [53.4305, -8.805], [53.4318, -8.797], [53.4310, -8.790],
        [53.4290, -8.791], [53.4280, -8.799], [53.4292, -8.807],
      ])], { name: 'Central Bog — Zone B', depth_m: 2.1, volume_m3: 185000 }),
    ],
  };

  // ── Visual Impact Zones — irregular broad polygons ─────────────────────────
  const visualLayer = {
    id: ID.visual, name: 'Visual Impact Zones', type: 'polygon', visible: false,
    color: '#a855f7', fillOpacity: 0.09, strokeOpacity: 0.6, strokeWeight: 1.5,
    features: [
      poly(ID.visual, [ring([
        [53.450, -8.832], [53.453, -8.810], [53.449, -8.775],
        [53.445, -8.748], [53.430, -8.738], [53.414, -8.742],
        [53.408, -8.765], [53.410, -8.800], [53.413, -8.835],
        [53.430, -8.845],
      ])], { name: 'Zone of Theoretical Visibility — 5km', distance_km: 5, impact: 'Moderate' }),
      poly(ID.visual, [ring([
        [53.462, -8.860], [53.468, -8.820], [53.460, -8.758],
        [53.445, -8.720], [53.420, -8.708], [53.398, -8.718],
        [53.388, -8.760], [53.392, -8.830], [53.408, -8.862],
        [53.436, -8.870],
      ])], { name: 'Zone of Theoretical Visibility — 15km', distance_km: 15, impact: 'Low' }),
    ],
  };

  // ── Residential Setbacks ───────────────────────────────────────────────────
  const residentialLayer = {
    id: ID.residential, name: 'Residential Setbacks', type: 'polygon', visible: true,
    color: '#f59e0b', fillOpacity: 0.18, strokeOpacity: 0.8, strokeWeight: 1.5,
    features: [
      poly(ID.residential, [ring([
        [53.4192, -8.800], [53.4205, -8.793], [53.4188, -8.787],
        [53.4162, -8.789], [53.4150, -8.796], [53.4168, -8.803],
      ])], { name: 'Ballycraggan Village', dwelling_count: 47, nearest_turbine_m: 612 }),
      poly(ID.residential, [ring([
        [53.4265, -8.762], [53.4275, -8.756], [53.4262, -8.751],
        [53.4245, -8.753], [53.4238, -8.759], [53.4252, -8.764],
      ])], { name: 'Clooneen Townland', dwelling_count: 8, nearest_turbine_m: 780 }),
      poly(ID.residential, [ring([
        [53.4405, -8.814], [53.4415, -8.808], [53.4408, -8.803],
        [53.4392, -8.805], [53.4385, -8.811], [53.4395, -8.816],
      ])], { name: 'Mullaghmore Farm Complex', dwelling_count: 3, nearest_turbine_m: 530 }),
    ],
  };

  // ── Access Tracks ─────────────────────────────────────────────────────────
  const accessLayer = {
    id: ID.access, name: 'Access Tracks & Hardstanding', type: 'polygon', visible: true,
    color: '#d97706', fillOpacity: 0.45, strokeOpacity: 0.8, strokeWeight: 1,
    features: [
      poly(ID.access, [ring([
        [53.438, -8.792], [53.422, -8.792], [53.422, -8.789], [53.438, -8.789],
      ])], { name: 'Main Site Access Track', width_m: 6, length_m: 1800 }),
      poly(ID.access, [ring([
        [53.430, -8.785], [53.430, -8.756], [53.428, -8.756], [53.428, -8.785],
      ])], { name: 'String C Spur Track', width_m: 5, length_m: 2100 }),
    ],
  };

  // ══════════════════════════════════════════════════════════════════════════
  // ALL-IRELAND NATIONAL CONSTRAINT LAYERS
  // ══════════════════════════════════════════════════════════════════════════

  // ── Flood Risk Zones ───────────────────────────────────────────────────────
  const floodLayer = {
    id: ID.flood, name: 'Flood Risk Zones (OPW)', type: 'polygon', visible: true,
    color: '#38bdf8', fillOpacity: 0.28, strokeOpacity: 0.7, strokeWeight: 1.5,
    features: [
      // Shannon catchment — central Ireland
      poly(ID.flood, [ring([
        [53.420, -8.340], [53.450, -8.280], [53.490, -8.260],
        [53.520, -8.310], [53.510, -8.380], [53.470, -8.410],
        [53.435, -8.400], [53.410, -8.370],
      ])], { name: 'River Shannon Flood Zone A — Athlone Area', zone: 'Zone A', return_period_yrs: 100, notes: 'OPW CFRAMS mapping. Development restricted in Zone A.' }),
      poly(ID.flood, [ring([
        [53.330, -8.000], [53.380, -7.940], [53.420, -7.960],
        [53.410, -8.030], [53.370, -8.060], [53.335, -8.040],
      ])], { name: 'Bord na Móna Wetland Flood Plain — Midlands', zone: 'Zone B', return_period_yrs: 1000, notes: 'Secondary flood zone per OPW guidelines' }),
      // Corrib / Galway Bay floodplain
      poly(ID.flood, [ring([
        [53.280, -9.070], [53.310, -9.020], [53.340, -9.050],
        [53.325, -9.110], [53.295, -9.120], [53.270, -9.095],
      ])], { name: 'Corrib Estuary Tidal Flood Zone — Galway City', zone: 'Zone A', return_period_yrs: 100, notes: 'Tidal influence to Wolfe Tone Bridge. Detailed FRA required.' }),
      // Boyne valley
      poly(ID.flood, [ring([
        [53.700, -6.620], [53.740, -6.580], [53.760, -6.630],
        [53.740, -6.680], [53.705, -6.670], [53.690, -6.645],
      ])], { name: 'River Boyne Flood Zone — Trim to Drogheda', zone: 'Zone A', return_period_yrs: 100, notes: 'Heritage site considerations apply — Brú na Bóinne WHS proximity' }),
      // Lee valley Cork
      poly(ID.flood, [ring([
        [51.890, -8.520], [51.910, -8.470], [51.930, -8.490],
        [51.920, -8.540], [51.895, -8.555], [51.878, -8.535],
      ])], { name: 'River Lee Flood Zone — Cork City', zone: 'Zone A', return_period_yrs: 100, notes: 'November 2009 flood event reference. OPW FRM scheme underway.' }),
    ],
  };

  // ── Town / Settlement Boundaries ──────────────────────────────────────────
  const townsLayer = {
    id: ID.towns, name: 'Town & Settlement Boundaries', type: 'polygon', visible: true,
    color: '#fb923c', fillOpacity: 0.15, strokeOpacity: 0.8, strokeWeight: 1.5,
    features: [
      poly(ID.towns, [ring([
        [53.418, -8.010], [53.442, -7.990], [53.460, -8.015],
        [53.455, -8.055], [53.435, -8.065], [53.412, -8.048],
        [53.408, -8.028],
      ])], { name: 'Athlone', population: 21000, plan_zone: 'Town Development Plan 2022–2028', setback_turbine_m: 500 }),
      poly(ID.towns, [ring([
        [53.270, -9.080], [53.300, -9.040], [53.320, -9.062],
        [53.310, -9.108], [53.282, -9.118], [53.260, -9.100],
        [53.258, -9.072],
      ])], { name: 'Galway City', population: 80000, plan_zone: 'Galway City Development Plan 2023–2029', setback_turbine_m: 1000 }),
      poly(ID.towns, [ring([
        [54.348, -7.640], [54.375, -7.612], [54.392, -7.638],
        [54.378, -7.672], [54.352, -7.678], [54.338, -7.658],
      ])], { name: 'Enniskillen', population: 14000, plan_zone: 'Enniskillen Area Plan 2020', setback_turbine_m: 500 }),
      poly(ID.towns, [ring([
        [51.892, -8.505], [51.920, -8.468], [51.945, -8.485],
        [51.940, -8.540], [51.912, -8.558], [51.888, -8.540],
        [51.880, -8.515],
      ])], { name: 'Cork City', population: 210000, plan_zone: 'Cork City Development Plan 2022–2028', setback_turbine_m: 1000 }),
      poly(ID.towns, [ring([
        [53.328, -6.268], [53.360, -6.230], [53.385, -6.248],
        [53.375, -6.298], [53.348, -6.312], [53.322, -6.290],
      ])], { name: 'Dublin City Centre', population: 550000, plan_zone: 'Dublin City Development Plan 2022–2028', setback_turbine_m: 2000 }),
      poly(ID.towns, [ring([
        [52.655, -8.640], [52.680, -8.608], [52.700, -8.628],
        [52.688, -8.668], [52.660, -8.675], [52.645, -8.655],
      ])], { name: 'Limerick City', population: 95000, plan_zone: 'Limerick City Development Plan 2022–2028', setback_turbine_m: 1000 }),
      poly(ID.towns, [ring([
        [54.592, -5.955], [54.620, -5.918], [54.640, -5.938],
        [54.628, -5.982], [54.600, -5.995], [54.580, -5.975],
      ])], { name: 'Belfast City Centre', population: 340000, plan_zone: 'Belfast Metropolitan Area Plan', setback_turbine_m: 2000 }),
      poly(ID.towns, [ring([
        [52.840, -6.920], [52.862, -6.892], [52.878, -6.910],
        [52.866, -6.948], [52.843, -6.958], [52.828, -6.938],
      ])], { name: 'Kilkenny', population: 27000, plan_zone: 'Kilkenny City & County Development Plan', setback_turbine_m: 500 }),
    ],
  };

  // ── No-Build / Wind Energy Restriction Zones ──────────────────────────────
  const nobuildLayer = {
    id: ID.nobuild, name: 'Wind Energy Restriction Zones', type: 'polygon', visible: true,
    color: '#dc2626', fillOpacity: 0.18, strokeOpacity: 0.8, strokeWeight: 2,
    features: [
      poly(ID.nobuild, [ring([
        [54.175, -6.355], [54.210, -6.310], [54.240, -6.330],
        [54.255, -6.380], [54.230, -6.420], [54.195, -6.430],
        [54.165, -6.410], [54.158, -6.375],
      ])], { name: 'Mourne AONB Wind Restriction Zone', designation: 'Area of Outstanding Natural Beauty', policy: 'No turbines >25m within AONB', authority: 'DAERA NI' }),
      poly(ID.nobuild, [ring([
        [53.180, -9.740], [53.210, -9.700], [53.245, -9.718],
        [53.250, -9.768], [53.225, -9.800], [53.188, -9.805],
        [53.168, -9.775],
      ])], { name: 'Twelve Bens / Connemara National Park', designation: 'National Park', policy: 'Absolute wind energy exclusion zone', authority: 'NPWS' }),
      poly(ID.nobuild, [ring([
        [52.150, -10.050], [52.180, -10.005], [52.210, -10.018],
        [52.215, -10.068], [52.190, -10.100], [52.158, -10.098],
        [52.140, -10.068],
      ])], { name: 'Killarney National Park', designation: 'National Park / UNESCO Biosphere', policy: 'Absolute exclusion — no wind infrastructure', authority: 'NPWS' }),
      poly(ID.nobuild, [ring([
        [54.418, -8.580], [54.448, -8.540], [54.472, -8.558],
        [54.468, -8.608], [54.440, -8.632], [54.412, -8.615],
        [54.405, -8.590],
      ])], { name: 'North Mayo Blanket Bog SPA', designation: 'Special Protection Area / Ramsar Site', policy: 'Turbines prohibited within SPA boundary', authority: 'NPWS / BirdWatch Ireland' }),
      poly(ID.nobuild, [ring([
        [53.465, -9.445], [53.498, -9.408], [53.522, -9.428],
        [53.520, -9.478], [53.492, -9.505], [53.462, -9.488],
        [53.450, -9.460],
      ])], { name: 'Lough Corrib SAC / SPA', designation: 'Special Area of Conservation', policy: 'Buffer 500m from designated boundary', authority: 'NPWS' }),
    ],
  };

  // ── Natura 2000 / SPAs ─────────────────────────────────────────────────────
  const naturaLayer = {
    id: ID.natura, name: 'Natura 2000 / SPAs', type: 'polygon', visible: true,
    color: '#4ade80', fillOpacity: 0.20, strokeOpacity: 0.75, strokeWeight: 1.5,
    features: [
      poly(ID.natura, [ring([
        [53.612, -9.908], [53.648, -9.868], [53.678, -9.890],
        [53.670, -9.948], [53.638, -9.972], [53.605, -9.950],
        [53.595, -9.922],
      ])], { name: 'Killala Bay / Moy Estuary SPA', site_code: 'IE0000333', key_species: 'Bar-tailed Godwit, Light-bellied Brent Goose', notes: 'Article 6 Appropriate Assessment required for projects within 15km' }),
      poly(ID.natura, [ring([
        [52.180, -7.540], [52.215, -7.498], [52.248, -7.512],
        [52.252, -7.568], [52.225, -7.600], [52.188, -7.595],
        [52.168, -7.568],
      ])], { name: 'Waterford Harbour SPA', site_code: 'IE0004233', key_species: 'Oystercatcher, Curlew, Dunlin', notes: 'Important estuarine habitat. Shadow flicker assessment required.' }),
      poly(ID.natura, [ring([
        [54.618, -6.025], [54.648, -5.988], [54.670, -6.008],
        [54.665, -6.058], [54.638, -6.078], [54.612, -6.060],
        [54.602, -6.035],
      ])], { name: 'Belfast Lough RAMSAR / SPA', site_code: 'UK9020031', key_species: 'Pale-bellied Brent Goose, Redshank', notes: 'Ramsar Site — international importance' }),
      poly(ID.natura, [ring([
        [51.618, -8.862], [51.650, -8.825], [51.678, -8.840],
        [51.672, -8.892], [51.648, -8.918], [51.618, -8.905],
        [51.605, -8.878],
      ])], { name: 'Roaringwater Bay and Islands SAC', site_code: 'IE0000090', key_species: 'Bottlenose Dolphin, Grey Seal, Harbour Porpoise', notes: 'Marine SAC — offshore wind buffer zone applies' }),
    ],
  };

  // ── State Forestry / Coillte Zones ────────────────────────────────────────
  const forestryLayer = {
    id: ID.forestry, name: 'State Forestry / Coillte Zones', type: 'polygon', visible: false,
    color: '#166534', fillOpacity: 0.25, strokeOpacity: 0.7, strokeWeight: 1.5,
    features: [
      poly(ID.forestry, [ring([
        [53.058, -7.858], [53.092, -7.820], [53.125, -7.835],
        [53.128, -7.888], [53.098, -7.918], [53.062, -7.910],
        [53.042, -7.878],
      ])], { name: 'Slieve Bloom Mountains — Coillte Plantation', area_ha: 8400, species: 'Sitka Spruce, Norway Spruce', notes: 'Coillte open to wind lease agreements — contact Coillte Renewable Energy' }),
      poly(ID.forestry, [ring([
        [52.718, -6.568], [52.752, -6.532], [52.780, -6.548],
        [52.778, -6.598], [52.750, -6.625], [52.718, -6.615],
        [52.702, -6.585],
      ])], { name: 'Wicklow Mountains — State Forest', area_ha: 12600, species: 'Sitka Spruce, Lodgepole Pine', notes: 'Wind lease areas available. Contact Coillte RE division.' }),
      poly(ID.forestry, [ring([
        [54.388, -7.078], [54.418, -7.042], [54.445, -7.058],
        [54.440, -7.108], [54.415, -7.135], [54.385, -7.122],
        [54.372, -7.095],
      ])], { name: 'Fermanagh / Cavan Border Forestry Block', area_ha: 5200, species: 'Sitka Spruce', notes: 'Cross-border licensing applies. Contact Forest Service NI.' }),
    ],
  };

  // ── Military / Aviation Safeguarding ─────────────────────────────────────
  const aviationLayer = {
    id: ID.aviation, name: 'Aviation & Military Safeguarding', type: 'polygon', visible: false,
    color: '#dc2626', fillOpacity: 0.12, strokeOpacity: 0.8, strokeWeight: 2,
    features: [
      poly(ID.aviation, [ring([
        [53.408, -6.318], [53.430, -6.265], [53.468, -6.270],
        [53.478, -6.330], [53.462, -6.375], [53.428, -6.378],
        [53.398, -6.345],
      ])], { name: 'Dublin Airport PSZ / Instrument Flight Safeguarding Area', type: 'Commercial Airport', authority: 'IAA / daa', notes: 'Statutory safeguarding consultation required. IAA height limit applies within 30km.' }),
      poly(ID.aviation, [ring([
        [51.820, -8.508], [51.848, -8.462], [51.878, -8.475],
        [51.872, -8.530], [51.848, -8.558], [51.818, -8.545],
        [51.805, -8.520],
      ])], { name: 'Cork Airport Safeguarding Zone', type: 'Commercial Airport', authority: 'IAA / daa', notes: 'Consultation required for any structure exceeding 100m AGL.' }),
      poly(ID.aviation, [ring([
        [53.888, -8.828], [53.918, -8.792], [53.945, -8.808],
        [53.940, -8.858], [53.915, -8.882], [53.885, -8.868],
        [53.872, -8.840],
      ])], { name: 'Casement Aerodrome (Baldonnel) Military Safeguarding', type: 'Military Airfield', authority: 'Irish Air Corps / IAA', notes: 'Strict height restrictions. Ministerial consent may be required.' }),
      poly(ID.aviation, [ring([
        [54.658, -6.228], [54.688, -6.192], [54.715, -6.208],
        [54.710, -6.258], [54.685, -6.282], [54.655, -6.268],
        [54.642, -6.240],
      ])], { name: 'Aldergrove / Belfast International Airport Safeguarding', type: 'Commercial Airport', authority: 'CAA / NI Aviation', notes: 'Consultation with CAA required per Article 16 Air Navigation Order' }),
    ],
  };

  // ── Built / Archaeological Heritage ──────────────────────────────────────
  const heritageLayer = {
    id: ID.heritage, name: 'Protected Archaeological Heritage', type: 'polygon', visible: false,
    color: '#b45309', fillOpacity: 0.20, strokeOpacity: 0.8, strokeWeight: 1.5,
    features: [
      poly(ID.heritage, [ring([
        [53.692, -6.462], [53.718, -6.430], [53.745, -6.445],
        [53.742, -6.498], [53.718, -6.520], [53.690, -6.508],
        [53.678, -6.478],
      ])], { name: 'Brú na Bóinne World Heritage Site Buffer', designation: 'UNESCO WHS / NMI', monument_type: 'Neolithic Passage Tomb Complex', notes: 'Turbines prohibited within WHS. Visual impact must be assessed within 5km buffer.' }),
      poly(ID.heritage, [ring([
        [53.338, -9.068], [53.362, -9.040], [53.385, -9.052],
        [53.380, -9.095], [53.358, -9.115], [53.332, -9.102],
        [53.322, -9.078],
      ])], { name: 'Aran Islands — High Density Archaeological Landscape', designation: 'NHA / Archaeological Zone', monument_type: 'Iron Age / Early Christian remains', notes: 'RMP consent required for any development activity' }),
      poly(ID.heritage, [ring([
        [52.518, -6.458], [52.545, -6.428], [52.568, -6.442],
        [52.562, -6.490], [52.538, -6.512], [52.510, -6.498],
        [52.500, -6.470],
      ])], { name: 'Wexford Historic Town Core Zone', designation: 'Architectural Conservation Area', monument_type: 'Viking / Medieval Settlement', notes: 'Protected structures within zone. Development Plan ACA designations apply.' }),
      poly(ID.heritage, [ring([
        [54.358, -7.842], [54.382, -7.815], [54.405, -7.828],
        [54.400, -7.872], [54.378, -7.895], [54.352, -7.882],
        [54.340, -7.858],
      ])], { name: 'Enniskillen Castle & Monastic Complex', designation: 'SMR / AE (NI)', monument_type: 'Castle / Plantation Town', notes: 'DAERA Historic Environment consent required' }),
    ],
  };

  // ── Turbine Layer ─────────────────────────────────────────────────────────
  const turbineLayer = {
    id: ID.turbine, name: 'Turbines', type: 'turbine', visible: true,
    color: '#10b981', fillOpacity: 0.8, strokeOpacity: 0.9, strokeWeight: 2,
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

  // ── Substations ───────────────────────────────────────────────────────────
  const onSiteSubId = uuid();
  const esbSubId = uuid();

  const substationLayer = {
    id: ID.substation, name: 'Substations', type: 'substation', visible: true,
    color: '#facc15', fillOpacity: 1, strokeOpacity: 1, strokeWeight: 2,
    schema: [],
    features: [
      {
        id: onSiteSubId, layerId: ID.substation,
        geometry: { type: 'Point', coordinates: [ONSITE_SUB_LNG, ONSITE_SUB_LAT] },
        properties: { name: 'Ballycraggan On-Site 33/0.69kV', transformer_mva: 60, capacity_generation_mw: 50.4, capacity_demand_mw: 5, notes: '2× 30MVA transformers (N+1 redundancy).' },
      },
      {
        id: esbSubId, layerId: ID.substation,
        geometry: { type: 'Point', coordinates: [SUB_LNG, SUB_LAT] },
        properties: { name: 'ESB Maam Cross 110/38kV Grid Substation', transformer_mva: 120, capacity_generation_mw: 100, capacity_demand_mw: 80, notes: 'Point of Connection. Export capacity 50.4MW.' },
      },
    ],
  };

  // ── Cables ────────────────────────────────────────────────────────────────
  const tPos = {};
  turbinePositions.forEach(t => { tPos[t.name] = t; });
  const tFeats = {};
  turbineLayer.features.forEach(f => { tFeats[f.properties.name] = f; });

  const cableFeatures = [];

  [['T01','T02'],['T02','T03'],['T03','T04']].forEach(([from, to]) => {
    const a = tPos[from], b = tPos[to];
    const pts = [[a.lat, a.lng], [b.lat, b.lng]];
    cableFeatures.push(makeFeature(ID.cable, { type: 'LineString', coordinates: pts.map(([lat, lng]) => [lng, lat]) }, {
      name: `${from}→${to} (String A)`, cable_type_id: 'mv33-240', length_m: +segLen(pts).toFixed(0),
      start_node: { type: 'turbine', id: tFeats[from].id }, end_node: { type: 'turbine', id: tFeats[to].id },
    }));
  });
  { const a = tPos['T04']; const pts = [[a.lat, a.lng], [ONSITE_SUB_LAT, ONSITE_SUB_LNG]];
    cableFeatures.push(makeFeature(ID.cable, { type: 'LineString', coordinates: pts.map(([lat, lng]) => [lng, lat]) }, { name: 'T04→On-Site Sub (String A)', cable_type_id: 'mv33-240', length_m: +segLen(pts).toFixed(0), start_node: { type: 'turbine', id: tFeats['T04'].id }, end_node: { type: 'substation', id: onSiteSubId } })); }

  [['T05','T06'],['T06','T07'],['T07','T08']].forEach(([from, to]) => {
    const a = tPos[from], b = tPos[to];
    const pts = [[a.lat, a.lng], [b.lat, b.lng]];
    cableFeatures.push(makeFeature(ID.cable, { type: 'LineString', coordinates: pts.map(([lat, lng]) => [lng, lat]) }, {
      name: `${from}→${to} (String B)`, cable_type_id: 'mv33-240', length_m: +segLen(pts).toFixed(0),
      start_node: { type: 'turbine', id: tFeats[from].id }, end_node: { type: 'turbine', id: tFeats[to].id },
    }));
  });
  { const a = tPos['T08']; const pts = [[a.lat, a.lng], [ONSITE_SUB_LAT, ONSITE_SUB_LNG]];
    cableFeatures.push(makeFeature(ID.cable, { type: 'LineString', coordinates: pts.map(([lat, lng]) => [lng, lat]) }, { name: 'T08→On-Site Sub (String B)', cable_type_id: 'mv33-240', length_m: +segLen(pts).toFixed(0), start_node: { type: 'turbine', id: tFeats['T08'].id }, end_node: { type: 'substation', id: onSiteSubId } })); }

  [['T09','T10'],['T10','T11'],['T11','T12']].forEach(([from, to]) => {
    const a = tPos[from], b = tPos[to];
    const pts = [[a.lat, a.lng], [b.lat, b.lng]];
    cableFeatures.push(makeFeature(ID.cable, { type: 'LineString', coordinates: pts.map(([lat, lng]) => [lng, lat]) }, {
      name: `${from}→${to} (String C)`, cable_type_id: 'mv33-150', length_m: +segLen(pts).toFixed(0),
      start_node: { type: 'turbine', id: tFeats[from].id }, end_node: { type: 'turbine', id: tFeats[to].id },
    }));
  });
  { const a = tPos['T12']; const pts = [[a.lat, a.lng], [ONSITE_SUB_LAT, ONSITE_SUB_LNG]];
    cableFeatures.push(makeFeature(ID.cable, { type: 'LineString', coordinates: pts.map(([lat, lng]) => [lng, lat]) }, { name: 'T12→On-Site Sub (String C)', cable_type_id: 'mv33-150', length_m: +segLen(pts).toFixed(0), start_node: { type: 'turbine', id: tFeats['T12'].id }, end_node: { type: 'substation', id: onSiteSubId } })); }

  { const pts = [[ONSITE_SUB_LAT, ONSITE_SUB_LNG],[53.427,-8.750],[53.424,-8.735],[SUB_LAT, SUB_LNG]];
    cableFeatures.push(makeFeature(ID.cable, { type: 'LineString', coordinates: pts.map(([lat, lng]) => [lng, lat]) }, { name: 'Grid Export — On-Site Sub → ESB Maam Cross (132kV OHL)', cable_type_id: 'ol132', length_m: +segLen(pts).toFixed(0), start_node: { type: 'substation', id: onSiteSubId }, end_node: { type: 'substation', id: esbSubId } })); }

  const cableLayer = {
    id: ID.cable, name: 'Cables', type: 'cable', visible: true,
    color: '#f97316', fillOpacity: 0.8, strokeOpacity: 0.9, strokeWeight: 2, schema: [],
    features: cableFeatures,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ASSEMBLE — all-Ireland layers render first (background), site layers on top
  // ─────────────────────────────────────────────────────────────────────────
  const layers = [
    // Background / national layers
    floodLayer,
    naturaLayer,
    nobuildLayer,
    forestryLayer,
    aviationLayer,
    heritageLayer,
    townsLayer,
    // Site-level layers
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