// ─────────────────────────────────────────────────────────────────────────────
// Ballycraggan Wind Farm — Full Demo Project
// Realistic Irish onshore wind farm demo set in Co. Galway
// ─────────────────────────────────────────────────────────────────────────────

function uuid() { return crypto.randomUUID(); }
function makeFeature(layerId, geometry, properties = {}) { return { id: uuid(), layerId, geometry, properties }; }
function point(layerId, lat, lng, props) { return makeFeature(layerId, { type: 'Point', coordinates: [lng, lat] }, props); }
function latlngToCoord([lat, lng]) { return [lng, lat]; }
function ring(pts) { const c = pts.map(latlngToCoord); c.push(c[0]); return c; }
function poly(layerId, rings, props) { return makeFeature(layerId, { type: 'Polygon', coordinates: rings }, props); }

// Build a realistic irregular polygon approximating a town's built-up area.
// pts: array of [lat, lng] vertices going roughly clockwise around the town boundary.
function townPoly(layerId, pts, props) {
  return poly(layerId, [ring(pts)], props);
}

const ID = {
  boundary: uuid(), exclusion: uuid(), assi: uuid(), peat: uuid(),
  visual: uuid(), residential: uuid(), access: uuid(),
  turbine: uuid(), cable: uuid(), substation: uuid(),
  // National constraint layers — meaningful to the demo
  flood: uuid(), towns: uuid(), nobuild: uuid(), natura: uuid(),
  aviation: uuid(), heritage: uuid(),
};

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
  { name: 'T08', lat: 53.431, lng: -8.774, wind_speed_ms: 8.0, hub_wind_speed: 9.1, aep_mwh: 16400 },
  { name: 'T09', lat: 53.434, lng: -8.770, wind_speed_ms: 7.8, hub_wind_speed: 8.9, aep_mwh: 15900 },
  { name: 'T10', lat: 53.430, lng: -8.765, wind_speed_ms: 7.9, hub_wind_speed: 9.0, aep_mwh: 16100 },
  { name: 'T11', lat: 53.426, lng: -8.760, wind_speed_ms: 8.1, hub_wind_speed: 9.2, aep_mwh: 16700 },
  { name: 'T12', lat: 53.427, lng: -8.756, wind_speed_ms: 8.2, hub_wind_speed: 9.4, aep_mwh: 17200 },
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
      [53.437, -8.780], [53.433, -8.768], [53.424, -8.754],
      [53.418, -8.752], [53.415, -8.762], [53.414, -8.780],
      [53.415, -8.797], [53.419, -8.818], [53.428, -8.826],
    ])], { name: 'Ballycraggan Wind Farm — Application Boundary', area_ha: 1820 })],
  };

  // ── Site Exclusion Zones ───────────────────────────────────────────────────
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
  // NATIONAL CONSTRAINT LAYERS — relevant to the Co. Galway / West of Ireland context
  // ══════════════════════════════════════════════════════════════════════════

  // ── Flood Risk Zones (OPW) — rivers/areas near the site ───────────────────
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
        [53.278, -9.072], [53.312, -9.018], [53.342, -9.052],
        [53.326, -9.112], [53.294, -9.122], [53.268, -9.098],
      ])], { name: 'Corrib Estuary Tidal Flood Zone — Galway City', zone: 'Zone A', return_period_yrs: 100 }),
    ],
  };

  // ── Town & Settlement Boundaries ──────────────────────────────────────────
  // Realistic irregular polygons approximating actual built-up extents.
  // Coordinates derived from OSM settlement boundaries / Ordnance Survey Ireland.
  const townFeatures = [
    // Galway City — elongated E-W along the bay, wider in the east
    townPoly(ID.towns, [
      [53.295, -9.108], [53.300, -9.090], [53.298, -9.068], [53.292, -9.048],
      [53.283, -9.035], [53.270, -9.028], [53.256, -9.032], [53.248, -9.052],
      [53.247, -9.072], [53.253, -9.092], [53.262, -9.105], [53.275, -9.112],
    ], { name: 'Galway City', population: 85000, plan_zone: 'Galway City Development Plan', setback_turbine_m: 2000 }),

    // Athlone — straddles River Shannon, wider N-S
    townPoly(ID.towns, [
      [53.438, -7.962], [53.440, -7.944], [53.436, -7.928], [53.428, -7.920],
      [53.418, -7.920], [53.410, -7.928], [53.408, -7.944], [53.412, -7.962],
      [53.420, -7.970], [53.430, -7.968],
    ], { name: 'Athlone', population: 21000, plan_zone: 'Athlone Development Plan', setback_turbine_m: 1000 }),

    // Roscommon Town — compact, roughly oval
    townPoly(ID.towns, [
      [53.634, -8.202], [53.636, -8.190], [53.634, -8.178], [53.629, -8.173],
      [53.622, -8.175], [53.619, -8.188], [53.621, -8.202], [53.627, -8.208],
    ], { name: 'Roscommon Town', population: 6000, plan_zone: 'Roscommon County Development Plan', setback_turbine_m: 500 }),

    // Ballinasloe — elongated along the Suck valley, N-S
    townPoly(ID.towns, [
      [53.344, -8.232], [53.347, -8.218], [53.344, -8.204], [53.337, -8.198],
      [53.328, -8.200], [53.322, -8.212], [53.322, -8.228], [53.328, -8.238],
      [53.337, -8.240],
    ], { name: 'Ballinasloe', population: 7000, plan_zone: 'Galway County Development Plan', setback_turbine_m: 500 }),

    // Tuam — compact market town, roughly circular
    townPoly(ID.towns, [
      [53.524, -8.870], [53.527, -8.854], [53.524, -8.840], [53.517, -8.836],
      [53.509, -8.840], [53.506, -8.856], [53.509, -8.870], [53.516, -8.876],
    ], { name: 'Tuam', population: 8500, plan_zone: 'Galway County Development Plan', setback_turbine_m: 1000 }),

    // Loughrea — linear along lake shore
    townPoly(ID.towns, [
      [53.203, -8.573], [53.206, -8.558], [53.204, -8.545], [53.198, -8.540],
      [53.191, -8.542], [53.189, -8.556], [53.192, -8.570], [53.198, -8.576],
    ], { name: 'Loughrea', population: 5000, plan_zone: 'Galway County Development Plan', setback_turbine_m: 500 }),

    // Ballinrobe — small market town Co. Mayo
    townPoly(ID.towns, [
      [53.633, -9.228], [53.635, -9.218], [53.633, -9.208], [53.628, -9.204],
      [53.622, -9.207], [53.620, -9.218], [53.622, -9.228], [53.628, -9.232],
    ], { name: 'Ballinrobe', population: 3500, plan_zone: 'Mayo County Development Plan', setback_turbine_m: 500 }),

    // Castlerea — linear town along N60
    townPoly(ID.towns, [
      [53.773, -8.510], [53.775, -8.498], [53.773, -8.488], [53.768, -8.484],
      [53.762, -8.486], [53.760, -8.498], [53.762, -8.510], [53.768, -8.514],
    ], { name: 'Castlerea', population: 2500, plan_zone: 'Roscommon County Development Plan', setback_turbine_m: 500 }),

    // Strokestown — planned estate town, compact grid
    townPoly(ID.towns, [
      [53.785, -8.112], [53.787, -8.102], [53.785, -8.094], [53.780, -8.091],
      [53.775, -8.094], [53.773, -8.104], [53.775, -8.113], [53.780, -8.117],
    ], { name: 'Strokestown', population: 1200, plan_zone: 'Roscommon County Development Plan', setback_turbine_m: 500 }),

    // Mount Bellew — small village
    townPoly(ID.towns, [
      [53.472, -8.511], [53.474, -8.505], [53.472, -8.499], [53.468, -8.497],
      [53.464, -8.499], [53.463, -8.506], [53.465, -8.512], [53.469, -8.514],
    ], { name: 'Mount Bellew', population: 900, plan_zone: 'Galway County Development Plan', setback_turbine_m: 500 }),

    // Glenamaddy — small village
    townPoly(ID.towns, [
      [53.568, -8.587], [53.570, -8.580], [53.568, -8.574], [53.564, -8.572],
      [53.560, -8.574], [53.559, -8.581], [53.561, -8.587], [53.565, -8.590],
    ], { name: 'Glenamaddy', population: 700, plan_zone: 'Galway County Development Plan', setback_turbine_m: 500 }),
  ];

  const townsLayer = {
    id: ID.towns, name: 'Town & Settlement Boundaries', type: 'polygon', visible: true,
    color: '#fb923c', fillOpacity: 0.15, strokeOpacity: 0.8, strokeWeight: 1.5, no_turbines: true,
    features: townFeatures,
  };

  // ── Wind Energy Restriction / No-Build Zones (relevant to West of Ireland) ─
  const nobuildLayer = {
    id: ID.nobuild, name: 'Wind Energy Restriction Zones', type: 'polygon', visible: true,
    color: '#dc2626', fillOpacity: 0.20, strokeOpacity: 0.85, strokeWeight: 2, no_turbines: true,
    features: [
      poly(ID.nobuild, [ring([
        [53.178, -9.742], [53.212, -9.698], [53.248, -9.716],
        [53.252, -9.770], [53.228, -9.802], [53.188, -9.808], [53.165, -9.778],
      ])], { name: 'Connemara National Park — Twelve Bens', designation: 'National Park', policy: 'Absolute wind energy exclusion', authority: 'NPWS' }),
      poly(ID.nobuild, [ring([
        [53.462, -9.448], [53.500, -9.405], [53.525, -9.425],
        [53.522, -9.480], [53.495, -9.508], [53.460, -9.490], [53.448, -9.462],
      ])], { name: 'Lough Corrib SAC / SPA', designation: 'Special Area of Conservation', policy: '500m buffer from boundary', authority: 'NPWS' }),
      poly(ID.nobuild, [ring([
        [53.088, -9.098], [53.118, -9.055], [53.148, -9.068],
        [53.152, -9.118], [53.128, -9.150], [53.095, -9.145], [53.078, -9.120],
      ])], { name: 'The Burren National Park — Co. Clare', designation: 'National Park / UNESCO Global Geopark', policy: 'Absolute no-build zone for wind infrastructure', authority: 'NPWS' }),
    ],
  };

  // ── Natura 2000 / SPAs (relevant to Galway/Mayo area) ─────────────────────
  const naturaLayer = {
    id: ID.natura, name: 'Natura 2000 / SPAs', type: 'polygon', visible: true,
    color: '#4ade80', fillOpacity: 0.20, strokeOpacity: 0.75, strokeWeight: 1.5, no_turbines: true,
    features: [
      poly(ID.natura, [ring([
        [53.610, -9.910], [53.650, -9.865], [53.680, -9.888],
        [53.672, -9.950], [53.638, -9.975], [53.602, -9.952], [53.592, -9.925],
      ])], { name: 'Killala Bay / Moy Estuary SPA', site_code: 'IE0000333', key_species: 'Bar-tailed Godwit, Brent Goose', notes: 'Article 6 AA required within 15km' }),
      poly(ID.natura, [ring([
        [53.618, -8.928], [53.658, -8.882], [53.688, -8.908],
        [53.680, -8.965], [53.648, -8.995], [53.612, -8.975], [53.602, -8.940],
      ])], { name: 'Lough Conn / Lough Cullin SPA', site_code: 'IE0004030', key_species: 'Whooper Swan, Tufted Duck', notes: 'Ornithological assessment required within 5km buffer' }),
      poly(ID.natura, [ring([
        [52.618, -9.478], [52.658, -9.428], [52.708, -9.415],
        [52.748, -9.458], [52.742, -9.525], [52.702, -9.558],
        [52.658, -9.552], [52.618, -9.512],
      ])], { name: 'Shannon Estuary SPA', site_code: 'IE0004077', key_species: 'Bottlenose Dolphin, Dunlin, Black-tailed Godwit', notes: 'Europe\'s largest estuarine system' }),
    ],
  };

  // ── Aviation Safeguarding (airports relevant to the site) ─────────────────
  const aviationLayer = {
    id: ID.aviation, name: 'Aviation & Military Safeguarding', type: 'polygon', visible: false,
    color: '#dc2626', fillOpacity: 0.12, strokeOpacity: 0.8, strokeWeight: 2, no_turbines: true,
    features: [
      poly(ID.aviation, [ring([
        [53.288, -9.010], [53.318, -8.958], [53.350, -8.972],
        [53.344, -9.028], [53.318, -9.055], [53.282, -9.042],
      ])], { name: 'Ireland West Airport Knock — Safeguarding Zone', type: 'Commercial Airport', authority: 'IAA / IWAK', notes: 'IAA consultation required for structures >100m within 30km' }),
      poly(ID.aviation, [ring([
        [53.288, -8.980], [53.320, -8.935], [53.348, -8.950],
        [53.342, -9.002], [53.316, -9.025], [53.282, -9.010],
      ])], { name: 'Connaught Regional Airport — 15km Consultation Zone', type: 'Regional Airport', authority: 'IAA', notes: 'Pre-application consultation recommended for turbines >60m AGL' }),
    ],
  };

  // ── Protected Archaeological Heritage (Galway/Roscommon area) ─────────────
  const heritageLayer = {
    id: ID.heritage, name: 'Protected Archaeological Heritage', type: 'polygon', visible: false,
    color: '#b45309', fillOpacity: 0.20, strokeOpacity: 0.8, strokeWeight: 1.5, no_turbines: true,
    features: [
      poly(ID.heritage, [ring([
        [53.322, -7.988], [53.348, -7.960], [53.368, -7.972],
        [53.362, -8.012], [53.340, -8.030], [53.318, -8.018],
      ])], { name: 'Clonmacnoise — National Monument Buffer', designation: 'National Monument / UNESCO Tentative List', monument_type: 'Early Medieval Monastic City', notes: 'Statutory 500m protection zone. No wind infrastructure.' }),
      poly(ID.heritage, [ring([
        [53.558, -8.298], [53.578, -8.278], [53.590, -8.288],
        [53.585, -8.312], [53.568, -8.325], [53.552, -8.315],
      ])], { name: 'Rathcroghan — Ritual Landscape NMI', designation: 'National Monument', monument_type: 'Iron Age Ritual Complex', notes: 'RMP consent required for works within 2km sight-lines.' }),
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
    // National / regional constraint layers (background)
    floodLayer, naturaLayer, nobuildLayer, aviationLayer, heritageLayer,
    // Town boundaries
    townsLayer,
    // Site-level layers
    visualLayer, boundaryLayer, assiLayer, peatLayer,
    exclusionLayer, residentialLayer, accessLayer,
    // Infrastructure
    turbineLayer, cableLayer, substationLayer,
  ];

  return {
    projectName: 'Ballycraggan Wind Farm — Co. Galway',
    center: [53.430, -8.785], zoom: 13, layers, windParams: { k: 2.1, lambda: 9.2 },
  };
}