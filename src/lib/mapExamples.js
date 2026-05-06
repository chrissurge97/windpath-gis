// ─────────────────────────────────────────────────────────────────────────────
// Stepped Map Scenarios — rich, practical wind-farm planning exercises
//
// Step action types:
//   'read'           — user reads, clicks Next
//   'click_turbine'  — user places N turbines on the map
//   'draw_polygon'   — user draws a polygon (click vertices, click Finish)
//   'place_radius'   — user clicks to place a radius centre point
//
// Overlay types:
//   turbines:   [[lat,lng,label?], ...]
//   polygons:   { pts:[[lat,lng],...], color?:'#hex', fillColor?:'#hex', label?:'', opacity?:0.15 }[]
//   circles:    [[lat,lng,radius_m, label, color?], ...]
//   lines:      [[lat,lng], [lat,lng]] pairs as { pts:[[lat,lng],...], color, label }[]
//   heatPoints: [[lat,lng,value], ...]  — coloured dots sized by value
// ─────────────────────────────────────────────────────────────────────────────

export const MAP_EXAMPLES = {

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 1 — Land & Site Acquisition
  // ══════════════════════════════════════════════════════════════
  land_acquisition: {
    title: 'Mapping Land Parcels & Acquisition Status',
    center: [52.04, -1.5],
    zoom: 12,
    steps: [
      {
        action: 'read',
        instruction: 'Welcome to the land acquisition scenario. This site spans farmland owned by three separate landowners. We need to map each parcel and track whether land has been purchased, leased, or is still under negotiation.',
        hint: 'In the planning tool: use the Layers tab to create a new polygon layer for each ownership parcel.',
        overlays: {
          polygons: [
            { pts: [[52.05, -1.56], [52.07, -1.56], [52.07, -1.52], [52.05, -1.52]], color: '#06b6d4', opacity: 0.08, label: 'Gross site boundary' },
          ],
        },
      },
      {
        action: 'read',
        instruction: 'Three landowners have been identified: Farm A (northern block), Farm B (central block), and Farm C (southern block). Each parcel is drawn as a separate polygon layer so it can be styled and toggled independently.',
        hint: 'Tip: name layers clearly — "Farm A – Purchased", "Farm B – Negotiating". The name appears in the Layers tab and the exported GeoJSON.',
        overlays: {
          polygons: [
            { pts: [[52.06, -1.56], [52.07, -1.56], [52.07, -1.52], [52.06, -1.52]], color: '#10b981', opacity: 0.35, label: 'Farm A — Leased ✓' },
            { pts: [[52.05, -1.56], [52.06, -1.56], [52.06, -1.52], [52.05, -1.52]], color: '#f59e0b', opacity: 0.35, label: 'Farm B — Option Agreed' },
            { pts: [[52.04, -1.56], [52.05, -1.56], [52.05, -1.52], [52.04, -1.52]], color: '#ef4444', opacity: 0.35, label: 'Farm C — Not Acquired' },
          ],
        },
      },
      {
        action: 'read',
        instruction: 'Green = Leased (secured), Amber = Option Agreed (in progress), Red = Not Acquired. This colour convention is immediately readable by developers, investors, and planning consultants.',
        hint: 'In the planning tool: click on a layer in the Layers tab, then click the colour swatch to change it. You can also rename the layer to include the current status.',
        overlays: {
          polygons: [
            { pts: [[52.06, -1.56], [52.07, -1.56], [52.07, -1.52], [52.06, -1.52]], color: '#10b981', opacity: 0.4, label: 'Farm A — Leased ✓' },
            { pts: [[52.05, -1.56], [52.06, -1.56], [52.06, -1.52], [52.05, -1.52]], color: '#f59e0b', opacity: 0.4, label: 'Farm B — Option Agreed' },
            { pts: [[52.04, -1.56], [52.05, -1.56], [52.05, -1.52], [52.04, -1.52]], color: '#ef4444', opacity: 0.4, label: 'Farm C — Not Acquired' },
          ],
        },
      },
      {
        action: 'draw_polygon',
        required: 1,
        instruction: 'Draw a new parcel boundary. Click at least 4 points to outline a field boundary, then click "Finish Polygon" below.',
        hint: 'In the real tool: click "Boundary" mode, click vertices on the map, then double-click or click Finish. Try drawing a rough quadrilateral representing a field.',
        overlays: {
          polygons: [
            { pts: [[52.06, -1.56], [52.07, -1.56], [52.07, -1.52], [52.06, -1.52]], color: '#10b981', opacity: 0.25, label: 'Farm A' },
            { pts: [[52.05, -1.56], [52.06, -1.56], [52.06, -1.52], [52.05, -1.52]], color: '#f59e0b', opacity: 0.25, label: 'Farm B' },
            { pts: [[52.04, -1.56], [52.05, -1.56], [52.05, -1.52], [52.04, -1.52]], color: '#ef4444', opacity: 0.25, label: 'Farm C' },
          ],
        },
      },
      {
        action: 'read',
        instruction: 'Status update: Farm C has now agreed heads of terms — update the polygon colour from red to amber and rename the layer to "Farm C — Option Agreed". The map now shows the improved acquisition position.',
        hint: 'As negotiations progress, updating layer colours means your GIS map is always a live picture of land status — essential for reporting to the project board.',
        overlays: {
          polygons: [
            { pts: [[52.06, -1.56], [52.07, -1.56], [52.07, -1.52], [52.06, -1.52]], color: '#10b981', opacity: 0.4, label: 'Farm A — Leased ✓' },
            { pts: [[52.05, -1.56], [52.06, -1.56], [52.06, -1.52], [52.05, -1.52]], color: '#10b981', opacity: 0.4, label: 'Farm B — Leased ✓' },
            { pts: [[52.04, -1.56], [52.05, -1.56], [52.05, -1.52], [52.04, -1.52]], color: '#f59e0b', opacity: 0.4, label: 'Farm C — Option Agreed' },
          ],
        },
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 2 — Turbine Placement & Setback Radii
  // ══════════════════════════════════════════════════════════════
  turbine_placement: {
    title: 'Placing Turbines & Checking Setback Distances',
    center: [52.04, -1.5],
    zoom: 12,
    steps: [
      {
        action: 'read',
        instruction: 'The site boundary is defined (cyan). Three dwellings exist near the site (orange markers). UK policy requires turbines to be at least 500m from any dwelling. We need to place turbines while respecting this setback.',
        hint: 'A 500m setback radius is drawn around each dwelling — turbines must be placed outside all three circles.',
        overlays: {
          polygons: [
            { pts: [[52.02, -1.56], [52.06, -1.56], [52.06, -1.44], [52.02, -1.44]], color: '#06b6d4', opacity: 0.08, label: 'Site boundary' },
          ],
          circles: [
            [52.055, -1.535, 500, '500m setback — Dwelling 1', '#f97316'],
            [52.03, -1.50, 500, '500m setback — Dwelling 2', '#f97316'],
            [52.025, -1.465, 500, '500m setback — Dwelling 3', '#f97316'],
          ],
        },
      },
      {
        action: 'read',
        instruction: 'Each placed turbine also has its own radius for checking inter-turbine spacing. This Vestas V136 has a 136m rotor — minimum spacing is 3×D = 408m cross-wind and 7×D = 952m downwind. The green rings show safe spacing zones around proposed positions.',
        hint: 'In the planning tool, select a turbine and click "Show Radius" to draw a distance ring at any specified value (e.g. 500m or 1000m).',
        overlays: {
          turbines: [[52.045, -1.548], [52.038, -1.525]],
          circles: [
            [52.045, -1.548, 500, 'T1 — 500m radius', '#10b981'],
            [52.038, -1.525, 500, 'T2 — 500m radius', '#10b981'],
            [52.055, -1.535, 500, '500m setback — Dwelling 1', '#f97316'],
            [52.03, -1.50, 500, '500m setback — Dwelling 2', '#f97316'],
          ],
        },
      },
      {
        action: 'click_turbine',
        required: 3,
        instruction: 'Place 3 turbines inside the site boundary (cyan), outside all three 500m dwelling setback zones (orange circles). Click carefully to find valid positions.',
        hint: 'The north-east and south-west areas of the site are clear of dwelling setbacks — aim there. In the real tool, the radius tool shows a live 500m ring as you position your cursor.',
        overlays: {
          polygons: [
            { pts: [[52.02, -1.56], [52.06, -1.56], [52.06, -1.44], [52.02, -1.44]], color: '#06b6d4', opacity: 0.08, label: 'Site boundary' },
          ],
          circles: [
            [52.055, -1.535, 500, '500m — Dwelling 1', '#f97316'],
            [52.03, -1.50, 500, '500m — Dwelling 2', '#f97316'],
            [52.025, -1.465, 500, '500m — Dwelling 3', '#f97316'],
          ],
        },
      },
      {
        action: 'read',
        instruction: 'After placing turbines, add a measurement radius to each one. Here we show 1km rings — any dwelling or receptor within 1km needs noise and shadow flicker assessment.',
        hint: 'You can also measure specific distances: turbine to road, turbine to power line, turbine to scheduled monument. The measurement tool gives you a precise number in metres.',
        overlays: {
          turbines: [[52.045, -1.548], [52.038, -1.525], [52.028, -1.492]],
          circles: [
            [52.045, -1.548, 1000, 'T1 — 1km assessment zone', '#8b5cf6'],
            [52.038, -1.525, 1000, 'T2 — 1km assessment zone', '#8b5cf6'],
            [52.028, -1.492, 1000, 'T3 — 1km assessment zone', '#8b5cf6'],
            [52.055, -1.535, 500, '500m — Dwelling 1', '#f97316'],
            [52.03, -1.50, 500, '500m — Dwelling 2', '#f97316'],
            [52.025, -1.465, 500, '500m — Dwelling 3', '#f97316'],
          ],
        },
      },
      {
        action: 'read',
        instruction: 'Final layout check: T1 and T2 are clear of all dwellings. T3 is very close to the Dwelling 2 setback — its 500m ring nearly touches the boundary. In the real tool, you would measure this precisely and likely move T3 northward by ~100m to create comfortable clearance.',
        hint: 'Always add a buffer beyond the minimum setback — exactly 500m may be challenged in planning. 550–600m gives resilience. Use the distance tool to verify.',
        overlays: {
          turbines: [[52.045, -1.548], [52.038, -1.525], [52.028, -1.492]],
          circles: [
            [52.028, -1.492, 500, 'T3 — 500m radius (TIGHT)', '#ef4444'],
            [52.03, -1.50, 500, '500m — Dwelling 2', '#f97316'],
          ],
        },
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 3 — Cable Routing
  // ══════════════════════════════════════════════════════════════
  cable_routing: {
    title: 'Designing the Electrical Collection Network',
    center: [52.04, -1.5],
    zoom: 12,
    steps: [
      {
        action: 'read',
        instruction: 'Five turbines are placed. The on-site substation (green square, bottom-centre) collects energy from all turbines via 33kV underground cables. The DNO grid substation (blue, bottom-right) is the Point of Connection to the public network.',
        hint: 'In the real tool: select "Draw Cable" mode, choose a cable type from the Cables tab, then click two points to draw a route.',
        overlays: {
          turbines: [[52.055, -1.545], [52.052, -1.525], [52.048, -1.510], [52.040, -1.535], [52.035, -1.520]],
          circles: [
            [52.018, -1.50, 150, 'Wind Farm Substation', '#10b981'],
            [52.018, -1.465, 150, 'DNO 33kV Substation (PoC)', '#3b82f6'],
          ],
        },
      },
      {
        action: 'read',
        instruction: 'Option A — Radial topology: each turbine connects directly to the substation. Simple but expensive — 5 separate cable runs, each potentially 1–3km. Total cable here ≈ 7.2km at £120/m = £864,000.',
        hint: 'Radial is used when turbines are scattered and string routing would be longer, or when resilience is prioritised (one cable failure affects only one turbine).',
        overlays: {
          turbines: [[52.055, -1.545], [52.052, -1.525], [52.048, -1.510], [52.040, -1.535], [52.035, -1.520]],
          lines: [
            { pts: [[52.055, -1.545], [52.018, -1.50]], color: '#f97316', label: 'T1→Sub (3.2km)' },
            { pts: [[52.052, -1.525], [52.018, -1.50]], color: '#f97316', label: 'T2→Sub (2.9km)' },
            { pts: [[52.048, -1.510], [52.018, -1.50]], color: '#f97316', label: 'T3→Sub (2.5km)' },
            { pts: [[52.040, -1.535], [52.018, -1.50]], color: '#f97316', label: 'T4→Sub (2.0km)' },
            { pts: [[52.035, -1.520], [52.018, -1.50]], color: '#f97316', label: 'T5→Sub (1.5km)' },
          ],
          circles: [
            [52.018, -1.50, 150, 'Wind Farm Substation', '#10b981'],
          ],
        },
      },
      {
        action: 'read',
        instruction: 'Option B — String topology: T1→T2→T3 form one string, T4→T5 form another, then each string connects to the substation. Total cable here ≈ 5.1km at £120/m = £612,000 — saving £252,000.',
        hint: 'String topology is more economical when turbines are roughly in a line toward the substation. The trade-off: if one cable section fails, all turbines further along the string lose connection.',
        overlays: {
          turbines: [[52.055, -1.545], [52.052, -1.525], [52.048, -1.510], [52.040, -1.535], [52.035, -1.520]],
          lines: [
            { pts: [[52.055, -1.545], [52.052, -1.525]], color: '#10b981', label: 'T1→T2' },
            { pts: [[52.052, -1.525], [52.048, -1.510]], color: '#10b981', label: 'T2→T3' },
            { pts: [[52.048, -1.510], [52.018, -1.50]], color: '#10b981', label: 'T3→Sub' },
            { pts: [[52.040, -1.535], [52.035, -1.520]], color: '#3b82f6', label: 'T4→T5' },
            { pts: [[52.035, -1.520], [52.018, -1.50]], color: '#3b82f6', label: 'T5→Sub' },
          ],
          circles: [
            [52.018, -1.50, 150, 'Wind Farm Substation', '#10b981'],
          ],
        },
      },
      {
        action: 'click_turbine',
        required: 2,
        instruction: 'Place 2 additional turbines to extend the layout. Position them so they could connect into the existing string topology without adding excessive cable length.',
        hint: 'Think about proximity to the existing string routes. New turbines near T3 or T5 can tap into the existing strings economically.',
        overlays: {
          turbines: [[52.055, -1.545], [52.052, -1.525], [52.048, -1.510], [52.040, -1.535], [52.035, -1.520]],
          lines: [
            { pts: [[52.055, -1.545], [52.052, -1.525]], color: '#10b981', label: '' },
            { pts: [[52.052, -1.525], [52.048, -1.510]], color: '#10b981', label: '' },
            { pts: [[52.048, -1.510], [52.018, -1.50]], color: '#10b981', label: '' },
            { pts: [[52.040, -1.535], [52.035, -1.520]], color: '#3b82f6', label: '' },
            { pts: [[52.035, -1.520], [52.018, -1.50]], color: '#3b82f6', label: '' },
          ],
          circles: [
            [52.018, -1.50, 150, 'Wind Farm Substation', '#10b981'],
            [52.018, -1.465, 150, 'DNO PoC', '#3b82f6'],
          ],
        },
      },
      {
        action: 'read',
        instruction: 'Grid connection: from the wind farm substation to the DNO substation (Point of Connection), a 132kV overhead line is drawn at £85/m. Distance here is ~3.5km = £297,500. This is in addition to the internal cable costs.',
        hint: 'The grid connection is often the largest single infrastructure cost item. In the planning tool, draw it as a separate cable layer using the 132kV Overhead Line type so you can see it clearly on the map.',
        overlays: {
          turbines: [[52.055, -1.545], [52.052, -1.525], [52.048, -1.510], [52.040, -1.535], [52.035, -1.520]],
          lines: [
            { pts: [[52.018, -1.50], [52.018, -1.465]], color: '#facc15', label: '132kV Grid Connection (3.5km · £297,500)' },
          ],
          circles: [
            [52.018, -1.50, 150, 'Wind Farm Substation', '#10b981'],
            [52.018, -1.465, 150, 'DNO 33kV Substation', '#3b82f6'],
          ],
        },
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 4 — Wind Resource & Energy Analysis
  // ══════════════════════════════════════════════════════════════
  wind_resource: {
    title: 'Visualising Wind Resource & Calculating AEP',
    center: [52.04, -1.5],
    zoom: 11,
    steps: [
      {
        action: 'read',
        instruction: 'A wind resource layer shows mean annual wind speed across the site as a colour-coded grid. Blue = lower wind (< 6 m/s at 10m), green = moderate (7–9 m/s), yellow/red = high (> 10 m/s). The site here has a clear gradient — hilltops in the east have better wind resource.',
        hint: 'In the planning tool, wind resource data is fetched automatically for each placed turbine from Open-Meteo ERA5 reanalysis data.',
        overlays: {
          circles: [
            [52.07, -1.58, 2500, '5.8 m/s — Poor', '#1d4ed8'],
            [52.05, -1.55, 2500, '6.8 m/s — Below average', '#06b6d4'],
            [52.04, -1.50, 2500, '7.9 m/s — Good', '#10b981'],
            [52.03, -1.46, 2500, '8.8 m/s — Very good', '#f59e0b'],
            [52.01, -1.43, 2500, '9.6 m/s — Excellent', '#ef4444'],
          ],
        },
      },
      {
        action: 'read',
        instruction: 'Wind shear: wind speed increases with height. At a hub height of 120m, wind speed is ~21% higher than at 10m (power law, α=0.143). A 9.6 m/s site at 10m becomes 11.6 m/s at 120m hub — the difference between a marginal site and an excellent one.',
        hint: 'Power law: v_hub = v_ref × (h_hub / h_ref)^0.143. For 120m hub: v_hub = 9.6 × (120/10)^0.143 = 9.6 × 1.21 = 11.6 m/s. AEP scales roughly with v³ — so 21% more wind means ~77% more energy.',
        overlays: {
          circles: [
            [52.04, -1.50, 2500, '7.9 m/s at 10m → 9.6 m/s at 120m hub', '#10b981'],
            [52.01, -1.43, 2500, '9.6 m/s at 10m → 11.6 m/s at 120m hub', '#ef4444'],
          ],
        },
      },
      {
        action: 'read',
        instruction: 'Weibull distribution: wind speed is not constant — it follows a probability distribution. k=2 and λ=9 (m/s) means wind speed is around 9 m/s about 15% of the time, with lower and higher speeds occurring less often. AEP is calculated by integrating the turbine power curve over this distribution.',
        hint: 'In the Analysis tab, the Weibull chart shows this distribution. Adjust k (shape) and λ (scale) with the sliders to see how the distribution changes. When turbines are placed, real k and λ values are fetched automatically.',
        overlays: {
          circles: [
            [52.04, -1.50, 1500, 'Met Mast Location — 24-month measurement campaign', '#8b5cf6'],
          ],
          turbines: [[52.045, -1.48], [52.035, -1.47]],
        },
      },
      {
        action: 'click_turbine',
        required: 2,
        instruction: 'Place 2 turbines in the best wind resource area (the eastern yellow/red zones). Avoid the blue low-wind zone in the north-west.',
        hint: 'Target the south-east portion of the map. Real projects use wind resource maps to identify ridge lines and exposed hillsides — the best positions for turbines.',
        overlays: {
          circles: [
            [52.07, -1.58, 2200, 'Low wind — avoid', '#1d4ed8'],
            [52.05, -1.55, 2200, 'Below average', '#06b6d4'],
            [52.04, -1.50, 2200, 'Good — consider', '#10b981'],
            [52.03, -1.46, 2200, 'Very good — target', '#f59e0b'],
            [52.01, -1.43, 2200, 'Best resource — place here', '#ef4444'],
          ],
        },
      },
      {
        action: 'read',
        instruction: 'Monthly energy profile: UK onshore wind is strongly seasonal. October–March generates 25–35% more energy than April–September. A 4-turbine farm with 8 m/s average wind speed producing 50,000 MWh/yr will produce ~5,200 MWh in January but only ~3,400 MWh in June.',
        hint: 'The monthly profile is shown in the Analysis tab as a bar chart. This seasonal pattern is used in financial modelling — energy is worth more when power prices are higher, which in the UK often coincides with winter demand peaks.',
        overlays: {
          turbines: [[52.035, -1.47], [52.03, -1.46], [52.025, -1.465], [52.02, -1.455]],
          circles: [
            [52.028, -1.46, 3500, 'High wind resource cluster — 9.1 m/s average', '#f59e0b'],
          ],
        },
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 5 — Working With GIS Data Layers
  // ══════════════════════════════════════════════════════════════
  layer_data: {
    title: 'Creating & Managing GIS Data Layers',
    center: [52.04, -1.5],
    zoom: 11,
    steps: [
      {
        action: 'read',
        instruction: 'A complex wind farm GIS project has many layers. This map shows a typical layer stack: Site Boundary (cyan), Elevation Contours (brown lines), Existing 33kV Overhead Line (yellow), Ancient Woodland (dark green), and Residential Properties (orange dots). Each layer can be toggled on/off independently.',
        hint: 'In the planning tool: Layers tab → eye icon to toggle visibility. Click a layer to select it and change its colour, name, or style.',
        overlays: {
          polygons: [
            { pts: [[52.02, -1.56], [52.07, -1.56], [52.07, -1.44], [52.02, -1.44]], color: '#06b6d4', opacity: 0.06, label: 'Site Boundary' },
            { pts: [[52.055, -1.54], [52.06, -1.54], [52.06, -1.52], [52.055, -1.52]], color: '#166534', opacity: 0.5, label: 'Ancient Woodland' },
            { pts: [[52.03, -1.48], [52.035, -1.48], [52.035, -1.46], [52.03, -1.46]], color: '#166534', opacity: 0.5, label: 'Ancient Woodland' },
          ],
          lines: [
            { pts: [[52.07, -1.52], [52.05, -1.52], [52.03, -1.50], [52.02, -1.48]], color: '#facc15', label: 'Existing 33kV Overhead Line' },
          ],
          circles: [
            [52.058, -1.535, 80, 'Dwelling', '#f97316'],
            [52.042, -1.515, 80, 'Dwelling', '#f97316'],
            [52.028, -1.488, 80, 'Dwelling', '#f97316'],
            [52.038, -1.544, 80, 'Dwelling', '#f97316'],
          ],
        },
      },
      {
        action: 'read',
        instruction: 'Elevation data: each turbine shows its ground elevation fetched from Open-Elevation. But for site-wide topography, we import a digital elevation model as contour lines. Contours reveal ridge lines (good wind resource) and valley bottoms (poor access, higher foundation costs).',
        hint: 'In the planning tool: import a GeoJSON file of contour lines using the Import button. Style the layer with a brown/tan colour at low opacity so it reads clearly beneath other data layers.',
        overlays: {
          polygons: [
            { pts: [[52.02, -1.56], [52.07, -1.56], [52.07, -1.44], [52.02, -1.44]], color: '#06b6d4', opacity: 0.06, label: '' },
          ],
          circles: [
            [52.05, -1.50, 4000, '200m contour (ridge)', '#a16207'],
            [52.05, -1.50, 3000, '220m contour', '#a16207'],
            [52.05, -1.50, 2000, '240m contour', '#a16207'],
            [52.05, -1.50, 1000, '260m contour (summit)', '#a16207'],
          ],
        },
      },
      {
        action: 'read',
        instruction: 'Electricity network topology: map the existing network infrastructure near the site. Here we see a 33kV overhead line running across the site (yellow) and the DNO substation (blue). Understanding the network capacity and connection cost at each point is critical for economic viability.',
        hint: "Import the electricity network from OS Open Data or your DNO's GIS portal. Add it as a separate \"Electricity Network\" layer so it can be toggled independently of turbines and cables.",
        overlays: {
          polygons: [
            { pts: [[52.02, -1.56], [52.07, -1.56], [52.07, -1.44], [52.02, -1.44]], color: '#06b6d4', opacity: 0.06, label: '' },
          ],
          lines: [
            { pts: [[52.07, -1.52], [52.05, -1.52], [52.03, -1.50], [52.02, -1.48]], color: '#facc15', label: 'Existing 33kV Overhead Line' },
            { pts: [[52.04, -1.56], [52.04, -1.54], [52.04, -1.50]], color: '#a78bfa', label: '132kV Transmission Line (distant)' },
          ],
          circles: [
            [52.02, -1.48, 200, 'DNO 33kV Substation — PoC candidate', '#3b82f6'],
          ],
        },
      },
      {
        action: 'draw_polygon',
        required: 1,
        instruction: 'Draw a new layer representing an environmental constraint — for example, a Flood Risk Zone or a buffer around the Ancient Woodland. Click at least 4 points, then click "Finish Polygon".',
        hint: 'In the real tool: use "+ Add Zone" in the Layers tab to create the layer, name it (e.g. "Flood Zone 3"), choose a colour (blue for flood risk), then switch to Boundary mode to draw it.',
        overlays: {
          polygons: [
            { pts: [[52.055, -1.54], [52.06, -1.54], [52.06, -1.52], [52.055, -1.52]], color: '#166534', opacity: 0.35, label: 'Ancient Woodland' },
            { pts: [[52.02, -1.56], [52.07, -1.56], [52.07, -1.44], [52.02, -1.44]], color: '#06b6d4', opacity: 0.06, label: '' },
          ],
        },
      },
      {
        action: 'read',
        instruction: 'Final layer stack showing all data together: site boundary, elevation contours, electricity network, ancient woodland, residential buffers, and turbine positions. Each layer was built separately and can be toggled to focus on specific aspects of the analysis.',
        hint: 'When exporting, all layers are bundled into a single GeoJSON FeatureCollection. Open it in QGIS to apply professional cartographic styling, run spatial analysis (buffer, intersect, clip), and produce planning application maps.',
        overlays: {
          polygons: [
            { pts: [[52.02, -1.56], [52.07, -1.56], [52.07, -1.44], [52.02, -1.44]], color: '#06b6d4', opacity: 0.06, label: 'Site boundary' },
            { pts: [[52.055, -1.54], [52.06, -1.54], [52.06, -1.52], [52.055, -1.52]], color: '#166534', opacity: 0.4, label: 'Ancient Woodland' },
            { pts: [[52.03, -1.48], [52.035, -1.48], [52.035, -1.46], [52.03, -1.46]], color: '#166534', opacity: 0.4, label: 'Ancient Woodland' },
          ],
          turbines: [[52.045, -1.505], [52.038, -1.495], [52.028, -1.472]],
          lines: [
            { pts: [[52.07, -1.52], [52.05, -1.52], [52.03, -1.50], [52.02, -1.48]], color: '#facc15', label: '33kV OHL' },
            { pts: [[52.045, -1.505], [52.038, -1.495]], color: '#f97316', label: 'Internal cable' },
            { pts: [[52.038, -1.495], [52.028, -1.472]], color: '#f97316', label: 'Internal cable' },
            { pts: [[52.028, -1.472], [52.02, -1.48]], color: '#f97316', label: 'Grid connection' },
          ],
          circles: [
            [52.058, -1.535, 500, '500m setback', '#f97316'],
            [52.02, -1.48, 150, 'DNO Substation', '#3b82f6'],
          ],
        },
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 6 — Site Constraints & Suitability
  // ══════════════════════════════════════════════════════════════
  site_constraints: {
    title: 'Constraints Analysis & Finding the Developable Envelope',
    center: [52.04, -1.5],
    zoom: 11,
    steps: [
      {
        action: 'read',
        instruction: 'Step 1: Start with the gross site boundary. This 1,200-hectare site has been identified as a potential wind farm location based on wind resource and landowner interest. The gross area is everything inside the site boundary — but most of it will be excluded once constraints are applied.',
        hint: 'In the planning tool: draw the gross boundary as the first polygon layer (Site Boundary, cyan). This is the outer limit of the project area.',
        overlays: {
          polygons: [
            { pts: [[52.02, -1.58], [52.08, -1.58], [52.08, -1.43], [52.02, -1.43]], color: '#06b6d4', opacity: 0.08, label: 'Gross site boundary (1,200 ha)' },
          ],
        },
      },
      {
        action: 'read',
        instruction: 'Step 2: Apply residential setbacks. Five dwellings exist within or near the site boundary. A 500m buffer around each one removes significant land. Each buffer is drawn as a separate circle or polygon layer.',
        hint: 'Create a "Residential 500m Setback" layer in red. Draw each buffer as a circle (using Boundary mode with a known radius) or import dwelling locations from AddressBase data.',
        overlays: {
          polygons: [
            { pts: [[52.02, -1.58], [52.08, -1.58], [52.08, -1.43], [52.02, -1.43]], color: '#06b6d4', opacity: 0.06, label: '' },
          ],
          circles: [
            [52.07, -1.56, 500, 'Dwelling A — 500m buffer', '#ef4444'],
            [52.065, -1.49, 500, 'Dwelling B — 500m buffer', '#ef4444'],
            [52.04, -1.575, 500, 'Dwelling C — 500m buffer', '#ef4444'],
            [52.026, -1.52, 500, 'Dwelling D — 500m buffer', '#ef4444'],
            [52.022, -1.455, 500, 'Dwelling E — 500m buffer', '#ef4444'],
          ],
        },
      },
      {
        action: 'read',
        instruction: 'Step 3: Apply ecological constraints. A SSSI covers part of the northern area, and two ancient woodland blocks lie within the boundary. Both are hard exclusions — no turbines or infrastructure within or adjacent to them.',
        hint: 'Create separate layers: "SSSI Boundary" (green) and "Ancient Woodland" (dark green). Import data from Natural England's GIS portal or draw from aerial imagery.',
        overlays: {
          polygons: [
            { pts: [[52.02, -1.58], [52.08, -1.58], [52.08, -1.43], [52.02, -1.43]], color: '#06b6d4', opacity: 0.04, label: '' },
            { pts: [[52.072, -1.58], [52.08, -1.58], [52.08, -1.53], [52.072, -1.53]], color: '#16a34a', opacity: 0.45, label: 'SSSI' },
            { pts: [[52.05, -1.575], [52.055, -1.575], [52.055, -1.555], [52.05, -1.555]], color: '#166534', opacity: 0.55, label: 'Ancient Woodland' },
            { pts: [[52.033, -1.465], [52.039, -1.465], [52.039, -1.452], [52.033, -1.452]], color: '#166534', opacity: 0.55, label: 'Ancient Woodland' },
          ],
          circles: [
            [52.07, -1.56, 500, 'Dwelling A', '#ef4444'],
            [52.065, -1.49, 500, 'Dwelling B', '#ef4444'],
            [52.04, -1.575, 500, 'Dwelling C', '#ef4444'],
            [52.026, -1.52, 500, 'Dwelling D', '#ef4444'],
            [52.022, -1.455, 500, 'Dwelling E', '#ef4444'],
          ],
        },
      },
      {
        action: 'read',
        instruction: 'Step 4: Apply infrastructure constraints. The existing 33kV overhead line requires a 2× tip-height (≈300m) buffer either side. The A-road requires a 200m buffer. These are "soft" constraints — turbines can be closer with justification, but buffers are typically observed.',
        hint: 'Create "OHL Buffer" and "Road Buffer" layers in orange (soft constraint colour). These narrow strips can significantly limit turbine positions near infrastructure.',
        overlays: {
          polygons: [
            { pts: [[52.02, -1.58], [52.08, -1.58], [52.08, -1.43], [52.02, -1.43]], color: '#06b6d4', opacity: 0.04, label: '' },
          ],
          lines: [
            { pts: [[52.08, -1.52], [52.05, -1.52], [52.03, -1.50], [52.02, -1.48]], color: '#facc15', label: 'Existing 33kV OHL (300m buffer each side)' },
            { pts: [[52.08, -1.56], [52.055, -1.54], [52.03, -1.52], [52.02, -1.52]], color: '#9ca3af', label: 'A-road (200m buffer)' },
          ],
          circles: [
            [52.07, -1.56, 300, 'OHL buffer', '#f59e0b'],
            [52.05, -1.52, 300, 'OHL buffer', '#f59e0b'],
            [52.026, -1.52, 300, 'OHL buffer', '#f59e0b'],
          ],
        },
      },
      {
        action: 'read',
        instruction: 'Step 5: The developable envelope. After removing all constraints, the green zone is where turbines can go. Only ~22% of the gross site area remains developable — typical for a constrained UK site. This area can realistically fit 4–6 turbines.',
        hint: 'The developable envelope is the starting point for layout design. In the planning tool, draw it as its own polygon layer ("Developable Area", green) so planners and turbine layout engineers know exactly where to work.',
        overlays: {
          polygons: [
            { pts: [[52.02, -1.58], [52.08, -1.58], [52.08, -1.43], [52.02, -1.43]], color: '#06b6d4', opacity: 0.04, label: 'Gross boundary' },
            { pts: [[52.044, -1.545], [52.058, -1.545], [52.058, -1.513], [52.044, -1.513]], color: '#10b981', opacity: 0.35, label: 'Developable area (zone A)' },
            { pts: [[52.03, -1.50], [52.042, -1.50], [52.042, -1.473], [52.03, -1.473]], color: '#10b981', opacity: 0.35, label: 'Developable area (zone B)' },
          ],
          circles: [
            [52.07, -1.56, 500, 'Dwelling A', '#ef4444'],
            [52.065, -1.49, 500, 'Dwelling B', '#ef4444'],
            [52.04, -1.575, 500, 'Dwelling C', '#ef4444'],
          ],
        },
      },
      {
        action: 'click_turbine',
        required: 4,
        instruction: 'Place 4 turbines within the two developable zones (green areas), respecting all setbacks shown. The green areas are your only valid options.',
        hint: 'Click inside the two green polygons. In the real tool you would also check each turbine against all constraint layers using the radius tool before confirming the layout.',
        overlays: {
          polygons: [
            { pts: [[52.044, -1.545], [52.058, -1.545], [52.058, -1.513], [52.044, -1.513]], color: '#10b981', opacity: 0.3, label: 'Zone A — valid' },
            { pts: [[52.03, -1.50], [52.042, -1.50], [52.042, -1.473], [52.03, -1.473]], color: '#10b981', opacity: 0.3, label: 'Zone B — valid' },
          ],
          circles: [
            [52.07, -1.56, 500, 'Excluded', '#ef4444'],
            [52.065, -1.49, 500, 'Excluded', '#ef4444'],
            [52.04, -1.575, 500, 'Excluded', '#ef4444'],
            [52.026, -1.52, 500, 'Excluded', '#ef4444'],
            [52.022, -1.455, 500, 'Excluded', '#ef4444'],
          ],
        },
      },
    ],
  },
};