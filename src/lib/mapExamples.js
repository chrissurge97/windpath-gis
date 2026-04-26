// ─────────────────────────────────────────────────────────────────
// Stepped Map Examples for the Learn module
// Each example corresponds to a training module
// ─────────────────────────────────────────────────────────────────

export const MAP_EXAMPLES = {
  gis_basics: {
    title: 'Identify GIS Layers on a Map',
    center: [52.04, -1.5],
    zoom: 11,
    steps: [
      {
        action: 'read',
        instruction: 'This is a GIS map of a potential wind farm site in the English Midlands.',
        hint: 'Notice the dark basemap — this is a CartoDB dark tileset, commonly used for data visualisation.',
        overlays: {},
      },
      {
        action: 'read',
        instruction: 'The cyan polygon shows the proposed site boundary — a vector polygon layer.',
        hint: 'Vector data is made of coordinates and can be styled and queried unlike raster imagery.',
        overlays: {
          polygons: [[[52.06, -1.58], [52.08, -1.48], [52.02, -1.44], [52.00, -1.54]]],
        },
      },
      {
        action: 'read',
        instruction: 'The orange circles mark 500m exclusion zones around villages — a buffer analysis result.',
        hint: 'Buffers are one of the most common GIS operations, used to enforce setback constraints.',
        overlays: {
          polygons: [[[52.06, -1.58], [52.08, -1.48], [52.02, -1.44], [52.00, -1.54]]],
          circles: [
            [52.055, -1.52, 500, 'Village exclusion zone'],
            [52.03, -1.50, 500, 'Village exclusion zone'],
          ],
        },
      },
      {
        action: 'click_turbine',
        required: 2,
        instruction: 'Now place 2 turbines inside the site boundary, avoiding exclusion zones.',
        hint: 'Click anywhere on the map — aim inside the cyan polygon and away from the orange circles.',
        overlays: {
          polygons: [[[52.06, -1.58], [52.08, -1.48], [52.02, -1.44], [52.00, -1.54]]],
          circles: [
            [52.055, -1.52, 500, 'Village exclusion zone'],
            [52.03, -1.50, 500, 'Village exclusion zone'],
          ],
        },
      },
    ],
  },

  wind_resource: {
    title: 'Read Wind Resource Data on a Map',
    center: [52.04, -1.5],
    zoom: 10,
    steps: [
      {
        action: 'read',
        instruction: 'Wind resource maps show mean wind speed across an area at a reference height (usually 10m or 100m).',
        hint: 'Colour gradients typically go from blue (low wind) to red (high wind).',
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
        instruction: 'Wind speed increases with elevation. Ridgelines and exposed hilltops have higher resource.',
        hint: 'The power law shear correction: V_hub = V_ref × (H_hub / H_ref)^α, where α ≈ 0.143 for open terrain.',
        overlays: {
          circles: [
            [52.10, -1.6, 3000, '6.5 m/s — Valley (low)'],
            [52.05, -1.5, 3000, '7.8 m/s — Slope'],
            [52.00, -1.4, 3000, '9.1 m/s — Ridgeline (high)'],
          ],
          polygons: [[[52.02, -1.46], [52.03, -1.44], [51.98, -1.42], [51.97, -1.44]]],
        },
      },
      {
        action: 'click_turbine',
        required: 1,
        instruction: 'Click on the highest-wind area (near the bottom-right circle) to place a turbine.',
        hint: 'In real planning, you would always target the highest wind resource while respecting constraints.',
        overlays: {
          circles: [
            [52.10, -1.6, 3000, '6.5 m/s — Low'],
            [52.05, -1.5, 3000, '7.8 m/s — Medium'],
            [52.00, -1.4, 3000, '9.1 m/s — High — place here!'],
          ],
        },
      },
    ],
  },

  site_suitability: {
    title: 'Site Suitability Mapping',
    center: [52.04, -1.5],
    zoom: 10,
    steps: [
      {
        action: 'read',
        instruction: 'Site suitability analysis combines multiple constraint layers to find viable areas.',
        hint: 'This is often done using weighted overlay or Boolean intersection in a GIS tool.',
        overlays: {
          polygons: [[[52.06, -1.58], [52.08, -1.48], [52.02, -1.44], [52.00, -1.54]]],
        },
      },
      {
        action: 'read',
        instruction: 'Red circles show "hard" constraints: villages, airports, protected areas — no turbines allowed.',
        hint: 'Hard constraints are absolute exclusions regardless of wind resource.',
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
        instruction: 'After removing constraints, the remaining area is the developable envelope — shown here.',
        hint: 'In practice this would be a suitability score raster, showing degrees of suitability.',
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
        instruction: 'Place 3 turbines within the developable area (small polygon) avoiding exclusion zones.',
        hint: 'Aim for the cyan polygon. Turbines should be spaced at least 3-5 rotor diameters apart.',
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
    title: 'Turbine Layout Optimisation',
    center: [52.04, -1.5],
    zoom: 11,
    steps: [
      {
        action: 'read',
        instruction: 'Turbine spacing affects wake losses. Turbines downstream of others receive less wind.',
        hint: 'In the prevailing wind direction (usually SW in UK), turbines should be spaced 7-10 rotor diameters apart.',
        overlays: {
          turbines: [[52.04, -1.55], [52.04, -1.52], [52.04, -1.49]],
        },
      },
      {
        action: 'read',
        instruction: 'These turbines in a row perpendicular to the wind have minimal wake interaction — efficient layout.',
        hint: 'A line of turbines perpendicular to the prevailing wind is the simplest optimised layout.',
        overlays: {
          turbines: [[52.02, -1.55], [52.04, -1.55], [52.06, -1.55]],
          polygons: [[[52.01, -1.58], [52.01, -1.52], [52.07, -1.52], [52.07, -1.58]]],
        },
      },
      {
        action: 'click_turbine',
        required: 4,
        instruction: 'Design your own layout — place 4 turbines. Try to space them evenly.',
        hint: 'Think about the SW prevailing wind direction. Spacing turbines perpendicular to wind minimises wake losses.',
        overlays: {
          polygons: [[[52.02, -1.58], [52.06, -1.58], [52.06, -1.46], [52.02, -1.46]]],
        },
      },
    ],
  },

  energy_yield: {
    title: 'Energy Yield — Reading the Numbers',
    center: [52.04, -1.5],
    zoom: 11,
    steps: [
      {
        action: 'read',
        instruction: 'This layout of 5 turbines has been placed at this site. Each turbine is 3.5 MW rated.',
        hint: 'Total installed capacity = 5 × 3.5 MW = 17.5 MW.',
        overlays: {
          turbines: [[52.05, -1.55], [52.05, -1.51], [52.03, -1.53], [52.03, -1.49], [52.05, -1.47]],
          polygons: [[[52.01, -1.58], [52.07, -1.58], [52.07, -1.44], [52.01, -1.44]]],
        },
      },
      {
        action: 'read',
        instruction: 'With a mean wind speed of 8.5 m/s and a capacity factor of 35%, the gross AEP = 17.5 MW × 8,760 hrs × 35% = 53,655 MWh/yr.',
        hint: 'Capacity factor is how much energy is actually produced vs theoretical maximum at full power all year.',
        overlays: {
          turbines: [[52.05, -1.55], [52.05, -1.51], [52.03, -1.53], [52.03, -1.49], [52.05, -1.47]],
        },
      },
      {
        action: 'read',
        instruction: 'After deducting 8% wake loss, 4% availability loss, and 1.5% electrical loss — Net AEP ≈ 47,000 MWh/yr.',
        hint: 'Net AEP is what lenders and buyers use for financial modelling. P90 is a further ~12% conservative cut.',
        overlays: {
          turbines: [[52.05, -1.55], [52.05, -1.51], [52.03, -1.53], [52.03, -1.49], [52.05, -1.47]],
        },
      },
      {
        action: 'click_turbine',
        required: 1,
        instruction: 'This site has room for one more turbine. Place it to increase the farm\'s AEP.',
        hint: 'Adding a 6th turbine at ~35% CF adds approximately 10,731 MWh/yr to the net yield.',
        overlays: {
          turbines: [[52.05, -1.55], [52.05, -1.51], [52.03, -1.53], [52.03, -1.49], [52.05, -1.47]],
          polygons: [[[52.01, -1.58], [52.07, -1.58], [52.07, -1.44], [52.01, -1.44]]],
        },
      },
    ],
  },

  grid_connection: {
    title: 'Grid Connection & Infrastructure',
    center: [52.04, -1.5],
    zoom: 11,
    steps: [
      {
        action: 'read',
        instruction: 'Wind farms need a grid connection to export electricity. The connection point (substation) is shown in orange.',
        hint: 'Grid connection cost is often the biggest single cost in a wind farm development budget.',
        overlays: {
          turbines: [[52.05, -1.55], [52.03, -1.52], [52.06, -1.50]],
          circles: [[52.01, -1.50, 200, 'Grid substation']],
        },
      },
      {
        action: 'read',
        instruction: 'Cables run from each turbine to a collection substation, then to the grid. Shorter cable = lower cost.',
        hint: 'The cable route is another GIS problem — finding the shortest path avoiding obstacles.',
        overlays: {
          turbines: [[52.05, -1.55], [52.03, -1.52], [52.06, -1.50]],
          circles: [[52.01, -1.50, 200, 'Grid substation']],
          polygons: [
            [[52.04, -1.535], [52.04, -1.525], [52.03, -1.525], [52.03, -1.535]],
          ],
        },
      },
      {
        action: 'click_turbine',
        required: 2,
        instruction: 'Place 2 more turbines as close to the substation (orange circle) as possible to minimise cable length.',
        hint: 'In real life you would also avoid crossing roads, watercourses, and third-party land.',
        overlays: {
          turbines: [[52.05, -1.55], [52.03, -1.52], [52.06, -1.50]],
          circles: [[52.01, -1.50, 200, 'Grid substation — aim nearby']],
        },
      },
    ],
  },
};