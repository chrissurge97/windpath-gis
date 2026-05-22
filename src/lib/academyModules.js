/**
 * WindPath Academy — Full module definitions
 * Each module has steps with validators, hints, and rich content
 */

import { createLayer, createFeature } from '@/lib/gisUtils';
import { DEFAULT_TURBINE_TYPES, DEFAULT_CABLE_TYPES } from '@/lib/turbineTypes';

export const GLENHAVEN_CENTER = [53.7245, -8.4532]; // Co. Roscommon upland ridge
const [LAT, LNG] = GLENHAVEN_CENTER;

// ── Checkpoint project builders ──────────────────────────────────────────────

export function buildGlenhavenBlank() {
  return {
    name: 'Glenhaven Wind Farm — Training',
    turbineTypes: DEFAULT_TURBINE_TYPES,
    cableTypes: DEFAULT_CABLE_TYPES,
    windParams: { k: 2.1, lambda: 8.5 },
    layers: [
      createLayer({ name: 'Site Boundary', type: 'polygon', color: '#06b6d4', fillOpacity: 0.1 }),
      createLayer({ name: 'Turbines', type: 'turbine', color: '#10b981', fillOpacity: 0.8 }),
      createLayer({ name: 'Cables', type: 'cable', color: '#f97316', fillOpacity: 0.8 }),
      createLayer({ name: 'Substations', type: 'substation', color: '#facc15', fillOpacity: 1 }),
    ],
  };
}

function makePoly(layerId, coords, name, notes = '') {
  return createFeature(layerId, { type: 'Polygon', coordinates: [coords] }, { name, notes });
}

export function buildGlenhavenBoundaryOnly() {
  const proj = buildGlenhavenBlank();
  const bl = proj.layers[0];
  // ~5km × 4km irregular polygon
  const ring = [
    [LNG - 0.06, LAT - 0.03], [LNG - 0.05, LAT + 0.02],
    [LNG - 0.01, LAT + 0.04], [LNG + 0.03, LAT + 0.035],
    [LNG + 0.055, LAT + 0.01], [LNG + 0.05, LAT - 0.025],
    [LNG + 0.02, LAT - 0.045], [LNG - 0.02, LAT - 0.04],
    [LNG - 0.06, LAT - 0.03],
  ];
  bl.features.push(makePoly(bl.id, ring, 'Glenhaven Gross Site Boundary', 'Gross area ~18km². Upland grassland and bog.'));
  return proj;
}

export function buildGlenhavenWithConstraints() {
  const proj = buildGlenhavenBoundaryOnly();
  
  const hardLayer = createLayer({ name: 'Hard Exclusions', type: 'polygon', color: '#ef4444', fillOpacity: 0.25, no_turbines: true });
  const softLayer = createLayer({ name: 'Soft Constraints', type: 'polygon', color: '#f97316', fillOpacity: 0.15 });
  const leasedLayer = createLayer({ name: 'Leased Land', type: 'polygon', color: '#10b981', fillOpacity: 0.15 });

  // Residential buffer SW
  const resRing = [ [LNG-0.05,LAT-0.025],[LNG-0.045,LAT-0.01],[LNG-0.03,LAT-0.005],[LNG-0.025,LAT-0.02],[LNG-0.04,LAT-0.03],[LNG-0.05,LAT-0.025] ];
  hardLayer.features.push(makePoly(hardLayer.id, resRing, 'Glenhaven Village — 500m Buffer', 'Residential setback. No-turbine zone. ETSU-R-97 noise assessment required.'));
  
  // Peat habitat NE
  const peatRing = [ [LNG+0.01,LAT+0.02],[LNG+0.02,LAT+0.03],[LNG+0.04,LAT+0.03],[LNG+0.045,LAT+0.015],[LNG+0.03,LAT+0.01],[LNG+0.01,LAT+0.02] ];
  hardLayer.features.push(makePoly(hardLayer.id, peatRing, 'Active Blanket Bog SAC', 'Natura 2000 SAC. Absolute no-turbine constraint.'));

  // Watercourse buffer
  const waterRing = [ [LNG-0.01,LAT+0.01],[LNG+0.005,LAT+0.02],[LNG+0.01,LAT+0.015],[LNG+0.0,LAT+0.005],[LNG-0.01,LAT+0.01] ];
  softLayer.features.push(makePoly(softLayer.id, waterRing, 'Watercourse 50m Buffer', 'Drainage buffer. Turbines require >50m from watercourse.'));

  // Leased land
  const leasedRing = [ [LNG-0.025,LAT-0.005],[LNG-0.01,LAT+0.0],[LNG+0.005,LAT-0.005],[LNG+0.0,LAT-0.02],[LNG-0.02,LAT-0.02],[LNG-0.025,LAT-0.005] ];
  leasedLayer.features.push(makePoly(leasedLayer.id, leasedRing, 'Glenhaven Farm A — Signed Lease', 'Annual lease signed. 25-year term. Landowner: Murphy Family.'));

  proj.layers.push(hardLayer);
  proj.layers.push(softLayer);
  proj.layers.push(leasedLayer);
  return proj;
}

