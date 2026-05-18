export const MODULES = [
  {
    id: 'land_acquisition',
    title: 'Interface & Toolbar',
    subtitle: 'Every button, panel and map toggle — hands-on',
    icon: 'Map',
    xp_reward: 120,
    color: 'cyan',
    description: 'A quick walkthrough of the Planning tool interface — toolbar modes, right-hand panel tabs, and map overlays.',
    lessons: [
      {
        id: 'l1',
        title: '🖱️ Toolbar Modes',
        content: `The toolbar has five drawing mode buttons at the top:

**Select** — default. Click any map feature to open its properties panel. Only in Select mode can you MOVE turbines, cables and substations.

**Pan** — navigate the map and click features to inspect them (menus open, tooltips show) WITHOUT moving anything.

**Polygon** — click to place vertices; double-click or hit "Finish" to close the shape.

**Place Turbine** — click the map to drop a turbine. Auto-fetches real elevation and wind speed from Open-Meteo.

**Draw Cable** — click two or more points to draw a cable. Hover near a turbine/substation to snap to it.

**Substation** — click to place a yellow substation marker.

> 🎯 Try activating each mode below. Notice the cursor icon changes and the blue hint bar at the top of the map updates.`,
      },
      {
        id: 'l2',
        title: '💾 Save, Import & Export',
        content: `The right side of the toolbar handles files:

**File menu** — New, Save, Open and Import Project.

**Import** — load GeoJSON, Shapefile (.zip), or CSV files as new map layers. The classifier asks how to handle point/line features.

**Export** — export as GeoJSON, Shapefile, KML, CSV, or PDF. Choose your coordinate reference system (WGS84, ITM, Irish Grid).

**Auto-save** — your work is also written to browser storage every 500ms whenever layers change.

> 🎯 Click File → Save now. Then try Import and explore the export formats.`,
      },
      {
        id: 'l3',
        title: '🗺️ Map Controls',
        content: `Top-right corner of the map has two overlay controls:

**Base Map selector** — switch between Dark (clean, good for line visibility), Satellite (Esri aerial photography), and Roads (OpenStreetMap).

**Substations toggle** — shows/hides placed substations. The count shows how many are currently on the map.

**Layer hover tooltips** — hover over any polygon to see its name, layer, and description.

**Right panel collapse** — the ▶ button on the right edge collapses/restores the right panel for a full-screen map view.

> 🎯 Toggle between Dark and Satellite. Then collapse the right panel and re-open it.`,
      },
      {
        id: 'l4',
        title: '📊 Right Panel Tabs',
        content: `The right panel has five tabs:

**Turbines** — select active turbine type, view all placed turbines with wind/AEP data, edit names, manage setback radii.

**Cables** — select cable type, view all cables with length/cost/load data, optimise cable sizing.

**Analysis** — Weibull wind distribution sliders + monthly energy chart + 6 KPI boxes (AEP, capacity factor, cable cost).

**Layers** — list all map layers. Click to select (new polygons go into selected layer). Expand any layer to see individual features with their areas. Toggle visibility, reorder, delete.

**Types** — turbine specification library. Edit or add custom turbine types.

**Data Tables** — opens a popup with full editable data for all layers, plus turbine and cable library editors.

> 🎯 Click through each tab and spend 20 seconds on each one.`,
      },
      {
        id: 'l5',
        title: '🏗️ Cables: Nodes & Routing',
        content: `The cable network supports **junction nodes** — not just turbine-to-substation connections:

**Adding a cable node** — in Select mode, click any cable and choose "Add Node". This splits the cable at the clicked point. Other cables can now connect to that node.

**Power flow** — current flows FROM turbines TOWARD substations. If multiple cables feed into a node, the outbound cable carries the **sum** of all incoming power. The cable load display auto-calculates this.

**Moving cables** — in Select mode, click a cable to select it, then drag a waypoint to reshape the route.

**Overloaded cables** — shown in red with a dashed line when current exceeds the cable's ampacity. Click the cable to upgrade its type.

> 🎯 Draw two cables from two turbines meeting at a node, then connect the node to a substation.`,
      },
    ],
  },

  {
    id: 'turbine_placement',
    title: 'Polygons — Drawing & Editing',
    subtitle: 'Site boundaries, constraint zones, vertex editing & colour conventions',
    icon: 'Wind',
    xp_reward: 150,
    color: 'green',
    description: 'Draw, style and edit polygons — the core GIS skill for mapping wind farm sites and constraints.',
    lessons: [
      {
        id: 'l1',
        title: '✏️ Drawing a Polygon',
        content: `Click **Polygon** in Draw Tools. The cursor becomes a crosshair.

Click 5–8 times to place vertices. A dashed cyan line connects them as you go. Once you have 3+ points, the **"Finish (N pts)"** button appears in the toolbar — click it, or double-click, to close the polygon.

**Which layer does it go into?** Whichever layer is highlighted in the Layers tab. Polygon mode auto-selects the first polygon layer. To draw into a different layer, click that layer row first.

**Area display** — once a polygon is drawn, hover over it to see its area in km² in the tooltip. The Layers tab also shows the area when you expand a layer.

> 🎯 Draw a rough site boundary — 6 vertices, irregular shape. Hover over it to see the area.`,
      },
      {
        id: 'l2',
        title: '🎨 Editing Polygon Properties',
        content: `Switch to **Select** mode (or **Pan** mode). Click the polygon. A panel appears top-left:

- **Name** — e.g. "Site Boundary", "500m Residential Buffer"
- **Colour** — 10 presets + native colour picker or hex code
- **Fill Transparency** — 0–80%. Most polygons: 15–30% so basemap shows through
- **No-Turbine Zone** — tick this to block turbine placement inside the polygon
- **Notes / Data** — free text: owner, lease status, planning reference

Click **Apply** to save. Changes take effect immediately.

> 🎯 Edit your boundary: name it "Gross Site Boundary", set cyan (#06b6d4), 15% opacity.`,
      },
      {
        id: 'l3',
        title: '📐 Vertex Editing',
        content: `Open a polygon's panel (Select mode → click polygon). Click **"✏ Edit Vertices"**.

The outline becomes dashed. White circular handles appear at each vertex.

**Move a vertex** — drag a handle to reshape.

**Add a vertex** — click anywhere on the polygon's edge (between handles). A new vertex inserts at the closest edge point. Drag it into position.

**Finish editing** — click the ✕ banner at the top of the map, or press Escape.

> 🎯 Vertex-edit your boundary: drag a corner, then add an extra vertex on one edge.`,
      },
      {
        id: 'l4',
        title: '🗂️ Layers & Colour Conventions',
        content: `Click **"+ Add Zone"** in the Layers tab to create a new layer. Select it, then draw polygons into it.

**Professional colour conventions:**

*Land acquisition:*
- 🟢 Green — Leased / Option agreed
- 🟡 Amber — Actively negotiating
- 🔴 Red — Not pursuing

*Planning constraints:*
- 🔴 Red — Hard exclusion (SSSI, residential buffer, "No Turbine Zone" ticked)
- 🟠 Orange — Soft constraint (AONB, PRoW corridor)
- 🟡 Yellow — Advisory zone (noise, heritage)

*Ecological:*
- 🟢 Lime — Habitat survey area
- 🔵 Blue — Watercourse / Flood zone

> 🎯 Create three layers — "Leased", "Negotiating", "Hard Constraint" — with correct colours.`,
      },
      {
        id: 'l5',
        title: '👁️ Layer Visibility & Organisation',
        content: `With 8–12 layers on a real project, visibility control is essential.

**Expand a layer** — click the ▶ arrow next to the layer name in the Layers tab to reveal individual features with their areas in km².

**Eye icon** — toggle any layer on/off without deleting it. Use this when presenting to different stakeholders.

**Reorder** — ↑↓ arrows change rendering order. Layers at the top of the list render on top of layers below.

**Delete** — bin icon removes the layer and all its features. Core layers (Turbines, Cables, Substations) cannot be deleted.

> 🎯 Expand a polygon layer to see its features. Toggle constraint layers on and off.`,
      },
    ],
  },

  {
    id: 'cable_routing',
    title: 'Turbines — Placement & Setbacks',
    subtitle: 'Placing turbines, reading live wind data, setback radii & layout iteration',
    icon: 'Zap',
    xp_reward: 150,
    color: 'orange',
    description: 'Place turbines with real wind data, assign types, apply setback radii, and iterate your layout.',
    lessons: [
      {
        id: 'l1',
        title: '🔩 Choosing a Turbine Type',
        content: `Before placing, check the **Turbines tab** — the active type is shown in the selector at the top. Click to expand and choose:

- **Vestas V150-4.5** (4.5 MW, Ø150m, 105m hub) — standard large onshore turbine
- **Siemens Gamesa SG 5.0-145** (5.0 MW, Ø145m, 115m hub)
- **GE Cypress 5.3-158** (5.3 MW, Ø158m, 120m hub)
- **Enercon E-138 EP3** (4.2 MW, Ø138m, 131m hub)

Each type sets hub height (affects wind shear and AEP), rotor diameter (affects setback distances), and rated power (affects total capacity KPI).

> 🎯 Open the Turbines tab and switch between turbine types. Note how specs change.`,
      },
      {
        id: 'l2',
        title: '📍 Placing Turbines & Live Wind Data',
        content: `Click **Place Turbine** in Draw Tools, then click the map. The tool immediately:

1. Fetches ground elevation from Open-Elevation
2. Fetches 30-day mean wind speed at 10m from Open-Meteo ERA5
3. Applies power-law shear to calculate **hub-height wind speed**
4. Estimates AEP using the power curve × Weibull distribution

Wind data is shown in the turbine popup and Turbines tab. The KPI strip updates in real time.

**When you move a turbine** (Select mode → drag) the wind speed, elevation and AEP automatically refresh for the new location.

> 🎯 Place 5 turbines on a ridgeline. Watch wind circles appear. Move one to a lower location and watch its wind speed drop.`,
      },
      {
        id: 'l3',
        title: '🔴 Turbine Setback Radii',
        content: `Setback radii are dashed circles around each turbine for constraint clearance checking.

**Global radii** — in the Turbines tab, scroll down to "Turbine Setback Radii". Enable 5D (5× rotor diameter) as a wake spacing guide, or 7D as a strict no-go zone.

**Blocking radii** — enable "Block Placement" on a radius to prevent other turbines (or substations) being placed within it. A red warning appears if you try.

**UK guidance:**
- 500m — minimum from nearest dwelling (noise screening)
- 2× tip height — from public roads (~460m for a 5MW turbine)
- 3D–4D — minimum rotor separation for same-row turbines
- 6D–8D — downwind separation to reduce wake losses

> 🎯 Enable 5D radii in the Turbines tab. Toggle "Block Placement" on 7D and try placing a turbine too close to another.`,
      },
      {
        id: 'l4',
        title: '✏️ Editing & Renaming Turbines',
        content: `Three ways to edit a turbine:

**Map popup** — click turbine in Select/Pan mode: rename, change type, add custom fields, assign to a zone polygon, delete.

**Turbines tab** — pencil icon on each row: edit name and hub height inline. Click the location target to fly the map to that turbine.

**Data Tables** — click the Data Tables tab in the right panel: open the popup, click any cell to edit. Change lat/lng here to fine-tune position without redrawing.

Changing turbine type via the popup updates rated power, rotor diameter, hub height, and AEP immediately.

> 🎯 Rename all turbines T01–T05 using the Turbines tab pencil icons. Then open Data Tables to verify.`,
      },
      {
        id: 'l5',
        title: '🔄 Layout Iteration Workflow',
        content: `Professional layout design is always iterative:

1. **Draw site boundary** → defines study area
2. **Add constraint layers** → mark "No Turbine Zone" on hard exclusions
3. **Place turbines** → on highest ground, 4–5 rotor diameters apart
4. **Enable setback radii** → check constraint clearances visually
5. **Check Analysis tab** → target >30% capacity factor, >7.5 m/s hub wind
6. **Move turbines** → drag in Select mode; wind speed, elevation and AEP auto-refresh
7. **Save & export** → GeoJSON + KML for QGIS / sharing with consultants

> 🎯 Move a turbine to a better wind location. Watch the hub wind speed and AEP update automatically.`,
      },
    ],
  },

  {
    id: 'wind_resource',
    title: 'Cables, Nodes & Grid Connection',
    subtitle: 'Cable routing, junction nodes, substation sizing & cost estimation',
    icon: 'BarChart2',
    xp_reward: 125,
    color: 'purple',
    description: 'Design the electrical collection network — cable types, routing topology, junction nodes, substation sizing, and grid connection.',
    lessons: [
      {
        id: 'l1',
        title: '⚡ The Electrical Network',
        content: `Every wind farm has three electrical layers:

**1. Internal collection cables** — typically 33kV underground, running from each turbine toward the onsite substation.

**2. Junction nodes** — optional midpoints where cables from multiple turbines meet before continuing to the substation. The outbound cable from a node automatically carries the summed power of all incoming cables.

**3. Onsite substation** — steps up from 33kV to 132kV. Positioned centrally to minimise cable lengths.

**4. Grid connection** — cable or overhead line from the substation to the DNO's grid. Often the most expensive single item.

Power ALWAYS flows turbine → (nodes) → substation. The cable load display shows actual current and flags overloads in red.`,
      },
      {
        id: 'l2',
        title: '🔌 Cable Types',
        content: `Open the **Cables tab** and look at the type selector:

- **33kV 150mm² XLPE Underground** (€120/m) — standard collection cable for individual turbines
- **33kV 240mm² XLPE Underground** (€175/m) — higher ampacity; use for main feeders carrying multiple strings
- **33kV Overhead Line** (€45/m) — cheaper but visually intrusive
- **132kV Overhead Line** (€85/m) — for long grid connections

The cable load display shows:
- **Current (A)** — calculated from power flowing through it
- **Ampacity** — the cable's rated maximum
- **Load %** — bar turns red if overloaded

Click **Optimise** in the Cables tab to auto-assign the smallest cable type that handles the actual load.

> 🎯 Note each cable type before drawing any cables.`,
      },
      {
        id: 'l3',
        title: '🗺️ Drawing Cable Routes',
        content: `Click **Draw Cable** in Draw Tools.

Click a turbine → click next point → click substation. Cables snap to turbines and substations (yellow snap ring appears on hover).

**String topology** — T01 → T02 → T03 → Sub (chain). Less cable, lower cost.

**Using nodes** — T01 → Node → Sub, T02 → Node → Sub. The node carries T01+T02 power. Select the node cable → Auto-upgrades to handle combined load.

**Adding nodes** — in Select mode, click any cable, then click "Add Node". This splits the cable; new cables can connect to the node.

**Moving cables** — in Select mode, click a cable waypoint and drag to reshape the route.

> 🎯 Draw a string: T01→T02→T03→Sub. Check the cable popup to see how load accumulates along the string.`,
      },
      {
        id: 'l4',
        title: '🏭 Placing & Sizing the Substation',
        content: `Click **Substation** → click the map near the centre of your turbine cluster.

Click it in Select/Pan mode to edit:

- **Name** — e.g. "Knockroe 33/132kV Collection Substation"
- **Transformer MVA** — rule of thumb: total MW × 1.2. For 10 × 4.5 MW = 45 MW → 60 MVA
- **Gen Capacity MW** — match total rated capacity
- **Notes** — grid reference, DNO reference, connection application number

A green "Within Capacity" / red "Over Capacity" badge shows live load vs. rated capacity.

> 🎯 Place a substation and fill in all five fields. Connect all turbines to it and check the capacity badge.`,
      },
      {
        id: 'l5',
        title: '💰 Reading Cable Costs',
        content: `After drawing cables, open the **Analysis tab**. The bottom KPI boxes show:

- **Cable Length** — total km across all routes
- **Cable Cost** — sum of (length × cost/m) for each cable type

Also check the **Cables tab** summary: total routes, length, cost, and any overloaded cables flagged in orange.

**Click Optimise** (Cables tab) to automatically upgrade overloaded cables to the cheapest type that handles the actual load.

**Irish benchmarks (10-turbine, 45 MW farm):**
- Internal 33kV collection (8–15 km): €960k–€1.8M
- 132kV grid connection underground (5 km): ~€1.5M
- 132kV overhead (10 km): ~€850k
- Total electrical infrastructure: €2.5M–€4M

> 🎯 Optimise all cables. Check the cost reduction in the Analysis tab.`,
      },
    ],
  },

  {
    id: 'layer_data',
    title: 'Site Constraints & Layer Management',
    subtitle: 'Constraint mapping, buffer zones, data import & export',
    icon: 'Layers',
    xp_reward: 175,
    color: 'blue',
    description: 'Map planning constraints as GIS layers, apply setback buffers, import external data, and build a professional constraint map.',
    lessons: [
      {
        id: 'l1',
        title: '🗂️ Why Layers Matter',
        content: `A wind farm planning application needs dozens of technical assessments — noise, ecology, heritage, hydrology, aviation, visual impact. Each produces a map layer.

**Core project layers** (always present): Site Boundary, Turbines, Cables, Substations.

**Constraint layers** (you create): 500m Residential Buffer, SSSI/SPA, Ancient Woodland, MOD Radar Zone, Flood Zone, Aviation Surface, PRoW Corridor.

**Assessment layers**: Noise receptor points, ZTV contour, Shadow Flicker hours.

**Layer area display** — expand any polygon layer in the Layers tab to see each feature with its area in km² or hectares. This makes it easy to report constraint areas.

Each layer gets its own colour, visibility toggle, and data attributes. Organised correctly, the same file serves every consultant on the team.`,
      },
      {
        id: 'l2',
        title: '🔴 Creating a Constraint Layer',
        content: `Example: 500m residential buffer.

1. Layers tab → **"+ Add Zone"** → name it "500m Residential Buffer"
2. Click the new layer row to select it
3. Switch to **Polygon** mode → draw a polygon around the dwelling location
4. Switch to **Select** mode → click the polygon:
   - Name: "500m Buffer — Farmhouse A"
   - Colour: Red (#ef4444)
   - Fill: 20%
   - **No-Turbine Zone: ✓** — blocks turbine placement inside
   - Notes: "Nearest dwelling 320m from proposed T3. ETSU-R-97 noise assessment required."
5. Click **Apply**

When "No-Turbine Zone" is enabled, the placement tool shows a ⛔ warning if you try to place a turbine inside.

> 🎯 Create this constraint layer and draw two buffer polygons. Try placing a turbine inside one.`,
      },
      {
        id: 'l3',
        title: '📥 Importing External GIS Data',
        content: `Click **Import** in the toolbar → select a GeoJSON, Shapefile (.zip), or CSV file.

If the file has point or line features, the **Classify Imports** modal appears — choose whether to treat points as turbines, lines as cables, or keep as a plain layer.

**Warning** — if coordinates are in a projected CRS (e.g. Irish Grid ITM — large numbers), an amber warning shows. Re-export from your GIS as WGS84/EPSG:4326 first.

**Where to get Irish data (free):**
- OS Open Data Ireland: data.gov.ie
- Environmental data: epa.ie / npws.ie (NPWS SAC/SPA boundaries)
- Ordnance Survey Ireland: osi.ie

> 🎯 Import a GeoJSON file from data.gov.ie and classify it as a plain layer. Toggle it on/off.`,
      },
      {
        id: 'l4',
        title: '📋 Organising for a Planning Deliverable',
        content: `**Naming convention:**
- "Hard Constraint — SSSI/SPA Boundary (NPWS)"
- "Hard Constraint — 500m Residential Buffer"
- "Soft Constraint — Scenic Route Corridor"
- "Advisory — PRoW 50m Buffer"

**Visibility presets before export:**
- Constraint map: show constraints + site boundary, hide turbines and cables
- Layout check: show turbines + boundary + residential buffers
- Cable cost view: show cables + substations only

Use eye icons to switch between these views instantly.

**Expand layers** in the Layers tab to audit individual features — check every polygon has a name and notes filled in before the planning submission.

> 🎯 Set up these three visibility presets. Expand each layer to check features have names.`,
      },
      {
        id: 'l5',
        title: '📈 Analysis Tab — Project Dashboard',
        content: `The **Analysis tab** auto-updates as you add, move, or delete turbines.

**Weibull sliders** — adjust k (shape) and λ (scale) if you have site-specific met mast data. Auto-populated once turbines have real wind data.

**Monthly energy profile** — seasonal breakdown. Irish wind farms produce 25–35% more energy November–February vs June–August.

**Six KPI boxes:**
- Gross AEP / Net AEP (Net ≈ Gross − 9% losses)
- Capacity Factor = Net AEP ÷ (Rated Capacity × 8,760h)
- Average Hub Wind Speed
- Total Cable Length / Cost

**Irish onshore benchmarks:**
- Capacity factor > 30% = good; < 25% = likely unviable
- Average hub wind > 7.5 m/s = good; < 6.5 m/s = marginal

> 🎯 Place 5 turbines and check all six KPIs. Adjust Weibull sliders and watch the chart update.`,
      },
    ],
  },

  {
    id: 'site_constraints',
    title: 'Full Wind Farm Design',
    subtitle: 'End-to-end walkthrough — blank map to export-ready project',
    icon: 'ShieldAlert',
    xp_reward: 200,
    color: 'yellow',
    description: 'Design a complete 10-turbine wind farm: site boundary, constraints, turbine layout, cables, nodes, substation, data review, and export.',
    lessons: [
      {
        id: 'l1',
        title: '🏁 Step 1 — Project Setup & Site Boundary',
        content: `In the Planning tool: click the project name (top-left) and rename it **"Knockroe Wind Farm — Indicative Layout"**.

**Create layers** (Layers tab → "+ Add Zone" four times):
- Site Boundary (cyan, 15%)
- Hard Constraints (red, 20%, No-Turbine Zone ✓)
- Soft Constraints (orange, 15%)
- Land Parcels (green, 10%)

**Draw the site boundary:** Polygon mode → Site Boundary layer → draw a 6–8 vertex irregular polygon covering a ~5km × 4km upland ridge.

Select the polygon (Select mode) → name it "Knockroe Site Boundary" → add notes: "Gross area ~18 km². Upland grassland. Wind 8.5–10.5 m/s hub height."

**Check the area** — hover over the polygon to see its area in km² in the tooltip. Expand the Site Boundary layer to see the feature listed.

> 🎯 Complete this step in the Planning tool.`,
      },
      {
        id: 'l2',
        title: '🚧 Step 2 — Map the Constraints',
        content: `Select **Hard Constraints** layer. Draw two polygons:

**Residential buffer** — oval in the southwest corner.
- Name: "Knockroe Village — 500m Buffer"
- No-Turbine Zone: ✓
- Notes: "Nearest dwelling 380m. ETSU-R-97 required. Night limit 43 dB LA90."

**SAC/SPA** — polygon in the northeast corner.
- Name: "Blanket Bog SAC"
- No-Turbine Zone: ✓
- Notes: "Natura 2000 SAC. No turbines within 500m. Curlew / golden plover survey required."

Select **Soft Constraints** layer. Draw two more polygons — an AONB buffer along the eastern edge and a PRoW corridor diagonal.

> 🎯 Try placing a turbine inside the Hard Constraint layer — it should be blocked. Toggle the layer on/off with the eye icon.`,
      },
      {
        id: 'l3',
        title: '💨 Step 3 — Turbine Type & Layout',
        content: `Turbines tab → select **Vestas V150-4.5 (4.5 MW)**.

Click **Place Turbine** in Draw Tools. Place 10 turbines:
- Inside site boundary
- Outside constraint polygons (they're blocked)
- Along the main ridge, spaced ~650m apart (≈ 4× rotor diameter)
- Stagger any second row ~400m laterally to reduce wake losses

As each turbine places, real elevation and wind data load automatically.

**Enable radii** — in the Turbines tab, enable 5D radii to visualise spacing.

Check KPI strip: target ~45 MW capacity, 130–180 GWh AEP, 33–45% capacity factor.

**Try moving a turbine** — drag in Select mode and watch wind speed update at the new location.

> 🎯 Place all 10 turbines. Move the worst-performing one to better wind.`,
      },
      {
        id: 'l4',
        title: '🔌 Step 4 — Cable Network with Nodes',
        content: `**Place substation:** Substation tool → click near centre of turbines.
Edit it: Name "Knockroe 33/132kV Collection Sub", Transformer 60 MVA, Gen Capacity 45 MW.

**Draw internal cables (33kV 150mm²):**
Use the string topology with nodes:
- Draw T01 → T02 → T03 → T04 → T05 forming a string
- Add a node by selecting the T03→T04 cable → Add Node
- Connect T06 and T07 to that node
- Continue T05 string → Substation; continue node → Substation

**Optimise** — click Optimise in Cables tab to auto-upgrade overloaded cables.

**Grid connection:** Change cable type to 132kV Overhead → draw from substation to site boundary edge.

> 🎯 Draw the complete cable network. Use Optimise to handle overloads.`,
      },
      {
        id: 'l5',
        title: '📊 Step 5 — Data Review & Export',
        content: `Navigate to **Data Tables** (click the Data Tables tab in the right panel) and check:

**Turbines:** All 10 listed T01–T10. Hub wind speed values present. AEP values reasonable. Hub height 105m for all.

**Cables:** 11+ cables. Grid connection type = 132kV OHL. Collection cables = 33kV 150mm². No 0,0 lat/lng.

**Substations:** 1 listed, 60 MVA, 45 MW gen capacity.

**Polygons:** Site boundary, 4 constraint polygons, all named with notes. Expand layers to confirm areas are shown.

Back in Planning: **File → Save** → then use the Export button to download GeoJSON and KML.

> 🎯 Export complete. Your indicative wind farm layout is ready for consultants.`,
      },
      {
        id: 'l6',
        title: '🏆 Step 6 — Review & Iterate',
        content: `With the full layout exported, do a final review:

**Constraints check:**
- No turbine is inside a Hard Constraint polygon
- 5D radii don't overlap constraint zones
- Substation is near a road and the grid connection point

**Electrical check:**
- No overloaded cables (all should be green in Cables tab)
- Substation shows "Within Capacity"
- Grid connection cable is the right type (132kV)

**Energy check (Analysis tab):**
- Capacity factor > 30%
- Average hub wind > 7.5 m/s
- Monthly profile shows realistic seasonal variation

**Professional tip:** Save different visibility states using the eye icons — constraint view, layout view, electrical view — before presenting to different audiences.

> 🎯 Congratulations! You've completed the full wind farm design walkthrough.`,
      },
    ],
  },
];

export const BADGES = {
  first_steps:     { name: 'First Steps',       description: 'Complete your first training module',          icon: 'Star'       },
  land_mapper:     { name: 'Interface Pro',      description: 'Complete the Toolbar & Interface module',      icon: 'Map'        },
  turbine_placer:  { name: 'Polygon Master',     description: 'Complete the Polygons module',                 icon: 'Wind'       },
  cable_runner:    { name: 'Turbine Placer',     description: 'Complete the Turbines module',                 icon: 'Zap'        },
  wind_analyst:    { name: 'Grid Engineer',      description: 'Complete the Cables & Substations module',     icon: 'BarChart2'  },
  layer_master:    { name: 'Constraint Mapper',  description: 'Complete the Site Constraints module',         icon: 'Layers'     },
  site_surveyor:   { name: 'Site Designer',      description: 'Complete the Full Wind Farm Design walkthrough', icon: 'ShieldAlert'},
  completionist:   { name: 'Completionist',      description: 'Complete all 6 training modules',              icon: 'Trophy'     },
};