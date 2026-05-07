export const MODULES = [
  {
    id: 'land_acquisition',
    title: 'Toolbar & Interface Basics',
    subtitle: 'Learn every button, panel and mode before touching the map',
    icon: 'Map',
    xp_reward: 120,
    color: 'cyan',
    description: 'A complete walkthrough of the Planning tool interface — every toolbar button, right-hand panel tab, and map overlay explained with exactly what each one does.',
    lessons: [
      {
        id: 'l1',
        title: 'The Toolbar — Left Side',
        content: `The toolbar runs along the top of the Planning page. On the left you will find the project name field (click to rename it) and then five mode buttons:

• **Select** (cursor icon) — the default mode. Click any feature on the map to open its properties panel. Nothing is drawn in this mode.

• **Polygon** (pentagon icon) — draw a filled polygon. Each click places a vertex. When you have 3 or more points, a "Finish (N pts)" button appears. Click it, or double-click on the map, to close the polygon. Polygons are placed into the currently selected layer in the Layers tab.

• **Place Turbine** (wind icon) — click anywhere on the map to drop a turbine at that location. The tool automatically fetches the real elevation from Open-Elevation and the mean wind speed from Open-Meteo for that grid point. Both values appear in the turbine popup and in the Turbines data table. The turbine type placed is whatever is selected in the Turbines tab.

• **Draw Cable** (zap icon) — click a start point then an end point on the map. The cable is drawn and its length is calculated automatically using the Haversine formula. The cable type placed is whatever is active in the Cables tab. You can draw as many cables as needed.

• **Substation** (target icon) — click anywhere on the map to drop a substation marker (yellow square). Click it in Select mode to edit its properties (name, transformer MVA, generation capacity, demand capacity, notes).`
      },
      {
        id: 'l2',
        title: 'The Toolbar — Right Side',
        content: `On the right side of the toolbar:

• **Import** — loads a GeoJSON or GeoJSON file from your computer. The imported data appears as a new layer in the Layers panel. Use this to bring in OS Open Data, SSSI boundaries, flood zones, or any other reference dataset.

• **GeoJSON** — exports your entire project (all layers, all features, all properties) as a single GeoJSON FeatureCollection. This file can be opened in QGIS, ArcGIS Pro, or Google Earth Pro.

• **KML** — exports to KML format with proper styling. KML opens directly in Google Earth and ArcGIS and is fully georeferenced.

• **Save** — saves your current project to the browser's local storage. Your work is also auto-saved whenever you make changes. The button briefly shows "Saved!" to confirm.

At the top of the map you will also see a blue status bar when you are in an active drawing mode — it tells you exactly what to do next (e.g. "Click to add vertices • Double-click to finish").`
      },
      {
        id: 'l3',
        title: 'The Map Overlay Toggles',
        content: `In the top-right corner of the map are four overlay toggle buttons:

• **Satellite** — switches the base map between a dark vector map (default) and Esri World Imagery satellite photography. Use satellite view when you need to see actual field boundaries, woodland, buildings, or roads.

• **Elevation** — overlays an Esri shaded relief layer on top of the base map. This helps you visually understand terrain — ridges appear brighter, valleys darker. Turn this on when assessing whether a site sits on elevated ground (better wind) or in a sheltered valley (poorer wind).

• **Wind** — shows or hides the coloured wind speed circles around each placed turbine. Each circle is coloured by hub wind speed: blue = below 6 m/s (poor), green = 6–8 m/s (moderate), amber = 8–10 m/s (good), red = above 10 m/s (excellent). This gives an instant visual read of the wind resource across your layout.

• **Substations (N)** — shows or hides the placed substations. The count in brackets tells you how many substations are on the map.`
      },
      {
        id: 'l4',
        title: 'The Right-Hand Panel — Turbines & Cables Tabs',
        content: `The right-hand panel has five tabs. The first two are data tables:

**Turbines tab** — shows the active turbine type selector at the top (click it to expand and choose a different turbine model before placing). Below that is a summary of turbine count, total capacity, and estimated total AEP. Each placed turbine appears as a row with its name, rated power, rotor diameter, hub height, elevation, wind speed at 10m, hub wind speed (corrected for height), and estimated AEP. Click the edit (pencil) icon on any row to rename a turbine or change its hub height. Click the bin icon to delete it.

**Cables tab** — shows the active cable type selector (click to expand and pick a different cable spec before drawing). Below is a summary of total routes, total cable length in km, and estimated total cost. Each drawn cable appears as a row with its name, type, length, and cost. Click the pencil icon to edit a cable type's name and cost per metre.`
      },
      {
        id: 'l5',
        title: 'The Right-Hand Panel — Analysis, Layers & Types Tabs',
        content: `**Analysis tab** — shows the Weibull wind distribution chart with adjustable k (shape) and λ (scale) parameters. Once turbines are placed with real wind data, the monthly energy profile bar chart appears, alongside six key metrics: Gross AEP, Net AEP, Capacity Factor, Average Hub Wind Speed, Total Cable Length, and Total Cable Cost.

**Layers tab** — lists every layer in your project (Site Boundary, Turbines, Cables, Substations, and any custom polygon zones you have added). Click a layer row to select it (this determines which layer new polygons are drawn into). Click the eye icon to toggle a layer on or off. Click the bin icon to delete a custom layer. Click "+ Add Zone" to create a new polygon layer with a custom name and colour.

**Types tab** — the turbine library. Shows all available turbine models with their specifications (manufacturer, model, rated power, rotor diameter, hub height, cut-in/cut-out wind speeds, colour). Click the edit icon to modify any spec. Click "+ Add Type" to create a custom turbine profile. This is where you would enter a specific turbine's power curve parameters when moving from indicative to detailed design.`
      },
      {
        id: 'l6',
        title: 'The Data Tables Page',
        content: `The Data Tables page (accessible from the main navigation) gives you a spreadsheet view of all project data — turbines, cables, substations, and polygons — in one place.

**Editing cells** — click any cell to edit it inline. Press Enter or click away to commit the change. Numeric fields (lat/lng, power, capacity) accept numbers only. Changes sync immediately back to the map.

**Adding rows** — for substations, click "+ Add Row" to insert a new substation record. You can then type its coordinates directly in the Lat and Lng columns to position it on the map without using the map tool.

**Deleting rows** — click the ✕ button at the end of any row to permanently remove that feature.

**Refreshing** — if you have made changes in the Planning page and switch to Data Tables, click "Refresh" in the top-right to reload the latest data from local storage.

The Data Tables page is particularly useful for bulk review — checking that all turbines have reasonable hub heights, all cables have the correct type assigned, and all substations have capacity values entered.`
      },
    ],
  },

  {
    id: 'turbine_placement',
    title: 'Polygons — Drawing, Editing & Styling',
    subtitle: 'Site boundaries, constraint zones, colour conventions & vertex editing',
    icon: 'Wind',
    xp_reward: 150,
    color: 'green',
    description: 'Master polygon drawing, vertex editing, colour-coding, and layer management — the foundational GIS skills for mapping any wind farm site.',
    lessons: [
      {
        id: 'l1',
        title: 'Drawing Your First Polygon',
        content: `To draw a polygon, click the **Polygon** button in the toolbar. The cursor changes to a crosshair and the blue status bar reads "Click to add vertices • Double-click to finish".

Click once to place the first vertex. Click again to place the second. Each subsequent click adds another vertex. A dashed preview line connects your points as you go.

When you have placed 3 or more vertices, the "Finish (N pts)" button appears in the toolbar. Either click that button, or double-click on the map, to close the polygon. The polygon fills with your layer colour and becomes a permanent feature.

**Tip:** If you accidentally click in the wrong place, the last placed vertex cannot currently be undone one step — but you can finish the polygon and then edit its vertices afterwards (see the Edit Vertices lesson).

**Which layer does the polygon go into?** Whichever layer is selected (highlighted) in the Layers tab. When you click the Polygon button, the tool automatically selects the first polygon layer. If you want to draw into a different layer — for example "Ecological Constraint" instead of "Site Boundary" — go to the Layers tab first and click the target layer row before drawing.`
      },
      {
        id: 'l2',
        title: 'Editing Polygon Properties',
        content: `After drawing a polygon, switch to **Select** mode (click the cursor icon in the toolbar). Click on the polygon on the map — a properties panel slides open from the top-left corner.

The panel has four fields:

• **Name** — give the polygon a meaningful label, e.g. "Site Boundary", "Farm A — Leased", "500m Residential Buffer", "Ancient Woodland SSSI".

• **Colour** — choose from the preset palette (10 swatches covering cyan, green, amber, red, purple, pink, orange, blue, lime, white). Or click the native colour picker (the square swatch) to open your OS colour wheel. Or type any hex code directly into the text field next to it (e.g. #2dd4bf for teal).

• **Fill Transparency** — the slider controls how transparent the fill is, from 0% (fully opaque, blocks the map underneath) to 80% (nearly transparent). Most planning polygons work best at 15–30% opacity so you can still see the basemap through them.

• **Notes / Data** — a free-text field for any attribute data: owner name, lease status, constraint type, planning reference, area in hectares, or anything else you need to record.

Click **Apply** to save your changes to the map. They take effect immediately.`
      },
      {
        id: 'l3',
        title: 'Vertex Editing — Moving & Adding Points',
        content: `After opening a polygon's property panel (Select mode → click polygon), click the **"✏ Edit / Move Vertices"** button at the bottom of the panel.

The polygon switches to edit mode: the outline becomes dashed and white circular handles appear at each vertex. The status bar reads: **"Drag vertices to reshape • Click edge to add vertex • Click polygon to finish"**.

**Moving a vertex:** Click and hold a white handle, then drag it to its new position. Release to drop it. The polygon redraws instantly. Use this to precisely adjust a boundary that doesn't quite follow a field edge or road.

**Adding a vertex:** While in vertex edit mode, click anywhere on the polygon's edge (the line between two existing vertices). A new vertex is inserted at that exact point, automatically placed on the closest edge. You can then drag it to the correct position. This is how you add detail to a previously rough polygon — for example, adding a notch to exclude a dwelling from a lease boundary.

**Finishing editing:** Click anywhere on the polygon fill (not a vertex handle) to exit vertex edit mode and return to normal Select mode.`
      },
      {
        id: 'l4',
        title: 'Creating Layers & Colour Conventions',
        content: `Each polygon layer groups related features together. In the Layers tab, click **"+ Add Zone"** to create a new layer. A layer named "New Zone" is added — click it to select it, then draw polygons into it.

To rename a layer, you can edit the layer name directly. To change its colour, draw a polygon into it and use the colour picker in the polygon properties panel (the colour applies to the whole layer).

**Professional colour conventions for wind farm GIS:**

For **land acquisition status:**
- 🟢 Green (#10b981) — Leased / Option agreed
- 🟡 Amber (#f59e0b) — Actively negotiating
- 🔴 Red (#ef4444) — Refused / Not pursuing
- 🔵 Cyan (#06b6d4) — Site boundary / Study area

For **planning constraints:**
- 🔴 Red (#ef4444) — Hard exclusion (e.g. SSSI, National Park, residential buffer)
- 🟠 Orange (#f97316) — Sensitive area (e.g. AONB, PRoW corridor)
- 🟡 Yellow (#f59e0b) — Advisory zone (e.g. heritage setting, noise assessment area)
- 🟣 Purple (#8b5cf6) — Site-specific study area

For **ecological features:**
- 🟢 Green (#84cc16) — Habitat survey area
- 🔵 Blue (#3b82f6) — Watercourse / Flood zone
- 🩷 Pink (#ec4899) — Breeding bird survey area`
      },
      {
        id: 'l5',
        title: 'Layer Visibility & Organisation',
        content: `As your project grows, you may have 8–12 layers. Good layer management is essential.

**Toggle visibility** — click the eye icon next to any layer to hide it without deleting it. Hidden layers are greyed out in the panel. Use this when presenting to different audiences — show the landowner only their parcel, show the ecologist only the ecological constraints.

**Layer order** — layers are drawn in the order they appear in the panel (first layer = bottom, last = top). Keep the Site Boundary layer near the bottom so turbines and cables draw on top of it.

**Deleting a layer** — click the bin icon next to a custom layer to permanently remove it and all its features. Core layers (Turbines, Cables, Substations) cannot be deleted.

**Practical workflow tip:** When doing constraint analysis, create one layer per constraint type rather than drawing everything into a single "Constraints" layer. This lets you toggle individual constraints on/off independently — for example, switching off the visual impact zone when discussing noise, or showing just the flood risk layer to an environmental consultant. Each layer can also carry different styling.`
      },
    ],
  },

  {
    id: 'cable_routing',
    title: 'Turbines — Placement, Types & Setbacks',
    subtitle: 'Turbine placement workflow, type selection, setback radii & data table review',
    icon: 'Zap',
    xp_reward: 150,
    color: 'orange',
    description: 'Learn how to place turbines precisely, assign the correct turbine type, use setback radius circles for constraint checking, and review the full data set in the Turbines table.',
    lessons: [
      {
        id: 'l1',
        title: 'Selecting a Turbine Type Before Placing',
        content: `Before you click on the map to place a turbine, always check the active turbine type in the **Turbines tab** of the right-hand panel. The selected type is shown in the blue selector button at the top — it shows the manufacturer, model name, rated power, rotor diameter, and hub height.

Click the selector to expand the dropdown and choose a different turbine type. The tool ships with several pre-configured types:
- Vestas V150-4.5 (4.5 MW, 150m rotor, 105m hub) — a large modern onshore turbine
- Siemens Gamesa SG 5.0-145 (5.0 MW, 145m rotor, 115m hub)
- GE Cypress 5.3-158 (5.3 MW, 158m rotor, 120m hub)
- Enercon E-138 EP3 (4.2 MW, 138m rotor, 131m hub)
- Custom Profile (editable in the Types tab)

**Why it matters:** The turbine type determines the hub height (which affects wind speed correction), rotor diameter (which affects AEP calculation), and rated power (which feeds the total capacity KPI at the bottom of the map). Always match the type to what you are actually proposing for the site.`
      },
      {
        id: 'l2',
        title: 'Placing Turbines & Reading the Data',
        content: `Click **Place Turbine** in the toolbar. The cursor changes to a cross. Click anywhere on the map.

The tool immediately:
1. Fetches the ground elevation from Open-Elevation (shown in the popup as "Elevation: XXXm")
2. Fetches the 30-year mean wind speed at 10m height from Open-Meteo (shown as "Wind 10m: X.X m/s")
3. Applies the power-law wind shear formula to extrapolate hub-height wind speed (shown as "Hub wind: X.X m/s")
4. Calculates an estimated AEP (Annual Energy Production) in MWh/year using the turbine's power curve weighted by the Weibull distribution (shown as "AEP: X.XX GWh")

All four values appear instantly in the turbine popup. They also appear in the Turbines tab data table and in the full Data Tables page.

The turbine icon on the map is coloured to match the turbine type's colour (configurable in the Types tab). A coloured wind speed circle appears around the turbine if the Wind overlay is turned on.

**Reading the KPI strip** at the bottom of the map: as you add turbines, the "Turbines", "Capacity", "Est. AEP", and "Cap. Factor" values update in real time.`
      },
      {
        id: 'l3',
        title: 'Setting Up Setback Radii',
        content: `A setback radius is a circle drawn around a turbine to visually check whether it is too close to a sensitive receptor (dwelling, road, monument). To set one up:

1. Switch to **Select** mode and click a turbine on the map. The turbine properties panel opens.
2. Scroll down to **"Setback / Assessment Radius"**.
3. Tick **"Show on map"**.
4. Use the slider or the preset buttons (500m / 1km / 2km / 3km) to set the radius distance.
5. Click **Apply**.

An orange dashed circle appears on the map centred on the turbine. If the circle extends outside your site boundary polygon, or overlaps a residential area, you can immediately see it and decide whether to move the turbine.

**UK guidance on setbacks:**
- 500m minimum from nearest non-associated dwelling (noise — typically the starting point for screening)
- 2× tip height from public roads (tip height = hub height + half rotor diameter; for a 5MW turbine typically ~230m total, so 460m setback from roads)
- 500m from scheduled monuments and listed buildings as a starting point for heritage assessment
- 5km from some MOD radar installations (check with the specific installation)

You can show different radius distances on different turbines — for example 500m on all turbines and 2km on one specific turbine that is close to a village.`
      },
      {
        id: 'l4',
        title: 'Editing & Renaming Turbines',
        content: `To edit a turbine after placing it:

**Via the map popup** — click the turbine in Select mode. The panel shows:
- A name field at the top — click to edit and rename (e.g. "T1", "T2A", "Hilltop 1")
- A turbine type dropdown — change the type to update all specs and recalculate AEP
- The setback radius controls
- An Apply button to save changes, and a red bin button to delete the turbine

**Via the Turbines tab** — each row has a pencil icon. Click it to edit the turbine name and hub height inline. Press Enter or click the green tick to save. Click the bin icon to delete.

**Via the Data Tables page** — click any cell in the turbines table to edit it. You can change lat/lng coordinates directly here to fine-tune a turbine's position without redrawing it.

**Changing turbine type** — when you change a turbine's type via the popup, the rated power, rotor diameter, and hub height all update automatically. If the turbine has hub wind speed data, the AEP is recalculated immediately.`
      },
      {
        id: 'l5',
        title: 'Iterating the Layout — A Practical Approach',
        content: `Layout design is always iterative. Here is a practical workflow:

**Step 1: Draw the site boundary** first (Polygon mode, into the Site Boundary layer). This defines the study area.

**Step 2: Draw constraint layers** — residential buffers, ecological areas, access corridors. Use red for hard exclusions, orange for soft constraints.

**Step 3: Place indicative turbines** — start by placing turbines in the areas with best wind (highest ground elevation on the Elevation overlay) and furthest from constraint polygons. Aim for equal spacing of roughly 4–5 rotor diameters between turbines.

**Step 4: Enable setback radii** on each turbine at 500m and check for overlaps with the residential buffer polygons.

**Step 5: Review the Analysis tab** — check capacity factor and AEP. A UK onshore site should aim for 30–40% capacity factor. If the AEP looks too low, check the hub wind speeds — turbines in sheltered valley positions will show lower values than ridge-top positions.

**Step 6: Adjust** — move turbines that breach constraints (edit lat/lng in Data Tables), delete under-performing positions, add turbines in better wind areas. Repeat until you are satisfied with the layout.

**Step 7: Save and export** — click Save, then export GeoJSON and KML for use in QGIS or sharing with consultants.`
      },
    ],
  },

  {
    id: 'wind_resource',
    title: 'Cables, Substations & Grid Connection',
    subtitle: 'Cable routing, substation placement, cost calculation & grid connection planning',
    icon: 'BarChart2',
    xp_reward: 125,
    color: 'purple',
    description: 'Plan the electrical collection network — draw cable routes, place substations, select the right cable types, and estimate infrastructure costs.',
    lessons: [
      {
        id: 'l1',
        title: 'Understanding the Electrical Network',
        content: `Every wind farm needs an electrical collection network to get power from each turbine to the grid. The network has three main components:

**1. Internal collection cables** — underground cables (typically 33kV) running from each turbine to a central substation inside the site. These are usually buried along access tracks to minimise disturbance.

**2. The onsite substation** — a transformer station that steps voltage up from 33kV to 132kV (or higher) for efficient transmission. The substation is typically located near the geometric centre of the turbine cluster, close to the grid connection point.

**3. The grid connection** — a cable or overhead line from the onsite substation to the nearest Distribution Network Operator (DNO) substation on the public grid. This is often the most expensive single infrastructure item.

In the planning tool, you represent all three with the same "Draw Cable" tool — just select the appropriate cable type for each segment. The tool calculates length and cost for each cable you draw.`
      },
      {
        id: 'l2',
        title: 'Choosing the Right Cable Type',
        content: `In the **Cables tab**, click the cable type selector to see the available types. The tool ships with four pre-configured cable types:

- **33kV 150mm² XLPE Underground** (£120/m) — the workhorse of onshore wind farm collection systems. Suitable for strings of 2–4 turbines at 3–5 MW each. Most common choice.

- **33kV 240mm² XLPE Underground** (£175/m) — larger cross-section, higher current capacity. Use for main feeder cables carrying current from multiple turbine strings to the substation.

- **33kV Overhead Line** (£45/m) — much cheaper but visually intrusive. Sometimes used in remote locations with no houses within 200m. Requires statutory consent.

- **132kV Overhead Line** (£85/m) — for grid connection where a long distance to the PoC (Point of Connection) makes underground uneconomical.

You can edit any cable type's name and cost per metre in the Cables tab by clicking the pencil icon. This lets you enter site-specific costs from contractor quotes.`
      },
      {
        id: 'l3',
        title: 'Drawing Cable Routes',
        content: `Click **Draw Cable** in the toolbar. The status bar reads: "Click two points to draw a cable route (Cable Type Name)".

Click your start point (e.g. turbine base location) and then your end point (e.g. substation location). The cable is drawn as a straight orange line and the cable length is calculated automatically. Length and cost appear immediately in the Cables tab.

**Practical tips:**

• **String topology** — connect turbines in a chain: T1 → T2 → T3 → Substation. Draw three cables: T1 to T2, T2 to T3, T3 to substation. This uses less cable than connecting each turbine directly to the substation (radial topology), but if one cable fails, turbines downstream of it also go offline.

• **Radial topology** — draw one cable from each turbine directly to the substation. More cable, higher cost, but each turbine is independently connected.

• **Route realism** — in reality cables follow roads and tracks to avoid open-field excavation costs. If your access track is 800m but the straight-line distance is 500m, draw the cable with a waypoint at the track bend to get a more realistic length estimate.

• **Grid connection** — draw a final cable from the onsite substation to the grid connection point (PoC). Change the cable type to 132kV Overhead Line if it is a long distance over open ground.`
      },
      {
        id: 'l4',
        title: 'Placing & Editing Substations',
        content: `Click **Substation** in the toolbar, then click the map to place it. A yellow square marker appears. Click it in Select mode to open the substation properties panel.

The panel has five fields:

• **Name** — e.g. "33/132kV Grid Substation", "Onsite Collection Substation"

• **Transformer (MVA)** — enter the transformer rating. For a 10 × 5MW wind farm (50MW total), a 60–66 MVA transformer is typical (allowing for power factor and losses).

• **Available Gen Capacity (MW)** — how much generation capacity the substation can handle. This should match or exceed your total turbine rated capacity.

• **Available Demand Capacity (MW)** — relevant if the substation also serves local demand (rare for dedicated wind farm substations, but important if connecting to an existing grid substation).

• **Notes** — use for the grid reference, DNO reference number, voltage level, or connection application status.

Click outside the fields to save each value (the fields save on blur). Click **Done** to close the panel. The values appear in the Substations table in the Data Tables page.

You can also add and edit substations directly in the Data Tables page — enter lat/lng coordinates to position a substation precisely.`
      },
      {
        id: 'l5',
        title: 'Reading Cable Costs in the Analysis Tab',
        content: `Once you have drawn cable routes, open the **Analysis tab** in the right-hand panel. Scroll down to the six KPI boxes. The bottom two show:

• **Cable Length** — total cumulative length of all drawn cable routes in kilometres

• **Cable Cost** — total estimated cost in Euros (using the cost per metre from each cable type's specification)

Also check the **Cables tab** directly — it shows a summary grid with: number of routes, total length, total estimated cost, and average cable length. Below that, each individual cable is listed with its name, type, length, and individual cost.

**Cost benchmarking:**
For a 10-turbine, 50MW onshore wind farm in the UK:
- Internal 33kV collection cables: typically 8–15 km total → £960k–£1.8M at £120/m
- 132kV grid connection (underground, 5km): ~£1.5M
- 132kV grid connection (overhead, 10km): ~£850k at £85/m
- Total electrical infrastructure: typically £2.5M–£4M for a 50MW farm

These numbers make the electrical infrastructure 5–10% of total project cost (total project cost for a 50MW onshore farm is typically £60–80M).`
      },
    ],
  },

  {
    id: 'layer_data',
    title: 'Site Constraints & GIS Layer Management',
    subtitle: 'Constraint mapping, buffer analysis, layer organisation & data export',
    icon: 'Layers',
    xp_reward: 175,
    color: 'blue',
    description: 'Map planning constraints as GIS layers, apply setback buffers, import external data, and build a professional constraint map for early-stage site assessment.',
    lessons: [
      {
        id: 'l1',
        title: 'Why GIS Layers Are Central to Wind Farm Planning',
        content: `A wind farm planning application requires dozens of technical assessments — noise, shadow flicker, ecology, heritage, hydrology, aviation, visual impact. Each assessment produces a map layer. Managing these layers systematically in GIS is what separates a professional planning submission from a back-of-envelope exercise.

In the planning tool, every layer you create becomes a building block:

**Core project layers (always present):**
- Site Boundary — the outer limit of the study area
- Turbines — all candidate turbine positions
- Cables — the electrical collection network
- Substations — transformer and grid connection points

**Constraint layers (you create these):**
- 500m Residential Buffer
- SSSI / SAC / SPA Boundaries
- Ancient Woodland Boundary
- MOD Radar Safeguarding Zone
- Flood Zone 2 / Zone 3
- Aviation Obstacle Limitation Surface
- Public Rights of Way (PRoW) Corridor

**Assessment output layers:**
- Noise Assessment Receptor Points
- Zone of Theoretical Visibility (ZTV) Contour
- Shadow Flicker Hours Contour

Each of these gets its own layer, its own colour, and can be toggled independently.`
      },
      {
        id: 'l2',
        title: 'Creating Constraint Layers — Step by Step',
        content: `Here is how to create a residential 500m buffer layer:

**1. Add a new layer** — In the Layers tab, click "+ Add Zone". A "New Zone" layer appears. Click it to select it. It is now the active drawing layer.

**2. Draw the buffer polygon** — Switch to Polygon mode. Draw a polygon that represents the 500m exclusion zone around the nearest dwelling or settlement. In practice you would do this by placing a rough polygon and then vertex-editing it to the correct shape, or importing a pre-computed buffer from QGIS.

**3. Set the polygon properties** — Click the polygon in Select mode. In the properties panel:
- Name it "500m Residential Buffer — Farmhouse A"
- Set colour to red (#ef4444)
- Set fill opacity to 20%
- In Notes: "Nearest dwelling 320m from proposed T3. Noise sensitive receptor. Full BS4142 / ETSU-R-97 assessment required."

**4. Repeat** for each dwelling or settlement. Each gets its own polygon. When you have five farmhouses, you will have five buffer polygons, all in the same layer.

**5. Style the layer** — all polygons in a layer share the same colour (set via any polygon's colour picker). Use red for hard exclusions, orange for soft constraints, yellow for sensitivity areas.`
      },
      {
        id: 'l3',
        title: 'Importing External GIS Data',
        content: `Real wind farm assessments use OS Open Data, Natural England GIS data, Environment Agency flood maps, and many other datasets. These are available as GeoJSON files that you can import directly.

**How to import:**
1. Click **Import** in the toolbar
2. Navigate to your downloaded GeoJSON or GeoJSON file
3. Click Open
4. The data appears as a new layer named after the file

**Where to get the data (UK):**
- OS Open Data (roads, buildings, water): data.os.uk
- SSSI boundaries (Natural England): magic.defra.gov.uk — download as GeoJSON
- Flood zones (Environment Agency): environment.data.gov.uk
- Ancient Woodland (Forestry Commission): data.forestry.gov.uk
- MOD safeguarding zones: mod.gov.uk/defence-infrastructure-organisation

**After importing:**
- The imported layer is selectable and toggleable like any other
- You can draw additional features into it (though typically you treat imported layers as read-only reference data)
- The data is included when you export GeoJSON or KML

**Practical example:** Import the SSSI boundary GeoJSON for your study area. Set its layer colour to dark red (#dc2626). Toggle it on when checking which turbine positions fall within or adjacent to the SSSI boundary.`
      },
      {
        id: 'l4',
        title: 'Organising Layers for a Professional Deliverable',
        content: `When producing a planning constraint map as a deliverable for a client, planning authority, or environmental consultant, layer organisation matters.

**Naming convention:** Use consistent, descriptive names:
- "Hard Constraint — SSSI Boundary (NE)"
- "Hard Constraint — 500m Residential Buffer"
- "Soft Constraint — AONB Boundary"
- "Advisory — PRoW Corridor 50m"
- "Site — Proposed Turbine Positions"
- "Site — Site Boundary"

**Visibility management:** Before exporting or taking a screenshot, decide which layers to show:
- For the headline constraint map: show all constraint layers + site boundary, hide turbines and cables
- For the turbine layout check: show turbines + site boundary + residential buffers, hide other constraints
- For the cable cost estimate: show cables + substations only

**Toggle workflow:** In the Layers tab, use the eye icons to switch layers on and off. The map updates instantly. This is much faster than switching between different saved versions of the project.

**Export:** When the map is set up with the right layers visible, export GeoJSON for sharing with consultants who use QGIS, or KML for clients who use Google Earth.`
      },
      {
        id: 'l5',
        title: 'Using the Analysis Tab for Site Summary',
        content: `The Analysis tab in the right-hand panel is your project dashboard. It auto-updates as you add, move, or delete turbines.

**Wind Distribution panel** — two sliders let you manually adjust the Weibull k and λ parameters if you have site-specific wind data from a met mast or from a commercial resource dataset. Once placed turbines have real wind data fetched from Open-Meteo, the sliders auto-populate with those values. The Weibull curve chart updates in real time as you adjust the sliders.

**Monthly Energy Profile chart** — once you have turbines with AEP estimates, this bar chart shows the seasonal energy output. UK wind farms typically produce 20–30% more energy in winter (November–February) than in summer (June–August) due to Atlantic weather systems. The monthly profile is calculated by scaling the annual AEP by empirical seasonal factors.

**Six KPI boxes:**
- Gross AEP (MWh/yr) — before wake losses and downtime
- Net AEP (MWh/yr) — after ~9% losses (wake effects ~5%, electrical losses ~2%, availability ~2%)
- Capacity Factor (%) — Net AEP ÷ (rated capacity × 8760 hours)
- Average Hub Wind Speed (m/s) — mean across all turbine positions
- Total Cable Length (km) — sum of all drawn cable routes
- Total Cable Cost (£) — sum of (length × cost per metre) for all cables

**Benchmarks for UK onshore sites:**
- Capacity factor: 30–40% is good; below 25% the project may not be economically viable
- Average hub wind speed: above 7.5 m/s is good; below 6.5 m/s is marginal
- Net AEP: for a 10 × 5MW farm, expect 50–80 GWh/year depending on site wind resource`
      },
    ],
  },

  {
    id: 'site_constraints',
    title: 'Full Wind Farm Design — End-to-End Walkthrough',
    subtitle: 'Design a complete 10-turbine wind farm from blank map to export-ready project',
    icon: 'ShieldAlert',
    xp_reward: 200,
    color: 'yellow',
    description: 'A detailed, step-by-step walkthrough of a full wind farm design exercise covering site boundary, constraints, turbine placement, cable routing, substation, data review, and export.',
    lessons: [
      {
        id: 'l1',
        title: 'Step 1 — Set Up the Project & Site Boundary',
        content: `Open the Planning page. At the top-left, click the project name field and rename it: **"Knockroe Wind Farm — Indicative Layout"**.

Click the **Layers tab** in the right-hand panel. You will see four default layers. Click **"+ Add Zone"** four times to create new layers. Rename them:
- "Site Boundary" (already exists — use it)
- "Hard Constraints"
- "Soft Constraints"
- "Land Parcels"
- "Access Roads"

Set colours by clicking each layer's layer and using the colour picker on a drawn polygon:
- Site Boundary → Cyan (#06b6d4), 15% fill
- Hard Constraints → Red (#ef4444), 20% fill
- Soft Constraints → Orange (#f97316), 15% fill
- Land Parcels → Green (#10b981), 10% fill
- Access Roads → White (#ffffff), 80% opacity (use as line approximation)

Now draw the **Site Boundary**: click the Polygon button, then click the Layers tab and make sure "Site Boundary" is selected. Click the Polygon button in the toolbar. Draw a roughly rectangular polygon covering a 5km × 4km upland area. Make it have 6–8 vertices to look realistic — a ridge running northeast–southwest, with the polygon wider in the middle. Click Finish. Click the polygon in Select mode, name it "Knockroe Site Boundary", set colour to cyan, fill 15%, and add a note: "Gross site area ~18 km². Upland grassland and blanket bog. Wind speed 8.5–10.5 m/s at hub height."`
      },
      {
        id: 'l2',
        title: 'Step 2 — Map the Constraints',
        content: `Switch to the **Hard Constraints** layer in the Layers tab (click it to select). Draw these constraint polygons using Polygon mode:

**Polygon 1 — Residential Settlement Buffer:**
Draw a rough oval on the southwest corner of the site where a village would be. Name it "Knockroe Village — 500m Buffer". Colour: Red. Opacity: 20%. Notes: "Nearest dwelling 380m from proposed turbine envelope. ETSU-R-97 assessment required. Night-time noise limit 43 dB LA90."

**Polygon 2 — Bog/SSSI Area:**
Draw a polygon over the northeast corner. Name it "Blanket Bog SSSI". Colour: Dark red (#dc2626). Notes: "Natura 2000 SPA designation. No turbines within 500m of boundary. Ornithological survey required (hen harrier, golden plover)."

Now switch to the **Soft Constraints** layer. Draw:

**Polygon 3 — Visual Sensitivity Zone:**
Draw a polygon along the eastern boundary. Name it "AONB Boundary — 5km Buffer". Colour: Orange (#f97316). Opacity: 15%. Notes: "Adjacent AONB. LVIA and Cumulative Impact Assessment required. Turbines may need visual assessment from key viewpoints."

**Polygon 4 — PRoW Corridor:**
Draw a thin elongated polygon along a diagonal through the site. Name it "PRoW — Route 47 Corridor 50m". Colour: Amber (#f59e0b). Notes: "Public footpath. 50m exclusion zone from path centreline. Access must be maintained during construction."

Now you can see, at a glance, which parts of the site are available for turbines and which are constrained. Toggle the Hard Constraints layer off and on with the eye icon to see the effect.`
      },
      {
        id: 'l3',
        title: 'Step 3 — Select Turbine Type & Place Initial Layout',
        content: `Click the **Turbines tab** in the right-hand panel. Click the turbine type selector and choose **Vestas V150-4.5 (4.5 MW, 150m rotor, 105m hub)**. This is a realistic choice for an upland Irish/UK site.

Click **Place Turbine** in the toolbar. Now place 10 turbines in the developable area — the parts of the site that are:
- Inside the site boundary
- Outside the residential buffer
- Outside the SSSI area
- Clear of the PRoW corridor

**Placement strategy:** Place turbines along the main ridge axis (northeast–southwest), spaced approximately 600–700m apart (this is roughly 4× the 150m rotor diameter, a typical minimum spacing). Stagger any turbines in a second row to the northwest by 400m laterally to reduce wake losses.

As each turbine is placed, the tool fetches real elevation and wind data. Watch the wind speed circles appear — they should be in the green-to-red range (7–10 m/s) for this upland location. If any turbine shows blue (below 6 m/s), it is in a poor wind location — consider moving it.

After placing all 10, check the KPI strip at the bottom: you should see ~45 MW capacity and an estimated AEP of 130–180 GWh/year at 33–45% capacity factor for a good upland site.`
      },
      {
        id: 'l4',
        title: 'Step 4 — Check Setbacks & Refine the Layout',
        content: `Switch to **Select** mode. Click each turbine to open its properties panel. For every turbine:
1. Tick "Show on map" under Setback Radius
2. Set to **500m** (the initial residential screening distance)
3. Click Apply

Now zoom out. Check whether any 500m radius circle overlaps the residential buffer polygon or extends significantly outside the site boundary. If any turbine's orange circle touches the red constraint polygon:
- Open that turbine's panel
- In the Data Tables page, edit its Lat and Lng to move it away from the constraint
- Or delete it and re-place in a better position

**Turbine separation check:** Also eyeball that no two turbines are within 450m of each other (3× rotor diameter minimum). If two turbines are too close, their wakes will significantly reduce each other's AEP. In the Data Tables page, check the lat/lng values — the difference should be roughly 0.005 degrees in latitude ≈ 550m.

After adjustment, switch the setback radius on T1 to **1000m** using the 1km preset button to check against any outlying dwellings. Repeat for any turbine near the edge of the site boundary.

Once satisfied, **rename all turbines** to professional labels: click each turbine, type a name like "T01", "T02", etc. and click Apply.`
      },
      {
        id: 'l5',
        title: 'Step 5 — Place the Substation & Draw the Cable Network',
        content: `**Place the substation:**
Click the **Substation** tool. Place it near the centre of the turbine cluster — ideally near the site access point and close to a public road (to minimise the grid connection cable length). Click the substation in Select mode. Fill in:
- Name: "Knockroe 33/132kV Collection Substation"
- Transformer MVA: 60 (covers 45MW at 0.95 power factor with margin)
- Gen Capacity MW: 45
- Demand Capacity MW: 0
- Notes: "Grid connection: 132kV underground to Ballinrobe 132kV Substation, 12km. Connection application submitted ref: ESB-2024-KW-041."

**Select the cable type:** Go to the Cables tab and select **33kV 150mm² XLPE Underground (£120/m)**.

**Draw the internal string layout:**
Use Draw Cable to connect turbines in two strings:
- String 1: T01 → T02 → T03 → T04 → T05 → Substation (5 cables)
- String 2: T06 → T07 → T08 → T09 → T10 → Substation (5 cables)

Each cable draws as a straight line. For a more accurate length, add a waypoint along the access track where the cable would realistically be buried.

**Draw the grid connection:**
Change cable type to **132kV Overhead Line (£85/m)**. Draw one cable from the substation to the nearest edge of the site boundary (representing the PoC distance).

Check the Analysis tab — you should see total cable length of approximately 15–20 km and total cable cost in the range of £1.5–£2.5M.`
      },
      {
        id: 'l6',
        title: 'Step 6 — Data Tables Review & Export',
        content: `Before exporting, do a full data quality check using the **Data Tables page**. Navigate to it from the main navigation menu.

**Turbines table — check:**
- All 10 turbines are listed with names T01–T10
- All have hub wind speed values (not blank — blank means wind data fetch failed for that position)
- AEP values are present and reasonable (each 4.5MW turbine at 35% CF should produce ~13.8 GWh/yr)
- Hub height column shows 105m for all (matching V150-4.5 spec)
- No turbine shows 0,0 lat/lng (would indicate a data error)

**Cables table — check:**
- 11 cables total (10 collection + 1 grid connection)
- Grid connection cable type is set to 132kV Overhead Line
- All collection cables are set to 33kV 150mm²
- Length values look sensible (collection cables 300–800m, grid connection line > 2km)

**Substations table — check:**
- 1 substation listed with name, 60 MVA transformer, 45 MW generation capacity
- Lat/lng coordinates match the map position

**Polygons table — check:**
- Site Boundary, constraint polygons, and land parcel polygons all listed with correct names and notes

Once satisfied, return to Planning page and click:
1. **Save** — saves to local storage
2. **GeoJSON** — download the full project as a GeoJSON file
3. **KML** — download for Google Earth / ArcGIS presentation

Congratulations — you have completed a full indicative wind farm layout. The exported files are ready to open in QGIS or share with planning consultants, environmental assessors, and the project client.`
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