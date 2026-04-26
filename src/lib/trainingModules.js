export const MODULES = [
  {
    id: 'gis_basics',
    title: 'Using the Map Tool',
    subtitle: 'Layers, boundaries & basic navigation',
    icon: 'Map',
    xp_reward: 100,
    color: 'blue',
    description: 'Learn to navigate the planning tool, add map layers, draw site boundaries, and manage your project.',
    lessons: [
      { id: 'l1', title: 'The Planning Interface', content: 'The planning tool has a map on the left and a data panel on the right. The toolbar at the top lets you switch between modes: Select, Boundary, Place Turbine, and Draw Cable. Use the right-hand tabs (Turbines, Cables, Analysis, Layers, Types) to manage project data.' },
      { id: 'l2', title: 'Drawing a Site Boundary', content: 'Click "Boundary" in the toolbar to enter boundary drawing mode. Click on the map to add vertices of your polygon. When you have at least 3 points, click "Finish" to close the polygon. The boundary appears as a filled polygon layer on the map.' },
      { id: 'l3', title: 'Managing Layers', content: 'Click the "Layers" tab to see all map layers. You can toggle visibility with the eye icon, or delete custom zones. The Turbines and Cables layers are permanent. Add extra constraint zones (e.g. exclusion areas) using the "+ Add Zone" button.' },
      { id: 'l4', title: 'Saving and Exporting', content: 'Click "Save" to persist your project to browser storage. Use "Export" to download the full project as a GeoJSON file — this can be opened in QGIS, ArcGIS, or any GIS tool. Use "Import" to load an existing GeoJSON dataset as a new layer.' },
    ],
    quiz: {
      id: 'quiz_gis',
      questions: [
        { q: 'How do you draw a site boundary in the planning tool?', options: ['Click "Place Turbine" then click the map', 'Click "Boundary" then click vertices on the map, then Finish', 'Use the Layers tab to add a polygon', 'Import a GeoJSON file'], answer: 1 },
        { q: 'What format does the Export function produce?', options: ['CSV', 'Shapefile (.shp)', 'GeoJSON', 'KML'], answer: 2 },
        { q: 'How do you hide a layer without deleting it?', options: ['Delete it from the Layers tab', 'Click the eye icon next to the layer', 'Set opacity to 0 in settings', 'Move it below other layers'], answer: 1 },
        { q: 'Where is project data saved when you click Save?', options: ['A remote server', 'A file on your desktop', 'Browser local storage', 'The cloud'], answer: 2 },
      ]
    }
  },
  {
    id: 'turbine_placement',
    title: 'Placing & Configuring Turbines',
    subtitle: 'Turbine types, data tables & AEP per turbine',
    icon: 'Wind',
    xp_reward: 150,
    color: 'cyan',
    description: 'Learn to place turbines on the map, select turbine types, and read per-turbine energy data.',
    lessons: [
      { id: 'l1', title: 'Turbine Types', content: 'Before placing turbines, select a type from the dropdown in the Turbines tab. The tool includes Vestas V136-4.2 (4.2 MW), Siemens Gamesa SG 5.0-145 (5 MW), GE 3.8-130 (3.8 MW), and a Custom option. Each type has its own rotor diameter, hub height, and power rating.' },
      { id: 'l2', title: 'Placing a Turbine', content: 'Select "Place Turbine" mode in the toolbar. Click anywhere on the map — the tool automatically fetches real elevation and 30-day mean wind speed from Open-Meteo for that location. The turbine appears on the map and is added to the Turbines data table with all fetched data.' },
      { id: 'l3', title: 'The Turbines Data Table', content: 'The Turbines tab shows a data table with every placed turbine. Each row shows: Rated Power (MW), Rotor Diameter, Hub Height, Elevation, Wind Speed at 10m, Estimated Hub-Height Wind Speed, and Estimated Annual Energy Production (AEP in MWh/yr). Click the pencil icon to rename a turbine or edit hub height.' },
      { id: 'l4', title: 'Custom Turbine Types', content: 'Go to the Types tab to add your own turbine specifications. Fill in Manufacturer, Model, Rated Power (MW), Rotor Diameter (m), Hub Height (m), and cut-in/cut-out speeds. Click "Add Type" and your custom turbine will appear in the Turbines tab dropdown ready for placement.' },
    ],
    quiz: {
      id: 'quiz_turbine',
      questions: [
        { q: 'Where do you select a turbine type before placing one?', options: ['In the toolbar', 'In the Turbines tab dropdown', 'In the Types tab only', 'In the Analysis tab'], answer: 1 },
        { q: 'What real-world data is automatically fetched when you place a turbine?', options: ['Noise levels and shadow flicker', 'Elevation and wind speed', 'Land ownership and planning status', 'Grid connection distance'], answer: 1 },
        { q: 'What does AEP stand for in the turbine data table?', options: ['Average Electrical Power', 'Annual Energy Production', 'Adjusted Efficiency Parameter', 'Automatic Estimation Point'], answer: 1 },
        { q: 'How do you add a custom turbine type?', options: ['Edit the turbine directly on the map', 'Go to the Types tab and click Add Type', 'Import a JSON file of specs', 'Contact the manufacturer'], answer: 1 },
      ]
    }
  },
  {
    id: 'cable_routing',
    title: 'Cable & Overhead Line Routing',
    subtitle: 'Draw routes, select cable types, track costs',
    icon: 'Zap',
    xp_reward: 150,
    color: 'orange',
    description: 'Learn to draw cable routes, select cable specifications, and understand how cable length drives project cost.',
    lessons: [
      { id: 'l1', title: 'Cable Types Available', content: 'The tool includes four cable types: 33kV 150mm² XLPE underground (£120/m), 33kV 240mm² XLPE underground (£175/m), 132kV Overhead Line (£85/m), and 33kV Overhead Line (£45/m). Each has different voltage, ampacity, and cost per metre. Select the type in the Cables tab before drawing.' },
      { id: 'l2', title: 'Drawing a Cable Route', content: 'Click "Draw Cable" in the toolbar. Click the first point (e.g. a turbine location), then click the second point (e.g. the substation). The route is automatically added to the Cables data table with calculated length and estimated cost. Repeat for each cable run.' },
      { id: 'l3', title: 'The Cables Data Table', content: 'The Cables tab shows every drawn route with: Cable Type, Voltage (kV), Length (km), and Estimated Cost (£). The summary row at the top shows total cable length and total estimated cost. Cable cost is automatically recalculated when you change the unit cost (£/m) by clicking the edit icon on any cable type.' },
      { id: 'l4', title: 'Editing Cable Type Costs', content: 'In the Cables tab, expand the cable type selector and click the edit (pencil) icon next to any type. You can update the name and cost per metre (£/m). This updates the cost for all cables of that type instantly — useful for location-specific cost adjustments.' },
    ],
    quiz: {
      id: 'quiz_cable',
      questions: [
        { q: 'How do you draw a cable route between two points?', options: ['Use the Boundary tool and click twice', 'Select "Draw Cable" then click the start and end points', 'Import a GeoJSON LineString', 'Manually enter coordinates in the Cables tab'], answer: 1 },
        { q: 'Which cable type is cheapest per metre?', options: ['33kV 240mm² XLPE underground', '132kV Overhead Line', '33kV Overhead Line', '33kV 150mm² XLPE underground'], answer: 2 },
        { q: 'Where can you edit the cost per metre of a cable type?', options: ['In the Analysis tab', 'By clicking the edit icon in the cable type selector in the Cables tab', 'In the Types tab', 'You cannot edit costs'], answer: 1 },
        { q: 'What is shown in the Cable summary row?', options: ['Only the longest cable', 'Total cable length and total estimated cost', 'Average voltage and impedance', 'Number of substations'], answer: 1 },
      ]
    }
  },
  {
    id: 'wind_resource',
    title: 'Wind Resource & Analysis',
    subtitle: 'Weibull parameters, AEP & capacity factor',
    icon: 'BarChart2',
    xp_reward: 125,
    color: 'purple',
    description: 'Understand the Analysis tab — how to read Weibull wind distribution, monthly energy profiles, and farm-level energy KPIs.',
    lessons: [
      { id: 'l1', title: 'The Analysis Tab', content: 'The Analysis tab shows farm-level energy results. At the top you can adjust the Weibull wind distribution parameters (k = shape, λ = scale/mean). When you place turbines, real wind data is automatically fetched and used to set these. You can override them with the sliders.' },
      { id: 'l2', title: 'Weibull Distribution', content: 'Wind speeds follow a Weibull distribution. The shape factor k (typically 1.5–3.0) controls variability: higher k means more consistent winds. The scale factor λ is closely related to mean wind speed. The distribution chart shows how often each wind speed occurs at the site — critical for AEP calculation.' },
      { id: 'l3', title: 'Monthly Energy Profile', content: 'The monthly bar chart shows estimated energy output for each month of the year. Wind energy is seasonal — in the UK, winter months (Oct–Mar) typically produce 20–30% more energy than summer months. This chart uses seasonal factors applied to the mean AEP.' },
      { id: 'l4', title: 'Gross vs Net AEP', content: 'Gross AEP is the theoretical maximum before losses. Net AEP (shown as "Net AEP") has ~9% losses applied (wake, electrical, availability). Capacity Factor = Net AEP / (Installed Capacity × 8,760 hours). Good onshore sites achieve 30–40%. The Analysis tab shows all six key metrics.' },
    ],
    quiz: {
      id: 'quiz_wind',
      questions: [
        { q: 'In the Analysis tab, what do the sliders control?', options: ['Turbine hub height and rotor diameter', 'Weibull distribution k and λ parameters', 'Cable cost and length', 'Map zoom and centre'], answer: 1 },
        { q: 'What does "Net AEP" mean in the Analysis tab?', options: ['Maximum theoretical output', 'Output after losses are applied', 'Output at cut-in wind speed only', 'P90 value'], answer: 1 },
        { q: 'When is AEP shown in the Analysis tab?', options: ['Always, even with no turbines', 'Only after connecting to a grid', 'After at least one turbine with wind data is placed', 'Only after saving the project'], answer: 2 },
        { q: 'A capacity factor of 35% means:', options: ['35% of turbines are running', 'The farm produces 35% of its rated power on average', '35% of the site has turbines', '35% efficiency loss from wake effects'], answer: 1 },
      ]
    }
  },
  {
    id: 'site_suitability',
    title: 'Site Constraints & Zones',
    subtitle: 'Adding exclusion zones and constraint layers',
    icon: 'ShieldAlert',
    xp_reward: 125,
    color: 'green',
    description: 'Learn to add constraint and exclusion zone layers, and use them to guide turbine placement on the map.',
    lessons: [
      { id: 'l1', title: 'Adding Constraint Zones', content: 'In the Layers tab, click "+ Add Zone" to create a new polygon layer. Name it something meaningful (e.g. "Exclusion Zone", "Residential Buffer", "Protected Area"). Then switch to "Boundary" mode and draw the zone polygon on the map. You can have as many constraint layers as you need.' },
      { id: 'l2', title: 'Common Constraint Types', content: 'Typical constraints mapped in wind farm planning: Residential setbacks (500m–1km from dwellings), Protected nature areas (SSSIs, National Parks), Aviation and radar zones, MOD low-flying areas, Flood risk zones, Woodland and peat. Each should be a separate layer so they can be toggled independently.' },
      { id: 'l3', title: 'Using Colours to Differentiate', content: 'When adding a constraint layer, you can set its colour in the Layers tab by clicking on the layer. Use a convention: red for hard exclusions, orange for soft constraints, yellow for sensitivity areas. This makes the map easier to read when many layers are visible.' },
      { id: 'l4', title: 'Checking Turbine Positions', content: 'After drawing constraint zones, use "Place Turbine" mode and click inside your developable area — the clear land remaining after removing all constraints. The tool does not automatically enforce constraints, so you need to visually check that turbines fall outside exclusion zones.' },
    ],
    quiz: {
      id: 'quiz_site',
      questions: [
        { q: 'How do you add a new constraint zone layer in the planning tool?', options: ['Import it from a shapefile', 'Click + Add Zone in the Layers tab then draw a boundary', 'Use the Types tab to define a zone type', 'Place a turbine and mark it as constrained'], answer: 1 },
        { q: 'What is a typical minimum setback distance from residential dwellings for wind turbines?', options: ['50m', '200m', '500m–1km', '5km'], answer: 2 },
        { q: 'Does the planning tool automatically prevent turbines from being placed in exclusion zones?', options: ['Yes, it blocks placement', 'Yes, with a warning message', 'No, you must check positions visually', 'Only if the zone is coloured red'], answer: 2 },
        { q: 'What is the recommended colour convention for hard exclusion zones?', options: ['Green', 'Blue', 'Red', 'Yellow'], answer: 2 },
      ]
    }
  },
  {
    id: 'turbine_layout',
    title: 'Layout Optimisation & Spacing',
    subtitle: 'Wake losses, row alignment & spacing rules',
    icon: 'CircleDot',
    xp_reward: 150,
    color: 'yellow',
    description: 'Learn how to space and align turbines in the planning tool to minimise wake losses and maximise energy yield.',
    lessons: [
      { id: 'l1', title: 'Wake Effects in Practice', content: 'When turbines are placed close together in the prevailing wind direction, downstream turbines generate less power due to the wake (reduced wind speed) from upstream machines. Wake losses are 5–15% for typical onshore layouts. In the planning tool, you can see each turbine\'s AEP — turbines with lower hub wind speed may be wake-affected.' },
      { id: 'l2', title: 'Spacing Rules', content: 'Standard spacing: 3–5 rotor diameters (D) cross-wind, 7–10D downwind. For a Vestas V136 (rotor = 136m): 410–680m cross-wind, 950m–1.36km downwind. When placing turbines, use the KPI overlay at the bottom of the map to see total capacity grow. Space them to maintain reasonable AEP per turbine.' },
      { id: 'l3', title: 'Row Alignment', content: 'Align turbine rows perpendicular to the prevailing wind direction. In the UK, prevailing winds are from the SW. So turbine rows should run NW–SE, with rows stepping SW–NE. In the planning tool, place the first turbine, then step perpendicular to the wind for the next turbine in the same row.' },
      { id: 'l4', title: 'Reading Layout Performance', content: 'After placing turbines, check the Analysis tab for total Capacity Factor. If CF is below 28% onshore, consider whether wind resource is genuinely low or whether wake losses are high. Check individual turbine hub wind speeds in the Turbines data table — if they vary widely, the site may have good and poor positions.' },
    ],
    quiz: {
      id: 'quiz_layout',
      questions: [
        { q: 'What is the recommended minimum downwind spacing between wind turbines?', options: ['1–2 rotor diameters', '3–5 rotor diameters', '7–10 rotor diameters', '15–20 rotor diameters'], answer: 2 },
        { q: 'For the UK prevailing SW wind direction, how should turbine rows be oriented?', options: ['N–S rows', 'E–W rows', 'NW–SE rows (perpendicular to SW wind)', 'SW–NE rows (parallel to wind)'], answer: 2 },
        { q: 'Where can you see individual turbine AEP estimates in the planning tool?', options: ['Only in the Analysis tab total', 'In the Turbines data table, per-turbine AEP column', 'On the map popup only', 'In the Layers tab'], answer: 1 },
        { q: 'Typical wake losses in an onshore wind farm are:', options: ['< 1%', '5–15%', '30–40%', '> 50%'], answer: 1 },
      ]
    }
  },
];

export const BADGES = {
  first_steps: { name: 'First Steps', description: 'Complete your first module', icon: 'Star' },
  map_navigator: { name: 'Map Navigator', description: 'Complete the Map Tool module', icon: 'Map' },
  turbine_placer: { name: 'Turbine Placer', description: 'Complete the Turbine Placement module', icon: 'Wind' },
  cable_runner: { name: 'Cable Runner', description: 'Complete the Cable Routing module', icon: 'Zap' },
  wind_analyst: { name: 'Wind Analyst', description: 'Complete Wind Resource & Analysis', icon: 'BarChart2' },
  site_surveyor: { name: 'Site Surveyor', description: 'Complete Site Constraints module', icon: 'ShieldAlert' },
  layout_pro: { name: 'Layout Pro', description: 'Complete Layout Optimisation module', icon: 'CircleDot' },
  completionist: { name: 'Completionist', description: 'Complete all 6 training modules', icon: 'Trophy' },
  quiz_ace: { name: 'Quiz Ace', description: 'Score 100% on any quiz', icon: 'Award' },
};