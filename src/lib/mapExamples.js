// ─────────────────────────────────────────────────────────────────
// Stepped Map Examples — aligned with the 6 training modules
// ─────────────────────────────────────────────────────────────────

export const MAP_EXAMPLES = {
  gis_basics: {
    title: 'Draw a Site Boundary',
    center: [52.04, -1.5],
    zoom: 11,
    steps: [
      {
        action: 'read',
        instruction: 'This is the planning map. The dark basemap is CartoDB dark — good for visualising data layers on top.',
        hint: 'In the real tool, use the Layers tab on the right to manage layers.',
        overlays: {},
      },
      {
        action: 'read',
        instruction: 'A site boundary polygon (cyan) defines the project area. Everything outside is off-limits for turbine placement.',
        hint: 'In the tool: click "Boundary" in the toolbar, click vertices on the map, then "Finish" to close the polygon.',
        overlays: {
          polygons: [[[52.06, -1.58], [52.08, -1.48], [52.02, -1.44], [52.00, -1.54]]],
        },
      },
      {
        action: 'read',
        instruction: 'A constraint zone (orange) marks an exclusion area — e.g. a village with a 500m setback. Turbines must stay outside this.',
        hint: 'In the tool: click "+ Add Zone" in the Layers tab to add any number of constraint layers.',
        overlays: {
          polygons: [[[52.06, -1.58], [52.08, -1.48], [52.02, -1.44], [52.00, -1.54]]],
          circles: [
            [52.055, -1.52, 500, 'Village setback — 500m'],
            [52.03, -1.50, 500, 'Village setback — 500m'],
          ],
        },
      },
      {
        action: 'click_turbine',
        required: 2,
        instruction: 'Place 2 turbines inside the site boundary (cyan), outside the exclusion zones (orange circles).',
        hint: 'Aim for the cyan polygon area, away from orange circles. In the real tool, use "Place Turbine" mode.',
        overlays: {
          polygons: [[[52.06, -1.58], [52.08, -1.48], [52.02, -1.44], [52.00, -1.54]]],
          circles: [
            [52.055, -1.52, 500, 'Village setback'],
            [52.03, -1.50, 500, 'Village setback'],
          ],
        },
      },
    ],
  },

  turbine_placement: {
    title: 'Place Turbines & Read Data',
    center: [52.04, -1.5],
    zoom: 11,
    steps: [
      {
        action: 'read',
        instruction: 'When you place a turbine in the planning tool, real elevation and wind data are fetched automatically from Open-Meteo.',
        hint: 'The turbine type selector in the Turbines tab controls which turbine spec is used (MW rating, rotor, hub height).',
        overlays: {
          polygons: [[[52.02, -1.58], [52.06, -1.58], [52.06, -1.46], [52.02, -1.46]]],
        },
      },
      {
        action: 'read',
        instruction: 'Each turbine in the data table shows: Rated Power (MW), Rotor Ø, Hub Height, Elevation, Wind Speed at 10m, Hub Wind Speed, and estimated AEP.',
        hint: 'Hub wind speed is calculated from 10m wind using the power law shear: v_hub = v_10 × (hub_height/10)^0.143.',
        overlays: {
          turbines: [[52.05, -1.55], [52.04, -1.50]],
          polygons: [[[52.02, -1.58], [52.06, -1.58], [52.06, -1.46], [52.02, -1.46]]],
        },
      },
      {
        action: 'click_turbine',
        required: 3,
        instruction: 'Place 3 turbines inside the site boundary. In the real tool, their AEP would be shown in the data table.',
        hint: 'Try to space them at least 400m apart to avoid wake losses. Aim inside the cyan polygon.',
        overlays: {
          polygons: [[[52.02, -1.58], [52.06, -1.58], [52.06, -1.46], [52.02, -1.46]]],
        },
      },
    ],
  },

  cable_routing: {
    title: 'Plan Cable Routes',
    center: [52.04, -1.5],
    zoom: 11,
    steps: [
      {
        action: 'read',
        instruction: 'Cable routes connect turbines to a substation. The orange circle marks the grid connection substation.',
        hint: 'In the tool, use "Draw Cable" mode — click a start point then an end point to create a route.',
        overlays: {
          turbines: [[52.05, -1.55], [52.04, -1.50], [52.06, -1.50]],
          circles: [[52.01, -1.50, 200, 'Grid substation']],
        },
      },
      {
        action: 'read',
        instruction: 'Shorter cable routes = lower cost. Compare: 33kV underground (£120/m) vs 33kV overhead line (£45/m). Overhead is cheaper but needs wayleaves and has visual impact.',
        hint: 'In the Cables tab, expand the cable type selector and click the edit icon to change the £/m for any type.',
        overlays: {
          turbines: [[52.05, -1.55], [52.04, -1.50], [52.06, -1.50]],
          circles: [[52.01, -1.50, 200, 'Grid substation']],
          polygons: [[[52.04, -1.535], [52.04, -1.525], [52.03, -1.525], [52.03, -1.535]]],
        },
      },
      {
        action: 'click_turbine',
        required: 2,
        instruction: 'Place 2 more turbines as close to the substation (orange circle) as practical to minimise cable length.',
        hint: 'Each 100m of cable at £120/m costs £12,000. Over a 1km run that\'s £120,000 — significant at project scale.',
        overlays: {
          turbines: [[52.05, -1.55], [52.04, -1.50], [52.06, -1.50]],
          circles: [[52.01, -1.50, 200, 'Grid substation']],
        },
      },
    ],
  },

  wind_resource: {
    title: 'Read Wind Resource Data',
    center: [52.04, -1.5],
    zoom: 10,
    steps: [
      {
        action: 'read',
        instruction: 'Colour-coded circles show mean wind speed across the site. Blue = lower wind, red = higher wind.',
        hint: 'In the Analysis tab, the Weibull chart shows the distribution of wind speeds — key to accurate AEP calculation.',
        overlays: {
          circles: [
            [52.10, -1.6, 3000, '6.5 m/s — Low'],
            [52.05, -1.5, 3000, '7.8 m/s — Medium'],
            [52.00, -1.4, 3000, '9.1 m/s — High'],
          ],
        },
      },
      {
        action: 'read',
        instruction: 'Wind speed increases with height. Hub-height wind is always faster than 10m reference. Higher hub heights (e.g. 120m) mean more energy per turbine.',
        hint: 'In the Turbines data table: the "Hub wind" value is always higher than "Wind 10m" — this is the shear correction.',
        overlays: {
          circles: [
            [52.10, -1.6, 3000, '6.5 m/s at 10m → 7.9 m/s at 120m'],
            [52.05, -1.5, 3000, '7.8 m/s at 10m → 9.4 m/s at 120m'],
            [52.00, -1.4, 3000, '9.1 m/s at 10m → 11.0 m/s at 120m'],
          ],
          polygons: [[[52.02, -1.46], [52.03, -1.44], [51.98, -1.42], [51.97, -1.44]]],
        },
      },
      {
        action: 'click_turbine',
        required: 1,
        instruction: 'Place a turbine in the highest-wind area (near the bottom-right, large circle).',
        hint: 'Target the bottom-right circle — this represents the site\'s best wind resource location.',
        overlays: {
          circles: [
            [52.10, -1.6, 3000, '6.5 m/s — Low — avoid'],
            [52.05, -1.5, 3000, '7.8 m/s — Medium'],
            [52.00, -1.4, 3000, '9.1 m/s — Best — place here!'],
          ],
        },
      },
    ],
  },

  site_suitability: {
    title: 'Map Constraints & Find Developable Area',
    center: [52.04, -1.5],
    zoom: 10,
    steps: [
      {
        action: 'read',
        instruction: 'Site suitability starts with the gross site boundary, then removes hard constraints to find where turbines can go.',
        hint: 'In the tool: use "+ Add Zone" in Layers to add as many constraint layers as you need.',
        overlays: {
          polygons: [[[52.06, -1.58], [52.08, -1.48], [52.02, -1.44], [52.00, -1.54]]],
        },
      },
      {
        action: 'read',
        instruction: 'Hard exclusions (red zones) — village buffers and a protected area — are removed from consideration. No turbines in these zones.',
        hint: 'In the planning tool, you draw these as separate layers. Toggle them on/off to see the impact on available area.',
        overlays: {
          polygons: [[[52.06, -1.58], [52.08, -1.48], [52.02, -1.44], [52.00, -1.54]]],
          circles: [
            [52.07, -1.56, 600, 'Village — 500m buffer'],
            [52.01, -1.47, 500, 'SSSI protected area'],
          ],
        },
      },
      {
        action: 'read',
        instruction: 'The remaining "developable envelope" (small cyan polygon) is where turbines can be placed — typically 15–40% of the gross area.',
        hint: 'The smaller developable area is the result of applying all constraint layers.',
        overlays: {
          polygons: [
            [[52.04, -1.58], [52.06, -1.54], [52.04, -1.50], [52.02, -1.54]],
          ],
          circles: [
            [52.07, -1.56, 600, 'Village — excluded'],
            [52.01, -1.47, 500, 'SSSI — excluded'],
          ],
        },
      },
      {
        action: 'click_turbine',
        required: 3,
        instruction: 'Place 3 turbines within the small developable area (cyan polygon), avoiding the exclusion zones.',
        hint: 'Aim for the small cyan polygon. In the real tool, use Layers to toggle constraints on/off to verify positions.',
        overlays: {
          polygons: [
            [[52.04, -1.58], [52.06, -1.54], [52.04, -1.50], [52.02, -1.54]],
          ],
          circles: [
            [52.07, -1.56, 600, 'Village — excluded'],
            [52.01, -1.47, 500, 'SSSI — excluded'],
          ],
        },
      },
    ],
  },

  turbine_layout: {
    title: 'Optimise Turbine Spacing & Layout',
    center: [52.04, -1.5],
    zoom: 11,
    steps: [
      {
        action: 'read',
        instruction: 'Poor layout: turbines in a line parallel to the prevailing SW wind. Each one sits in the wake of the one before — high wake losses.',
        hint: 'In the Turbines data table, wake-affected turbines will show lower hub wind speed and lower AEP.',
        overlays: {
          turbines: [[52.04, -1.55], [52.04, -1.52], [52.04, -1.49]],
          polygons: [[[52.02, -1.58], [52.06, -1.58], [52.06, -1.46], [52.02, -1.46]]],
        },
      },
      {
        action: 'read',
        instruction: 'Good layout: turbines in a row perpendicular to the prevailing SW wind (running NW–SE). Minimal wake interaction between turbines.',
        hint: 'For a second row, step 7–10 rotor diameters (~1km for 130m rotor) downwind (to the NE).',
        overlays: {
          turbines: [[52.02, -1.55], [52.04, -1.55], [52.06, -1.55]],
          polygons: [[[52.01, -1.58], [52.01, -1.52], [52.07, -1.52], [52.07, -1.58]]],
        },
      },
      {
        action: 'click_turbine',
        required: 4,
        instruction: 'Place 4 turbines in an optimised layout — aim for a row perpendicular to the SW wind (left–right across the map).',
        hint: 'Place turbines roughly horizontally across the map, with ~500m spacing between them.',
        overlays: {
          polygons: [[[52.02, -1.58], [52.06, -1.58], [52.06, -1.46], [52.02, -1.46]]],
        },
      },
    ],
  },
};