export function buildGlenhavenConflictExample() {
  const proj = buildGlenhavenWithConstraints();
  const tl = proj.layers.find(l => l.type === 'turbine');
  const hardLayer = proj.layers.find(l => l.name === 'Hard Exclusions');
  
  // Place turbines - one deliberately inside a constraint
  const positions = [
    { dlat: -0.015, dlng: -0.01, name: 'T01' },
    { dlat: -0.005, dlng:  0.01, name: 'T02' },
    { dlat:  0.01,  dlng:  0.0,  name: 'T03' },
    { dlat:  0.015, dlng: -0.015,name: 'T04' },
    // T05 deliberately inside residential buffer
    { dlat: -0.018, dlng: -0.037,name: 'T05 ⚠' },
    { dlat:  0.005, dlng:  0.025, name: 'T06' },
  ];
  
  const tt = DEFAULT_TURBINE_TYPES[0];
  positions.forEach(({ dlat, dlng, name }) => {
    tl.features.push(createFeature(tl.id,
      { type: 'Point', coordinates: [LNG + dlng, LAT + dlat] },
      { name, turbine_type_id: tt.id, rated_power_mw: tt.rated_power_mw, hub_height: tt.hub_height_m, rotor_diameter: tt.rotor_diameter_m }
    ));
  });
  return proj;
}

export function buildGlenhavenCableChallenge() {
  const proj = buildGlenhavenWithConstraints();
  const tl = proj.layers.find(l => l.type === 'turbine');
  const subLayer = proj.layers.find(l => l.type === 'substation');
  const tt = DEFAULT_TURBINE_TYPES[0];

  const turbinePositions = [
    [-0.018, -0.01], [-0.008, 0.008], [0.005, 0.005],
    [0.012, -0.01],  [-0.005, -0.018], [0.015, 0.015],
    [-0.015, 0.015],
  ];
  turbinePositions.forEach(([dlat, dlng], i) => {
    tl.features.push(createFeature(tl.id,
      { type: 'Point', coordinates: [LNG + dlng, LAT + dlat] },
      { name: `T0${i + 1}`, turbine_type_id: tt.id, rated_power_mw: tt.rated_power_mw, hub_height: tt.hub_height_m, rotor_diameter: tt.rotor_diameter_m, hub_wind_speed: 8.2 + Math.random() }
    ));
  });

  subLayer.features.push(createFeature(subLayer.id,
    { type: 'Point', coordinates: [LNG + 0.002, LAT - 0.005] },
    { name: 'Glenhaven 33/132kV Collection Substation', transformer_mva: 60, capacity_generation_mw: 35, capacity_demand_mw: 10, notes: 'Central location. Grid connection point 3.2km NW.' }
  ));

  return proj;
}

export function buildGlenhavenFinalChallenge() {
  const proj = buildGlenhavenWithConstraints();
  return { ...proj, name: 'Glenhaven — Final Design Challenge Starter' };
}

// Save a checkpoint to localStorage so it can be opened from the planner
export function saveCheckpoint(key, projectData) {
  const id = `academy_checkpoint_${key}`;
  const full = { ...projectData, id };
  localStorage.setItem(`planning_project_${id}`, JSON.stringify(full));
  // Register in index
  let index = [];
  try { index = JSON.parse(localStorage.getItem('planning_projects_index') || '[]'); } catch {}
  const existing = index.find(p => p.id === id);
  if (!existing) {
    index.push({ id, name: full.name, createdAt: Date.now(), updatedAt: Date.now() });
    localStorage.setItem('planning_projects_index', JSON.stringify(index));
  }
  return id;
}

// ── Academy module definitions ───────────────────────────────────────────────

