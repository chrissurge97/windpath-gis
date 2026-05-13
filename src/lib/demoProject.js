// ─────────────────────────────────────────────────────────────────────────────
// Ballycraggan Wind Farm — Full Demo Project
// Realistic Irish onshore wind farm demo set in Co. Galway
// Includes: site-level constraints + comprehensive all-Ireland constraint layers
// ─────────────────────────────────────────────────────────────────────────────

function uuid() { return crypto.randomUUID(); }
function makeFeature(layerId, geometry, properties = {}) { return { id: uuid(), layerId, geometry, properties }; }
function point(layerId, lat, lng, props) { return makeFeature(layerId, { type: 'Point', coordinates: [lng, lat] }, props); }
function latlngToCoord([lat, lng]) { return [lng, lat]; }
function ring(pts) { const c = pts.map(latlngToCoord); c.push(c[0]); return c; }
function poly(layerId, rings, props) { return makeFeature(layerId, { type: 'Polygon', coordinates: rings }, props); }

const ID = {
  boundary: uuid(), exclusion: uuid(), assi: uuid(), peat: uuid(),
  visual: uuid(), residential: uuid(), access: uuid(),
  turbine: uuid(), cable: uuid(), substation: uuid(),
  // All-Ireland layers
  flood: uuid(), towns: uuid(), nobuild: uuid(), natura: uuid(),
  forestry: uuid(), aviation: uuid(), heritage: uuid(),
  // New layers
  bog: uuid(), upland: uuid(), radar: uuid(), setback500: uuid(), coastal: uuid(),
};

const TURBINE_TYPE_ID = 'v136-4.2';
const TURBINE_MW = 4.2;
const TURBINE_HUB = 112;
const TURBINE_ROTOR = 136;

// T12 moved slightly NE to clear the OHL buffer zone (was inside it at 53.422, -8.755)
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
  // T12 moved north to clear OHL buffer
  { name: 'T12', lat: 53.432, lng: -8.758, wind_speed_ms: 8.2, hub_wind_speed: 9.4, aep_mwh: 17200 },
];

const SUB_LAT = 53.422, SUB_LNG = -8.720;
const ONSITE_SUB_LAT = 53.428, ONSITE_SUB_LNG = -8.768;

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

