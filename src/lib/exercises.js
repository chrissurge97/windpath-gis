/**
 * Guided exercises that run inside the real Planning tool.
 * Each step has:
 *   - instruction: what the user should do
 *   - hint: quick tip
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
    intro: 'Use the Planning tool to build a basic land acquisition map — exactly as you would on a live project.',
    steps: [
      {
        action: 'draw_polygon',
        instruction: 'Draw a site boundary polygon: click Polygon in the toolbar, place at least 5 vertices on the map, then click Finish.',
        hint: 'Make it an irregular shape — not a rectangle. The "Finish (N pts)" button appears once you have 3+ vertices.',
        check: ({ layers }) => totalPolygons(layers) >= 1,
      },
      {
        action: 'edit',
        instruction: 'Click the polygon (Select mode) to open its properties. Name it "Gross Site Boundary", set colour to Cyan (#06b6d4), opacity 15%, and add a note. Click Apply.',
        hint: 'Switch to Select mode first (cursor icon in toolbar). The panel appears top-left.',
        check: ({ layers }) => polyLayers(layers).some(l => l.features.some(f => f.properties?.name?.trim().length > 0 && f.properties?.notes?.trim().length > 0)),
      },
      {
        action: 'draw_polygon',
        instruction: 'Create a new layer ("Farm A – Leased") via the Layers tab "+ Add Zone". Select it, then draw a polygon inside the site boundary. Set colour to Green (#10b981).',
        hint: 'Click "+ Add Zone", click the new layer row to select it, then switch to Polygon mode and draw.',
        check: ({ layers }) => totalPolygons(layers) >= 2,
      },
      {
        action: 'draw_polygon',
        instruction: 'Create another layer ("Farm B – Negotiating"). Draw a second land parcel. Set colour to Amber (#f59e0b) — the industry convention for ongoing negotiations.',
        hint: 'Repeat the same process: + Add Zone → select layer → draw polygon → click polygon in Select mode → change colour → Apply.',
        check: ({ layers }) => totalPolygons(layers) >= 3 && polyLayers(layers).length >= 3,
      },
      {
        action: 'edit',
        instruction: 'Click each parcel polygon and add relevant notes (e.g. landowner name, area in ha, lease status). Then toggle layers on/off using the eye icons in the Layers tab.',
        hint: 'Notes field stores any text — landowner contact, grid reference, site area, planning status.',
        check: ({ layers }) => polyLayers(layers).filter(l => l.features.some(f => f.properties?.notes?.trim().length > 5)).length >= 2,
      },
      {
        action: 'read',
        instruction: '✅ Export the project as GeoJSON (toolbar → GeoJSON). This file can be opened in QGIS, ArcGIS, or shared with the project team.',
        hint: 'The GeoJSON export includes all layers, all feature properties, and all coordinates. Open it in a text editor to inspect the raw data structure.',
        check: () => true,
      },
    ],
  },

  turbine_placement: {
    title: 'Turbine Placement & Setback Radii',
    intro: 'Place turbines with live wind and elevation data, apply setback radii, and review the energy KPIs.',
    steps: [
      {
        action: 'read',
        instruction: 'Open the Turbines tab. Expand the type selector and choose a turbine model. Note its rated power (MW), rotor diameter (m), and hub height (m).',
        hint: 'The Vestas V150-4.5 (4.5 MW, 150m rotor, 105m hub) is typical for UK/IE upland sites. Hub height determines the wind shear correction applied to the 10m wind data.',
        check: () => true,
      },
      {
        action: 'place_turbine',
        instruction: 'Turn on the Elevation overlay (top-right map toggle). Click "Place Turbine" and place your first turbine on the highest visible ground.',
        hint: 'Brighter areas on the elevation overlay = higher ground = better wind. The tool will fetch real wind speed data — you\'ll see "Fetching real data…" in the toolbar.',
        check: ({ turbines }) => turbines.length >= 1,
      },
      {
        action: 'place_turbine',
        instruction: 'Place 4 more turbines along the same ridge, spaced ~650m apart. Watch the KPI strip at the bottom — Capacity and AEP update with each turbine.',
        hint: 'Space = 4× rotor diameter minimum (4 × 150m = 600m). The KPI strip shows real-time total capacity (MW), estimated AEP (GWh), and capacity factor (%).',
        check: ({ turbines }) => turbines.length >= 5,
      },
      {
        action: 'edit',
        instruction: 'Select mode → click a turbine → tick "Show on map" under Setback Radius → set to 500m → Apply. Add 500m setback circles to all 5 turbines.',
        hint: '500m is the UK minimum residential separation for noise screening. The orange dashed circle shows the exclusion zone on the map — check it doesn\'t overlap any dwellings.',
        check: ({ turbines }) => turbines.length >= 5,
      },
      {
        action: 'edit',
        instruction: 'Rename all 5 turbines T01–T05 using the pencil icons in the Turbines tab. Then check the Analysis tab — is capacity factor above 30%?',
        hint: 'If capacity factor is below 25%, turbines may be in sheltered positions. Move them to higher ground using the Data Tables page lat/lng fields.',
        check: ({ turbines }) => turbines.filter(t => /^T0?\d+$/i.test(t.properties?.name || '')).length >= 3,
      },
      {
        action: 'read',
        instruction: '✅ Open the Analysis tab. Check all 6 KPI boxes. Turn the Wind overlay on to see hub wind speed circles. Blue circles = poor positions — consider moving those turbines.',
        hint: 'Target: Capacity Factor > 30%, Average Hub Wind > 7 m/s. The monthly energy profile chart should show higher winter production.',
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
        instruction: 'Open the Cables tab. Expand the cable type selector and note the four available types. Select "33kV 150mm² XLPE Underground (£120/m)" — the standard collection cable.',
        hint: 'Check the cable specs: voltage, current capacity (ampacity), cost per metre. The pencil icon lets you edit cost to match real contractor quotes.',
        check: () => true,
      },
      {
        action: 'place_substation',
        instruction: 'Click "Substation" in the toolbar. Place the substation near the centre of your turbine cluster — close to a road if possible.',
        hint: 'Good substation position: central to turbines (minimises cable lengths), near a road (access during construction), near the grid connection point (minimises export cable).',
        check: ({ substations }) => substations.length >= 1,
      },
      {
        action: 'edit',
        instruction: 'Click the substation (Select mode). Fill in: Name = "33/132kV Collection Substation", Transformer MVA = 60, Gen Capacity MW = 45. Click Done.',
        hint: 'Rule of thumb: Transformer MVA = total turbine MW × 1.2. For 10 × 4.5MW = 45MW → 60 MVA (allows for power factor and future expansion).',
        check: ({ substations }) => substations.length >= 1 && substations.some(s => s.properties?.transformer_mva > 0 && s.properties?.name?.trim().length > 0),
      },
      {
        action: 'draw_cable',
        instruction: 'Click "Draw Cable" (33kV 150mm² selected). Connect turbines into a string: T01→T02→T03→Substation. Draw each segment as a separate cable click.',
        hint: 'Each cable = one click pair (start point → end point). For a 3-turbine string you need 3 cable segments. Length and cost update in the Cables tab instantly.',
        check: ({ cables }) => cables.length >= 3,
      },
      {
        action: 'draw_cable',
        instruction: 'Draw a second string: T04→T05→Substation. Then change cable type to "132kV Overhead Line (£85/m)" in the Cables tab and draw one cable from substation toward the site boundary (grid connection).',
        hint: 'The grid connection represents the export cable to the nearest DNO substation. Draw it toward the nearest road or site boundary edge.',
        check: ({ cables }) => cables.length >= 6,
      },
      {
        action: 'read',
        instruction: '✅ Open the Analysis tab and check Cable Length and Cable Cost KPIs. Then go to Data Tables to review all cables in the spreadsheet. Check each has the correct type and a sensible length.',
        hint: 'Benchmarks: 5 turbines, internal collection ~3–5km, £360k–£600k. Grid connection depends on distance to DNO — typically £200k–£1.5M.',
        check: () => true,
      },
    ],
  },

  wind_resource: {
    title: 'Wind Resource & Energy Analysis',
    intro: 'Use live wind data and the Analysis tab to understand a site\'s energy potential — Weibull distribution, hub wind speeds, AEP, and capacity factor.',
    steps: [
      {
        action: 'place_turbine',
        instruction: 'Place 3 turbines on elevated ground. Watch for "Fetching real data…" in the toolbar — this confirms live wind and elevation data is being retrieved.',
        hint: 'Each turbine fetch takes 1–3 seconds. The spinner in the toolbar shows it\'s working. Once loaded, hub wind speed and AEP appear in the Turbines tab.',
        check: ({ turbines }) => turbines.length >= 3,
      },
      {
        action: 'read',
        instruction: 'Turn on the Wind overlay (top-right map button). Wind speed circles appear. Identify any blue turbines (< 6 m/s) and note their positions relative to the terrain.',
        hint: 'Blue = poor wind position. Compare to the Elevation overlay — blue turbines are usually in valley positions. They drag down the average hub wind speed and capacity factor.',
        check: () => true,
      },
      {
        action: 'place_turbine',
        instruction: 'Place 2 more turbines on higher ground than your first 3. After they load, open the Analysis tab — the Monthly Energy Profile chart should now appear.',
        hint: 'The monthly chart requires turbines with AEP data. UK wind farms peak in November–February. If the chart is flat, wind data may still be loading — wait a few seconds.',
        check: ({ turbines }) => turbines.length >= 5,
      },
      {
        action: 'read',
        instruction: 'In the Analysis tab, adjust the Weibull k slider (1–4) and λ slider (3–15 m/s). Watch the wind speed distribution curve update. Higher λ = faster mean wind = more energy.',
        hint: 'UK upland sites: k ≈ 1.8–2.2, λ ≈ 7–10 m/s. The sliders auto-populate from real wind data once turbines are placed — you can override them with met mast values.',
        check: () => true,
      },
      {
        action: 'edit',
        instruction: 'In the Turbines tab, move any low-performing turbine (blue wind circle) to a better position. Edit its lat/lng directly in the Data Tables page to fine-tune placement.',
        hint: 'Data Tables → Turbines table → click the Lat or Lng cell → type new value → press Enter. The turbine moves on the map. Check if the wind circle colour improves.',
        check: ({ turbines }) => turbines.length >= 5,
      },
      {
        action: 'read',
        instruction: '✅ Check the 6 KPI boxes: target Capacity Factor > 30%, Average Hub Wind > 7 m/s. Go to Data Tables and confirm all turbines have hub wind speed and AEP values populated.',
        hint: 'If a turbine shows no hub wind speed, its API fetch may have failed. Delete it and re-place to trigger a new fetch. Wind data is from Open-Meteo — 30-year climate average.',
        check: () => true,
      },
    ],
  },

  layer_data: {
    title: 'Constraint Mapping & Layer Management',
    intro: 'Build a professional constraint map with dedicated layers, correct colour conventions, and notes — ready to share with planning consultants.',
    steps: [
      {
        action: 'draw_polygon',
        instruction: 'Create a "Hard Constraints" layer (Layers tab → + Add Zone). Select it. Draw a polygon representing a 500m residential buffer. Set colour to Red (#ef4444), opacity 20%.',
        hint: 'In real projects, dwelling locations come from Ordnance Survey AddressBase. You would draw buffer polygons around each one, or import QGIS-generated buffers as GeoJSON.',
        check: ({ layers }) => polyLayers(layers).some(l => l.features.some(f => f.geometry.type === 'Polygon')),
      },
      {
        action: 'edit',
        instruction: 'Click the red polygon (Select mode). In Notes, type: "500m residential buffer. Nearest dwelling 320m from T3. ETSU-R-97 noise assessment required." Click Apply.',
        hint: 'Planning assessors and noise consultants read these notes. Include: which turbine is affected, the actual separation distance, and the relevant technical standard.',
        check: ({ layers }) => polyLayers(layers).some(l => l.features.some(f => (f.properties?.notes?.trim().length || 0) > 15)),
      },
      {
        action: 'draw_polygon',
        instruction: 'Create a "Soft Constraints" layer. Draw a polygon for an AONB boundary near the site edge. Name it "AONB — 5km Buffer Zone", colour Orange (#f97316), opacity 15%.',
        hint: 'Soft constraints don\'t prevent turbines but require extra assessment. AONB proximity triggers a Landscape and Visual Impact Assessment (LVIA) from designated viewpoints.',
        check: ({ layers }) => polyLayers(layers).length >= 2 && totalPolygons(layers) >= 2,
      },
      {
        action: 'draw_polygon',
        instruction: 'Draw a "Developable Envelope" polygon in a new layer — the area remaining after removing all constraint zones. Set colour to Green (#10b981), opacity 20%.',
        hint: 'On a constrained UK site, typically only 15–30% of gross site area is developable. The envelope is what you show the turbine layout team as the "available area".',
        check: ({ layers }) => totalPolygons(layers) >= 3 && polyLayers(layers).length >= 3,
      },
      {
        action: 'edit',
        instruction: 'In the Layers tab: hide Hard Constraints (eye icon), then show again. Do the same for Soft Constraints. This is how you switch views for different stakeholders.',
        hint: 'One toggle to go from "constraint map for the ecologist" to "clean layout map for the client presentation". No need to maintain multiple project files.',
        check: () => true,
      },
      {
        action: 'read',
        instruction: '✅ Export as KML (toolbar → KML). The file contains your constraint layers as separate folders with colours preserved — exactly what you would send to a planning consultant.',
        hint: 'Open the KML in Google Earth: each layer folder is independently toggleable. Share via Google Earth project link or send the .kml file directly.',
        check: () => true,
      },
    ],
  },

  site_constraints: {
    title: 'Full Site Design — End to End',
    intro: 'Complete a full wind farm design from blank map to export. Replicates the workflow used by professional wind energy developers.',
    steps: [
      {
        action: 'draw_polygon',
        instruction: 'Step 1: Draw a realistic site boundary — 6–8 vertices, irregular shape, ~5km across. Create a "Site Boundary" layer (Layers tab → + Add Zone), select it, draw the polygon, then name it and set cyan colour + 15% opacity.',
        hint: 'Use Satellite + Elevation overlays to pick an upland area. Draw the boundary across a ridge. Irregular shapes look professional — avoid perfect rectangles.',
        check: ({ layers }) => polyLayers(layers).some(l => l.features.some(f => f.geometry.type === 'Polygon' && (f.properties?.name?.trim().length || 0) > 0)),
      },
      {
        action: 'draw_polygon',
        instruction: 'Step 2: Create "Hard Constraints" layer. Draw 2 polygons: a residential buffer (oval, SW corner, red) and an SSSI zone (NE corner, dark red). Name each with descriptive notes.',
        hint: 'Red = no turbines. Add notes stating which technical assessment applies: ETSU-R-97 for noise, NatureScot/Natural England guidance for ecology.',
        check: ({ layers }) => totalPolygons(layers) >= 3,
      },
      {
        action: 'place_turbine',
        instruction: 'Step 3: Select V150-4.5 in the Turbines tab. Place 8–10 turbines in the developable area — clear of constraint polygons, along the ridge, spaced 650m+ apart.',
        hint: 'Use Elevation overlay. Place on highest visible ground. KPI strip shows live capacity and AEP. Green-to-red wind circles = good positions. Blue = move to higher ground.',
        check: ({ turbines }) => turbines.length >= 6,
      },
      {
        action: 'edit',
        instruction: 'Step 4: Add 500m setback radii to every turbine. Check no orange circle overlaps a red constraint polygon. Move any that do via Data Tables (edit lat/lng). Rename all turbines T01–T10.',
        hint: 'Data Tables → click a Lat or Lng cell → type new value → Enter. The turbine moves on the map. Renaming consistently is essential for coordination with noise, shadow flicker, and LVIA consultants.',
        check: ({ turbines }) => turbines.length >= 6 && turbines.filter(t => /^T\d+$/i.test(t.properties?.name || '')).length >= 3,
      },
      {
        action: 'place_substation',
        instruction: 'Step 5: Place the onsite substation centrally. Set: Name = "Knockroe 33/132kV Substation", Transformer MVA = 60, Gen Capacity MW = 45.',
        hint: 'Central position minimises average cable length. Near a road reduces civil costs. The 60 MVA transformer handles 45MW at 0.95 power factor with margin for losses.',
        check: ({ substations }) => substations.length >= 1 && substations.some(s => s.properties?.transformer_mva > 0),
      },
      {
        action: 'draw_cable',
        instruction: 'Step 6: Draw two turbine strings to the substation (33kV 150mm²). Then draw the grid connection (132kV Overhead Line) from the substation to the site boundary.',
        hint: 'String 1: T01→T02→T03→T04→T05→Sub. String 2: T06→T07→T08→T09→T10→Sub. Change cable type before drawing the grid connection segment.',
        check: ({ cables }) => cables.length >= 5 && cables.some(c => c.properties?.cable_type_id?.toString().includes('132') || (c.properties?.length_m || 0) > 1000),
      },
      {
        action: 'read',
        instruction: '✅ Final checks: Data Tables → all turbines have hub wind + AEP values. Analysis tab → CF > 30%, hub wind > 7 m/s. Save → GeoJSON → KML. Your first complete wind farm design is done.',
        hint: 'Target: 10 turbines, ~45 MW, 130–180 GWh AEP, 33–45% CF, 15–20km cable, £1.5–£2.5M cable cost. Export files are ready for QGIS or client sharing.',
        check: () => true,
      },
    ],
  },
};