export const ACADEMY_MODULE_CONTENT = {

  bootcamp: {
    id: 'bootcamp',
    title: 'Module 1 — Interface Bootcamp',
    subtitle: 'Mission Control Systems Check',
    story: `You've just joined GreenVolt Energy as a junior wind development analyst. Your first job: get familiar with the WindPath GIS planning tool before Monday's site review meeting.

Think of this as activating mission control — every system needs to be checked before the real work begins.`,
    objective: 'Learn every panel, button, and mode in the tool through hands-on exploration.',
    color: 'cyan',
    icon: '🖥️',
    checkpointKey: 'blank',
    steps: [
      {
        id: 'select_mode',
        title: '🖱️ System Check: Select Mode',
        story: 'Every astronaut checks their systems before launch. Start with the fundamentals — Select mode is your default operating state.',
        goal: 'Activate Select mode in the toolbar.',
        tasks: [{ id: 'select', label: 'Click the Select button in the toolbar', watch: 'mode', value: 'select', required: true }],
        why: 'Select mode lets you click features to inspect, rename, or delete them. It also allows dragging turbines and substations.',
        hint: 'The Select button has a cursor arrow icon. It\'s in the top toolbar.',
        stuckHelp: 'Look at the top toolbar — it\'s the first button after the File menu, showing a mouse cursor icon.',
      },
      {
        id: 'pan_mode',
        title: '🗺️ System Check: Pan Mode',
        story: 'Good. Select online. Now test navigation — Pan mode lets you fly over the site without accidentally moving features.',
        goal: 'Activate Pan mode.',
        tasks: [{ id: 'pan', label: 'Activate Pan mode', watch: 'mode', value: 'pan', required: true }],
        why: 'Pan mode is safe for map navigation during presentations — nothing gets accidentally moved.',
        hint: 'The Pan button has a compass/hand icon, next to Select.',
      },
      {
        id: 'draw_tools',
        title: '✏️ System Check: Draw Tools',
        story: 'Drawing tools are the core of layout design. The Draw Tools menu contains 5 modes — let\'s fire them up.',
        goal: 'Open Draw Tools and activate Polygon mode.',
        tasks: [
          { id: 'polygon_mode', label: 'Activate Polygon drawing mode', watch: 'mode', value: 'draw_polygon', required: true },
        ],
        why: 'Draw Tools contains: Polygon, Place Turbine, Draw Cable, Substation, and Place Text.',
        hint: 'Click the "Draw Tools" dropdown button in the toolbar — it shows the last active draw tool.',
      },
      {
        id: 'tabs_check',
        title: '📊 System Check: Right Panel Tabs',
        story: 'The right panel is your analysis dashboard. Let\'s verify all tabs are responding.',
        goal: 'Click through the Turbines, Cables, and Analysis tabs.',
        tasks: [
          { id: 'tab_turbines', label: 'Open the Turbines tab', watch: 'tab', value: 'turbines', required: true },
          { id: 'tab_cables', label: 'Open the Cables tab', watch: 'tab', value: 'cables', required: true },
          { id: 'tab_analysis', label: 'Open the Analysis tab', watch: 'tab', value: 'analysis', required: true },
          { id: 'tab_layers', label: 'Open the Layers tab', watch: 'tab', value: 'layers', required: false },
        ],
        why: 'Each tab provides different project data. You\'ll use all of them throughout a real design.',
        hint: 'The tabs are at the top of the right panel — look for Turbines, Cables, Analysis, Layers.',
      },
      {
        id: 'basemap_check',
        title: '🛰️ System Check: Basemaps',
        story: 'Satellite imagery is essential for terrain assessment. Roads helps with infrastructure routing. Dark is best for presentations.',
        goal: 'Switch to Satellite view, then back to Dark.',
        tasks: [
          { id: 'satellite', label: 'Switch to Satellite basemap', watch: 'basemap', value: 'satellite', required: true },
          { id: 'dark_back', label: 'Switch back to Dark basemap', watch: 'basemap', value: 'dark', required: true },
        ],
        why: 'Satellite view reveals terrain and land use — critical for siting decisions.',
        hint: 'The basemap selector is in the top-right corner of the map — click the "Dark/Satellite/Roads" dropdown.',
      },
      {
        id: 'save_check',
        title: '💾 System Check: File Operations',
        story: 'Before the meeting, make sure the save system is online. Auto-save keeps your work safe, but a manual save is good practice.',
        goal: 'Open the File menu and navigate the options.',
        tasks: [
          { id: 'file_menu', label: 'Open the File menu (top-left toolbar)', watch: 'event', value: 'file_menu_opened', required: true },
        ],
        why: 'The File menu contains New, Save, Open, and Import Project. Auto-save runs every 1.5 seconds when data changes.',
        hint: 'Click the "File" button (📄 icon) at the far left of the toolbar.',
      },
    ],
    successMessage: '🎉 All systems online! Interface Bootcamp complete. You know every control — now let\'s design something.',
    badge: 'first_steps',
    xp: 100,
  },

  polygons: {
    id: 'polygons',
    title: 'Module 2 — Polygons & Exclusion Zones',
    subtitle: 'Glenhaven Site Boundary & Constraint Mapping',
    story: `You've received the first task from your senior analyst: "Get the Glenhaven site mapped before Thursday. We need boundary, leased land, and the key exclusions on the map."

You're working with data from the planning team — your job is to get it into the GIS tool correctly.`,
    objective: 'Draw and manage planning layers for the Glenhaven Wind Farm.',
    color: 'green',
    icon: '🗺️',
    checkpointKey: 'blank',
    steps: [
      {
        id: 'draw_boundary',
        title: '📍 Draw the Site Boundary',
        story: 'Every wind farm starts with a gross site boundary. This defines the area under investigation — not just turbine positions, but all the land the project team is looking at.',
        goal: 'Draw a polygon with at least 5 vertices as the gross site boundary.',
        tasks: [
          { id: 'polygon_mode', label: 'Activate Polygon mode', watch: 'mode', value: 'draw_polygon', required: true },
          { id: 'polygon_drawn', label: 'Draw a polygon with 5+ vertices', watch: 'polygonCount', minValue: 1, required: true },
        ],
        mapCenter: GLENHAVEN_CENTER,
        mapZoom: 12,
        why: 'The gross site boundary defines your search area. It\'s typically drawn based on land option agreements and initial feasibility.',
        hint: 'Click "Draw Tools → Polygon" then click 5+ points on the map. Double-click or click "Finish" to close it.',
        stuckHelp: 'Click the "Draw Tools" dropdown → select "Polygon" → click at least 5 points on the map → click the "Finish" button in the toolbar.',
      },
      {
        id: 'name_boundary',
        title: '✏️ Name the Site Boundary',
        story: 'A polygon without a name is useless in a planning document. Your analyst says: "Every feature needs a name and notes before it goes to the client."',
        goal: 'Click the polygon in Select mode and name it "Glenhaven Gross Site Boundary".',
        tasks: [
          { id: 'select_mode', label: 'Switch to Select mode', watch: 'mode', value: 'select', required: true },
          { id: 'polygon_named', label: 'Name the polygon (click it to open menu)', watch: 'event', value: 'polygon_named', required: true },
        ],
        why: 'Consistent naming is essential — solicitors, planners, and consultants all reference layers by name.',
        hint: 'Switch to Select mode, click your polygon, then fill in the Name field and click Apply.',
      },
      {
        id: 'create_layers',
        title: '📂 Create Planning Layers',
        story: 'The planning team has sent you three data categories: leased land, negotiations, and hard exclusions. Each needs its own colour-coded layer.',
        goal: 'Create three new layers: "Leased Land", "Negotiating Land", and "Hard Exclusions".',
        tasks: [
          { id: 'layers_tab', label: 'Open the Layers tab', watch: 'tab', value: 'layers', required: true },
          { id: 'layer_leased', label: 'Create a layer named "Leased Land"', watch: 'layerExists', value: 'Leased Land', required: true },
          { id: 'layer_negotiating', label: 'Create a layer named "Negotiating Land"', watch: 'layerExists', value: 'Negotiating Land', required: true },
          { id: 'layer_exclusions', label: 'Create a layer named "Hard Exclusions"', watch: 'layerExists', value: 'Hard Exclusions', required: true },
        ],
        why: 'Professional projects separate data into meaningful layers — it makes the map readable and the data auditable.',
        hint: 'In the Layers tab, click "+ Add Zone" to create new layers. Create at least 3 in addition to the default Site Boundary.',
        stuckHelp: 'Open the Layers tab (right panel) → click the green "+ Add Zone" button at the bottom → type the layer name.',
      },
      {
        id: 'draw_exclusion',
        title: '🚫 Map the Hard Exclusion Zone',
        story: 'The ecology report came back: there\'s a 500m residential buffer in the southwest and a blanket bog SAC in the northeast. Both are hard no-turbine zones.',
        goal: 'Draw at least one polygon in the "Hard Exclusions" layer and mark it as No-Turbine Zone.',
        tasks: [
          { id: 'select_hard_layer', label: 'Select the Hard Exclusions layer', watch: 'layerSelected', value: 'Hard Exclusions', required: true },
          { id: 'exclusion_drawn', label: 'Draw an exclusion polygon', watch: 'polygonCount', minValue: 2, required: true },
          { id: 'no_turbine_set', label: 'Set at least one polygon as No-Turbine Zone', watch: 'noTurbineZoneCount', minValue: 1, required: true },
        ],
        why: 'No-Turbine Zone blocks turbine placement — try placing a turbine inside one to see the red warning.',
        hint: 'Select a layer → draw a polygon → switch to Select mode → click the polygon → tick "No-Turbine Zone" → Apply.',
        coachTip: '💡 Coach Tip: Red = hard exclusion (SAC, residential buffer). Orange = soft constraint (AONB, PRoW). These colour conventions are industry standard.',
      },
      {
        id: 'toggle_visibility',
        title: '👁️ Control Layer Visibility',
        story: 'Your manager wants to see just the exclusion zones for a stakeholder meeting. Toggle layers to create a "constraints view".',
        goal: 'Toggle at least one layer off then back on.',
        tasks: [
          { id: 'layer_toggled', label: 'Toggle a layer visibility off', watch: 'event', value: 'layer_visibility_toggled', required: true },
        ],
        why: 'Layer visibility control is essential for presentations — show the audience only what they need to see.',
        hint: 'In the Layers tab, click the eye icon (👁) next to any layer name to toggle it.',
      },
    ],
    successMessage: '✅ Site mapping complete! The Glenhaven boundary and exclusion zones are on the map. Ready for turbine placement.',
    badge: 'polygon_master',
    xp: 150,
  },

  importing: {
    id: 'importing',
    title: 'Module 3 — Importing Project Data',
    subtitle: 'The Glenhaven Data Room',
    story: `The GIS consultant has sent over the Glenhaven data files. Your job: get them into the tool, classified correctly, and verify the feature counts match the brief.

"Think of it like a data room audit," your senior says. "If the feature count is wrong, the file is wrong."`,
    objective: 'Download training files and import them correctly into the planner.',
    color: 'blue',
    icon: '📂',
    checkpointKey: 'blank',
    hasDownloads: true,
    steps: [
      {
        id: 'download_boundary',
        title: '📥 Download Site Boundary File',
        story: 'The consultant has provided a GeoJSON of the Glenhaven gross site boundary. Download it, then import it into the Planning tool.',
        goal: 'Download and import the Glenhaven site boundary GeoJSON.',
        tasks: [
          { id: 'downloaded_boundary', label: 'Download glenhaven-site-boundary.geojson', watch: 'download', value: 'glenhaven-site-boundary', required: true },
          { id: 'imported_boundary', label: 'Import the file into the Planning tool', watch: 'event', value: 'import_completed', required: true },
        ],
        why: 'Real GIS workflows involve importing external data — from planning portals, consultants, or OSi/EPA.',
        hint: 'Click the Download button below, then click Import in the Planning toolbar and select the downloaded file.',
        downloadFile: 'glenhaven-site-boundary',
      },
      {
        id: 'download_exclusions',
        title: '📥 Download Exclusion Zones',
        story: 'Now bring in the hard constraints. The file contains 4 exclusion polygons — check the count after import to verify.',
        goal: 'Download and import the exclusion zones file.',
        tasks: [
          { id: 'downloaded_exclusions', label: 'Download glenhaven-exclusion-zones.geojson', watch: 'download', value: 'glenhaven-exclusion-zones', required: true },
          { id: 'imported_exclusions', label: 'Import exclusions (should add ~4 polygons)', watch: 'polygonCount', minValue: 2, required: true },
        ],
        downloadFile: 'glenhaven-exclusion-zones',
        why: 'Feature count verification is part of a GIS data audit — if you get 3 polygons instead of 4, the file is incomplete.',
        hint: 'After import, expand the imported layer in the Layers tab to count the features.',
      },
      {
        id: 'download_parcels',
        title: '📦 Download Land Parcels',
        story: 'The land acquisition team has supplied parcel data. Import it and classify the layer correctly.',
        goal: 'Download and import the land parcels GeoJSON.',
        tasks: [
          { id: 'downloaded_parcels', label: 'Download glenhaven-land-parcels.geojson', watch: 'download', value: 'glenhaven-land-parcels', required: true },
          { id: 'imported_parcels', label: 'Import the parcels file', watch: 'event', value: 'import_completed', required: true },
        ],
        downloadFile: 'glenhaven-land-parcels',
        why: 'Land parcel data comes from the Land Registry, OSi datasets, or client-supplied mapping.',
      },
      {
        id: 'download_turbines',
        title: '🌀 Download Turbine Candidates CSV',
        story: 'Your colleague has identified 7 candidate turbine positions based on the terrain analysis. They\'re in a CSV. Import them as point features.',
        goal: 'Download the turbine candidates CSV and import it.',
        tasks: [
          { id: 'downloaded_csv', label: 'Download glenhaven-turbine-candidates.csv', watch: 'download', value: 'glenhaven-turbine-candidates', required: true },
          { id: 'imported_csv', label: 'Import the CSV file', watch: 'event', value: 'import_completed', required: true },
        ],
        downloadFile: 'glenhaven-turbine-candidates',
        why: 'CSV turbine candidate files are common in pre-feasibility — engineers do terrain analysis in GIS and export candidate points.',
      },
      {
        id: 'verify_import',
        title: '✅ Verify Your Import',
        story: 'Before signing off, audit what you imported. The Layers tab should now show multiple imported layers with the correct feature counts.',
        goal: 'Open the Layers tab and verify all imported layers appear.',
        tasks: [
          { id: 'layers_tab', label: 'Open the Layers tab', watch: 'tab', value: 'layers', required: true },
          { id: 'multiple_layers', label: 'Verify at least 4 layers exist (including imported ones)', watch: 'totalLayerCount', minValue: 5, required: true },
        ],
        why: 'A GIS data audit confirms that every file imported successfully and has the expected feature counts.',
        hint: 'Open the Layers tab and expand each layer to see how many features were imported.',
      },
    ],
    successMessage: '📂 Data room cleared! All Glenhaven files imported and verified. The project is ready for turbine placement.',
    badge: 'data_officer',
    xp: 150,
  },

  turbines: {
    id: 'turbines',
    title: 'Module 4 — Turbines & Setback Zones',
    subtitle: 'Glenhaven Turbine Layout',
    story: `The site team has confirmed the land and constraints. Now it's your job to place the turbines.

Your brief: "Place 5–7 turbines on the Glenhaven ridge, respecting all exclusion zones. Check your setback radii before finalising."`,
    objective: 'Place turbines correctly, use setback radii, and avoid all constraint violations.',
    color: 'orange',
    icon: '🌀',
    checkpointKey: 'constraints',
    steps: [
      {
        id: 'place_first_turbines',
        title: '📍 Place Your First 3 Turbines',
        story: 'The ridge runs northeast across the site. Start with 3 turbines along the highest ground — check the satellite basemap to find the ridge.',
        goal: 'Place at least 3 turbines on the map, outside any exclusion zones.',
        mapCenter: GLENHAVEN_CENTER,
        mapZoom: 12,
        tasks: [
          { id: 'turbine_mode', label: 'Activate Place Turbine mode', watch: 'mode', value: 'place_turbine', required: true },
          { id: 'turbines_3', label: 'Place at least 3 turbines', watch: 'turbineCount', minValue: 3, required: true },
        ],
        why: 'Wind data fetches automatically for each turbine — watch the toolbar for "Fetching wind data…".',
        hint: 'Switch to Satellite basemap to find elevated ground. Click the Draw Tools dropdown → Place Turbine.',
        stuckHelp: 'Click Draw Tools in the toolbar → select "Place Turbine" → click on the map in the main area (not the panel).',
        coachTip: '🌤️ Each turbine placement fetches real elevation and wind data from Open-Meteo ERA5. It takes 1-2 seconds.',
      },
      {
        id: 'place_more_turbines',
        title: '🌀 Complete the Layout: 5 Turbines',
        story: 'Good start. The brief calls for at least 5 turbines. Extend the string along the ridge, keeping at least 600m spacing.',
        goal: 'Reach at least 5 turbines placed.',
        tasks: [
          { id: 'turbines_5', label: 'Place at least 5 turbines total', watch: 'turbineCount', minValue: 5, required: true },
        ],
        why: 'Turbine spacing should be 4–5× rotor diameter in the prevailing wind direction to minimise wake losses.',
        coachTip: '💡 If you try to place a turbine inside a No-Turbine Zone, you\'ll get a red warning. That\'s the constraint system working correctly.',
      },
      {
        id: 'enable_setbacks',
        title: '📏 Enable Setback Radii',
        story: 'Your planning advisor calls: "Before you share the layout, check the turbine-to-turbine spacing. Industry guidance recommends a minimum of 5D — five times the rotor diameter — between turbines to limit wake losses."',
        goal: 'Enable at least one setback radius in the Turbine Setback Config panel.',
        tasks: [
          { id: 'tab_turbines_2', label: 'Open the Turbines tab', watch: 'tab', value: 'turbines', required: true },
          { id: 'setback_enabled', label: 'Enable a setback radius (toggle one ON)', watch: 'event', value: 'radii_enabled', required: true },
        ],
        why: 'Turbine separation is measured in rotor diameters (D). 5D in the prevailing wind direction and 3D crosswind is a common minimum — for a 150m rotor that\'s 750m and 450m respectively.',
        hint: 'In the Turbines tab, click "Turbine Setback Config" to expand the editor, then toggle the green switch on the 5D radius to enable it.',
        coachTip: '🔴 Enable "Block Placement" on a radius to prevent other turbines being placed inside the separation zone.',
      },
      {
        id: 'rename_turbines',
        title: '✏️ Name Your Turbines T01–T05',
        story: 'The noise consultant needs turbine names for their model. "Turbine 1" isn\'t good enough — they need T01, T02 format.',
        goal: 'Rename at least 3 turbines using T01, T02 naming convention.',
        tasks: [
          { id: 'turbines_renamed', label: 'Rename at least 3 turbines (T01, T02 format)', watch: 'event', value: 'turbine_renamed', minCount: 3, required: true },
        ],
        why: 'Turbine naming conventions (T01–T10) are used consistently across noise, shadow, ecology, and LVIA reports.',
        hint: 'Click a turbine → edit the name field in the popup → click Apply. Or use the pencil icon in the Turbines tab.',
      },
      {
        id: 'move_turbine',
        title: '↔️ Optimise: Move a Turbine',
        story: '"T03 looks too close to the soft constraint boundary," your manager says. Move it north toward better wind.',
        goal: 'Move at least one turbine to a new position.',
        tasks: [
          { id: 'select_mode_move', label: 'Switch to Select mode', watch: 'mode', value: 'select', required: true },
          { id: 'turbine_moved', label: 'Move a turbine by dragging it', watch: 'event', value: 'turbine_moved', required: true },
        ],
        why: 'In Select mode, turbines are draggable. Wind speed, elevation, and AEP update automatically at the new position.',
        hint: 'Switch to Select mode → drag a turbine marker to a new position on the map.',
      },
    ],
    successMessage: '🌀 Turbine layout complete! 5+ turbines placed, setbacks checked, turbines named. The layout is ready for electrical design.',
    badge: 'turbine_placer',
    xp: 200,
    challengeStep: {
      id: 'spot_the_issue',
      title: '🔍 Challenge: Spot the Issue',
      story: 'A colleague has shared their layout. There\'s a problem — one turbine is inside an exclusion zone. Can you find and fix it?',
      checkpointKey: 'conflict',
    },
  },

  cables: {
    id: 'cables',
    title: 'Module 5 — Cables & Electrical Layout',
    subtitle: 'Glenhaven Electrical Network Design',
    story: `The turbines are placed. Now connect them to the grid.

Your electrical engineer has sent a note: "Keep the cable routes tight — every extra metre costs €120. And make sure nothing's overloaded before you send me the file."`,
    objective: 'Design the complete electrical collection network for Glenhaven.',
    color: 'yellow',
    icon: '⚡',
    checkpointKey: 'cables',
    steps: [
      {
        id: 'place_substation',
        title: '🏭 Place the Collection Substation',
        story: 'Central to the turbine cluster, near a road — that\'s where your substation goes. The civil team needs reasonable road access.',
        goal: 'Place a substation on the map.',
        tasks: [
          { id: 'sub_mode', label: 'Activate Substation placement mode', watch: 'mode', value: 'place_substation', required: true },
          { id: 'sub_placed', label: 'Place a substation', watch: 'substationCount', minValue: 1, required: true },
        ],
        mapCenter: GLENHAVEN_CENTER,
        mapZoom: 13,
        why: 'Substation position drives cable length and cost. Central placement minimises total collection cable.',
        hint: 'Draw Tools → Substation → click the map near the centre of your turbine cluster.',
      },
      {
        id: 'configure_substation',
        title: '⚙️ Configure Substation Data',
        story: 'The electrical engineer needs the transformer size and capacity in the file. Set it up now.',
        goal: 'Name the substation and set transformer MVA.',
        tasks: [
          { id: 'sub_configured', label: 'Click substation and set its properties', watch: 'event', value: 'substation_configured', required: true },
        ],
        why: 'Transformer MVA = total MW × 1.2. For 7 × 4.5MW = 31.5MW → round to 40MVA.',
        hint: 'Click the substation in Select mode → fill in Name, Transformer MVA, and Gen Capacity → Done.',
        coachTip: '⚡ Standard transformer sizes: 10, 16, 20, 30, 40, 60, 90 MVA. Always round up to the next standard size.',
      },
      {
        id: 'draw_cables',
        title: '🔌 Draw the First Cable String',
        story: 'String topology — turbines chained together, then to the substation. Start simple: T01 → T02 → T03 → Substation.',
        goal: 'Draw at least 3 cable segments connecting turbines.',
        tasks: [
          { id: 'cable_mode', label: 'Activate Draw Cable mode', watch: 'mode', value: 'draw_cable', required: true },
          { id: 'cables_3', label: 'Draw at least 3 cable segments', watch: 'cableCount', minValue: 3, required: true },
        ],
        why: 'String topology minimises cable count. Cables carry cumulative power — the last cable in a string carries all turbines\' output.',
        hint: 'Draw Tools → Draw Cable. Hover near a turbine until the yellow snap ring appears, then click. Add waypoints and finish at the substation.',
        coachTip: '🟡 The yellow snap ring means you\'re connecting to a turbine or substation node. Always snap your cable endpoints.',
      },
      {
        id: 'complete_connection',
        title: '🔗 Connect All Turbines',
        story: 'The electrical model won\'t run without full connectivity. Every turbine needs a path to the substation.',
        goal: 'Draw cables so all turbines are connected to the substation.',
        tasks: [
          { id: 'cables_5', label: 'Draw at least 5 cable segments total', watch: 'cableCount', minValue: 5, required: true },
          { id: 'cables_tab', label: 'Check the Cables tab for load status', watch: 'tab', value: 'cables', required: true },
        ],
        why: 'Every turbine must have a cable path to the substation for the load flow to calculate correctly.',
      },
      {
        id: 'check_cables',
        title: '🔍 Check for Overloaded Cables',
        story: '"Red means trouble," your electrical engineer warns. "Any red cables in the file need to be upgraded before I can run the load flow."',
        goal: 'Open the Cables tab and check for overloaded cables. Use Optimise if needed.',
        tasks: [
          { id: 'cables_checked', label: 'Open Cables tab and review load status', watch: 'tab', value: 'cables', required: true },
          { id: 'cables_optimised', label: 'Click Optimise All Cables (if any are overloaded)', watch: 'event', value: 'cables_optimised', required: false },
        ],
        why: 'Overloaded cables (red bars) will trip circuit breakers. Cables must be sized for the actual load they carry.',
        hint: 'Open the Cables tab. If any cables show red load bars, click "Optimise All Cable Sizes" to auto-upgrade them.',
        coachTip: '⚠️ An overloaded cable shows red with dashes on the map. Click it to see the load percentage and upgrade manually, or use Optimise.',
      },
    ],
    successMessage: '⚡ Electrical layout complete! All turbines connected, cables checked. The Glenhaven collection network is ready for review.',
    badge: 'grid_engineer',
    xp: 200,
  },

  analysis: {
    id: 'analysis',
    title: 'Module 6 — Analysis & Optimisation',
    subtitle: 'Glenhaven Design Review',
    story: `The layout looks good on the map, but your manager asks: "What does the energy yield look like? Is it worth pursuing?"

You need to open the Analysis tab, read the KPIs, and make at least one design improvement before the numbers go to the board.`,
    objective: 'Use the Analysis tab to evaluate and improve the Glenhaven layout.',
    color: 'purple',
    icon: '📊',
    checkpointKey: 'cables',
    steps: [
      {
        id: 'open_analysis',
        title: '📊 Open the Analysis Dashboard',
        story: 'The Analysis tab is your project health dashboard — six KPIs that tell you whether the project stacks up financially.',
        goal: 'Open the Analysis tab and read the KPI values.',
        tasks: [
          { id: 'analysis_tab', label: 'Open the Analysis tab', watch: 'tab', value: 'analysis', required: true },
        ],
        mapCenter: GLENHAVEN_CENTER,
        mapZoom: 12,
        why: 'Analysis tab shows: Gross AEP, Capacity Factor, Average Hub Wind Speed, Cable Length, and Cable Cost.',
        hint: 'Click the "Analysis" tab in the right panel.',
        coachTip: '📈 Target: CF > 30%, Hub Wind > 7.5 m/s, AEP > 12 GWh per turbine. Below these = difficult to finance.',
      },
      {
        id: 'choose_goal',
        title: '🎯 Choose Your Design Goal',
        story: 'Before optimising, you need to know what you\'re optimising FOR. The board presentation has three options on the table.',
        goal: 'Select your optimisation goal (this shapes your feedback).',
        tasks: [
          { id: 'goal_selected', label: 'Select an optimisation goal', watch: 'event', value: 'analysis_goal_selected', required: true },
        ],
        isChoice: true,
        choices: [
          { id: 'energy', label: 'Maximise AEP', description: 'Push for highest annual energy output' },
          { id: 'cost', label: 'Minimise Cable Cost', description: 'Tighten cable routes to reduce infrastructure cost' },
          { id: 'compliance', label: 'Maximise Planning Compliance', description: 'Maximise constraint clearances' },
        ],
        why: 'Different stakeholders care about different metrics. Investors want AEP. Planners want compliance. EPC contractors want to minimise cable cost.',
      },
      {
        id: 'adjust_wind',
        title: '🌬️ Adjust Weibull Parameters',
        story: 'The met mast consultant has sent updated wind data for the site. Adjust the Weibull sliders to match the site-specific parameters.',
        goal: 'Adjust the Weibull k or λ slider in the Analysis tab.',
        tasks: [
          { id: 'weibull_changed', label: 'Adjust Weibull k or λ parameter', watch: 'event', value: 'weibull_changed', required: true },
        ],
        why: 'Weibull parameters directly affect AEP calculation. λ = 8.5 means mean wind ~7.6 m/s — typical for an Irish upland site.',
        hint: 'In the Analysis tab, drag the k (shape) or λ (scale) sliders and watch the chart update.',
        coachTip: '💡 Higher λ = more energy. Raising λ from 8 to 9 increases AEP by ~15–20%. Be conservative — use site data, not optimistic estimates.',
      },
      {
        id: 'move_for_improvement',
        title: '↔️ Improve the Layout',
        story: 'Your analysis shows T03 is in a wind shadow. Move it to better ground and watch the AEP improve.',
        goal: 'Move at least one turbine to improve energy yield.',
        tasks: [
          { id: 'turbine_moved', label: 'Move at least one turbine', watch: 'event', value: 'turbine_moved', required: true },
        ],
        why: 'Layout iteration is the most impactful improvement you can make — moving a turbine 200m can add 5–10% to its AEP.',
        hint: 'Switch to Select mode → drag a turbine to a new position → check if hub wind speed improves in the Turbines tab.',
      },
      {
        id: 'save_checkpoint',
        title: '💾 Save the Optimised Layout',
        story: 'The board presentation is tomorrow. Save the final layout as "Optimised Glenhaven Layout" so it doesn\'t get lost.',
        goal: 'Save the project with a meaningful name.',
        tasks: [
          { id: 'project_saved', label: 'Save the project', watch: 'event', value: 'project_saved', required: true },
        ],
        why: 'Version control through project naming is essential — "Glenhaven v1", "Glenhaven v2 optimised", "Glenhaven Final".',
        hint: 'Click File → Save (or File → Save Project) and ensure the project has been saved.',
      },
    ],
    successMessage: '📊 Analysis complete! Layout reviewed, optimised, and saved. Ready for the final design challenge.',
    badge: 'analyst',
    xp: 150,
  },

  challenge: {
    id: 'challenge',
    title: 'Module 7 — Final Design Challenge',
    subtitle: 'Glenhaven Wind Farm — Stakeholder Brief',
    story: `FINAL CHALLENGE: You have been briefed to produce an early-stage layout for the Glenhaven Wind Farm development.

Brief from the project director: "We need 6–8 turbines, all constraints respected, electrical infrastructure designed, and the project file ready to share with our technical consultants by end of day."

This is your chance to demonstrate everything you've learned. No step-by-step hand-holding — just a brief and a map.`,
    objective: 'Design a complete 6–8 turbine wind farm layout from scratch, meeting all technical requirements.',
    color: 'yellow',
    icon: '🏆',
    checkpointKey: 'final',
    isFinalChallenge: true,
    requirements: [
      { id: 'boundary', label: 'Site boundary polygon drawn', check: ({ polygonCount }) => polygonCount >= 1 },
      { id: 'exclusions', label: 'At least 2 exclusion/constraint layers', check: ({ polygonLayerCount }) => polygonLayerCount >= 3 },
      { id: 'turbines_count', label: '6–8 turbines placed', check: ({ turbineCount }) => turbineCount >= 6 && turbineCount <= 8 },
      { id: 'no_violations', label: 'No turbines inside hard exclusion zones', check: ({ violationCount }) => violationCount === 0 },
      { id: 'substation', label: 'At least one substation placed', check: ({ substationCount }) => substationCount >= 1 },
      { id: 'cables_connected', label: 'All turbines connected by cables', check: ({ cableCount, turbineCount }) => cableCount >= turbineCount },
      { id: 'cables_ok', label: 'No overloaded cables', check: ({ overloadedCables }) => overloadedCables === 0 },
    ],
    steps: [
      {
        id: 'challenge_brief',
        title: '📋 Read the Brief',
        story: 'Glenhaven is a 7-turbine onshore wind farm in Co. Roscommon. You have a gross site area of ~18km², one residential buffer zone in the SW, and a SAC in the NE. Your job: produce a viable early-stage layout.',
        goal: 'Start the challenge by loading the Glenhaven base site.',
        tasks: [
          { id: 'started', label: 'Begin the challenge', watch: 'event', value: 'challenge_started', required: true },
        ],
      },
    ],
  },
};