export function buildDemoProject() {

  // ── Site Boundary ──────────────────────────────────────────────────────────
  const boundaryLayer = {
    id: ID.boundary, name: 'Site Boundary', type: 'polygon', visible: true,
    color: '#06b6d4', fillOpacity: 0.07, strokeOpacity: 1, strokeWeight: 2.5, no_turbines: false,
    features: [poly(ID.boundary, [ring([
      [53.443, -8.822], [53.445, -8.806], [53.441, -8.792],
      [53.437, -8.780], [53.433, -8.768], [53.420, -8.752],
      [53.416, -8.769], [53.415, -8.797], [53.419, -8.818], [53.428, -8.826],
    ])], { name: 'Ballycraggan Wind Farm — Application Boundary', area_ha: 1620 })],
  };

  // ── Site Exclusion Zones — no_turbines: true ───────────────────────────────
  const exclusionLayer = {
    id: ID.exclusion, name: 'Site Exclusion Zones', type: 'polygon', visible: true,
    color: '#ef4444', fillOpacity: 0.30, strokeOpacity: 0.9, strokeWeight: 2, no_turbines: true,
    features: [
      poly(ID.exclusion, [ring([
        [53.4195, -8.800], [53.4210, -8.793], [53.4185, -8.787],
        [53.4160, -8.789], [53.4148, -8.796], [53.4165, -8.803],
      ])], { name: 'Ballycraggan Village — 500m Residential Setback', reason: '500m setback per Wind Energy Guidelines 2006', setback_m: 500 }),
      poly(ID.exclusion, [ring([
        [53.4365, -8.820], [53.4380, -8.814], [53.4370, -8.810],
        [53.4345, -8.811], [53.4335, -8.817], [53.4350, -8.822],
      ])], { name: 'River Suck Riparian Buffer — 50m', reason: '50m watercourse buffer — EPA Guidance', setback_m: 50 }),
      // OHL buffer — T12 now sits above this polygon's lat range (53.418–53.444)
      poly(ID.exclusion, [ring([
        [53.4425, -8.758], [53.4440, -8.754], [53.4430, -8.750],
        [53.4190, -8.751], [53.4175, -8.755], [53.4195, -8.759],
      ])], { name: 'ESB 38kV Overhead Line Buffer', reason: '2× blade length technical exclusion from active OHL', setback_m: 272 }),
    ],
  };

  // ── ASSIs / NHAs ───────────────────────────────────────────────────────────
  const assiLayer = {
    id: ID.assi, name: 'ASSIs / NHAs', type: 'polygon', visible: true,
    color: '#84cc16', fillOpacity: 0.22, strokeOpacity: 0.85, strokeWeight: 2, no_turbines: true,
    features: [
      poly(ID.assi, [ring([
        [53.4420, -8.818], [53.4435, -8.810], [53.4428, -8.802],
        [53.4410, -8.800], [53.4395, -8.805], [53.4385, -8.814], [53.4400, -8.820],
      ])], { name: 'Cloonfree Bog Complex NHA', designation: 'National Heritage Area', species: 'Sphagnum moss, Curlew, Golden Plover' }),
      poly(ID.assi, [ring([
        [53.4255, -8.777], [53.4270, -8.770], [53.4260, -8.762],
        [53.4238, -8.760], [53.4220, -8.765], [53.4228, -8.775],
      ])], { name: 'Ballycraggan Lake pSAC', designation: 'proposed Special Area of Conservation', species: 'Freshwater Pearl Mussel, Otter' }),
    ],
  };

  // ── Deep Peat ──────────────────────────────────────────────────────────────
  const peatLayer = {
    id: ID.peat, name: 'Deep Peat (>0.5m)', type: 'polygon', visible: true,
    color: '#92400e', fillOpacity: 0.30, strokeOpacity: 0.7, strokeWeight: 1.5, no_turbines: false,
    features: [
      poly(ID.peat, [ring([
        [53.4408, -8.810], [53.4420, -8.803], [53.4415, -8.795],
        [53.4395, -8.793], [53.4378, -8.798], [53.4380, -8.808], [53.4395, -8.813],
      ])], { name: 'Northern Blanket Bog — Zone A', depth_m: 3.8, volume_m3: 420000 }),
      poly(ID.peat, [ring([
        [53.4305, -8.805], [53.4318, -8.797], [53.4310, -8.790],
        [53.4290, -8.791], [53.4280, -8.799], [53.4292, -8.807],
      ])], { name: 'Central Bog — Zone B', depth_m: 2.1, volume_m3: 185000 }),
    ],
  };

  // ── Visual Impact Zones ────────────────────────────────────────────────────
  const visualLayer = {
    id: ID.visual, name: 'Visual Impact Zones', type: 'polygon', visible: false,
    color: '#a855f7', fillOpacity: 0.09, strokeOpacity: 0.6, strokeWeight: 1.5, no_turbines: false,
    features: [
      poly(ID.visual, [ring([
        [53.450, -8.832], [53.453, -8.810], [53.449, -8.775], [53.445, -8.748],
        [53.430, -8.738], [53.414, -8.742], [53.408, -8.765], [53.410, -8.800],
        [53.413, -8.835], [53.430, -8.845],
      ])], { name: 'Zone of Theoretical Visibility — 5km', distance_km: 5, impact: 'Moderate' }),
      poly(ID.visual, [ring([
        [53.462, -8.860], [53.468, -8.820], [53.460, -8.758], [53.445, -8.720],
        [53.420, -8.708], [53.398, -8.718], [53.388, -8.760], [53.392, -8.830],
        [53.408, -8.862], [53.436, -8.870],
      ])], { name: 'Zone of Theoretical Visibility — 15km', distance_km: 15, impact: 'Low' }),
    ],
  };

  // ── Residential Setbacks ───────────────────────────────────────────────────
  const residentialLayer = {
    id: ID.residential, name: 'Residential Setbacks', type: 'polygon', visible: true,
    color: '#f59e0b', fillOpacity: 0.18, strokeOpacity: 0.8, strokeWeight: 1.5, no_turbines: true,
    features: [
      poly(ID.residential, [ring([
        [53.4192, -8.800], [53.4205, -8.793], [53.4188, -8.787],
        [53.4162, -8.789], [53.4150, -8.796], [53.4168, -8.803],
      ])], { name: 'Ballycraggan Village — 500m Buffer', dwelling_count: 47, nearest_turbine_m: 612 }),
      poly(ID.residential, [ring([
        [53.4265, -8.762], [53.4275, -8.756], [53.4262, -8.751],
        [53.4245, -8.753], [53.4238, -8.759], [53.4252, -8.764],
      ])], { name: 'Clooneen Townland — 500m Buffer', dwelling_count: 8, nearest_turbine_m: 780 }),
      poly(ID.residential, [ring([
        [53.4405, -8.814], [53.4415, -8.808], [53.4408, -8.803],
        [53.4392, -8.805], [53.4385, -8.811], [53.4395, -8.816],
      ])], { name: 'Mullaghmore Farm Complex', dwelling_count: 3, nearest_turbine_m: 530 }),
    ],
  };

  // ── Access Tracks ──────────────────────────────────────────────────────────
  const accessLayer = {
    id: ID.access, name: 'Access Tracks & Hardstanding', type: 'polygon', visible: true,
    color: '#d97706', fillOpacity: 0.45, strokeOpacity: 0.8, strokeWeight: 1, no_turbines: false,
    features: [
      poly(ID.access, [ring([[53.438, -8.792], [53.422, -8.792], [53.422, -8.789], [53.438, -8.789]])],
        { name: 'Main Site Access Track', width_m: 6, length_m: 1800 }),
      poly(ID.access, [ring([[53.430, -8.785], [53.430, -8.756], [53.428, -8.756], [53.428, -8.785]])],
        { name: 'String C Spur Track', width_m: 5, length_m: 2100 }),
    ],
  };

  // ══════════════════════════════════════════════════════════════════════════
  // ALL-IRELAND NATIONAL CONSTRAINT LAYERS
  // ══════════════════════════════════════════════════════════════════════════

  // ── Flood Risk Zones (OPW) ─────────────────────────────────────────────────
  const floodLayer = {
    id: ID.flood, name: 'Flood Risk Zones (OPW)', type: 'polygon', visible: true,
    color: '#38bdf8', fillOpacity: 0.25, strokeOpacity: 0.7, strokeWeight: 1.5, no_turbines: true,
    features: [
      poly(ID.flood, [ring([
        [53.420, -8.340], [53.452, -8.275], [53.492, -8.255],
        [53.525, -8.305], [53.512, -8.385], [53.472, -8.415],
        [53.435, -8.402], [53.408, -8.368],
      ])], { name: 'River Shannon Flood Zone A — Athlone', zone: 'Zone A', return_period_yrs: 100, notes: 'OPW CFRAMS. Development restricted.' }),
      poly(ID.flood, [ring([
        [53.332, -8.002], [53.382, -7.938], [53.422, -7.958],
        [53.412, -8.032], [53.372, -8.062], [53.335, -8.042],
      ])], { name: 'Bord na Móna Wetland Floodplain — Co. Offaly', zone: 'Zone B', return_period_yrs: 1000 }),
      poly(ID.flood, [ring([
        [53.278, -9.072], [53.312, -9.018], [53.342, -9.052],
        [53.326, -9.112], [53.294, -9.122], [53.268, -9.098],
      ])], { name: 'Corrib Estuary Tidal Flood Zone — Galway City', zone: 'Zone A', return_period_yrs: 100 }),
      poly(ID.flood, [ring([
        [53.702, -6.622], [53.742, -6.578], [53.762, -6.632],
        [53.742, -6.682], [53.706, -6.672], [53.688, -6.648],
      ])], { name: 'River Boyne Flood Zone — Navan to Drogheda', zone: 'Zone A', return_period_yrs: 100, notes: 'Heritage site proximity — Brú na Bóinne WHS' }),
      poly(ID.flood, [ring([
        [51.888, -8.522], [51.912, -8.468], [51.932, -8.492],
        [51.922, -8.542], [51.892, -8.558], [51.876, -8.538],
      ])], { name: 'River Lee Flood Zone — Cork City', zone: 'Zone A', return_period_yrs: 100 }),
      // River Erne — Cavan/Fermanagh
      poly(ID.flood, [ring([
        [54.198, -7.358], [54.228, -7.310], [54.258, -7.328],
        [54.252, -7.382], [54.222, -7.408], [54.192, -7.388],
      ])], { name: 'River Erne Flood Zone — Cavan/Fermanagh', zone: 'Zone A', return_period_yrs: 100, notes: 'Cross-border OPW / Rivers Agency NI mapping' }),
      // River Bann — Co. Antrim
      poly(ID.flood, [ring([
        [54.468, -6.318], [54.498, -6.278], [54.518, -6.298],
        [54.508, -6.352], [54.482, -6.368], [54.460, -6.342],
      ])], { name: 'River Bann Flood Zone — Portadown', zone: 'Zone A', return_period_yrs: 100, notes: 'Rivers Agency NI SFRA mapping' }),
      // River Suir — Tipperary
      poly(ID.flood, [ring([
        [52.502, -7.818], [52.532, -7.778], [52.558, -7.792],
        [52.548, -7.842], [52.522, -7.862], [52.496, -7.842],
      ])], { name: 'River Suir Flood Zone — Thurles to Clonmel', zone: 'Zone A', return_period_yrs: 100 }),
      // River Slaney — Wexford
      poly(ID.flood, [ring([
        [52.482, -6.562], [52.508, -6.528], [52.532, -6.542],
        [52.524, -6.588], [52.498, -6.608], [52.472, -6.588],
      ])], { name: 'River Slaney Flood Zone — Enniscorthy', zone: 'Zone A', return_period_yrs: 100 }),
    ],
  };

  // ── Town & Settlement Boundaries ──────────────────────────────────────────
  const townsLayer = {
    id: ID.towns, name: 'Town & Settlement Boundaries', type: 'polygon', visible: true,
    color: '#fb923c', fillOpacity: 0.15, strokeOpacity: 0.8, strokeWeight: 1.5, no_turbines: true,
    features: [
      poly(ID.towns, [ring([
        [53.418, -8.012], [53.444, -7.988], [53.462, -8.014],
        [53.456, -8.058], [53.434, -8.068], [53.410, -8.050], [53.406, -8.028],
      ])], { name: 'Athlone', population: 21000, plan_zone: 'Athlone Town Development Plan 2022–2028', setback_turbine_m: 500 }),
      poly(ID.towns, [ring([
        [53.268, -9.082], [53.302, -9.038], [53.322, -9.060],
        [53.312, -9.110], [53.280, -9.120], [53.258, -9.102], [53.256, -9.075],
      ])], { name: 'Galway City', population: 80000, plan_zone: 'Galway City Development Plan 2023–2029', setback_turbine_m: 1000 }),
      poly(ID.towns, [ring([
        [51.890, -8.508], [51.922, -8.465], [51.948, -8.482],
        [51.942, -8.542], [51.910, -8.560], [51.886, -8.542], [51.878, -8.518],
      ])], { name: 'Cork City', population: 210000, plan_zone: 'Cork City Development Plan 2022–2028', setback_turbine_m: 1000 }),
      poly(ID.towns, [ring([
        [53.326, -6.270], [53.362, -6.228], [53.388, -6.246],
        [53.378, -6.300], [53.346, -6.315], [53.320, -6.292],
      ])], { name: 'Dublin City Centre', population: 550000, plan_zone: 'Dublin City Development Plan 2022–2028', setback_turbine_m: 2000 }),
      poly(ID.towns, [ring([
        [52.652, -8.642], [52.682, -8.606], [52.702, -8.626],
        [52.690, -8.670], [52.658, -8.678], [52.642, -8.658],
      ])], { name: 'Limerick City', population: 95000, plan_zone: 'Limerick City & County Development Plan 2022–2028', setback_turbine_m: 1000 }),
      poly(ID.towns, [ring([
        [54.590, -5.958], [54.622, -5.916], [54.642, -5.936],
        [54.630, -5.984], [54.598, -5.998], [54.578, -5.978],
      ])], { name: 'Belfast City Centre', population: 340000, plan_zone: 'Belfast Metropolitan Area Plan 2015', setback_turbine_m: 2000 }),
      poly(ID.towns, [ring([
        [52.838, -6.922], [52.864, -6.890], [52.880, -6.908],
        [52.868, -6.950], [52.840, -6.960], [52.826, -6.940],
      ])], { name: 'Kilkenny City', population: 27000, plan_zone: 'Kilkenny City & County Development Plan 2021–2027', setback_turbine_m: 500 }),
      poly(ID.towns, [ring([
        [52.334, -6.458], [52.362, -6.428], [52.380, -6.442],
        [52.372, -6.482], [52.348, -6.498], [52.328, -6.480],
      ])], { name: 'Wexford Town', population: 21000, plan_zone: 'Wexford County Development Plan 2021–2027', setback_turbine_m: 500 }),
      poly(ID.towns, [ring([
        [54.345, -7.638], [54.378, -7.610], [54.395, -7.635],
        [54.380, -7.672], [54.348, -7.680], [54.335, -7.658],
      ])], { name: 'Enniskillen', population: 14000, plan_zone: 'Enniskillen Area Plan 2020', setback_turbine_m: 500 }),
      // Sligo
      poly(ID.towns, [ring([
        [54.262, -8.488], [54.290, -8.458], [54.310, -8.472],
        [54.298, -8.512], [54.272, -8.522], [54.255, -8.502],
      ])], { name: 'Sligo Town', population: 22000, plan_zone: 'Sligo County Development Plan 2017–2023', setback_turbine_m: 500 }),
      // Waterford
      poly(ID.towns, [ring([
        [52.250, -7.122], [52.278, -7.090], [52.298, -7.105],
        [52.285, -7.148], [52.258, -7.162], [52.240, -7.142],
      ])], { name: 'Waterford City', population: 56000, plan_zone: 'Waterford City & County Development Plan 2022–2028', setback_turbine_m: 750 }),
      // Letterkenny
      poly(ID.towns, [ring([
        [54.942, -7.752], [54.968, -7.724], [54.985, -7.738],
        [54.972, -7.775], [54.948, -7.788], [54.932, -7.768],
      ])], { name: 'Letterkenny', population: 20000, plan_zone: 'Donegal County Development Plan 2018–2024', setback_turbine_m: 500 }),
      // Drogheda
      poly(ID.towns, [ring([
        [53.710, -6.362], [53.738, -6.335], [53.752, -6.348],
        [53.742, -6.385], [53.718, -6.400], [53.702, -6.382],
      ])], { name: 'Drogheda', population: 45000, plan_zone: 'Louth County Development Plan 2021–2027', setback_turbine_m: 500 }),
    ],
  };

  // ── Wind Energy Restriction / No-Build Zones ───────────────────────────────
  const nobuildLayer = {
    id: ID.nobuild, name: 'Wind Energy Restriction Zones', type: 'polygon', visible: true,
    color: '#dc2626', fillOpacity: 0.20, strokeOpacity: 0.85, strokeWeight: 2, no_turbines: true,
    features: [
      // Mourne AONB, Co. Down
      poly(ID.nobuild, [ring([
        [54.172, -6.358], [54.212, -6.308], [54.242, -6.328],
        [54.258, -6.382], [54.232, -6.422], [54.195, -6.432],
        [54.162, -6.412], [54.155, -6.378],
      ])], { name: 'Mourne AONB — Wind Restriction Zone', designation: 'Area of Outstanding Natural Beauty', policy: 'No turbines >25m within AONB', authority: 'DAERA NI' }),
      // Twelve Bens / Connemara NP
      poly(ID.nobuild, [ring([
        [53.178, -9.742], [53.212, -9.698], [53.248, -9.716],
        [53.252, -9.770], [53.228, -9.802], [53.188, -9.808],
        [53.165, -9.778],
      ])], { name: 'Connemara National Park — Twelve Bens', designation: 'National Park', policy: 'Absolute wind energy exclusion', authority: 'NPWS' }),
      // Killarney NP
      poly(ID.nobuild, [ring([
        [52.148, -10.052], [52.182, -10.002], [52.212, -10.018],
        [52.218, -10.070], [52.192, -10.102], [52.155, -10.100],
        [52.138, -10.070],
      ])], { name: 'Killarney National Park', designation: 'National Park / UNESCO Biosphere', policy: 'Absolute exclusion — no wind infrastructure', authority: 'NPWS' }),
      // North Mayo SPA / Ceide Fields
      poly(ID.nobuild, [ring([
        [54.415, -8.582], [54.450, -8.538], [54.475, -8.555],
        [54.470, -8.610], [54.442, -8.635], [54.410, -8.618],
        [54.402, -8.592],
      ])], { name: 'North Mayo Blanket Bog SPA / Ceide Fields', designation: 'SPA / Ramsar / UNESCO WHS Buffer', policy: 'Turbines prohibited within SPA boundary', authority: 'NPWS / BirdWatch Ireland' }),
      // Lough Corrib SAC
      poly(ID.nobuild, [ring([
        [53.462, -9.448], [53.500, -9.405], [53.525, -9.425],
        [53.522, -9.480], [53.495, -9.508], [53.460, -9.490],
        [53.448, -9.462],
      ])], { name: 'Lough Corrib SAC / SPA', designation: 'Special Area of Conservation', policy: '500m buffer from boundary', authority: 'NPWS' }),
      // Wicklow Mountains NP
      poly(ID.nobuild, [ring([
        [52.972, -6.392], [53.008, -6.348], [53.042, -6.358],
        [53.048, -6.408], [53.022, -6.445], [52.988, -6.452],
        [52.962, -6.425],
      ])], { name: 'Wicklow Mountains National Park', designation: 'National Park', policy: 'Absolute exclusion — no wind energy development', authority: 'NPWS' }),
      // Burren NP / Co. Clare
      poly(ID.nobuild, [ring([
        [53.088, -9.098], [53.118, -9.055], [53.148, -9.068],
        [53.152, -9.118], [53.128, -9.150], [53.095, -9.145],
        [53.078, -9.120],
      ])], { name: 'The Burren National Park — Co. Clare', designation: 'National Park / UNESCO Global Geopark', policy: 'Absolute no-build zone for wind infrastructure', authority: 'NPWS' }),
      // Glenveagh NP — Donegal
      poly(ID.nobuild, [ring([
        [55.018, -8.032], [55.048, -7.990], [55.075, -8.005],
        [55.072, -8.058], [55.048, -8.085], [55.018, -8.072],
        [55.005, -8.045],
      ])], { name: 'Glenveagh National Park — Co. Donegal', designation: 'National Park', policy: 'Absolute exclusion. Turbines prohibited within park boundary', authority: 'NPWS' }),
      // Binevenagh AONB — Co. Derry
      poly(ID.nobuild, [ring([
        [55.095, -6.882], [55.122, -6.848], [55.142, -6.862],
        [55.135, -6.908], [55.112, -6.928], [55.085, -6.912],
        [55.078, -6.888],
      ])], { name: 'Binevenagh AONB — Co. Derry/Londonderry', designation: 'Area of Outstanding Natural Beauty', policy: 'No turbines >25m within AONB boundary', authority: 'DAERA NI' }),
      // Antrim Glens AONB
      poly(ID.nobuild, [ring([
        [55.152, -6.108], [55.180, -6.068], [55.205, -6.082],
        [55.198, -6.132], [55.172, -6.152], [55.145, -6.135],
        [55.138, -6.112],
      ])], { name: 'Glens of Antrim AONB', designation: 'Area of Outstanding Natural Beauty', policy: 'Turbines restricted — landscape character assessment required', authority: 'DAERA NI' }),
      // Slieve Bloom upland restriction
      poly(ID.nobuild, [ring([
        [53.072, -7.862], [53.098, -7.822], [53.128, -7.838],
        [53.130, -7.888], [53.102, -7.918], [53.065, -7.910],
        [53.045, -7.882],
      ])], { name: 'Slieve Bloom Mountains — Upland Restriction Area', designation: 'County Laois/Offaly Landscape Policy Area', policy: 'Wind development subject to enhanced landscape assessment', authority: 'Laois/Offaly Co. Councils' }),
    ],
  };

  // ── Natura 2000 / SPAs ─────────────────────────────────────────────────────
  const naturaLayer = {
    id: ID.natura, name: 'Natura 2000 / SPAs', type: 'polygon', visible: true,
    color: '#4ade80', fillOpacity: 0.20, strokeOpacity: 0.75, strokeWeight: 1.5, no_turbines: true,
    features: [
      poly(ID.natura, [ring([
        [53.610, -9.910], [53.650, -9.865], [53.680, -9.888],
        [53.672, -9.950], [53.638, -9.975], [53.602, -9.952], [53.592, -9.925],
      ])], { name: 'Killala Bay / Moy Estuary SPA', site_code: 'IE0000333', key_species: 'Bar-tailed Godwit, Brent Goose', notes: 'Article 6 AA required within 15km' }),
      poly(ID.natura, [ring([
        [52.178, -7.542], [52.218, -7.495], [52.250, -7.510],
        [52.254, -7.570], [52.228, -7.602], [52.185, -7.598], [52.165, -7.568],
      ])], { name: 'Waterford Harbour SPA', site_code: 'IE0004233', key_species: 'Oystercatcher, Curlew, Dunlin' }),
      poly(ID.natura, [ring([
        [54.615, -6.028], [54.650, -5.985], [54.672, -6.008],
        [54.668, -6.060], [54.638, -6.080], [54.608, -6.062], [54.600, -6.035],
      ])], { name: 'Belfast Lough RAMSAR / SPA', site_code: 'UK9020031', key_species: 'Pale-bellied Brent Goose, Redshank' }),
      poly(ID.natura, [ring([
        [51.615, -8.865], [51.652, -8.822], [51.680, -8.838],
        [51.675, -8.892], [51.648, -8.920], [51.615, -8.908], [51.602, -8.880],
      ])], { name: 'Roaringwater Bay and Islands SAC', site_code: 'IE0000090', key_species: 'Bottlenose Dolphin, Grey Seal' }),
      // Lough Neagh SPA — largest lake in Ireland/UK
      poly(ID.natura, [ring([
        [54.548, -6.568], [54.598, -6.492], [54.658, -6.478],
        [54.708, -6.528], [54.718, -6.618], [54.678, -6.690],
        [54.608, -6.712], [54.545, -6.665], [54.518, -6.612],
      ])], { name: 'Lough Neagh & Lough Beg SPA / RAMSAR', site_code: 'UK9020011', key_species: 'Tufted Duck, Pochard, Scaup', notes: 'Largest freshwater lake in Ireland/UK. International importance.' }),
      // Wexford Slobs
      poly(ID.natura, [ring([
        [52.348, -6.358], [52.378, -6.322], [52.402, -6.335],
        [52.395, -6.378], [52.372, -6.400], [52.345, -6.385],
      ])], { name: 'Wexford Harbour & Slobs SPA', site_code: 'IE0000004', key_species: 'Greenland White-fronted Goose, Bewick\'s Swan', notes: 'Internationally important wildfowl site. IBA.' }),
      // Strangford Lough
      poly(ID.natura, [ring([
        [54.448, -5.618], [54.492, -5.572], [54.532, -5.578],
        [54.558, -5.618], [54.548, -5.672], [54.512, -5.708],
        [54.468, -5.715], [54.435, -5.678],
      ])], { name: 'Strangford Lough SAC / SPA / RAMSAR', site_code: 'UK9020181', key_species: 'Light-bellied Brent Goose, Common Seal', notes: 'Marine SAC. OSPAR listed habitat.' }),
      // Shannon Estuary SPA
      poly(ID.natura, [ring([
        [52.618, -9.478], [52.658, -9.428], [52.708, -9.415],
        [52.748, -9.458], [52.742, -9.525], [52.702, -9.558],
        [52.658, -9.552], [52.618, -9.512],
      ])], { name: 'Shannon Estuary SPA', site_code: 'IE0004077', key_species: 'Bottlenose Dolphin, Dunlin, Black-tailed Godwit', notes: 'Europe\'s largest estuarine system. Dolphin SAC.' }),
      // Donegal Bay SPA
      poly(ID.natura, [ring([
        [54.468, -8.335], [54.508, -8.288], [54.552, -8.298],
        [54.572, -8.348], [54.558, -8.405], [54.518, -8.435],
        [54.475, -8.425], [54.450, -8.375],
      ])], { name: 'Donegal Bay SPA — Intertidal', site_code: 'IE0004033', key_species: 'Barnacle Goose, Bar-tailed Godwit', notes: 'Wind development requires shadow flicker & ornithological assessment' }),
    ],
  };

  // ── State Forestry / Coillte Zones ────────────────────────────────────────
  const forestryLayer = {
    id: ID.forestry, name: 'State Forestry / Coillte Zones', type: 'polygon', visible: false,
    color: '#166534', fillOpacity: 0.25, strokeOpacity: 0.7, strokeWeight: 1.5, no_turbines: false,
    features: [
      poly(ID.forestry, [ring([
        [52.715, -6.570], [52.755, -6.528], [52.782, -6.545],
        [52.780, -6.598], [52.752, -6.628], [52.718, -6.618], [52.700, -6.588],
      ])], { name: 'Wicklow Mountains — Coillte State Forest', area_ha: 12600, species: 'Sitka Spruce, Lodgepole Pine', notes: 'Wind lease areas available via Coillte RE' }),
      poly(ID.forestry, [ring([
        [54.385, -7.080], [54.420, -7.040], [54.448, -7.055],
        [54.442, -7.108], [54.415, -7.138], [54.382, -7.125], [54.370, -7.098],
      ])], { name: 'Fermanagh / Cavan Border Forestry Block', area_ha: 5200, species: 'Sitka Spruce', notes: 'Cross-border licensing. Contact Forest Service NI.' }),
      // Ballyhoura Mountains — Cork/Limerick
      poly(ID.forestry, [ring([
        [52.308, -8.578], [52.338, -8.545], [52.362, -8.558],
        [52.358, -8.602], [52.332, -8.625], [52.305, -8.612],
      ])], { name: 'Ballyhoura Mountains — Coillte Plantation', area_ha: 7200, species: 'Sitka Spruce, Douglas Fir', notes: 'Active wind lease negotiation with Coillte RE' }),
      // Knockmealdown — Tipperary
      poly(ID.forestry, [ring([
        [52.208, -7.958], [52.238, -7.925], [52.260, -7.938],
        [52.255, -7.982], [52.232, -8.005], [52.205, -7.992],
      ])], { name: 'Knockmealdown Mountains — Forestry Block', area_ha: 4800, species: 'Sitka Spruce', notes: 'Part Coillte, part private. Wind feasibility study ongoing.' }),
    ],
  };

  // ── Aviation & Military Safeguarding ──────────────────────────────────────
  const aviationLayer = {
    id: ID.aviation, name: 'Aviation & Military Safeguarding', type: 'polygon', visible: false,
    color: '#dc2626', fillOpacity: 0.12, strokeOpacity: 0.8, strokeWeight: 2, no_turbines: true,
    features: [
      poly(ID.aviation, [ring([
        [53.405, -6.320], [53.432, -6.262], [53.470, -6.268],
        [53.480, -6.332], [53.464, -6.378], [53.426, -6.382], [53.396, -6.348],
      ])], { name: 'Dublin Airport PSZ / ILS Safeguarding Area', type: 'Commercial Airport', authority: 'IAA / daa', notes: 'Statutory consultation required. 30km IAA height limits apply.' }),
      poly(ID.aviation, [ring([
        [51.818, -8.510], [51.850, -8.460], [51.880, -8.474],
        [51.874, -8.532], [51.850, -8.560], [51.816, -8.548], [51.802, -8.522],
      ])], { name: 'Cork Airport Safeguarding Zone', type: 'Commercial Airport', authority: 'IAA / daa', notes: 'Consultation required for structures >100m AGL' }),
      poly(ID.aviation, [ring([
        [53.885, -8.830], [53.920, -8.790], [53.948, -8.808],
        [53.942, -8.860], [53.912, -8.885], [53.882, -8.872], [53.870, -8.842],
      ])], { name: 'Casement Aerodrome (Baldonnel) — Military Safeguarding', type: 'Military Airfield', authority: 'Irish Air Corps / IAA', notes: 'Ministerial consent may be required' }),
      poly(ID.aviation, [ring([
        [54.655, -6.230], [54.690, -6.188], [54.718, -6.205],
        [54.712, -6.260], [54.685, -6.285], [54.652, -6.270], [54.638, -6.242],
      ])], { name: 'Aldergrove / Belfast International — Safeguarding Zone', type: 'Commercial Airport', authority: 'CAA / NI Aviation', notes: 'CAA consultation per ANO Article 16' }),
      // Shannon Airport
      poly(ID.aviation, [ring([
        [52.688, -8.942], [52.718, -8.898], [52.748, -8.912],
        [52.742, -8.962], [52.715, -8.988], [52.682, -8.975],
      ])], { name: 'Shannon Airport Safeguarding Zone', type: 'Commercial Airport', authority: 'IAA / Shannon Group', notes: 'Instrument flight procedure safeguarding. Height consultation mandatory.' }),
      // Waterford Airport
      poly(ID.aviation, [ring([
        [52.182, -7.102], [52.208, -7.070], [52.228, -7.082],
        [52.222, -7.122], [52.200, -7.140], [52.178, -7.125],
      ])], { name: 'Waterford Airport Safeguarding Zone', type: 'Regional Airport', authority: 'IAA', notes: 'Consultation required for structures within 15km' }),
    ],
  };

  // ── Protected Archaeological Heritage ─────────────────────────────────────
  const heritageLayer = {
    id: ID.heritage, name: 'Protected Archaeological Heritage', type: 'polygon', visible: false,
    color: '#b45309', fillOpacity: 0.20, strokeOpacity: 0.8, strokeWeight: 1.5, no_turbines: true,
    features: [
      poly(ID.heritage, [ring([
        [53.690, -6.465], [53.720, -6.428], [53.748, -6.442],
        [53.744, -6.500], [53.720, -6.522], [53.688, -6.510], [53.676, -6.480],
      ])], { name: 'Brú na Bóinne UNESCO World Heritage Site Buffer', designation: 'UNESCO WHS / NMI', monument_type: 'Neolithic Passage Tomb Complex', notes: 'Turbines prohibited. Visual impact assessed within 5km.' }),
      poly(ID.heritage, [ring([
        [53.335, -9.070], [53.365, -9.038], [53.388, -9.050],
        [53.382, -9.095], [53.358, -9.118], [53.328, -9.105], [53.320, -9.080],
      ])], { name: 'Aran Islands — Archaeological Landscape', designation: 'NHA / Archaeological Zone', monument_type: 'Iron Age / Early Christian', notes: 'RMP consent required' }),
      poly(ID.heritage, [ring([
        [52.515, -6.460], [52.548, -6.425], [52.570, -6.440],
        [52.564, -6.492], [52.538, -6.515], [52.508, -6.500], [52.498, -6.472],
      ])], { name: 'Wexford Historic Town Core — ACA', designation: 'Architectural Conservation Area', monument_type: 'Viking / Medieval Settlement' }),
      // Rock of Cashel
      poly(ID.heritage, [ring([
        [52.508, -7.898], [52.532, -7.870], [52.550, -7.882],
        [52.545, -7.918], [52.525, -7.935], [52.502, -7.922], [52.495, -7.902],
      ])], { name: 'Rock of Cashel — Scheduled Monument Buffer', designation: 'National Monument / SMR', monument_type: 'Early Medieval Royal Site', notes: '500m statutory protection zone. Visual impact EIS required.' }),
      // Clonmacnoise
      poly(ID.heritage, [ring([
        [53.322, -7.988], [53.348, -7.960], [53.368, -7.972],
        [53.362, -8.012], [53.340, -8.030], [53.318, -8.018],
      ])], { name: 'Clonmacnoise — National Monument Buffer', designation: 'National Monument / UNESCO Tentative List', monument_type: 'Early Medieval Monastic City', notes: 'Statutory 500m protection zone. No wind infrastructure.' }),
      // Newgrange standalone
      poly(ID.heritage, [ring([
        [53.695, -6.480], [53.712, -6.462], [53.725, -6.470],
        [53.720, -6.492], [53.705, -6.505], [53.690, -6.498],
      ])], { name: 'Newgrange Passage Tomb — Core Zone', designation: 'UNESCO WHS / National Monument', monument_type: 'Neolithic Passage Tomb c.3200 BC', notes: 'No development of any kind. Absolute protection.' }),
    ],
  };

  // ── Upland Wind Sensitivity Areas ─────────────────────────────────────────
  const uplandLayer = {
    id: ID.upland, name: 'Upland Wind Sensitivity Areas', type: 'polygon', visible: false,
    color: '#c084fc', fillOpacity: 0.15, strokeOpacity: 0.7, strokeWeight: 1.5, no_turbines: false,
    features: [
      // Wicklow Hills
      poly(ID.upland, [ring([
        [52.995, -6.388], [53.032, -6.342], [53.068, -6.352],
        [53.072, -6.402], [53.045, -6.440], [53.010, -6.448], [52.985, -6.418],
      ])], { name: 'Wicklow / Dublin Mountain Upland Wind Sensitivity — High', sensitivity: 'High', elevation_m_range: '500–925m', notes: 'Strong development pressure. Detailed EIA required. SEA informed constraints.' }),
      // Blue Stack Mountains — Donegal
      poly(ID.upland, [ring([
        [54.752, -8.008], [54.782, -7.968], [54.812, -7.982],
        [54.808, -8.032], [54.782, -8.058], [54.752, -8.045], [54.738, -8.020],
      ])], { name: 'Blue Stack Mountains — Co. Donegal', sensitivity: 'High', elevation_m_range: '400–674m', notes: 'Existing wind farm clusters nearby. Cumulative impact assessment required.' }),
      // Comeragh Mountains — Waterford
      poly(ID.upland, [ring([
        [52.218, -7.582], [52.248, -7.548], [52.272, -7.558],
        [52.268, -7.602], [52.245, -7.625], [52.218, -7.615], [52.202, -7.592],
      ])], { name: 'Comeragh Mountains — Co. Waterford', sensitivity: 'Moderate-High', elevation_m_range: '300–792m', notes: 'SAC in upper plateau. Access constraints — single-track roads.' }),
      // Mullaghareirk — Cork/Limerick border
      poly(ID.upland, [ring([
        [52.312, -8.998], [52.342, -8.968], [52.365, -8.980],
        [52.360, -9.022], [52.338, -9.045], [52.310, -9.035],
      ])], { name: 'Mullaghareirk Mountains — Cork / Limerick', sensitivity: 'Moderate', elevation_m_range: '200–519m', notes: 'Active wind development area. Refer to Cork RSES wind energy strategy.' }),
    ],
  };

  // ── Military Radar Safeguarding ────────────────────────────────────────────
  const radarLayer = {
    id: ID.radar, name: 'Military / Met Radar Safeguarding', type: 'polygon', visible: false,
    color: '#f43f5e', fillOpacity: 0.12, strokeOpacity: 0.8, strokeWeight: 2, no_turbines: true,
    features: [
      // Belmullet Met Éireann radar — Co. Mayo
      poly(ID.radar, [ring([
        [54.228, -9.998], [54.268, -9.955], [54.302, -9.972],
        [54.298, -10.028], [54.268, -10.058], [54.232, -10.045], [54.215, -10.018],
      ])], { name: 'Belmullet Met Éireann Weather Radar — 75km Safeguarding Zone', type: 'Meteorological Radar', authority: 'Met Éireann / IAA', notes: 'Wind turbines within 75km may cause radar clutter. Pre-application consultation essential.' }),
      // Shannon radar
      poly(ID.radar, [ring([
        [52.878, -8.928], [52.912, -8.885], [52.942, -8.900],
        [52.938, -8.952], [52.912, -8.978], [52.878, -8.965],
      ])], { name: 'Shannon IAA En-Route Radar — Safeguarding Zone', type: 'Air Traffic Control Radar', authority: 'IAA', notes: 'ATC radar line-of-sight protection zone. Formal IAA consultation required.' }),
      // Casement military radar
      poly(ID.radar, [ring([
        [53.298, -6.558], [53.332, -6.518], [53.358, -6.532],
        [53.352, -6.578], [53.328, -6.602], [53.295, -6.588],
      ])], { name: 'Casement Aerodrome Military Radar — Safeguarding Area', type: 'Military Radar', authority: 'Irish Air Corps / Dept of Defence', notes: 'Ministerial consent required for structures within radar LOS.' }),
    ],
  };

  // ── 500m Residential Setback Zones (National) ──────────────────────────────
  const setback500Layer = {
    id: ID.setback500, name: 'Residential Setback Zones (National)', type: 'polygon', visible: false,
    color: '#f97316', fillOpacity: 0.18, strokeOpacity: 0.75, strokeWeight: 1.5, no_turbines: true,
    features: [
      // Ballinrobe — Co. Mayo
      poly(ID.setback500, [ring([
        [53.625, -9.222], [53.648, -9.198], [53.665, -9.210],
        [53.660, -9.245], [53.640, -9.262], [53.618, -9.248],
      ])], { name: 'Ballinrobe — 500m Residential Setback', dwelling_count: 38, notes: 'Per Wind Energy Guidelines 2006. Noise NNL <45dBLA.' }),
      // Castlerea — Co. Roscommon
      poly(ID.setback500, [ring([
        [53.762, -8.502], [53.785, -8.478], [53.802, -8.490],
        [53.798, -8.525], [53.778, -8.542], [53.755, -8.530],
      ])], { name: 'Castlerea — 500m Residential Setback', dwelling_count: 52, notes: 'Wind Energy Guidelines 2006' }),
      // Tuam — Co. Galway
      poly(ID.setback500, [ring([
        [53.508, -8.862], [53.532, -8.838], [53.548, -8.848],
        [53.545, -8.882], [53.525, -8.900], [53.502, -8.888],
      ])], { name: 'Tuam — 500m Residential Setback', dwelling_count: 95, notes: 'Major town — enhanced 1km buffer recommended by DECC' }),
      // Charleville — Co. Cork
      poly(ID.setback500, [ring([
        [52.355, -8.682], [52.375, -8.660], [52.390, -8.670],
        [52.385, -8.702], [52.368, -8.718], [52.348, -8.705],
      ])], { name: 'Charleville — 500m Residential Setback', dwelling_count: 72, notes: 'Cork County Wind Energy Strategy buffer zone' }),
    ],
  };

  // ── Coastal Setback Zones ──────────────────────────────────────────────────
  const coastalLayer = {
    id: ID.coastal, name: 'Coastal Setback & ICZM Zones', type: 'polygon', visible: false,
    color: '#0ea5e9', fillOpacity: 0.18, strokeOpacity: 0.7, strokeWeight: 1.5, no_turbines: true,
    features: [
      // Wild Atlantic Way coastal protection zone — Galway/Mayo
      poly(ID.coastal, [ring([
        [53.718, -10.082], [53.752, -10.042], [53.788, -10.058],
        [53.785, -10.112], [53.758, -10.138], [53.722, -10.128],
        [53.708, -10.100],
      ])], { name: 'Wild Atlantic Way Coastal Protection Zone — N Mayo', designation: 'ICZM Zone / Wild Atlantic Way Corridor', policy: '500m coastal setback for wind structures', authority: 'DHLGH / Mayo Co. Council' }),
      // Dingle Peninsula coastal zone
      poly(ID.coastal, [ring([
        [52.128, -10.248], [52.158, -10.205], [52.185, -10.218],
        [52.182, -10.268], [52.158, -10.295], [52.125, -10.282],
      ])], { name: 'Dingle Peninsula — Coastal ICZM Zone', designation: 'Wild Atlantic Way / ICZM', policy: '1km coastal turbine setback', authority: 'Kerry Co. Council / DHLGH' }),
      // Causeway Coast AONB coastal buffer — Co. Antrim
      poly(ID.coastal, [ring([
        [55.188, -6.518], [55.215, -6.480], [55.242, -6.492],
        [55.238, -6.538], [55.215, -6.560], [55.182, -6.548],
      ])], { name: 'Causeway Coast AONB — Coastal Buffer Zone', designation: 'AONB / SSSI', policy: 'No turbines within coastal AONB buffer', authority: 'DAERA NI / National Trust' }),
      // Copper Coast UNESCO Geopark — Waterford
      poly(ID.coastal, [ring([
        [52.092, -7.582], [52.115, -7.558], [52.135, -7.568],
        [52.130, -7.602], [52.112, -7.618], [52.088, -7.608],
      ])], { name: 'Copper Coast UNESCO Global Geopark', designation: 'UNESCO Global Geopark', policy: 'No industrial wind development within Geopark zone', authority: 'Waterford Co. Council / UNESCO' }),
    ],
  };

  // ── Turbine Layer ─────────────────────────────────────────────────────────
  const turbineLayer = {
    id: ID.turbine, name: 'Turbines', type: 'turbine', visible: true,
    color: '#10b981', fillOpacity: 0.8, strokeOpacity: 0.9, strokeWeight: 2, schema: [],
    features: turbinePositions.map(t => point(ID.turbine, t.lat, t.lng, {
      name: t.name, turbine_type_id: TURBINE_TYPE_ID, hub_height: TURBINE_HUB,
      rotor_diameter: TURBINE_ROTOR, rated_power_mw: TURBINE_MW,
      elevation_m: Math.round(200 + Math.random() * 80),
      wind_speed_ms: t.wind_speed_ms, hub_wind_speed: t.hub_wind_speed, aep_mwh: t.aep_mwh,
    })),
  };

  // ── Substations ───────────────────────────────────────────────────────────
  const onSiteSubId = uuid();
  const esbSubId = uuid();
  const substationLayer = {
    id: ID.substation, name: 'Substations', type: 'substation', visible: true,
    color: '#facc15', fillOpacity: 1, strokeOpacity: 1, strokeWeight: 2, schema: [],
    features: [
      { id: onSiteSubId, layerId: ID.substation, geometry: { type: 'Point', coordinates: [ONSITE_SUB_LNG, ONSITE_SUB_LAT] },
        properties: { name: 'Ballycraggan On-Site 33/0.69kV', transformer_mva: 60, capacity_generation_mw: 50.4, capacity_demand_mw: 5, notes: '2× 30MVA transformers (N+1).' } },
      { id: esbSubId, layerId: ID.substation, geometry: { type: 'Point', coordinates: [SUB_LNG, SUB_LAT] },
        properties: { name: 'ESB Maam Cross 110/38kV Grid Substation', transformer_mva: 120, capacity_generation_mw: 100, capacity_demand_mw: 80, notes: 'Point of Connection. Export capacity 50.4MW.' } },
    ],
  };

  // ── Cables ────────────────────────────────────────────────────────────────
  const tPos = {}; turbinePositions.forEach(t => { tPos[t.name] = t; });
  const tFeats = {}; turbineLayer.features.forEach(f => { tFeats[f.properties.name] = f; });
  const cableFeatures = [];

  [['T01','T02'],['T02','T03'],['T03','T04']].forEach(([from, to]) => {
    const a = tPos[from], b = tPos[to]; const pts = [[a.lat, a.lng], [b.lat, b.lng]];
    cableFeatures.push(makeFeature(ID.cable, { type: 'LineString', coordinates: pts.map(([lat, lng]) => [lng, lat]) }, { name: `${from}→${to} (String A)`, cable_type_id: 'mv33-240', length_m: +segLen(pts).toFixed(0), start_node: { type: 'turbine', id: tFeats[from].id }, end_node: { type: 'turbine', id: tFeats[to].id } }));
  });
  { const a = tPos['T04']; const pts = [[a.lat, a.lng], [ONSITE_SUB_LAT, ONSITE_SUB_LNG]];
    cableFeatures.push(makeFeature(ID.cable, { type: 'LineString', coordinates: pts.map(([lat, lng]) => [lng, lat]) }, { name: 'T04→On-Site Sub (String A)', cable_type_id: 'mv33-240', length_m: +segLen(pts).toFixed(0), start_node: { type: 'turbine', id: tFeats['T04'].id }, end_node: { type: 'substation', id: onSiteSubId } })); }

  [['T05','T06'],['T06','T07'],['T07','T08']].forEach(([from, to]) => {
    const a = tPos[from], b = tPos[to]; const pts = [[a.lat, a.lng], [b.lat, b.lng]];
    cableFeatures.push(makeFeature(ID.cable, { type: 'LineString', coordinates: pts.map(([lat, lng]) => [lng, lat]) }, { name: `${from}→${to} (String B)`, cable_type_id: 'mv33-240', length_m: +segLen(pts).toFixed(0), start_node: { type: 'turbine', id: tFeats[from].id }, end_node: { type: 'turbine', id: tFeats[to].id } }));
  });
  { const a = tPos['T08']; const pts = [[a.lat, a.lng], [ONSITE_SUB_LAT, ONSITE_SUB_LNG]];
    cableFeatures.push(makeFeature(ID.cable, { type: 'LineString', coordinates: pts.map(([lat, lng]) => [lng, lat]) }, { name: 'T08→On-Site Sub (String B)', cable_type_id: 'mv33-240', length_m: +segLen(pts).toFixed(0), start_node: { type: 'turbine', id: tFeats['T08'].id }, end_node: { type: 'substation', id: onSiteSubId } })); }

  [['T09','T10'],['T10','T11'],['T11','T12']].forEach(([from, to]) => {
    const a = tPos[from], b = tPos[to]; const pts = [[a.lat, a.lng], [b.lat, b.lng]];
    cableFeatures.push(makeFeature(ID.cable, { type: 'LineString', coordinates: pts.map(([lat, lng]) => [lng, lat]) }, { name: `${from}→${to} (String C)`, cable_type_id: 'mv33-150', length_m: +segLen(pts).toFixed(0), start_node: { type: 'turbine', id: tFeats[from].id }, end_node: { type: 'turbine', id: tFeats[to].id } }));
  });
  { const a = tPos['T12']; const pts = [[a.lat, a.lng], [ONSITE_SUB_LAT, ONSITE_SUB_LNG]];
    cableFeatures.push(makeFeature(ID.cable, { type: 'LineString', coordinates: pts.map(([lat, lng]) => [lng, lat]) }, { name: 'T12→On-Site Sub (String C)', cable_type_id: 'mv33-150', length_m: +segLen(pts).toFixed(0), start_node: { type: 'turbine', id: tFeats['T12'].id }, end_node: { type: 'substation', id: onSiteSubId } })); }
  { const pts = [[ONSITE_SUB_LAT, ONSITE_SUB_LNG],[53.427,-8.750],[53.424,-8.735],[SUB_LAT, SUB_LNG]];
    cableFeatures.push(makeFeature(ID.cable, { type: 'LineString', coordinates: pts.map(([lat, lng]) => [lng, lat]) }, { name: 'Grid Export — On-Site Sub → ESB Maam Cross (132kV OHL)', cable_type_id: 'ol132', length_m: +segLen(pts).toFixed(0), start_node: { type: 'substation', id: onSiteSubId }, end_node: { type: 'substation', id: esbSubId } })); }

  const cableLayer = { id: ID.cable, name: 'Cables', type: 'cable', visible: true, color: '#f97316', fillOpacity: 0.8, strokeOpacity: 0.9, strokeWeight: 2, schema: [], features: cableFeatures };

  const layers = [
    // Background / national layers (render first)
    floodLayer, naturaLayer, nobuildLayer, forestryLayer,
    aviationLayer, radarLayer, heritageLayer, townsLayer,
    uplandLayer, setback500Layer, coastalLayer,
    // Site-level layers
    visualLayer, boundaryLayer, assiLayer, peatLayer,
    exclusionLayer, residentialLayer, accessLayer,
    turbineLayer, cableLayer, substationLayer,
  ];

  return {
    projectName: 'Ballycraggan Wind Farm — Co. Galway',
    center: [53.430, -8.785], zoom: 13, layers, windParams: { k: 2.1, lambda: 9.2 },
  };
}