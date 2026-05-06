export const MODULES = [
  {
    id: 'land_acquisition',
    title: 'Land & Site Acquisition',
    subtitle: 'Drawing property boundaries, ownership & status',
    icon: 'Map',
    xp_reward: 120,
    color: 'cyan',
    description: 'Learn to map property parcels, record ownership details, and track acquisition status (purchased, leased, negotiating) as part of site development.',
    lessons: [
      {
        id: 'l1',
        title: 'Why Map Property Boundaries?',
        content: 'Before a wind farm can be developed, the project team must identify and acquire the land. Each agricultural field, woodland block, or access track may have a different owner. Mapping boundaries in GIS lets you track which parcels are inside the site, who owns them, and what stage of negotiation or agreement you are at.'
      },
      {
        id: 'l2',
        title: 'Drawing a Property Parcel',
        content: 'In the planning tool, switch to "Boundary" mode and click vertices around the property boundary. Double-click or click "Finish" to close the polygon. Each polygon represents one parcel. You can draw as many as needed — one per field, one per farm holding, or one per landowner. The polygon appears on the map in the colour you assign.'
      },
      {
        id: 'l3',
        title: 'Setting Parcel Attributes',
        content: 'Once drawn, each parcel can have attributes: Owner name, Land use type (arable, pasture, woodland), Acquisition status (Negotiating, Option Agreed, Leased, Purchased, Not Acquired), and a colour to visually distinguish status. Use a colour convention — green for secured land, amber for ongoing negotiations, red for refused or not pursued.'
      },
      {
        id: 'l4',
        title: 'Using Colours to Show Status',
        content: 'A colour-coded land acquisition map is one of the most useful outputs in early development. At a glance, the project team, developers, and investors can see how much land is secured. Recommended convention: Green = Leased/Purchased, Amber/Yellow = Option Agreed, Orange = Negotiating, Red = Not Acquired. Toggle the layer on and off to show landowners just their parcel.'
      },
      {
        id: 'l5',
        title: 'Multiple Landowners on One Site',
        content: 'Most wind farm sites span land owned by several different farmers or landowners. Each parcel gets its own polygon and its own set of attributes. When exporting as GeoJSON, all parcel geometries and their attributes are included — you can open this in QGIS, share with solicitors, or load it into project management software. Keep names accurate as they feed into lease documents.'
      },
    ],
  },

  {
    id: 'turbine_placement',
    title: 'Placing Turbines & Measuring Distances',
    subtitle: 'Turbine placement, setback radii & separation checks',
    icon: 'Wind',
    xp_reward: 150,
    color: 'green',
    description: 'Place turbines on the map, use radius circles to enforce setbacks, and measure distances to sensitive receptors or infrastructure.',
    lessons: [
      {
        id: 'l1',
        title: 'Placing a Turbine',
        content: 'Select "Place Turbine" in the toolbar, then choose the turbine type from the Turbines tab dropdown. Click anywhere on the map — the tool fetches real elevation data and 30-day mean wind speed from Open-Meteo for that exact grid point. The turbine appears on the map and is added to the data table.'
      },
      {
        id: 'l2',
        title: 'Setback Radii — What They Are',
        content: 'Every placed turbine must respect minimum setback distances from receptors. Typical UK setbacks: 500m–1km from the nearest dwelling (noise & visual), 200m from public roads, 500m from scheduled monuments, 2× tip height from overhead power lines. A "setback radius" is a circle drawn around a turbine (or receptor) to visually check compliance.'
      },
      {
        id: 'l3',
        title: 'Using the Radius Tool',
        content: 'In the planning tool, select any placed turbine and enable "Show Radius". You can set the radius distance (e.g. 500m, 1000m, 2500m). The circle appears on the map at the correct scale. If the radius overlaps a village, road, or monument, you can see it immediately and adjust the turbine position. You can show multiple radii at different distances simultaneously.'
      },
      {
        id: 'l4',
        title: 'Measuring Between Features',
        content: 'Beyond fixed radii, you often need to measure the distance between specific features — e.g. turbine T1 to the nearest building, T2 to the substation, or T3 to the site boundary. Use the distance measurement tool: click a start point, then an end point, and the distance is displayed in metres and kilometres. This is fundamental to constraint checking.'
      },
      {
        id: 'l5',
        title: 'Iterating the Layout',
        content: 'Wind farm layout is iterative. You place turbines, check radii and separations, move turbines that breach constraints, and recheck. Each time you move a turbine in the data table or on the map, the radii update automatically. The goal is to fit as many turbines as possible within the developable area, respecting all setbacks. The Turbines data table lets you track each turbine\'s position, type, and estimated AEP as you iterate.'
      },
    ],
  },

  {
    id: 'cable_routing',
    title: 'Electrical Cable & Grid Connection',
    subtitle: 'Internal cabling, grid connection & cost optimisation',
    icon: 'Zap',
    xp_reward: 150,
    color: 'orange',
    description: 'Plan underground cable routes and overhead lines from turbines to a substation, select appropriate cable types, and minimise infrastructure costs.',
    lessons: [
      {
        id: 'l1',
        title: 'The Electrical Collection Network',
        content: 'Inside a wind farm, underground cables (usually 33kV) connect turbines to a central substation. From there, a grid connection line (33kV or 132kV) runs to the nearest DNO substation on the public network. The total length and type of cables is one of the largest cost items in the project — often £1–5M for a 10-turbine onshore farm.'
      },
      {
        id: 'l2',
        title: 'Choosing Cable Types',
        content: 'The tool provides four cable types: 33kV 150mm² XLPE underground (£120/m, most common), 33kV 240mm² XLPE underground (£175/m, for higher current), 132kV Overhead Line (£85/m, for grid connection), and 33kV Overhead Line (£45/m, cheapest but visual impact). Select the type in the Cables tab before drawing a route.'
      },
      {
        id: 'l3',
        title: 'Drawing Cable Routes',
        content: 'Click "Draw Cable" in the toolbar, then click a start point (e.g. turbine pad) and an end point (e.g. substation). The route is drawn as a straight line and its length is auto-calculated using the Haversine formula. In reality cables follow roads and tracks to avoid excavating open fields — the tool lets you draw multi-segment routes to reflect this.'
      },
      {
        id: 'l4',
        title: 'Radial vs String Topologies',
        content: 'There are two common wiring topologies. Radial: each turbine connects directly to the substation (simple, high cost). String: turbines connect to each other in a chain, with only one cable back to the substation (lower cost, less resilient). The tool supports both — draw cables in whatever pattern reflects your design. The Cables tab shows total length and cost.'
      },
      {
        id: 'l5',
        title: 'Grid Connection Strategy',
        content: 'The grid connection point (Point of Connection, PoC) is negotiated with the DNO. You need to find the nearest 33kV or 132kV substation with available capacity. In the planning tool, mark the PoC as a point on the map and draw a cable route from the wind farm substation to the PoC. The tool calculates the distance and estimated connection cost — a key input to the project financial model.'
      },
    ],
  },

  {
    id: 'wind_resource',
    title: 'Wind Resource & Energy Analysis',
    subtitle: 'Wind data layers, Weibull analysis & AEP calculation',
    icon: 'BarChart2',
    xp_reward: 125,
    color: 'purple',
    description: 'Understand how wind resource data is collected, visualised as a GIS layer, and used to calculate Annual Energy Production (AEP).',
    lessons: [
      {
        id: 'l1',
        title: 'What Is a Wind Resource Layer?',
        content: 'A wind resource layer is a raster or point dataset showing mean annual wind speed across a geographic area. In GIS, this is visualised as a colour-coded grid — blue for low wind speed, red for high. The planning tool lets you add a wind resource layer to the map, so turbine positions can be overlaid directly on the wind speed gradient.'
      },
      {
        id: 'l2',
        title: 'Sources of Wind Data',
        content: 'Common wind resource datasets: NOABL (UK government, 1km resolution, 10m/45m/100m heights), ERA5 reanalysis (global, 30km, hourly), Copernicus Global Wind Atlas (1km resolution). For planning, ERA5 gives indicative speeds; a proper bankable resource assessment uses a met mast (anemometer on a tall mast) recording on-site for 12–24 months, correlated to long-term reference data.'
      },
      {
        id: 'l3',
        title: 'Wind Shear — Speed Increases With Height',
        content: 'Wind speed increases with height above ground due to surface friction. The power law model: v_hub = v_ref × (h_hub / h_ref)^α, where α ≈ 0.143 for flat farmland. So a turbine with a 120m hub height in 7 m/s wind at 10m will experience 7 × (120/10)^0.143 = 8.5 m/s at hub height — 21% more wind, which means ~75% more power (power ∝ v³).'
      },
      {
        id: 'l4',
        title: 'The Weibull Distribution & AEP',
        content: 'Wind speed follows a Weibull probability distribution. Two parameters define it: k (shape factor, typically 1.8–2.5) and λ (scale factor, ~ mean wind speed × 1.1). The Analysis tab shows this distribution as a curve. AEP = ∫ P(v) × f(v) dv × 8760 hours — the integral of the turbine power curve P(v) weighted by how often each wind speed v occurs f(v).'
      },
      {
        id: 'l5',
        title: 'Reading the Analysis Dashboard',
        content: 'The Analysis tab shows six key metrics: Gross AEP (before losses), Net AEP (after ~9% losses for wake, electrical, availability), Capacity Factor (%), Average Hub Wind Speed (m/s), Total Cable Length (km), and Total Cable Cost (£). A good onshore UK site achieves 30–40% capacity factor. The monthly energy chart shows seasonal variation — UK winters produce ~25% more energy than summers.'
      },
    ],
  },

  {
    id: 'layer_data',
    title: 'Working With GIS Data Layers',
    subtitle: 'Creating, importing, viewing & editing map layers',
    icon: 'Layers',
    xp_reward: 175,
    color: 'blue',
    description: 'Master the full GIS layer workflow: create new layers for elevation, electricity network, and environmental data; import external datasets; toggle and style layers; and export for use in QGIS or ArcGIS.',
    lessons: [
      {
        id: 'l1',
        title: 'Layer Types in Wind Farm GIS',
        content: 'A wind farm GIS project typically contains many layers: Site Boundary (polygon), Property Parcels (polygon), Turbine Positions (point), Cable Routes (line), Wind Speed Grid (point/raster), Elevation Contours (line), Electricity Network (line), Ecological Constraints (polygon), Noise Modelling Receptors (point), Visual Impact Viewpoints (point). Each layer can be toggled independently.'
      },
      {
        id: 'l2',
        title: 'Creating a New Layer',
        content: 'In the Layers tab, click "+ Add Zone" to create a new polygon layer. Give it a meaningful name (e.g. "Ancient Woodland", "Flood Zone 3", "MOD Radar Buffer"). Choose a colour that fits your visual convention. The new layer is added to the Layers panel and you can immediately draw features into it by switching to Boundary mode. You can have unlimited layers.'
      },
      {
        id: 'l3',
        title: 'Importing External GIS Data',
        content: 'Click "Import" in the toolbar to load an existing GeoJSON file. This might be: OS Open Data (roads, buildings), Environmental Agency Flood Maps, Natural England SSSIs, or data you\'ve exported from QGIS. The imported data becomes a new layer with its geometry intact. You can then toggle it, style it, and use it as a reference layer for constraint checking.'
      },
      {
        id: 'l4',
        title: 'Working With Elevation Data',
        content: 'Elevation affects turbine foundation costs, access road design, and visual impact. In the planning tool, elevation is fetched automatically for each placed turbine from the Open-Elevation API. For a site-wide view, you can import a digital elevation model (DEM) as a GeoJSON contour layer. Each turbine in the data table shows its ground elevation, allowing you to compare ridge-top vs valley-bottom positions.'
      },
      {
        id: 'l5',
        title: 'Electricity Network Topology',
        content: 'Mapping the existing electricity network is critical for grid connection planning. You need to know the location of 33kV and 132kV overhead lines, substations, and their capacity status. Import these as line and point layers (available from the OS National Grid dataset or your DNO). In the planning tool, draw the existing network as cable layers using different colours — this lets you visually plan the most direct grid connection route from your wind farm substation.'
      },
      {
        id: 'l6',
        title: 'Exporting Your GIS Project',
        content: 'Click "Export" to download your entire project as a single GeoJSON FeatureCollection. All layers, all geometries, and all properties are included. This file can be opened in QGIS (drag and drop), ArcGIS Pro (Add Data), or Google Earth Pro. When sharing with contractors, consultants, or the planning authority, GeoJSON is the universal format. Individual layers can also be exported separately by copying the features from the Layers panel.'
      },
    ],
  },

  {
    id: 'site_constraints',
    title: 'Site Constraints & Suitability Analysis',
    subtitle: 'Exclusion zones, buffers & developable envelope',
    icon: 'ShieldAlert',
    xp_reward: 125,
    color: 'yellow',
    description: 'Map planning constraints, apply setback buffers, and identify the developable envelope — the area remaining after all exclusions are applied.',
    lessons: [
      {
        id: 'l1',
        title: 'Hard vs Soft Constraints',
        content: 'Hard constraints are areas where turbines absolutely cannot be placed: National Parks, SSSIs, flood plains, within 500m of dwellings (noise policy), MOD radar safeguarding zones, aviation obstacle limitation zones. Soft constraints are areas of sensitivity that require careful justification but are not automatic exclusions: Areas of Outstanding Natural Beauty (AONBs), PRoW (Public Rights of Way) corridors, Cultural heritage assets.'
      },
      {
        id: 'l2',
        title: 'Creating Constraint Layers',
        content: 'For each constraint type, create a separate layer in the planning tool. Name it clearly (e.g. "500m Residential Buffer", "SSSI Boundary", "MOD Radar 5km Zone"). Use a colour convention: hard exclusions in red, soft constraints in orange, sensitivity areas in yellow. Draw each constraint polygon from the relevant data — OS AddressBase for dwellings, Natural England GIS data for ecological designations.'
      },
      {
        id: 'l3',
        title: 'Buffer Analysis',
        content: 'A buffer is a zone of a specified distance around a feature. Example: if the nearest house is at a given point, a 500m buffer around it marks the exclusion zone. In the planning tool, you can represent buffers as circles (for point features like a single dwelling) or as polygon offsets (for linear features like roads). The radius tool on placed turbines lets you check the converse: is this turbine within 500m of any dwelling?'
      },
      {
        id: 'l4',
        title: 'Finding the Developable Envelope',
        content: 'The developable envelope is the site area remaining after all constraints are removed. Typically: Start with gross site boundary → Remove residential buffers → Remove ecological designations → Remove MOD/aviation zones → Remove flood risk areas → Remove access and utility corridors. What remains is where turbines can theoretically go. This is usually 20–50% of the gross site area depending on how constrained the site is.'
      },
      {
        id: 'l5',
        title: 'Using Layers to Communicate Constraints',
        content: 'A well-structured constraint map is one of the most important deliverables in the early stages of wind farm development. Toggle constraint layers on and off to show different audiences what they need: planners want to see all constraints together; engineers want to see only the developable envelope; landowners want to see just their parcel and whether it falls in a constraint area. The planning tool\'s export function lets you share the full layer set as a GeoJSON.'
      },
    ],
  },
];

export const BADGES = {
  first_steps:     { name: 'First Steps',       description: 'Complete your first training scenario',     icon: 'Star'       },
  land_mapper:     { name: 'Land Mapper',        description: 'Complete the Land Acquisition scenario',   icon: 'Map'        },
  turbine_placer:  { name: 'Turbine Placer',     description: 'Complete the Turbine Placement scenario',  icon: 'Wind'       },
  cable_runner:    { name: 'Cable Runner',        description: 'Complete the Cable Routing scenario',      icon: 'Zap'        },
  wind_analyst:    { name: 'Wind Analyst',        description: 'Complete Wind Resource & Analysis',        icon: 'BarChart2'  },
  layer_master:    { name: 'Layer Master',        description: 'Complete the GIS Data Layers scenario',    icon: 'Layers'     },
  site_surveyor:   { name: 'Site Surveyor',       description: 'Complete Site Constraints scenario',       icon: 'ShieldAlert'},
  completionist:   { name: 'Completionist',       description: 'Complete all 6 training scenarios',        icon: 'Trophy'     },
};