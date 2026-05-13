/**
 * Guided exercises — run inside the real Planning tool.
 * Each step has:
 *   - instruction: what the user should do
 *   - hint: quick tip
 *   - diagram: optional ASCII/text diagram shown in a code block
 *   - keyPoints: bullet list of key learnings
 *   - action: icon tag ('read'|'place_turbine'|'draw_polygon'|'draw_cable'|'place_substation'|'edit')
 *   - check: ({ layers, turbines, cables, substations }) => boolean
 */

const polyLayers = (layers) =>
  layers.filter(l => !['turbine', 'cable', 'wind_resource', 'substation'].includes(l.type));

const totalPolygons = (layers) =>
  polyLayers(layers).reduce((t, l) => t + l.features.filter(f => f.geometry.type === 'Polygon').length, 0);

export const EXERCISES = {

  land_acquisition: {
    title: 'Mapping Land Parcels',
    intro: 'Use the Planning tool to build a land acquisition map — exactly as you would on a live Irish wind project.',
    steps: [
      {
        action: 'read',
        instruction: '📋 What is land acquisition mapping?',
        hint: 'Before placing a single turbine, a developer must secure legal access to land. This step shows you how GIS supports that process.',
        diagram: `LAND STATUS COLOUR CONVENTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟦 CYAN     — Gross Site Boundary
🟢 GREEN    — Signed lease agreement
🟡 AMBER    — Negotiation ongoing
🔴 RED      — Refused / no access
⬜ WHITE    — Unknown / no contact

These are industry standards used by
Ørsted, SSE, and RWE project teams.`,
        keyPoints: [
          'The gross site boundary encloses ALL land under investigation',
          'Individual parcels nest inside the gross boundary',
          'Colour coding lets the whole team understand status at a glance',
        ],
        check: () => true,
      },
      {
        action: 'draw_polygon',
        instruction: 'Draw your gross site boundary. Click Polygon in the toolbar, place 5–7 vertices on elevated ground, then click Finish.',
        hint: 'Choose an upland area using the Satellite or Elevation overlay. Make it irregular — wind sites are never perfect rectangles.',
        diagram: `HOW TO DRAW A POLYGON
━━━━━━━━━━━━━━━━━━━━
1. Click [Polygon] in toolbar
2. Click on map → vertex added
3. Add 5+ vertices to outline the site
4. When done → click [Finish (N pts)]
   OR double-click the last vertex

  ×─────×
 /       \\
×         ×
 \\       /
  ×─────×
     ↑
  Gross boundary`,
        check: ({ layers }) => totalPolygons(layers) >= 1,
      },
      {
        action: 'edit',
        instruction: 'Click the polygon in Select mode. Name it "Gross Site Boundary", set colour to Cyan, opacity 15%. Add a note with the approximate area in hectares.',
        hint: 'Switch to Select mode first (cursor icon in toolbar). The properties panel appears top-left of the map.',
        diagram: `POLYGON PROPERTIES PANEL
━━━━━━━━━━━━━━━━━━━━━━━
[Name         ] Gross Site Boundary
[Colour       ] ● #06b6d4 (cyan)
[Fill Opacity ] ───●─── 15%
[Notes        ] ~850ha upland site,
                Galway Co. Council area
[ Apply ]  [ 🗑 Delete ]`,
        keyPoints: [
          'Consistent naming matters — consultants, solicitors, and planners all reference the same layer',
          'Opacity 10–20% lets you see the map beneath the polygon',
        ],
        check: ({ layers }) => polyLayers(layers).some(l =>
          l.features.some(f => f.properties?.name?.trim().length > 0 && f.properties?.notes?.trim().length > 0)
        ),
      },
      {
        action: 'draw_polygon',
        instruction: 'Add a "+ New Zone" layer called "Farm A – Leased". Select it in the Layers tab, then draw a polygon inside the site boundary for a leased farm.',
        hint: 'Layers tab → "+ Add Zone" → click the new layer row to select it → switch to Polygon mode → draw inside the site boundary.',
        diagram: `LAYER STACK (Layers tab)
━━━━━━━━━━━━━━━━━━━━━━━
👁 Site Boundary      [1 polygon]
👁 Farm A – Leased    ← select this
👁 Farm B – Negotiating
👁 Turbines
👁 Cables
👁 Substations

Click the layer row to select it
before drawing a polygon.`,
        check: ({ layers }) => totalPolygons(layers) >= 2,
      },
      {
        action: 'draw_polygon',
        instruction: 'Create another layer "Farm B – Negotiating". Draw a second parcel. Set colour to Amber (#f59e0b) — industry convention for ongoing negotiations.',
        hint: 'Amber = talks ongoing. If a landowner says no, change colour to Red and toggle no-turbine zone ON in the polygon properties.',
        keyPoints: [
          'Amber polygons are updated weekly as land negotiations progress',
          'A "No-Turbine Zone" toggle prevents accidental turbine placement in refused areas',
        ],
        check: ({ layers }) => totalPolygons(layers) >= 3 && polyLayers(layers).length >= 3,
      },
      {
        action: 'read',
        instruction: '✅ Use the Export button → GeoJSON to download your map. This file can be opened in QGIS, ArcGIS, or shared with the project legal team.',
        hint: 'GeoJSON is an open standard — any GIS software can read it. In QGIS: Layer → Add Layer → Add Vector Layer → browse to the .geojson file.',
        diagram: `EXPORT WORKFLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━
[Export ▼] → GeoJSON  → QGIS / ArcGIS
           → KML      → Google Earth
           → CSV      → Excel / Sheets
           → PDF      → Client presentation

Your GeoJSON includes:
• All layer colours and names
• Feature names and notes
• Exact WGS84 coordinates`,
        check: () => true,
      },
    ],
  },

  turbine_placement: {
    title: 'Turbine Placement & Setback Radii',
    intro: 'Place turbines with live wind data, apply setback radii, and understand what the KPIs mean.',
    steps: [
      {
        action: 'read',
        instruction: '🌬 What makes a good turbine position?',
        hint: 'Three factors determine whether a turbine position is viable: wind speed, terrain clearance, and distance from constraints.',
        diagram: `TURBINE SITING CRITERIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Wind speed > 7 m/s at hub height
✅ On or near a ridge / hill crest
✅ 500m+ from nearest dwelling
✅ Clear of ASSIs, SPAs, SACs
✅ Accessible by a farm track or road

         WIND PROFILE (vertical)
         ┌─────── Hub height (~100m)
    100m │    ~~~ 9.2 m/s  ← turbine
         │
     10m │    ~~~ 7.0 m/s  ← met mast
         └──────────────────────────
         Wind speed increases with height
         (logarithmic wind shear law)`,
        keyPoints: [
          'Each 1 m/s increase in hub wind speed → ~20% more annual energy',
          'The tool applies the wind shear correction automatically',
        ],
        check: () => true,
      },
      {
        action: 'place_turbine',
        instruction: 'Select a turbine type in the Turbines tab. Click "Place Turbine" and place your first turbine on elevated ground. Wait for the wind data to load.',
        hint: 'Watch for "Fetching real data…" in the toolbar. After ~2 seconds you\'ll see hub wind speed and estimated AEP appear in the Turbines tab.',
        diagram: `WHAT HAPPENS WHEN YOU PLACE A TURBINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Click on map
2. → Fetch elevation (Open-Meteo SRTM)
3. → Fetch 10m wind speed (ERA5 30yr avg)
4. → Apply wind shear correction
       V_hub = V_10m × (h_hub/10)^0.143
5. → Estimate AEP from Weibull + power curve
6. → Turbine marker appears + wind circle`,
        check: ({ turbines }) => turbines.length >= 1,
      },
      {
        action: 'place_turbine',
        instruction: 'Place 4 more turbines along the same ridge, spaced ~650m apart. Watch the wind speed colour circles — green/orange = good, blue = poor.',
        hint: 'Spacing rule: minimum 4× rotor diameter. For a 150m rotor: 4 × 150 = 600m minimum. Closer spacing causes "wake turbulence" — the upwind turbine steals energy from the downwind one.',
        diagram: `TURBINE SPACING (plan view)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🌬 wind direction →

   T1  T2  T3  T4  T5
   ×───×───×───×───×
   |←650m→|

Wind circles (colour = hub wind speed):
  🔵 Blue   < 6 m/s  → poor position
  🟢 Green  6–8 m/s  → acceptable
  🟠 Orange 8–10 m/s → good
  🔴 Red    > 10 m/s → excellent`,
        check: ({ turbines }) => turbines.length >= 5,
      },
      {
        action: 'edit',
        instruction: 'Click a turbine → tick "Show on map" → set radius to 500m → Apply. Add 500m setback circles to all 5 turbines.',
        hint: '500m is the Irish minimum under Wind Energy Guidelines 2006. The orange dashed circle shows the zone — check it doesn\'t overlap any roads, houses, or red constraint polygons.',
        diagram: `SETBACK RADIUS — why it matters
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         🏠 House
          |
     500m |←— setback radius
          |
     ──── × ────  (turbine position)

Irish Wind Energy Guidelines 2006:
  • 500m minimum from a dwelling
  • 2× blade length from a road
  • 3× blade length from a building
  
New NPS (2024 draft): 600m+ in many
Local Authority areas`,
        check: ({ turbines }) => turbines.length >= 5,
      },
      {
        action: 'read',
        instruction: '✅ Open the Analysis tab. Check the 6 KPI boxes. Target: Capacity Factor > 30%, Average Hub Wind > 7 m/s.',
        hint: 'If CF is below 25%, some turbines may be in sheltered valleys. Use the Wind Heat Map toggle to identify the best positions.',
        diagram: `CAPACITY FACTOR — what it means
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CF = Actual AEP ÷ Maximum possible AEP
   = AEP ÷ (Rated MW × 8,760 hours)

Benchmarks for Ireland:
  🟢 35–45% CF  — excellent upland site
  🟡 25–35% CF  — average onshore site
  🔴 < 25% CF   — poor position / too low

A 45MW farm at 35% CF produces:
  45 × 8760 × 0.35 = 137,970 MWh/yr
  ≈ 45,000 homes powered annually`,
        check: () => true,
      },
    ],
  },

  cable_routing: {
    title: 'Cable Routing & Substation Placement',
    intro: 'Design the electrical collection network — place the substation, draw cable strings, and estimate infrastructure costs.',
    steps: [
      {
        action: 'read',
        instruction: '⚡ How does a wind farm electrical system work?',
        hint: 'Power generated at 690V is stepped up at the turbine to 33kV, collected via underground cables, and exported to the national grid via the substation.',
        diagram: `WIND FARM ELECTRICAL LAYOUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
T01──T02──T03──T04    String A
                  ↘
T05──T06──T07──T08──▣ On-Site Sub
                  ↗    33/132kV
T09──T10──T11──T12    String C
                  
▣ → ──────────────── ▣ Grid Sub
On-site 33kV              132kV / 110kV
substation              ESB Networks

Cables:
• 33kV XLPE underground (collection)
• 132kV overhead line (export to grid)`,
        keyPoints: [
          'Turbines connect in "strings" — like Christmas tree lights',
          'Each string carries cumulative power: last cable carries all turbines\' output',
          'The export cable must be sized for the full farm capacity',
        ],
        check: () => true,
      },
      {
        action: 'place_substation',
        instruction: 'Click "Substation" in the toolbar. Place it centrally within your turbine cluster, near a road.',
        hint: 'Central position minimises total cable length. Near a road reduces civil construction costs significantly.',
        diagram: `SUBSTATION SITING PRINCIPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        T1    T2    T3
         \\    |    /
    T6 ── ▣ Sub ── T4
         /    |    \\
        T5    T7    T8

✅ Central to turbine cluster
✅ Adjacent to existing road
✅ Flat ground (civil cost)
✅ Away from ASSIs / habitats
✅ Within 2km of grid connection`,
        check: ({ substations }) => substations.length >= 1,
      },
      {
        action: 'edit',
        instruction: 'Click the substation. Set: Name = "33/132kV Collection Substation", Transformer MVA = 60, Gen Capacity MW = 45.',
        hint: 'Rule of thumb: Transformer MVA = total turbine MW × 1.2. For 10 × 4.5MW = 45MW → need 54MVA → round to 60MVA (next standard size).',
        diagram: `TRANSFORMER SIZING RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total turbine MW = 10 × 4.5MW = 45MW

Transformer MVA = MW ÷ Power Factor
                = 45 ÷ 0.97 = 46.4 MVA

Select next standard size up: 60 MVA
(N+1 redundancy: two 30MVA units)

Standard transformer sizes (MVA):
  10, 16, 20, 30, 40, 60, 90, 120`,
        check: ({ substations }) => substations.length >= 1 && substations.some(s =>
          s.properties?.transformer_mva > 0 && s.properties?.name?.trim().length > 0
        ),
      },
      {
        action: 'draw_cable',
        instruction: 'Click "Draw Cable". Hover near T01 until the yellow snap ring appears, then click. Continue to T02, T03, and finally the substation. Each cable = one path.',
        hint: 'The yellow snap ring shows you\'re connecting exactly to a turbine or substation. Snapped cables show topology arrows in the Cables tab and calculate real load automatically.',
        diagram: `CABLE SNAP FEATURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                 ○ snap ring
                 ↓
  Drawing: ──── × T02 ──── × T03
                         snapped ↑

Load calculated automatically:
  Cable T02→T03 carries:
    T01 (4.5MW) + T02 (4.5MW) = 9.0MW
    
  Cable T03→Sub carries:
    T01 + T02 + T03 = 13.5MW`,
        check: ({ cables }) => cables.length >= 3,
      },
      {
        action: 'draw_cable',
        instruction: 'Draw a second string connecting remaining turbines to the substation. Then change cable type to "132kV Overhead Line" and draw one cable from the substation toward the site edge (grid connection).',
        hint: 'Change cable type in the Cables tab BEFORE drawing the 132kV segment. The export cable to the ESB grid point is typically the most expensive single cable on the project.',
        keyPoints: [
          'Check the load bar on each cable in the Cables tab — red means overloaded',
          'Click "Optimise All Cable Sizes" to auto-select the cheapest cable that fits each load',
        ],
        check: ({ cables }) => cables.length >= 6,
      },
      {
        action: 'read',
        instruction: '✅ Review cable costs in Analysis tab. Check Cable Length and Cable Cost KPIs. Then use Data Tables page to review all cables as a spreadsheet.',
        hint: 'Benchmark: 10 turbines, ~5–8km collection cables, ~£600k–£960k. Grid export cable 2–5km at £85/m = £170k–£425k. Total cable budget usually 3–5% of project CAPEX.',
        diagram: `CABLE COST BENCHMARKS (Ireland 2024)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
33kV 150mm² XLPE underground:  ~€120/m
33kV 240mm² XLPE underground:  ~€160/m
132kV underground cable:       ~€350/m
132kV overhead line:           ~€85/m

Civils (trenching, ducting):   ~€80–120/m
  (add to cable material cost)

Substation (33/132kV, 60MVA):  ~€3–5M
Grid connection fee (ESB):     ~€0.5–2M`,
        check: () => true,
      },
    ],
  },

  wind_resource: {
    title: 'Wind Resource & Energy Analysis',
    intro: 'Use live wind data and the Analysis tab to understand a site\'s energy potential — Weibull distribution, hub wind speeds, and capacity factor.',
    steps: [
      {
        action: 'read',
        instruction: '📊 Understanding wind resource assessment',
        hint: 'Wind speed follows a Weibull probability distribution. The two parameters (k and λ) describe how often different wind speeds occur at a site.',
        diagram: `WEIBULL WIND SPEED DISTRIBUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frequency
   ▲
 7%│     ╭──╮
 6%│    /    \\
 5%│   /      \\
 4%│  /        ──╮
 3%│ /             \\
 2%│/                ───────
   └──────────────────────── Wind speed
   0  2  4  6  8 10 12 14 16 m/s
   
k = shape (steepness of peak, 1.8–2.2 typical)
λ = scale  (related to mean wind speed)

Irish upland sites: k≈2.0, λ≈9–11 m/s`,
        keyPoints: [
          'AEP = integral of (power curve × Weibull PDF) × 8760 hours',
          'Moving λ from 8 to 10 m/s roughly doubles annual energy output',
        ],
        check: () => true,
      },
      {
        action: 'place_turbine',
        instruction: 'Place 3 turbines on elevated ground. Watch for "Fetching real data…" — this confirms live ERA5 wind data is loading from Open-Meteo.',
        hint: 'Each placement fetches 30 days of hourly wind data at 10m, calculates Weibull k and λ, applies wind shear to hub height, then estimates AEP using the power curve.',
        diagram: `DATA PIPELINE FOR EACH TURBINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Click on map
   ↓
Open-Meteo ERA5 API (30yr hourly)
   ↓
Calculate mean speed + Weibull params
   ↓
Wind shear: V_hub = V_10m × (H/10)^0.143
   ↓
Integrate power curve × Weibull PDF
   ↓
AEP estimate (MWh/yr)`,
        check: ({ turbines }) => turbines.length >= 3,
      },
      {
        action: 'read',
        instruction: 'Toggle the Wind Heat Map layer (top-right map buttons). Wind speed circles appear over each turbine. What colours do you see?',
        hint: 'Blue circles = < 6 m/s = poor. Compare to the terrain — blue turbines are usually in valleys. Elevation overlay helps confirm this.',
        diagram: `WIND SPEED COLOUR SCALE
━━━━━━━━━━━━━━━━━━━━━━━━━
🔵 < 6.0 m/s  — poor site
🟢 6–8 m/s    — moderate
🟠 8–10 m/s   — good
🔴 > 10 m/s   — excellent

Wind Heat Map = coloured gradient
circles centred on each turbine.
Larger overlap = more confident
estimate of spatial variation.

Toggle: top-right map buttons → Wind`,
        check: () => true,
      },
      {
        action: 'place_turbine',
        instruction: 'Place 2 more turbines on higher ground. Open the Analysis tab — the Monthly Energy Profile and 6 KPI boxes should now appear.',
        hint: 'The monthly chart shows higher energy in winter (Oct–Feb) — this is typical for Irish wind sites where Atlantic depressions drive the best wind speeds.',
        diagram: `TYPICAL MONTHLY ENERGY PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Energy
  ▲
  │██      ██
  │██ ██ ████ ██
  │██████████████ ██
  │████████████████
  └──────────────────── Month
    J F M A M J J A S O N D

Peak: Nov–Feb (Atlantic storm track)
Trough: Jun–Aug (summer anticyclones)`,
        check: ({ turbines }) => turbines.length >= 5,
      },
      {
        action: 'read',
        instruction: 'Adjust the Weibull k and λ sliders in Analysis tab. Watch the distribution curve and AEP KPIs update in real time.',
        hint: 'k controls the shape (how "peaky" the distribution is). λ controls the scale (the most probable speed). Higher λ = windier site = much more energy.',
        diagram: `WEIBULL SLIDER EFFECTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Shape k (1–4):
  Low k (1.5) = very gusty/variable
  High k (3.0) = steady consistent wind
  Typical onshore: k = 1.8–2.2

Scale λ (3–15 m/s):
  λ = 7  → mean wind ~6.3 m/s  (poor)
  λ = 9  → mean wind ~8.0 m/s  (good)
  λ = 11 → mean wind ~9.8 m/s  (excellent)

Formula: mean speed ≈ λ × Γ(1 + 1/k)`,
        check: () => true,
      },
      {
        action: 'read',
        instruction: '✅ Check KPI targets: CF > 30%, avg hub wind > 7 m/s. Export as PDF Report to get the full energy yield summary document.',
        hint: 'The PDF includes the monthly profile chart, Weibull curve, turbine inventory, and all KPIs — ready to share with an energy consultant for peer review.',
        diagram: `ENERGY YIELD TARGETS (Irish onshore)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                 Poor  Good  Excellent
Capacity Factor: <25%  25-35%  >35%
Hub Wind Speed:  <7     7-9    >9 m/s
Net AEP/turbine: <12   12-18   >18 GWh

P50 = median annual energy production
P90 = exceeded in 9 out of 10 years
(used for project financing)`,
        check: () => true,
      },
    ],
  },

  layer_data: {
    title: 'Constraint Mapping & Layer Management',
    intro: 'Build a professional constraint map with the correct colour conventions — ready to share with Irish planning consultants.',
    steps: [
      {
        action: 'read',
        instruction: '📋 Irish Planning & Environmental Constraints — Overview',
        hint: 'Wind farm consenting in Ireland is governed by multiple overlapping regimes. This step introduces the main constraint categories.',
        diagram: `CONSTRAINT HIERARCHY (Ireland)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE (turbines prohibited):
  • National Parks (NPWS)
  • SACs / SPAs (Natura 2000)
  • UNESCO World Heritage Sites
  • Active peatland

HIGHLY RESTRICTED:
  • AONBs (NI) / High Landscape Areas
  • ASSIs / NHAs
  • 500m residential setback zones
  • Radar safeguarding zones

SUBJECT TO ASSESSMENT:
  • 5–15km ZTV (visual impact)
  • Airport safeguarding (30km)
  • Deep peat (>0.5m depth)
  • Archaeological zones`,
        keyPoints: [
          'Load the demo project to see all Irish national constraints pre-mapped',
          'Red = absolute constraint. Orange = restricted. Yellow = assess carefully',
        ],
        check: () => true,
      },
      {
        action: 'draw_polygon',
        instruction: 'Create a "Hard Constraints" layer. Draw a polygon for a 500m residential buffer zone. Set colour to Red (#ef4444), opacity 20%, and turn on "No-Turbine Zone" toggle.',
        hint: 'Click the polygon → toggle "No-Turbine Zone" → Apply. The ⛔ icon will appear on the layer. Any turbine placed inside will now be blocked with a red warning.',
        diagram: `NO-TURBINE ZONE TOGGLE
━━━━━━━━━━━━━━━━━━━━━━━━
Polygon properties panel:
  ┌─────────────────────────┐
  │ ⛔ No-Turbine Zone  [ON]│
  │ "Blocks turbine         │
  │  placement in polygon"  │
  └─────────────────────────┘
  
When toggle is ON:
  • Layer shows ⛔ badge in Layers tab
  • Turbine placement inside = blocked
  • Red warning banner appears for 5s`,
        check: ({ layers }) => polyLayers(layers).some(l =>
          l.features.some(f => f.geometry.type === 'Polygon')
        ),
      },
      {
        action: 'edit',
        instruction: 'Click the red polygon → Notes: "500m residential buffer — 3 dwellings within 600m. ETSU-R-97 noise assessment required. Nearest dwelling: 520m from T3."',
        hint: 'Planning assessors and An Bord Pleanála inspectors read these notes. Include: which turbine is closest, the actual separation distance, and the relevant standard.',
        keyPoints: [
          'ETSU-R-97 = UK noise standard adopted in Ireland',
          'NNL at a dwelling must be ≤ 45 dB LA90 (day) / 43 dB LA90 (night)',
          'Shadow flicker must be < 30 hours/year at any receptor',
        ],
        check: ({ layers }) => polyLayers(layers).some(l =>
          l.features.some(f => (f.properties?.notes?.trim().length || 0) > 15)
        ),
      },
      {
        action: 'draw_polygon',
        instruction: 'Create a "Soft Constraints" layer. Draw an AONB boundary near the site edge. Name it "High Landscape Area — 5km Buffer", colour Orange (#f97316).',
        hint: 'Soft constraints don\'t prevent turbines but require enhanced assessment: LVIA from designated viewpoints, photomontages from public rights of way.',
        diagram: `LVIA = Landscape & Visual Impact Assessment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Required when site is within:
  • 5km of an AONB / High Landscape Area
  • 15km of a National Park
  • 5km of a designated viewpoint
  
Photomontages required from:
  • All public roads within ZTV
  • All recognised viewpoints
  • All nearby settlements`,
        check: ({ layers }) => polyLayers(layers).length >= 2 && totalPolygons(layers) >= 2,
      },
      {
        action: 'draw_polygon',
        instruction: 'Draw a "Developable Envelope" polygon — the area remaining after removing all constraint zones. Green (#10b981), opacity 20%.',
        hint: 'On a typical constrained Irish site, only 20–40% of the gross area is developable. This polygon defines the turbine layout team\'s "available canvas".',
        diagram: `GROSS SITE vs DEVELOPABLE ENVELOPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌────────────────────────────────┐
│  GROSS SITE BOUNDARY           │
│  ┌──────────────────────────┐  │
│  │                          │  │
│  │  ╔══════════════╗        │  │
│  │  ║  DEVELOPABLE ║        │  │
│  │  ║  ENVELOPE    ║        │  │
│  │  ╚══════════════╝        │  │
│  │  ████ CONSTRAINT         │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
Typical: 25–40% of gross = available`,
        check: ({ layers }) => totalPolygons(layers) >= 3 && polyLayers(layers).length >= 3,
      },
      {
        action: 'read',
        instruction: '✅ Use Export → KML to download your constraint map. The file contains your layers as separate folders with colours — ready to send to a planning consultant or open in Google Earth.',
        hint: 'In Google Earth: File → Open → select .kml file. Each layer is a separate folder you can toggle. Share via Google Earth project or email the .kml directly.',
        diagram: `KML EXPORT — what consultants get
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 Ballycraggan Wind Farm.kml
  📁 Site Boundary
     📍 Gross Site Boundary
  📁 Hard Constraints  
     📍 500m Residential Buffer
  📁 Soft Constraints
     📍 High Landscape Area
  📁 Developable Envelope
     📍 Available Area

Opens in: Google Earth, QGIS, ArcGIS,
AutoCAD Civil 3D, Global Mapper`,
        check: () => true,
      },
    ],
  },

  site_constraints: {
    title: 'Full Site Design — End to End',
    intro: 'Complete a full wind farm design from a blank map to final export. Replicates the workflow used by Irish wind energy developers.',
    steps: [
      {
        action: 'read',
        instruction: '🗺 Overview: the 6 stages of a wind farm design',
        hint: 'This exercise takes you through the complete workflow — from blank map to an exportable project file ready for consultant review.',
        diagram: `WIND FARM DEVELOPMENT WORKFLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stage 1: LAND           — polygon mapping
Stage 2: CONSTRAINTS    — exclusion zones
Stage 3: WIND RESOURCE  — data collection
Stage 4: LAYOUT         — turbine placement
Stage 5: INFRASTRUCTURE — cables + substation
Stage 6: EXPORT         — reports + files

⏱ In practice: Stage 1–2 take 6–18 months
   Stage 3: 1–2 years of met mast data
   Stage 4–5: 3–6 months of design iteration
   This exercise: ~20 minutes`,
        check: () => true,
      },
      {
        action: 'draw_polygon',
        instruction: 'Stage 1: Draw a site boundary — 6–8 vertices, ~5km across. Create a "Site Boundary" layer, draw the polygon, name it, set cyan colour + 15% opacity.',
        hint: 'Use Satellite + Elevation overlays to pick an upland area. Draw across a ridge for the best wind resource. Irregular shapes look professional.',
        check: ({ layers }) => polyLayers(layers).some(l =>
          l.features.some(f => f.geometry.type === 'Polygon' && (f.properties?.name?.trim().length || 0) > 0)
        ),
      },
      {
        action: 'draw_polygon',
        instruction: 'Stage 2: Create "Hard Constraints" layer. Draw 2 polygons: a residential buffer (red, SW corner) and a pSAC zone (dark green, NE corner). Enable "No-Turbine Zone" on both. Add notes.',
        hint: 'Red = no turbines. Toggle "No-Turbine Zone" on to activate the placement blocker. The ⛔ badge appears in the Layers tab.',
        diagram: `CONSTRAINT COLOUR CONVENTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#ef4444 🔴 Residential buffer / noise
#dc2626 🔴 SAC / SPA / Natura 2000
#84cc16 🟢 NHA / ASSI
#f59e0b 🟡 Visual / LVIA buffer
#38bdf8 🔵 Flood risk zone
#b45309 🟫 Archaeological / heritage`,
        check: ({ layers }) => totalPolygons(layers) >= 3,
      },
      {
        action: 'place_turbine',
        instruction: 'Stage 3 + 4: Select a turbine type. Place 8–10 turbines along the ridge, clear of constraint polygons, spaced 650m+ apart.',
        hint: 'Use Elevation overlay + Wind Heat Map. Place on the highest ground visible. Green/orange wind circles = good positions. If a placement is blocked, a red warning will appear.',
        check: ({ turbines }) => turbines.length >= 6,
      },
      {
        action: 'edit',
        instruction: 'Add 500m setback radii to every turbine. Rename all turbines T01–T10. Check no orange circle overlaps a red constraint polygon.',
        hint: 'Data Tables page → edit Lat/Lng cells directly to fine-tune positions without redrawing. Consistent T01-T10 naming is essential for noise/shadow consultants.',
        check: ({ turbines }) => turbines.length >= 6 &&
          turbines.filter(t => /^T\d+$/i.test(t.properties?.name || '')).length >= 3,
      },
      {
        action: 'place_substation',
        instruction: 'Stage 5: Place the substation centrally. Set: Name = "Knockroe 33/132kV", Transformer MVA = 60, Gen Capacity = 45 MW.',
        check: ({ substations }) => substations.length >= 1 && substations.some(s => s.properties?.transformer_mva > 0),
      },
      {
        action: 'draw_cable',
        instruction: 'Draw two turbine strings (33kV) to the substation. Then draw the grid export cable (132kV Overhead Line) from substation to the site boundary.',
        hint: 'String topology: T01→T02→T03→T04→T05→Sub, T06→T07→T08→T09→T10→Sub. Change cable type before drawing the 132kV export segment.',
        check: ({ cables }) => cables.length >= 5,
      },
      {
        action: 'read',
        instruction: '✅ Final checks: Analysis tab CF > 30%. All cables show green load bars. Export → PDF Report for the full summary. Export → GeoJSON for QGIS.',
        hint: 'Target: 10 turbines, ~45MW, 130–180 GWh AEP, 33–45% CF. Your exported GeoJSON can be opened in QGIS for further analysis using OS mapping, Ordnance Survey Ireland data, and elevation models.',
        diagram: `DELIVERABLES CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Site boundary polygon (cyan)
✅ Constraint layers (red/green/orange)
✅ 8–10 turbines with AEP data
✅ Setback circles on all turbines
✅ Substation with transformer data
✅ Cable strings with load verification
✅ CF > 30% in Analysis tab
✅ GeoJSON exported for QGIS
✅ PDF report for client/team review`,
        check: () => true,
      },
    ],
  },
};