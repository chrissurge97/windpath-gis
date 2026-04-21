export const MODULES = [
  {
    id: 'gis_basics',
    title: 'GIS Fundamentals',
    subtitle: 'Coordinate systems, projections & map basics',
    icon: 'Map',
    xp_reward: 100,
    color: 'blue',
    description: 'Learn the foundations of Geographic Information Systems including coordinate reference systems, map projections, and how spatial data is represented.',
    lessons: [
      { id: 'l1', title: 'What is GIS?', content: 'GIS (Geographic Information System) is a framework for gathering, managing, and analyzing spatial and geographic data. It integrates many types of data and analyzes spatial location and organizes layers of information into visualizations using maps.' },
      { id: 'l2', title: 'Coordinate Reference Systems', content: 'A CRS defines how your 2D map relates to real places on Earth. The most common is WGS84 (EPSG:4326), used by GPS. Web maps typically use Web Mercator (EPSG:3857). Understanding CRS is critical to avoid spatial misalignment.' },
      { id: 'l3', title: 'Raster vs Vector Data', content: 'Vector data represents features as points, lines, or polygons. Raster data represents the world as a grid of cells (pixels). Wind resource maps are typically raster, while turbine locations and site boundaries are vector.' },
      { id: 'l4', title: 'Map Layers & Overlays', content: 'GIS maps are built by stacking layers. For wind farm development, you might have: base satellite imagery, wind speed raster, elevation layer, protected areas polygons, and turbine point locations on top.' },
    ],
    quiz: {
      id: 'quiz_gis',
      questions: [
        { q: 'What does GIS stand for?', options: ['Geographic Information System', 'Global Index System', 'Grid Intelligence Software', 'Geospatial Integration Suite'], answer: 0 },
        { q: 'Which CRS is used by standard GPS?', options: ['EPSG:3857', 'WGS84 (EPSG:4326)', 'NAD83', 'UTM Zone 30N'], answer: 1 },
        { q: 'Which data type is best for representing turbine locations?', options: ['Raster', 'Vector Point', 'Polygon Raster', 'Grid Cell'], answer: 1 },
        { q: 'What is Web Mercator used for?', options: ['GPS navigation', 'Elevation modeling', 'Web map tile display', 'Wind speed analysis'], answer: 2 },
      ]
    }
  },
  {
    id: 'wind_resource',
    title: 'Wind Resource Analysis',
    subtitle: 'Weibull distribution & wind speed modeling',
    icon: 'Wind',
    xp_reward: 150,
    color: 'cyan',
    description: 'Understand how wind resources are characterized using statistical methods including the Weibull distribution, wind roses, and vertical wind shear modeling.',
    lessons: [
      { id: 'l1', title: 'Wind Speed Statistics', content: 'Wind speed varies continuously, so we use statistical distributions to characterize it. The Weibull distribution (with shape k and scale λ) fits wind data well globally. Mean wind speed alone is insufficient — we need the full distribution for AEP calculations.' },
      { id: 'l2', title: 'Weibull Distribution', content: 'P(v) = (k/λ)(v/λ)^(k-1) × exp(-(v/λ)^k). Shape factor k (typically 1.5-3.0): higher k means more consistent winds. Scale factor λ (m/s): related to mean wind speed. k≈2 is a Rayleigh distribution, common for many sites.' },
      { id: 'l3', title: 'Wind Shear & Hub Height', content: 'Wind speed increases with height following the power law: v(h) = v_ref × (h/h_ref)^α. The shear exponent α is typically 1/7 (0.143) over open terrain. For a turbine with 100m hub height, this means winds ~20% faster than at 10m reference height.' },
      { id: 'l4', title: 'Wind Rose & Directional Analysis', content: 'A wind rose shows frequency and speed by direction. Dominant wind directions inform turbine row orientation to minimize wake losses. Prevailing winds in Western Europe blow from the SW, while Great Plains winds are typically from the S/SSW.' },
    ],
    quiz: {
      id: 'quiz_wind',
      questions: [
        { q: 'What statistical distribution best models wind speeds?', options: ['Normal (Gaussian)', 'Weibull', 'Poisson', 'Uniform'], answer: 1 },
        { q: 'In the Weibull distribution, what does the "k" parameter represent?', options: ['Mean wind speed', 'Scale factor', 'Shape factor', 'Cut-in speed'], answer: 2 },
        { q: 'Wind speed at 100m hub height vs 10m reference using α=1/7 is approximately:', options: ['Same speed', '10% faster', '20% faster', '50% faster'], answer: 2 },
        { q: 'What does a wind rose show?', options: ['Wind speed only', 'Wind direction only', 'Frequency and speed by direction', 'Turbine wake patterns'], answer: 2 },
      ]
    }
  },
  {
    id: 'site_suitability',
    title: 'Site Suitability Assessment',
    subtitle: 'Constraints mapping & exclusion zones',
    icon: 'ShieldAlert',
    xp_reward: 125,
    color: 'orange',
    description: 'Learn to identify suitable land for wind and solar development by mapping environmental, social, and technical constraints using GIS layers.',
    lessons: [
      { id: 'l1', title: 'Constraint Categories', content: 'Site constraints fall into: Hard exclusions (legally prohibited — protected areas, aviation, radar zones), Soft exclusions (setbacks from roads, dwellings, water bodies), and Technical constraints (slope >15° for wind, shading for solar).' },
      { id: 'l2', title: 'Setback Distances', content: 'Typical wind turbine setbacks: 500m-1km from dwellings (noise/shadow flicker), 200m from roads, 50m from utilities. Solar PV setbacks are less stringent. Always check local planning regulations — requirements vary significantly by jurisdiction.' },
      { id: 'l3', title: 'GIS Constraint Mapping', content: 'In GIS, create buffer zones around constraint features (e.g. 500m buffer around settlements). Overlay all constraint layers. Remaining unconstrained area is the "search area" for turbine placement. This is typically 15-40% of the gross site area.' },
      { id: 'l4', title: 'Environmental Sensitivity', content: 'Key environmental checks: bird and bat flight paths, peat depth (carbon/stability risk), flood risk zones, visual impact viewsheds, and noise propagation. Environmental Impact Assessments (EIA) must address all significant effects.' },
    ],
    quiz: {
      id: 'quiz_site',
      questions: [
        { q: 'What is a "hard exclusion" in site assessment?', options: ['Areas with low wind speed', 'Legally prohibited zones', 'Steep terrain', 'Grid connection issues'], answer: 1 },
        { q: 'Typical minimum setback from residential dwellings for wind turbines:', options: ['100m', '200m', '500m-1km', '5km'], answer: 2 },
        { q: 'What percentage of gross area is typically available after constraints mapping?', options: ['5-10%', '15-40%', '60-80%', '90-95%'], answer: 1 },
        { q: 'Which is NOT typically a hard exclusion constraint?', options: ['National Parks', 'Aviation radar zones', 'Visual impact areas', 'Military low-flying areas'], answer: 2 },
      ]
    }
  },
  {
    id: 'turbine_layout',
    title: 'Turbine Layout Optimization',
    subtitle: 'Wake effects, spacing & array efficiency',
    icon: 'CircleDot',
    xp_reward: 150,
    color: 'purple',
    description: 'Learn how to optimize turbine placement to maximize energy production while minimizing wake losses and respecting site constraints.',
    lessons: [
      { id: 'l1', title: 'Wake Effects', content: 'When wind passes through a turbine, it creates a wake — a zone of reduced speed and increased turbulence. Downstream turbines in this wake generate less power. Wake losses typically account for 5-15% of gross AEP in a wind farm.' },
      { id: 'l2', title: 'Turbine Spacing Rules', content: 'Standard spacing: 3-5 rotor diameters (D) cross-wind, 7-10D downwind. For a 130m rotor: 390-650m cross-wind, 910m-1.3km downwind. Tighter spacing = more turbines = more wake loss. Optimal spacing balances land use vs energy production.' },
      { id: 'l3', title: 'Row Alignment', content: 'Turbine rows should be perpendicular to the prevailing wind to minimize wake losses. For SW prevailing winds, turbine rows run NW-SE, with rows spaced downwind. Staggered layouts can reduce wakes compared to regular grids.' },
      { id: 'l4', title: 'Jensen Wake Model', content: 'Simple wake model: V_wake = V_0 × (1 - (1-√(1-Ct)) / (1 + k×x/r)²). Ct = thrust coefficient (~0.8), k = wake decay constant (0.04 offshore, 0.075 onshore), x = downwind distance, r = rotor radius. Used for initial layout screening.' },
    ],
    quiz: {
      id: 'quiz_layout',
      questions: [
        { q: 'Typical wake losses in a wind farm are:', options: ['<1%', '5-15%', '30-40%', '>50%'], answer: 1 },
        { q: 'Recommended downwind spacing between turbines (in rotor diameters):', options: ['1-2D', '3-5D', '7-10D', '15-20D'], answer: 2 },
        { q: 'To minimize wake losses, turbine rows should be oriented:', options: ['Parallel to prevailing wind', 'Perpendicular to prevailing wind', 'At 45° to prevailing wind', 'Randomly distributed'], answer: 1 },
        { q: 'What is the Jensen wake model used for?', options: ['Structural analysis', 'Wind resource measurement', 'Wake loss estimation', 'Grid connection design'], answer: 2 },
      ]
    }
  },
  {
    id: 'energy_yield',
    title: 'Energy Yield Assessment',
    subtitle: 'AEP calculation & capacity factor',
    icon: 'Zap',
    xp_reward: 175,
    color: 'green',
    description: 'Calculate Annual Energy Production (AEP) using power curves, wind distributions, and uncertainty analysis to estimate project viability.',
    lessons: [
      { id: 'l1', title: 'Power Curve Basics', content: 'A turbine power curve maps wind speed (m/s) to power output (kW). Key points: Cut-in speed (~3 m/s, starts generating), Rated speed (~12 m/s, reaches rated power), Cut-out speed (~25 m/s, shuts down for safety). Power output scales with v³ in the linear region.' },
      { id: 'l2', title: 'AEP Calculation', content: 'AEP = Σ [P(v) × f(v) × 8760h] for all wind speeds. P(v) = power at speed v from power curve. f(v) = frequency of speed v from Weibull distribution. 8760 = hours/year. Gross AEP before losses, Net AEP after all losses applied.' },
      { id: 'l3', title: 'Energy Losses', content: 'Typical losses applied to Gross AEP: Wake losses 5-15%, Electrical losses 1-3%, Availability losses 3-5% (turbine downtime), Environmental losses 1-3% (icing, storm shutdowns), Curtailment (grid/noise/shadow) 1-5%. Total losses typically 15-25%.' },
      { id: 'l4', title: 'Capacity Factor & P50/P90', content: 'Capacity Factor = Net AEP / (Rated Power × 8760h). Good onshore wind CF = 30-40%. Offshore can reach 45-55%. P50 = median expected production (50% probability of exceeding). P90 = conservative estimate (90% probability of exceeding). Lenders typically use P90 for financing.' },
    ],
    quiz: {
      id: 'quiz_energy',
      questions: [
        { q: 'What is the typical cut-in wind speed for utility-scale turbines?', options: ['1 m/s', '3 m/s', '8 m/s', '12 m/s'], answer: 1 },
        { q: 'AEP stands for:', options: ['Average Energy Production', 'Annual Energy Production', 'Adjusted Energy Performance', 'Approximate Efficiency Parameter'], answer: 1 },
        { q: 'Typical total energy losses (gross to net AEP) are approximately:', options: ['2-5%', '5-10%', '15-25%', '30-40%'], answer: 2 },
        { q: 'What does P90 mean in energy yield assessment?', options: ['90% of rated capacity', '90% availability target', '90% probability of exceeding this production', '90th percentile wind speed'], answer: 2 },
      ]
    }
  },
  {
    id: 'grid_connection',
    title: 'Grid Connection & Electrical Design',
    subtitle: 'Substations, cables & grid integration',
    icon: 'Layers',
    xp_reward: 125,
    color: 'yellow',
    description: 'Understand the electrical infrastructure needed to connect a wind or solar farm to the grid, including cable routing, substation design, and grid code compliance.',
    lessons: [
      { id: 'l1', title: 'Grid Connection Basics', content: 'A wind farm connects to the grid via: internal MV cables (33kV) linking turbines, an onsite substation stepping up to HV (110-400kV), and a grid connection point (GCP) at the nearest suitable substation. Distance to GCP is a major cost driver.' },
      { id: 'l2', title: 'Cable Routing in GIS', content: 'GIS is used to route cables avoiding obstacles (roads, rivers, protected areas) while minimizing total length. Cables typically follow roads or field boundaries. Use cost-surface analysis to find optimal routes minimizing construction and electrical losses.' },
      { id: 'l3', title: 'Losses & Efficiency', content: 'Electrical losses in the system: MV cable losses 0.5-1.5%, Transformer losses 0.3-0.8%, HV connection losses 0.1-0.5%. Total electrical losses 1-3% of gross generation. Losses increase with cable length and load factor.' },
      { id: 'l4', title: 'Grid Code Compliance', content: 'Grid operators require: reactive power control (power factor 0.95 leading/lagging), fault ride-through capability (stay connected during voltage dips), frequency response (synthetic inertia for wind), and protection coordination. Non-compliance can prevent grid connection.' },
    ],
    quiz: {
      id: 'quiz_grid',
      questions: [
        { q: 'What voltage are typical internal wind farm collection cables?', options: ['11kV', '33kV', '132kV', '400kV'], answer: 1 },
        { q: 'What is the main cost driver for grid connection?', options: ['Turbine count', 'Distance to connection point', 'Cable diameter', 'Transformer rating'], answer: 1 },
        { q: 'Typical total electrical losses in a wind farm are:', options: ['<0.5%', '1-3%', '5-10%', '>15%'], answer: 1 },
        { q: 'What does "fault ride-through" refer to?', options: ['Cable fault detection', 'Staying connected during voltage dips', 'Turbine emergency shutdown', 'Grid frequency measurement'], answer: 1 },
      ]
    }
  },
];

export const BADGES = {
  first_steps: { name: 'First Steps', description: 'Complete your first module', icon: 'Star' },
  gis_master: { name: 'GIS Master', description: 'Complete GIS Fundamentals with 100% quiz score', icon: 'Map' },
  wind_analyst: { name: 'Wind Analyst', description: 'Complete Wind Resource Analysis', icon: 'Wind' },
  site_surveyor: { name: 'Site Surveyor', description: 'Complete Site Suitability module', icon: 'ShieldAlert' },
  layout_pro: { name: 'Layout Pro', description: 'Complete Turbine Layout module', icon: 'CircleDot' },
  energy_expert: { name: 'Energy Expert', description: 'Complete Energy Yield Assessment', icon: 'Zap' },
  grid_guru: { name: 'Grid Guru', description: 'Complete Grid Connection module', icon: 'Layers' },
  completionist: { name: 'Completionist', description: 'Complete all 6 training modules', icon: 'Trophy' },
  quiz_ace: { name: 'Quiz Ace', description: 'Score 100% on any quiz', icon: 'Award' },
};