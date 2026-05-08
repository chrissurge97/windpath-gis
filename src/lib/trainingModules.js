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
        title: 'Toolbar Modes',
        content: `The toolbar runs across the top. The five mode buttons are:

**Select** — default. Click any map feature to open its properties panel.

**Polygon** — click to place vertices; double-click or hit "Finish" to close the shape.

**Place Turbine** — click the map to drop a turbine. The tool auto-fetches real elevation and wind speed for that location from Open-Meteo.

**Draw Cable** — click two points to draw a cable segment. Length is calculated automatically.

**Substation** — click to place a yellow substation marker. Click it in Select mode to fill in specs.

> Try switching between modes in the Planning tool now — notice the cursor changes and the blue hint bar at the top of the map updates.`,
      },
      {
        id: 'l2',
        title: 'Save, Import & Export',
        content: `Right side of the toolbar:

**Save** — writes to browser storage. The button flashes "Saved!" to confirm. Your work is also auto-saved on every change.

**Import** — loads a GeoJSON file from your computer as a new layer. Use this to bring in OS Open Data, SSSI boundaries, or flood zones.

**GeoJSON** — downloads all layers as a single GeoJSON file. Opens in QGIS, ArcGIS, or Google Earth.

**KML** — downloads as KML with styling intact. Fully georeferenced; open in Google Earth or ArcGIS.

> In the Planning tool: click Save now, then try exporting GeoJSON. Open the file in a text editor to see the raw coordinate data.`,
      },
      {
        id: 'l3',
        title: 'Map Overlay Toggles',
        content: `Four toggle buttons sit in the top-right corner of the map:

**Satellite** — switches between dark vector map and Esri World Imagery aerial photography.

**Elevation** — overlays Esri shaded relief. Brighter = higher ground (better wind). Use this when deciding where to place turbines.

**Wind** — coloured circles around each turbine showing hub wind speed. Blue < 6 m/s (poor) → green 6–8 → amber 8–10 → red > 10 m/s (excellent).

**Substations (N)** — shows/hides placed substations. The count shows how many are on the map.

> Go to Planning and toggle each overlay on and off. Satellite + Elevation together gives the best site picture.`,
      },
      {
        id: 'l4',
        title: 'Right Panel — Turbines & Cables Tabs',
        content: `**Turbines tab** — select the active turbine type before placing. The dropdown shows manufacturer, model, MW, rotor diameter, hub height. Each placed turbine appears as a data row — edit name or hub height with the pencil icon.

**Cables tab** — select cable type (voltage, cost/m) before drawing. After drawing, each cable shows name, type, length, and cost. Edit a type's cost with the pencil icon to match site-specific contractor quotes.

> In the Planning tool: open the Turbines tab, expand the type selector, and switch between types. Note how the spec details change.`,
      },
      {
        id: 'l5',
        title: 'Right Panel — Analysis, Layers & Types Tabs',
        content: `**Analysis** — Weibull wind distribution (adjustable k and λ sliders). Once turbines have wind data: monthly energy bar chart + 6 KPI boxes (Gross AEP, Net AEP, Capacity Factor, Avg Hub Wind, Cable Length, Cable Cost).

**Layers** — lists all layers. Click a row to select it (new polygons draw into the selected layer). Eye icon = toggle visibility. Bin = delete. "+ Add Zone" = new polygon layer.

**Types** — turbine library. Edit any spec or add a custom turbine. This is where you enter a real manufacturer's power curve parameters.

> Open each tab in sequence and spend 30 seconds exploring. The next exercise will use all three.`,
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
        title: 'Drawing a Polygon',
        content: `Click **Polygon** in the toolbar. The cursor becomes a crosshair and the hint bar reads "Click to add vertices • Double-click to finish".

Click 5–8 times to place vertices. A dashed line connects them as you go. Once you have 3+ points, the **"Finish (N pts)"** button appears — click it, or double-click, to close the polygon.

**Which layer does it go into?** The layer selected (highlighted) in the Layers tab. Clicking Polygon mode auto-selects the first polygon layer. If you want to draw into a different layer, click that layer in the Layers tab first.

> In the Planning tool: draw a rough site boundary now — 6 vertices, irregular shape. Check the Layers tab to confirm it appeared.`,
      },
      {
        id: 'l2',
        title: 'Editing Polygon Properties',
        content: `Switch to **Select** mode. Click the polygon. A panel appears top-left:

- **Name** — e.g. "Site Boundary", "500m Residential Buffer", "Blanket Bog SSSI"
- **Colour** — 10 presets, native colour picker, or type a hex code directly
- **Fill Transparency** — 0–80%. Most polygons work at 15–30% so the basemap shows through
- **Notes / Data** — free text: owner, lease status, planning reference, area (ha), constraint source

Click **Apply** to save. Changes take effect immediately on the map.

> Edit your boundary now: name it "Gross Site Boundary", set cyan (#06b6d4), 15% opacity, and add a note with the approximate area.`,
      },
      {
        id: 'l3',
        title: 'Vertex Editing',
        content: `Open a polygon's panel (Select mode → click polygon). Click **"✏ Edit / Move Vertices"**.

The outline becomes dashed. White circular handles appear at each vertex.

**Move a vertex** — drag a handle to a new position. The polygon redraws instantly.

**Add a vertex** — click anywhere on the polygon's edge (between two handles). A new vertex inserts at the closest point on that edge. Drag it to the correct position.

**Finish editing** — click anywhere on the polygon fill (not a handle).

> Try vertex-editing your boundary now: drag a corner to reshape it, then add an extra vertex on one edge.`,
      },
      {
        id: 'l4',
        title: 'Layers & Colour Conventions',
        content: `Click **"+ Add Zone"** in the Layers tab to create a new layer. Select it, then draw polygons into it.

**Professional colour conventions:**

*Land acquisition:*
- 🟢 Green — Leased / Option agreed
- 🟡 Amber — Actively negotiating
- 🔴 Red — Not pursuing

*Planning constraints:*
- 🔴 Red — Hard exclusion (SSSI, residential buffer)
- 🟠 Orange — Soft constraint (AONB, PRoW corridor)
- 🟡 Yellow — Advisory zone (noise, heritage)

*Ecological:*
- 🟢 Lime — Habitat survey area
- 🔵 Blue — Watercourse / Flood zone

> Create three layers now — "Leased", "Negotiating", "Hard Constraint" — and assign the correct colours.`,
      },
      {
        id: 'l5',
        title: 'Layer Visibility & Organisation',
        content: `With 8–12 layers on a real project, visibility control is essential.

**Eye icon** — toggle any layer on/off without deleting it. The map updates instantly. Use this when presenting to different stakeholders: show the ecologist only ecological constraints, show the landowner only their parcel.

**Delete** — bin icon removes the layer and all its features. Core layers (Turbines, Cables, Substations) cannot be deleted.

**Best practice:** One layer per constraint type — not everything in one "Constraints" layer. This lets you switch each constraint on/off independently.

> Toggle your constraint layers on and off now. Then export KML and confirm the layers appear as separate folders.`,
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
        title: 'Choosing a Turbine Type',
        content: `Before placing, check the **Turbines tab** — the active type is shown in the selector. Click it to expand and choose:

- **Vestas V150-4.5** (4.5 MW, Ø150m, 105m hub) — standard large onshore turbine
- **Siemens Gamesa SG 5.0-145** (5.0 MW, Ø145m, 115m hub)
- **GE Cypress 5.3-158** (5.3 MW, Ø158m, 120m hub)
- **Enercon E-138 EP3** (4.2 MW, Ø138m, 131m hub)
- **Custom Profile** — edit in Types tab

The type sets hub height (affects wind shear correction), rotor diameter (affects AEP), and rated power (affects total capacity KPI).

> In the Planning tool: open the Turbines tab, select V150-4.5, then open the Types tab to see its full spec.`,
      },
      {
        id: 'l2',
        title: 'Placing Turbines & Reading Live Data',
        content: `Click **Place Turbine**, then click the map. The tool immediately:

1. Fetches ground elevation from Open-Elevation
2. Fetches 30-year mean wind speed at 10m from Open-Meteo
3. Applies power-law shear to calculate hub-height wind speed
4. Estimates AEP using the turbine's power curve × Weibull distribution

All four values appear in the turbine popup and the Turbines tab. The KPI strip at the bottom updates in real time: Turbines / Capacity / AEP / Cap. Factor.

**Placement tip:** use the Elevation overlay to find ridges — higher ground = better wind. Avoid valley floors (sheltered = blue wind circles).

> Place 5 turbines on a ridge. Watch the wind circles appear. Check the KPI strip.`,
      },
      {
        id: 'l3',
        title: 'Setback Radii',
        content: `A setback radius is an orange dashed circle to visually check constraint clearances.

**To set one up:** Select mode → click a turbine → scroll to "Setback / Assessment Radius" → tick "Show on map" → choose distance → Apply.

Presets: **500m / 1km / 2km / 3km**. Or drag the slider for any value.

**UK guidance:**
- 500m — minimum from nearest non-associated dwelling (noise screening)
- 2× tip height — from public roads (~460m for a 5MW turbine)
- 500m — from scheduled monuments / listed buildings (starting point)

You can show different radii on different turbines — e.g. 500m on all, 2km on the one closest to a village.

> Apply 500m setback radii to all 5 turbines. Check no circle overlaps your constraint polygons.`,
      },
      {
        id: 'l4',
        title: 'Editing & Renaming Turbines',
        content: `Three ways to edit a turbine:

**Map popup** — click turbine (Select mode): rename, change type, adjust setback radius, delete.

**Turbines tab** — pencil icon on each row: edit name and hub height inline.

**Data Tables page** — click any cell to edit. Change lat/lng here to fine-tune position without redrawing.

Changing turbine type via the popup updates rated power, rotor diameter, hub height, and AEP immediately.

> Rename all 5 turbines T01–T05 using the Turbines tab pencil icons.`,
      },
      {
        id: 'l5',
        title: 'Layout Iteration Workflow',
        content: `Professional layout design is always iterative:

1. **Draw site boundary** → defines study area
2. **Map constraint layers** → red for hard exclusions, orange for soft
3. **Place turbines** → on highest ground, 4–5 rotor diameters apart (600–750m for V150)
4. **Enable 500m setback radii** → check for constraint overlaps
5. **Check Analysis tab** → target >30% capacity factor, >7.5 m/s avg hub wind
6. **Adjust** → move low-CF turbines to higher ground; delete constraint breachers; add turbines in better wind areas
7. **Save & export** → GeoJSON + KML for QGIS / sharing with consultants

> Use the Data Tables page to edit lat/lng directly if a turbine needs precise repositioning.`,
      },
    ],
  },

  {
    id: 'wind_resource',
    title: 'Cables, Substations & Grid',
    subtitle: 'Cable routing, substation specs, cost estimation & grid connection planning',
    icon: 'BarChart2',
    xp_reward: 125,
    color: 'purple',
    description: 'Design the electrical collection network — cable types, routing topology, substation sizing, and grid connection.',
    lessons: [
      {
        id: 'l1',
        title: 'The Three-Part Electrical Network',
        content: `Every wind farm has three electrical layers:

**1. Internal collection cables** — typically 33kV underground, running from each turbine to the onsite substation. Buried alongside access tracks.

**2. Onsite substation** — steps up from 33kV to 132kV (or higher). Positioned centrally to minimise cable lengths, near a road for access, and near the grid connection point.

**3. Grid connection** — cable or overhead line from the onsite substation to the DNO (Distribution Network Operator) substation on the public grid. Often the most expensive single item.

In the Planning tool, all three use the **Draw Cable** tool — just change the cable type for each segment.`,
      },
      {
        id: 'l2',
        title: 'Cable Types & When to Use Them',
        content: `Open the **Cables tab** and expand the type selector:

- **33kV 150mm² XLPE Underground** (£120/m) — standard collection cable. Use for individual turbine connections.
- **33kV 240mm² XLPE Underground** (£175/m) — higher current capacity. Use for main feeder cables carrying current from multiple turbine strings.
- **33kV Overhead Line** (£45/m) — much cheaper, but visually intrusive. Only suitable in remote areas; requires statutory consent.
- **132kV Overhead Line** (£85/m) — for long grid connections where underground is uneconomical.

Click the pencil icon to edit any cable type's cost — replace with real contractor quotes when you have them.

> Select each cable type and note the voltage, cost, and type before the next step.`,
      },
      {
        id: 'l3',
        title: 'Drawing Cable Routes',
        content: `Click **Draw Cable**. The hint bar reads "Click two points to draw a cable route (Type Name)".

Click a turbine base → click the next turbine → cable draws instantly with length calculated.

**String topology** — T01 → T02 → T03 → Sub (chain). Less cable, lower cost, but one fault takes downstream turbines offline.

**Radial topology** — each turbine directly to Sub. More cable, higher cost, independent connections.

**Route realism tip:** real cables follow access tracks. If the track adds 300m vs a straight line, add a waypoint mid-route by clicking an intermediate point on the track path.

> Draw two strings of 3 turbines each, connecting each string to the substation. Then draw the grid connection using 132kV OHL.`,
      },
      {
        id: 'l4',
        title: 'Placing & Sizing the Substation',
        content: `Click **Substation** → click the map. Click it in Select mode to edit:

- **Name** — e.g. "Knockroe 33/132kV Collection Substation"
- **Transformer MVA** — rule of thumb: total MW capacity × 1.2. For 10 × 4.5MW = 45MW → 60 MVA.
- **Gen Capacity MW** — match to total rated capacity
- **Demand Capacity MW** — usually 0 for a dedicated wind farm
- **Notes** — grid reference, DNO reference, connection application number

Click **Done** to close. Substations also appear in the Data Tables page where you can edit lat/lng precisely.

> Place a substation and fill in all five fields. Check it appears in Data Tables.`,
      },
      {
        id: 'l5',
        title: 'Reading Cable Costs',
        content: `After drawing cables, open the **Analysis tab**. The bottom two KPI boxes show:

- **Cable Length** — total km across all drawn routes
- **Cable Cost** — sum of (length × cost/m) for each cable type

Also check the **Cables tab** summary: routes, total length, total cost, average length per cable.

**UK cost benchmarks (10-turbine, 50MW farm):**
- Internal 33kV collection (8–15km total): £960k–£1.8M
- 132kV grid connection underground (5km): ~£1.5M
- 132kV overhead (10km): ~£850k
- Total electrical infrastructure: £2.5M–£4M (5–10% of total project cost)

> Check your current cable costs against these benchmarks. Are your cable routes realistic?`,
      },
    ],
  },

  {
    id: 'layer_data',
    title: 'Site Constraints & Layer Management',
    subtitle: 'Constraint mapping, buffer analysis, data import & export',
    icon: 'Layers',
    xp_reward: 175,
    color: 'blue',
    description: 'Map planning constraints as GIS layers, apply setback buffers, import external data, and build a professional constraint map.',
    lessons: [
      {
        id: 'l1',
        title: 'Why Layers Matter',
        content: `A wind farm planning application needs dozens of technical assessments — noise, ecology, heritage, hydrology, aviation, visual impact. Each produces a map layer.

**Core project layers** (always present): Site Boundary, Turbines, Cables, Substations.

**Constraint layers** (you create): 500m Residential Buffer, SSSI/SPA boundaries, Ancient Woodland, MOD Radar Zone, Flood Zone 2/3, Aviation Obstacle Surface, PRoW Corridor.

**Assessment layers**: Noise receptor points, ZTV contour, Shadow Flicker hours.

Each layer gets its own colour, its own visibility toggle, and its own data attributes. Organised correctly, the same project file serves every consultant on the team.`,
      },
      {
        id: 'l2',
        title: 'Creating a Constraint Layer — Step by Step',
        content: `Example: 500m residential buffer.

1. Layers tab → **"+ Add Zone"** → new layer appears
2. Click the new layer row to select it
3. Switch to **Polygon** mode → draw a polygon around the dwelling location
4. Switch to **Select** mode → click the polygon:
   - Name: "500m Residential Buffer — Farmhouse A"
   - Colour: Red (#ef4444)
   - Fill: 20%
   - Notes: "Nearest dwelling 320m from proposed T3. ETSU-R-97 noise assessment required. Night-time limit 43 dB LA90."
5. Click **Apply**

Repeat for each dwelling. Five farmhouses = five buffer polygons, all in the same layer.

> Create this layer in the Planning tool now. Draw at least two buffer polygons.`,
      },
      {
        id: 'l3',
        title: 'Importing External GIS Data',
        content: `Click **Import** in the toolbar → select a GeoJSON file → the data appears as a new layer.

**Where to get UK data (all free):**
- OS Open Data (roads, buildings, water): data.os.uk
- SSSI boundaries: magic.defra.gov.uk
- Flood zones: environment.data.gov.uk
- Ancient Woodland: data.forestry.gov.uk
- MOD safeguarding: mod.gov.uk/DIO

After importing: the layer is toggleable and included in GeoJSON/KML exports. Treat it as read-only reference data.

**Practical example:** Import an SSSI GeoJSON. Set its colour to dark red (#dc2626). Toggle it on when placing turbines to check clearance.

> Download the SSSI GeoJSON for any area from magic.defra.gov.uk and import it now.`,
      },
      {
        id: 'l4',
        title: 'Organising for a Planning Deliverable',
        content: `**Naming convention:**
- "Hard Constraint — SSSI Boundary (NE)"
- "Hard Constraint — 500m Residential Buffer"
- "Soft Constraint — AONB Boundary"
- "Advisory — PRoW Corridor 50m"

**Visibility presets before export:**
- Constraint map: show constraints + site boundary, hide turbines and cables
- Layout check: show turbines + boundary + residential buffers
- Cable cost view: show cables + substations only

Use eye icons to switch between these views in seconds.

> Set up these three views in the Layers tab. Notice how quickly each audience's map is constructed.`,
      },
      {
        id: 'l5',
        title: 'Analysis Tab — Project Dashboard',
        content: `The **Analysis tab** auto-updates as you add, move, or delete turbines.

**Weibull sliders** — manually adjust k (shape) and λ (scale) if you have site-specific met mast data. Auto-populated once turbines have real wind data.

**Monthly energy profile** — seasonal breakdown. UK wind farms produce 20–30% more energy November–February vs June–August.

**Six KPI boxes:**
- Gross AEP / Net AEP (Net ≈ Gross − 9% losses)
- Capacity Factor = Net AEP ÷ (Rated Capacity × 8,760h)
- Average Hub Wind Speed
- Total Cable Length / Cost

**UK onshore benchmarks:**
- Capacity factor > 30% = good; < 25% = likely unviable
- Average hub wind > 7.5 m/s = good; < 6.5 m/s = marginal

> Place 5 turbines and check all six KPIs. Adjust Weibull sliders and watch the chart update.`,
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
    description: 'Design a complete 10-turbine wind farm: site boundary, constraints, turbine layout, cables, substation, data review, and export.',
    lessons: [
      {
        id: 'l1',
        title: 'Step 1 — Project Setup & Site Boundary',
        content: `In the Planning tool: click the project name (top-left) and rename it **"Knockroe Wind Farm — Indicative Layout"**.

**Create layers** (Layers tab → "+ Add Zone" four times):
- Site Boundary (cyan, 15%)
- Hard Constraints (red, 20%)
- Soft Constraints (orange, 15%)
- Land Parcels (green, 10%)

**Draw the site boundary:** Polygon mode → Site Boundary layer selected → draw a 6–8 vertex irregular polygon covering a ~5km × 4km upland ridge. Click the polygon in Select mode → name it "Knockroe Site Boundary" → note: "Gross area ~18 km². Upland grassland. Wind 8.5–10.5 m/s hub height."

> Do this step now. The exercise will track your polygon creation.`,
      },
      {
        id: 'l2',
        title: 'Step 2 — Map the Constraints',
        content: `Select **Hard Constraints** layer. Draw two polygons:

**Residential buffer** — oval in the southwest corner. Name: "Knockroe Village — 500m Buffer". Notes: "Nearest dwelling 380m. ETSU-R-97 required. Night limit 43 dB LA90."

**SSSI** — polygon in the northeast corner. Name: "Blanket Bog SSSI". Notes: "Natura 2000 SPA. No turbines within 500m. Hen harrier / golden plover survey required."

Select **Soft Constraints** layer. Draw two more:

**AONB buffer** — along the eastern edge. Name: "AONB — 5km Buffer Zone". Notes: "LVIA and cumulative impact assessment required."

**PRoW corridor** — thin diagonal across the site. Name: "PRoW Route 47 — 50m Corridor". Notes: "Public footpath. Access maintained during construction."

> Toggle the Hard Constraints layer on/off with the eye icon to see the effect.`,
      },
      {
        id: 'l3',
        title: 'Step 3 — Select Turbine Type & Place Layout',
        content: `Turbines tab → select **Vestas V150-4.5 (4.5 MW)**.

Click **Place Turbine**. Place 10 turbines in the developable area:
- Inside site boundary
- Outside residential buffer and SSSI
- Clear of PRoW corridor
- Along the main ridge, spaced ~650m apart (roughly 4× rotor diameter)
- Stagger any second row ~400m laterally to reduce wake losses

As each turbine places, it fetches real elevation and wind data. Green-to-red wind circles = good positions. Blue = move to higher ground.

Check the KPI strip: target ~45 MW capacity, 130–180 GWh AEP, 33–45% capacity factor.

> Place all 10 turbines before moving to Step 4.`,
      },
      {
        id: 'l4',
        title: 'Step 4 — Setbacks & Layout Refinement',
        content: `Select mode → click each turbine → Show on map → **500m** → Apply. Do this for all 10.

Zoom out. Check: does any orange circle overlap a red constraint polygon?

If yes: open Data Tables → edit that turbine's Lat/Lng to move it away, or delete and re-place.

**Spacing check:** No two turbines should be within 450m of each other (3× rotor diameter). In Data Tables, compare lat values — 0.005° ≈ 550m.

Switch T1's radius to **1km** to check outlying dwellings.

**Rename all turbines:** click each → type T01, T02… T10 → Apply. Professional naming is used in all technical reports and consultant drawings.

> Complete this step before moving to Step 5.`,
      },
      {
        id: 'l5',
        title: 'Step 5 — Substation & Cable Network',
        content: `**Place substation:** Substation tool → click near the centre of the turbine cluster (close to a road).

Click it in Select mode. Fill in:
- Name: "Knockroe 33/132kV Collection Substation"
- Transformer MVA: 60
- Gen Capacity MW: 45
- Notes: "132kV underground to nearest DNO substation, ~12km."

**Internal cables (33kV 150mm²):**
- String 1: T01→T02→T03→T04→T05→Substation (5 cables)
- String 2: T06→T07→T08→T09→T10→Substation (5 cables)

**Grid connection:** Change type to **132kV Overhead Line** → draw one cable from substation to site boundary edge.

Check Analysis tab: target ~15–20km total cable, £1.5–£2.5M total cost.

> Complete this step before moving to Step 6.`,
      },
      {
        id: 'l6',
        title: 'Step 6 — Data Review & Export',
        content: `Navigate to **Data Tables** (main nav). Check:

**Turbines:** All 10 listed T01–T10. Hub wind speed values present. AEP values reasonable (~13.8 GWh each at 35% CF). Hub height 105m for all. No 0,0 lat/lng.

**Cables:** 11 total (10 collection + 1 grid). Grid connection type = 132kV OHL. Collection cables = 33kV 150mm². Lengths sensible (collection 300–800m, grid > 2km).

**Substations:** 1 listed, 60 MVA, 45 MW gen capacity, correct lat/lng.

**Polygons:** Site boundary, 4 constraint polygons, all named with notes.

Back in Planning, click **Save** → **GeoJSON** → **KML**.

> Export complete. Your indicative wind farm layout is ready to share with consultants.`,
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