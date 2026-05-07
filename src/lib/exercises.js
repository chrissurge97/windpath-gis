/**
 * Guided exercises that run inside the real Planning tool.
 * Each exercise has steps with:
 *   - instruction: what the user should do
 *   - hint: extra context / tip
 *   - check: a function(planningData) => boolean that returns true when the step is done
 *            planningData = { layers, turbines, cables, substations }
 *   - action: tag used for the UI icon ('read'|'place_turbine'|'draw_polygon'|'draw_cable'|'place_substation'|'edit')
 */

export const EXERCISES = {

  land_acquisition: {
    title: 'Mapping Land Parcels',
    intro: 'In this exercise you will use the real Planning tool to create polygon layers representing land parcels with different acquisition statuses — exactly as you would in a live project.',
    steps: [
      {
        action: 'read',
        instruction: 'Open the Layers tab (right-hand panel) and click "+ Add Zone" to create a new polygon layer. Name it "Site Boundary".',
        hint: 'The Layers tab is the 4th tab icon (stack of layers) in the right panel. After creating the layer, click its row to select it.',
        check: ({ layers }) => layers.filter(l => !['turbine','cable','wind_resource','substation'].includes(l.type)).length >= 1,
      },
      {
        action: 'draw_polygon',
        instruction: 'Click "Polygon" in the toolbar, then click on the map to draw a site boundary with at least 5 vertices. Click "Finish" to close it.',
        hint: 'Make your site boundary a realistic irregular shape — not a perfect rectangle. Add 5–8 vertices. The "Finish (N pts)" button appears once you have 3+ vertices.',
        check: ({ layers }) => layers.filter(l => !['turbine','cable','wind_resource','substation'].includes(l.type)).some(l => l.features.filter(f => f.geometry.type === 'Polygon').length >= 1),
      },
      {
        action: 'edit',
        instruction: 'Click the polygon to open its properties. Name it "Gross Site Boundary", set colour to Cyan (#06b6d4), fill opacity to 15%, and add a note such as "Approx 1,200 ha upland study area". Click Apply.',
        hint: 'Click the polygon in Select mode (cursor icon). The panel appears top-left. After changing colour and name, click Apply.',
        check: ({ layers }) => layers.filter(l => !['turbine','cable','wind_resource','substation'].includes(l.type)).some(l => l.features.some(f => f.properties?.name?.length > 0)),
      },
      {
        action: 'draw_polygon',
        instruction: 'Add a second polygon layer ("Farm A – Leased"). Draw a polygon representing the northern land parcel inside the site boundary. Set its colour to Green (#10b981).',
        hint: 'Click "+ Add Zone", select the new layer, switch to Polygon mode, draw inside your site boundary. The colour is set via the polygon properties panel (click the polygon in Select mode).',
        check: ({ layers }) => layers.filter(l => !['turbine','cable','wind_resource','substation'].includes(l.type)).reduce((t,l) => t + l.features.filter(f=>f.geometry.type==='Polygon').length, 0) >= 2,
      },
      {
        action: 'draw_polygon',
        instruction: 'Add a third polygon layer ("Farm B – Negotiating"). Draw a polygon for the southern parcel. Set its colour to Amber (#f59e0b) to indicate ongoing negotiations.',
        hint: 'Create a new layer via "+ Add Zone". Amber/orange colour visually signals "in progress" — a convention recognisable to any wind energy professional.',
        check: ({ layers }) => layers.filter(l => !['turbine','cable','wind_resource','substation'].includes(l.type)).reduce((t,l) => t + l.features.filter(f=>f.geometry.type==='Polygon').length, 0) >= 3,
      },
      {
        action: 'read',
        instruction: '✅ Well done! You now have a basic land acquisition map. In the Layers tab, try toggling individual layers on/off with the eye icon, then export the project as GeoJSON using the toolbar.',
        hint: 'Click GeoJSON in the toolbar to download your project. This file can be opened in QGIS, ArcGIS, or Google Earth for further analysis.',
        check: () => true,
      },
    ],
  },

  turbine_placement: {
    title: 'Turbine Placement & Setback Radii',
    intro: 'Place turbines using the real tool — it fetches live elevation and wind speed data for each position. You will use setback radii to check constraint distances.',
    steps: [
      {
        action: 'read',
        instruction: 'Check the Turbines tab. Click the turbine type selector to expand it and choose a turbine. Note its rated power, rotor diameter, and hub height — these determine wind shear correction and AEP.',
        hint: 'The Vestas V150-4.5 (4.5 MW, 150m rotor, 105m hub) is a good choice for an upland UK/IE site. You can also edit or create custom types in the Types tab.',
        check: () => true,
      },
      {
        action: 'place_turbine',
        instruction: 'Click "Place Turbine" in the toolbar. Click on the map to place your first turbine on elevated ground (use the Elevation overlay to find ridges).',
        hint: 'Turn on the Elevation overlay (top-right button) to see terrain. Place the turbine on the highest visible ground — darker areas are valleys, brighter ridges have better wind. The tool auto-fetches wind data.',
        check: ({ turbines }) => turbines.length >= 1,
      },
      {
        action: 'place_turbine',
        instruction: 'Place 4 more turbines, spacing them approximately 600–800m apart along the ridge. Aim for 5 total — watch the total capacity in the KPI strip at the bottom grow.',
        hint: 'Space turbines at least 4× rotor diameters apart (4 × 150m = 600m). The KPI strip at the bottom of the map shows Turbines, Capacity (MW), AEP, and Capacity Factor in real time.',
        check: ({ turbines }) => turbines.length >= 5,
      },
      {
        action: 'edit',
        instruction: 'Click a turbine (Select mode) to open its properties. Tick "Show on map" under Setback Radius and set it to 500m. Click Apply. Repeat for all turbines.',
        hint: 'The 500m setback is the UK minimum residential separation distance. The orange dashed circle shows you the exclusion zone visually on the map.',
        check: () => true,
      },
      {
        action: 'edit',
        instruction: 'In the Turbines tab, click the pencil icon on any turbine to rename it "T01". Rename all 5 turbines T01–T05.',
        hint: 'Professional naming (T01, T02 etc.) is used throughout planning submissions, noise assessments, and shadow flicker reports. Consistent naming is essential when coordinating with consultants.',
        check: ({ turbines }) => turbines.some(t => /^T0?\d+$/.test(t.properties.name || '')),
      },
      {
        action: 'read',
        instruction: '✅ Check the Analysis tab — you should see the Weibull wind distribution and, once wind data loads, the monthly energy profile and KPIs. Check that capacity factor is above 25%.',
        hint: 'If capacity factor shows below 25%, your turbines may be in sheltered positions. Try the Elevation overlay to find higher ground positions. A good UK upland site targets 35–40% CF.',
        check: () => true,
      },
    ],
  },

  cable_routing: {
    title: 'Cable Routing & Substation Placement',
    intro: 'Design the electrical collection network — place the onsite substation, draw cable routes between turbines, and connect to the grid. The tool calculates real cable lengths and costs.',
    steps: [
      {
        action: 'read',
        instruction: 'Open the Cables tab. Click the cable type selector and choose "33kV 150mm² XLPE Underground (£120/m)". This is the standard collection cable for onshore wind farms.',
        hint: 'Check the cable specs: voltage, ampacity, cost per metre. You can edit any cable type\'s cost by clicking the pencil icon — useful when you have real contractor quotes.',
        check: () => true,
      },
      {
        action: 'place_substation',
        instruction: 'Click "Substation" in the toolbar, then click the map to place an onsite substation near the centre of your turbine cluster (or near the site access point).',
        hint: 'The substation should be: (a) central to the turbine cluster to minimise cable lengths, (b) close to a road for access, (c) near the grid connection point to minimise the export cable length.',
        check: ({ substations }) => substations.length >= 1,
      },
      {
        action: 'edit',
        instruction: 'Click the substation (Select mode) to open its properties. Set: Name = "33/132kV Collection Substation", Transformer MVA = 60, Gen Capacity MW = 45. Click Done.',
        hint: 'For a 5 × 4.5MW = 22.5MW farm, a 30 MVA transformer is sufficient. For 10 turbines (45MW), 60 MVA with margin. The capacity values inform future network analysis.',
        check: ({ substations }) => substations.length >= 1 && (substations[0]?.properties?.transformer_mva > 0 || substations[0]?.properties?.name?.length > 0),
      },
      {
        action: 'draw_cable',
        instruction: 'Click "Draw Cable" in the toolbar. Connect turbines into a string: click T01, then T02 to draw the first cable. Continue T02→T03→T04→T05→Substation.',
        hint: 'You need 5 clicks total (5 cable segments for a string of 5 turbines to the substation). The cable length appears in the Cables tab in real time. Aim for total cable under 5km.',
        check: ({ cables }) => cables.length >= 3,
      },
      {
        action: 'draw_cable',
        instruction: 'Change cable type to "132kV Overhead Line (£85/m)" in the Cables tab. Draw one cable from the substation toward the nearest road/site boundary to represent the grid connection.',
        hint: 'The grid connection is typically the most expensive single item. Draw it toward the nearest public road or existing electricity infrastructure visible on the satellite view.',
        check: ({ cables }) => cables.length >= 5,
      },
      {
        action: 'read',
        instruction: '✅ Open the Analysis tab and check Cable Length and Cable Cost in the six KPI boxes. Then go to the Data Tables page to review all cables in the spreadsheet view.',
        hint: 'The Data Tables page lets you click any cable cell to edit it. Check that all cables have the correct type assigned and that lengths look realistic for your layout.',
        check: () => true,
      },
    ],
  },

  wind_resource: {
    title: 'Wind Resource & Energy Analysis',
    intro: 'Use the built-in wind data integration and the Analysis tab to understand the site\'s energy potential — Weibull distribution, hub wind speeds, AEP, and capacity factor.',
    steps: [
      {
        action: 'place_turbine',
        instruction: 'Place at least 3 turbines on elevated ground. Watch the status bar — it says "Fetching real data…" while the tool retrieves wind speed and elevation from Open-Meteo and Open-Elevation.',
        hint: 'The wind data fetch takes 1–3 seconds per turbine. The spinner in the toolbar shows it is working. Once complete, each turbine shows hub wind speed and estimated AEP in the Turbines tab.',
        check: ({ turbines }) => turbines.length >= 3,
      },
      {
        action: 'read',
        instruction: 'Turn on the Wind overlay (top-right button on the map). Coloured circles appear around each turbine showing hub wind speed. Blue = <6 m/s (poor), green = 6–8 m/s, amber = 8–10 m/s, red = >10 m/s (excellent).',
        hint: 'This wind speed colour map is the quickest visual check of layout quality. A good site should show mostly green-to-amber. Move any blue turbines to higher ground positions.',
        check: () => true,
      },
      {
        action: 'read',
        instruction: 'Open the Analysis tab. Adjust the Weibull k and λ sliders. k controls shape (higher k = narrower distribution, more consistent wind), λ is the scale (average wind speed). Watch how the chart updates.',
        hint: 'For UK upland sites: k ≈ 1.8–2.2, λ ≈ 7–10 m/s. A higher λ means more energy. The shape k determines how much of the time the wind blows near the mean speed.',
        check: () => true,
      },
      {
        action: 'place_turbine',
        instruction: 'Add 2 more turbines. After they load wind data, check the Analysis tab — the Monthly Energy Profile bar chart should now appear. Note which months are highest.',
        hint: 'UK wind farms produce most energy November–February due to Atlantic weather systems. The chart should show winter months 20–30% higher than summer. This seasonal pattern is used in revenue forecasting.',
        check: ({ turbines }) => turbines.length >= 5,
      },
      {
        action: 'read',
        instruction: 'Review the 6 KPI boxes in the Analysis tab: Gross AEP, Net AEP, Capacity Factor, Avg Hub Wind, Cable Length, Cable Cost. For a viable UK site aim for >30% capacity factor and >7 m/s average hub wind.',
        hint: 'Net AEP is Gross AEP minus ~9% for wake losses, electrical losses, and availability. Capacity Factor = Net AEP ÷ (Rated Capacity × 8,760 hours). If CF is below 25%, the project is likely not economic.',
        check: () => true,
      },
      {
        action: 'read',
        instruction: '✅ Go to the Data Tables page and review the Turbines table. Check each turbine\'s Hub Wind and AEP columns. Any turbine with no hub wind value has not yet loaded wind data — try refreshing.',
        hint: 'The Refresh button in Data Tables reloads the latest data from storage. Wind data should populate within a few seconds of placing each turbine.',
        check: () => true,
      },
    ],
  },

  layer_data: {
    title: 'Constraint Mapping & Layer Management',
    intro: 'Build a professional constraint map by creating dedicated layers for each constraint type, using the correct colour conventions, and organising layers for a planning deliverable.',
    steps: [
      {
        action: 'draw_polygon',
        instruction: 'Create a "Hard Constraints" layer (+ Add Zone in Layers tab). Draw a polygon representing a 500m residential buffer around an imaginary dwelling inside or near your site. Set colour to Red (#ef4444), opacity 20%.',
        hint: 'In a real project, dwelling locations come from AddressBase or Ordnance Survey data. You would import the GeoJSON and then draw buffer polygons around each one, or use QGIS to auto-generate 500m buffers.',
        check: ({ layers }) => layers.filter(l => !['turbine','cable','wind_resource','substation'].includes(l.type)).some(l => l.features.some(f => f.geometry.type === 'Polygon')),
      },
      {
        action: 'edit',
        instruction: 'Click the red buffer polygon (Select mode). In the Notes field, type: "500m residential buffer — nearest dwelling 380m from turbine envelope. ETSU-R-97 noise assessment required." Click Apply.',
        hint: 'The Notes field stores any attribute text — use it for planning references, landowner names, constraint source, assessment requirements, or GIS data provenance.',
        check: ({ layers }) => layers.filter(l => !['turbine','cable','wind_resource','substation'].includes(l.type)).some(l => l.features.some(f => f.properties?.notes?.length > 10)),
      },
      {
        action: 'draw_polygon',
        instruction: 'Create a "Soft Constraints" layer. Draw a polygon representing an AONB boundary near the site edge. Set colour to Orange (#f97316), opacity 15%, and name it "AONB — 5km Buffer Zone".',
        hint: 'Soft constraints don\'t automatically prevent turbines but require additional assessment. AONB proximity triggers a Landscape and Visual Impact Assessment (LVIA) from key viewpoints.',
        check: ({ layers }) => layers.filter(l => !['turbine','cable','wind_resource','substation'].includes(l.type)).length >= 2,
      },
      {
        action: 'edit',
        instruction: 'In the Layers tab, use the eye icons to hide the "Hard Constraints" layer. Notice the red polygon disappears. Now show it again. Try the same for Soft Constraints.',
        hint: 'Layer toggle is one of the most useful GIS features — you can quickly switch between views for different audiences: show only constraints for the ecologist, only turbines for the layout engineer.',
        check: () => true,
      },
      {
        action: 'draw_polygon',
        instruction: 'Use the Polygon tool to draw a "Developable Envelope" polygon — the area that remains available for turbines after removing all constraint zones. Set colour to Green (#10b981), opacity 20%.',
        hint: 'The developable envelope is typically much smaller than the gross site. On a typical constrained UK site, only 15–30% of the gross area is developable. Draw it to reflect the remaining available space.',
        check: ({ layers }) => layers.filter(l => !['turbine','cable','wind_resource','substation'].includes(l.type)).reduce((t,l) => t + l.features.filter(f=>f.geometry.type==='Polygon').length, 0) >= 3,
      },
      {
        action: 'read',
        instruction: '✅ Export the project as KML (toolbar → KML button). Open it in Google Earth to see your constraint layers in 3D. KML preserves layer colours and names — exactly what you would share with a planning consultant.',
        hint: 'The exported KML contains all layers as separate folders. In Google Earth, each folder can be toggled independently. Add it to a Google Earth project and share the .kmz link with the team.',
        check: () => true,
      },
    ],
  },

  site_constraints: {
    title: 'Full Site Design — End to End',
    intro: 'Complete a full wind farm design from blank map to export-ready project. Follow each step in the real Planning tool — this replicates the workflow used by professional wind energy developers.',
    steps: [
      {
        action: 'draw_polygon',
        instruction: 'Step 1: Draw a realistic site boundary (6–8 vertices, irregular shape, roughly 5km across). Create it in a new layer named "Site Boundary", cyan colour, 15% opacity.',
        hint: 'Navigate the map to an upland area (use Satellite view to find hillier terrain). Draw your boundary across a ridge. Use the Elevation overlay to confirm you are on higher ground.',
        check: ({ layers }) => layers.filter(l => !['turbine','cable','wind_resource','substation'].includes(l.type)).some(l => l.features.some(f => f.geometry.type === 'Polygon')),
      },
      {
        action: 'draw_polygon',
        instruction: 'Step 2: Add constraint layers. Create "Hard Constraints" (red, 20% opacity) and draw at least 2 constraint polygons: one residential buffer (500m oval) and one ecological zone.',
        hint: 'Red = hard exclusion (no turbines). Draw the residential buffer as a rough oval. Draw the ecological zone (e.g. SSSI) as a polygon in the northwest corner of your site.',
        check: ({ layers }) => layers.filter(l => !['turbine','cable','wind_resource','substation'].includes(l.type)).reduce((t,l) => t + l.features.filter(f=>f.geometry.type==='Polygon').length, 0) >= 3,
      },
      {
        action: 'place_turbine',
        instruction: 'Step 3: Select turbine type in the Turbines tab (V150-4.5 or similar). Place 8–10 turbines in the developable area — avoiding constraint zones. Space them 600m+ apart along the ridge.',
        hint: 'Use the Elevation overlay to find the ridge. Place turbines where elevation is highest and they are clear of constraint polygons. The KPI strip shows capacity and AEP updating in real time.',
        check: ({ turbines }) => turbines.length >= 6,
      },
      {
        action: 'edit',
        instruction: 'Step 4: Add 500m setback radii to each turbine (click turbine → Show on map → 500m → Apply). Check no radius circle overlaps a red constraint polygon.',
        hint: 'Any turbine whose orange circle overlaps a red constraint polygon needs to be moved. Edit lat/lng directly in the Data Tables page for precise repositioning.',
        check: () => true,
      },
      {
        action: 'place_substation',
        instruction: 'Step 5: Place the onsite substation (Substation tool). Position it centrally within the turbine cluster near a road. Set transformer MVA to (turbine count × rated MW × 1.2) rounded up.',
        hint: 'For 8 × 4.5MW = 36MW farm: transformer = 36 × 1.2 = 43.2 → use 50 MVA. For 10 × 4.5MW = 45MW: use 60 MVA. The 1.2 factor provides headroom for power factor and future expansion.',
        check: ({ substations }) => substations.length >= 1,
      },
      {
        action: 'draw_cable',
        instruction: 'Step 6: Draw cable routes — connect turbines into 2 strings (Draw Cable → 33kV 150mm²). Then draw a grid connection cable from the substation to the site boundary using 132kV Overhead Line.',
        hint: 'String 1: T01→T02→T03→T04→T05→Sub. String 2: T06→T07→T08→T09→T10→Sub. Then change type to 132kV OHL and draw Sub→site boundary.',
        check: ({ cables }) => cables.length >= 5,
      },
      {
        action: 'read',
        instruction: '✅ Final review: go to Data Tables and check all turbines have hub wind data. Check the Analysis tab for KPIs. Save the project, then export both GeoJSON and KML. Your first complete wind farm design is ready.',
        hint: 'Target metrics: Capacity Factor >30%, Average Hub Wind >7 m/s, Total Cable Cost <£2M (for a 10-turbine farm). If metrics are below target, refine turbine positions and repeat.',
        check: () => true,
      },
    ],
  },
};