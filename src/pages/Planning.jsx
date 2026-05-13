import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Polyline,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';
import {
  Wind, Zap, Map, MousePointer, Pentagon, Trash2, Download,
  Upload, RefreshCw, Plus, Eye, EyeOff, BarChart2, Target,
  Layers, Settings, X, Satellite, Navigation,
  ChevronDown, ArrowUp, ArrowDown, PlusCircle
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { createLayer, createFeature, geoJSONToLayer, downloadJSON, layersToGeoJSON, DEFAULT_POWER_CURVE, windAtHubHeight, calcTurbineAEP, calcWeibullAEP } from '@/lib/gisUtils';
import { checkExclusionZones } from '@/lib/geoUtils';
import { fetchElevation, fetchWindData } from '@/lib/planningUtils';
import WindResourceRenderer from '@/components/gis/WindResourceLayer';
import TurbineDataTable from '@/components/planning/TurbineDataTable';
import CableDataTable from '@/components/planning/CableDataTable';
import TurbineTypeEditor from '@/components/planning/TurbineTypeEditor';
import PolygonMenu from '@/components/planning/PolygonMenu';
import { DEFAULT_TURBINE_TYPES, DEFAULT_CABLE_TYPES } from '@/lib/turbineTypes';
import { exportKML } from '@/lib/exportKMZ';
import { exportProjectPDF } from '@/lib/exportPDF';
import { buildDemoProject } from '@/lib/demoProject';
import ExerciseGuide from '@/components/planning/ExerciseGuide';
import { EXERCISES } from '@/lib/exercises';
import ExportMenu from '@/components/planning/ExportMenu';
import LayerImportExport from '@/components/planning/LayerImportExport';
import ProjectFileButtons, { saveProject, loadProject, createNewProject, loadProjectIndex } from '@/components/planning/ProjectManager';


delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const turbineIcon = (color = '#10b981', selected = false) => L.divIcon({
  html: `<div style="width:${selected ? 26 : 20}px;height:${selected ? 26 : 20}px;background:${color};border:${selected ? '3px' : '2px'} solid ${selected ? 'white' : 'rgba(255,255,255,0.5)'};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 8px ${color}99">
    <div style="width:2px;height:${selected ? 14 : 10}px;background:white;position:absolute;"></div>
    <div style="width:${selected ? 12 : 9}px;height:2px;background:white;position:absolute;transform:rotate(60deg);transform-origin:left center;left:50%;margin-top:-4px;"></div>
    <div style="width:${selected ? 12 : 9}px;height:2px;background:white;position:absolute;transform:rotate(-60deg);transform-origin:left center;left:50%;margin-top:4px;"></div>
  </div>`,
  className: '',
  iconSize: [selected ? 26 : 20, selected ? 26 : 20],
  iconAnchor: [selected ? 13 : 10, selected ? 13 : 10],
});

// ── Haversine distance ──────────────────────────────────────────────────────
function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Snap to nearest turbine/substation (pixel distance on screen) ───────────
const SNAP_PX = 25; // pixels
function findSnapNode(latlng, turbines, substations, map) {
  if (!map) return null;
  const clickPt = map.latLngToContainerPoint(latlng);
  let best = null, bestDist = SNAP_PX;
  for (const t of turbines) {
    const [lng, lat] = t.geometry.coordinates;
    const pt = map.latLngToContainerPoint([lat, lng]);
    const d = Math.hypot(pt.x - clickPt.x, pt.y - clickPt.y);
    if (d < bestDist) { bestDist = d; best = { type: 'turbine', id: t.id, lat, lng }; }
  }
  for (const s of substations) {
    const [lng, lat] = s.geometry.coordinates;
    const pt = map.latLngToContainerPoint([lat, lng]);
    const d = Math.hypot(pt.x - clickPt.x, pt.y - clickPt.y);
    if (d < bestDist) { bestDist = d; best = { type: 'substation', id: s.id, lat, lng }; }
  }
  return best;
}

// ── Topology: compute cumulative MW load carried by a cable ─────────────────
// Power flows FROM the upstream node (away from substation) TOWARD the downstream node.
// A cable's load = power of turbine(s) at its upstream node
//                + loads of all OTHER cables whose downstream node is that same upstream node.
//
// "upstreamNode" = the node of this cable that is NOT a substation, and is not the
//                  node that other cables are flowing FROM toward.
// We determine direction by: given we're coming from `fromNodeId` (the downstream side),
// the upstream side is the OTHER end of this cable.

function turbineMW(nodeId, turbines) {
  const t = turbines.find(t => t.id === nodeId);
  return t?.properties?.rated_power_mw || 0;
}

// Returns the MW load flowing through cableId, given that flow is coming FROM fromNodeId
// (i.e. fromNodeId is the downstream end — toward the substation).
// If fromNodeId is null, we detect direction: substation end is downstream.
function calcCableLoad(cableId, cables, turbines, fromNodeId = null, visited = new Set()) {
  if (visited.has(cableId)) return 0;
  visited.add(cableId);

  const cable = cables.find(c => c.id === cableId);
  if (!cable) return 0;

  const start = cable.properties.start_node;
  const end = cable.properties.end_node;

  // Determine upstream node (the end we're collecting power FROM)
  let upstreamNode = null;
  if (fromNodeId !== null) {
    // We know which end is downstream (fromNodeId) — upstream is the other end
    if (start?.id === fromNodeId) upstreamNode = end;
    else if (end?.id === fromNodeId) upstreamNode = start;
    else return 0; // cable not actually connected to fromNodeId
  } else {
    // No direction hint: pick the non-substation end as upstream
    // (substation is always the sink/downstream)
    if (end?.type === 'substation') upstreamNode = start;
    else if (start?.type === 'substation') upstreamNode = end;
    else {
      // Neither end is a substation — pick start as upstream by default
      upstreamNode = start;
    }
  }

  if (!upstreamNode) return 0;

  let total = 0;

  // Add power of the turbine at the upstream node (if it's a turbine)
  if (upstreamNode.type === 'turbine') {
    total += turbineMW(upstreamNode.id, turbines);
  }

  // Add loads of all OTHER cables that deliver power INTO the upstream node
  // (i.e. cables connected to upstreamNode where upstreamNode is their downstream end)
  const feedingCables = cables.filter(c =>
    c.id !== cableId && (
      c.properties.start_node?.id === upstreamNode.id ||
      c.properties.end_node?.id === upstreamNode.id
    )
  );
  for (const fc of feedingCables) {
    // For each feeding cable, upstreamNode is their DOWNSTREAM end (they flow INTO it)
    total += calcCableLoad(fc.id, cables, turbines, upstreamNode.id, new Set(visited));
  }

  return total;
}

// ── Substation total load: sum cables feeding INTO the substation ────────────
function calcSubstationLoad(substationId, cables, turbines) {
  const incomingCables = cables.filter(c =>
    c.properties.start_node?.id === substationId ||
    c.properties.end_node?.id === substationId
  );
  return incomingCables.reduce((sum, c) => {
    // Flow direction: substation is downstream, so pass substationId as fromNodeId
    return sum + calcCableLoad(c.id, cables, turbines, substationId, new Set());
  }, 0);
}

function MapMouseHandler({ mode, turbines, substations, onSnapPreview }) {
  useMapEvents({
    mousemove(e) {
      if (mode !== 'draw_cable') { onSnapPreview(null); return; }
      // We need the map instance — use e.target
      const snap = findSnapNode(e.latlng, turbines, substations, e.target);
      onSnapPreview(snap);
    },
  });
  return null;
}

function MapClickHandler({ mode, onAddPoint, onFinishPolygon, onFinishCable }) {
  const lastClickTime = useRef(0);
  const mapRef = useRef(null);
  const map = useMapEvents({
    click(e) {
      if (!['place_turbine', 'draw_polygon', 'draw_cable', 'place_substation'].includes(mode)) return;
      const now = Date.now();
      if (now - lastClickTime.current < 350) {
        if (mode === 'draw_polygon') { e.originalEvent.preventDefault(); onFinishPolygon(); }
        if (mode === 'draw_cable') { e.originalEvent.preventDefault(); onFinishCable(); }
        lastClickTime.current = 0;
        return;
      }
      lastClickTime.current = now;
      const latlng = e.latlng;
      setTimeout(() => {
        if (Date.now() - lastClickTime.current >= 300) {
          onAddPoint(latlng, map);
        }
      }, 300);
    },
    dblclick(e) {
      if (mode === 'draw_polygon') { e.originalEvent.preventDefault(); lastClickTime.current = 0; onFinishPolygon(); }
      if (mode === 'draw_cable') { e.originalEvent.preventDefault(); lastClickTime.current = 0; onFinishCable(); }
    },
  });
  return null;
}

const STORAGE_KEY = 'planning_v3_ire';

// Ireland bounding box
const IRELAND_BOUNDS = [[51.2, -10.8], [55.6, -5.4]];

// Enforces map stays within Ireland bounds
function MapBoundsEnforcer() {
  const map = useMapEvents({});
  useEffect(() => {
    map.setMaxBounds(IRELAND_BOUNDS);
    map.options.maxBoundsViscosity = 1.0;
  }, [map]);
  return null;
}

export default function Planning() {
  const location = useLocation();
  const navigate = useNavigate();
  const exerciseId = location.state?.exerciseId || null;
  const activeExercise = exerciseId ? EXERCISES[exerciseId] : null;

  // ── Project system ─────────────────────────────────────────────────────────
  const [currentProjectId, setCurrentProjectId] = useState(() => {
    // Load or create the first project
    const index = loadProjectIndex();
    if (index.length > 0) return index[0].id;
    // Migrate legacy data if any
    try {
      const legacy = localStorage.getItem(STORAGE_KEY);
      if (legacy) {
        const d = JSON.parse(legacy);
        const id = `proj_legacy_${Date.now()}`;
        const proj = {
          id,
          name: 'My Project',
          layers: d.layers || [],
          turbineTypes: d.turbineTypes || DEFAULT_TURBINE_TYPES,
          cableTypes: d.cableTypes || DEFAULT_CABLE_TYPES,
          windParams: { k: 2.0, lambda: 7.0 },
        };
        // Migrate: add substation layer if missing
        if (!proj.layers.find(l => l.type === 'substation')) {
          proj.layers.push(createLayer({ name: 'Substations', type: 'substation', color: '#facc15', fillOpacity: 1 }));
        }
        saveProject(id, proj);
        return id;
      }
    } catch {}
    const { id } = createNewProject('My Project');
    return id;
  });

  const loadCurrentProject = (id) => {
    const proj = loadProject(id);
    if (!proj) return null;
    if (!proj.layers.find(l => l.type === 'substation')) {
      proj.layers.push(createLayer({ name: 'Substations', type: 'substation', color: '#facc15', fillOpacity: 1 }));
    }
    return proj;
  };

  const initProj = loadCurrentProject(currentProjectId) || {};

  // ── State ──────────────────────────────────────────────────────────────────
  const [layers, setLayers] = useState(() => initProj.layers || [
    createLayer({ name: 'Site Boundary', type: 'polygon', color: '#06b6d4', fillOpacity: 0.1 }),
    createLayer({ name: 'Turbines', type: 'turbine', color: '#10b981', fillOpacity: 0.8 }),
    createLayer({ name: 'Cables', type: 'cable', color: '#f97316', fillOpacity: 0.8 }),
    createLayer({ name: 'Substations', type: 'substation', color: '#facc15', fillOpacity: 1 }),
  ]);

  const [turbineTypes, setTurbineTypes] = useState(() => initProj.turbineTypes || DEFAULT_TURBINE_TYPES);
  const [cableTypes, setCableTypes] = useState(() => initProj.cableTypes || DEFAULT_CABLE_TYPES);

  const [selectedTurbineTypeId, setSelectedTurbineTypeId] = useState(turbineTypes[0]?.id);
  const [selectedCableTypeId, setSelectedCableTypeId] = useState(cableTypes[0]?.id);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [mode, setMode] = useState('select');
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState(null);
  const [rightTab, setRightTab] = useState('turbines');
  const [loadingWind, setLoadingWind] = useState(false);
  const [windFetched, setWindFetched] = useState(false);
  const [projectName, setProjectName] = useState(() => initProj.name || 'Wind Farm Project');

  const [windParams, setWindParams] = useState({ k: 2.0, lambda: 7.0 });

  // Map display state
  const [baseMap, setBaseMap] = useState('roads'); // 'dark' | 'satellite' | 'roads'
  const [showBaseMapMenu, setShowBaseMapMenu] = useState(false);
  const satelliteView = baseMap === 'satellite';
  const roadsView = baseMap === 'roads';
  const [showWindLayer, setShowWindLayer] = useState(true);
  const [showSubstations, setShowSubstations] = useState(true);

  // Substation popup menu state
  const [substationMenuFeature, setSubstationMenuFeature] = useState(null);

  // Cable popup menu state
  const [cableMenuFeature, setCableMenuFeature] = useState(null);

  // Turbine popup menu state
  const [turbineMenuFeature, setTurbineMenuFeature] = useState(null);
  const [turbineMenuTypeId, setTurbineMenuTypeId] = useState(null);
  const [turbineMenuName, setTurbineMenuName] = useState('');
  const [turbineMenuRadius, setTurbineMenuRadius] = useState(500);
  const [turbineMenuShowRadius, setTurbineMenuShowRadius] = useState(false);
  const [turbineRadii, setTurbineRadii] = useState({}); // featureId -> { radius, show }
  const [turbineMenuCustomFields, setTurbineMenuCustomFields] = useState({}); // { label: value }
  const [turbineMenuPolygonId, setTurbineMenuPolygonId] = useState('');

  // Polygon menu state
  const [polygonMenuFeature, setPolygonMenuFeature] = useState(null);
  const [polygonMenuLayerId, setPolygonMenuLayerId] = useState(null);

  // Vertex edit mode: featureId -> [[lat,lng],...]
  const [editingPolygonId, setEditingPolygonId] = useState(null);

  // Cable snap state: stores snapped node for start/end of current cable
  const [drawingSnapNodes, setDrawingSnapNodes] = useState([]); // array of { type, id, lat, lng } or null per point
  const [snapPreview, setSnapPreview] = useState(null); // node being hovered near

  // Layer hover tooltip
  const [layerTooltip, setLayerTooltip] = useState(null); // { x, y, layerName, description }

  // Exclusion zone placement warning
  const [exclusionWarning, setExclusionWarning] = useState(null); // { layerName, featureName }

  const mapRef = useRef(null);
  const [panesReady, setPanesReady] = useState(false);

  const substationLayer = layers.find(l => l.type === 'substation');
  const substations = substationLayer?.features || [];

  const turbineLayer = layers.find(l => l.type === 'turbine');
  const cableLayer = layers.find(l => l.type === 'cable');
  const turbines = turbineLayer?.features || [];
  const cables = cableLayer?.features || [];

  const selectedTurbineType = turbineTypes.find(t => t.id === selectedTurbineTypeId) || turbineTypes[0];
  const selectedCableType = cableTypes.find(t => t.id === selectedCableTypeId) || cableTypes[0];

  // ── Persist (debounced) ────────────────────────────────────────────────────
  const saveTimer = useRef(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveProject(currentProjectId, { id: currentProjectId, name: projectName, layers, turbineTypes, cableTypes, windParams });
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [layers, turbineTypes, cableTypes, projectName, currentProjectId, windParams]);

  // ── Project switching ──────────────────────────────────────────────────────
  const handleSwitchProject = (id, proj) => {
    setCurrentProjectId(id);
    setLayers(proj.layers || []);
    setTurbineTypes(proj.turbineTypes || DEFAULT_TURBINE_TYPES);
    setCableTypes(proj.cableTypes || DEFAULT_CABLE_TYPES);
    setProjectName(proj.name || 'Project');
    setWindParams(proj.windParams || { k: 2.0, lambda: 7.0 });
    setMode('select');
    setTurbineMenuFeature(null);
    setPolygonMenuFeature(null);
    setCableMenuFeature(null);
    setSubstationMenuFeature(null);
  };

  const handleNewProject = (id, proj) => {
    handleSwitchProject(id, proj);
  };

  const updateLayer = useCallback((id, changes) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...changes } : l));
  }, []);

  // ── Map interactions ───────────────────────────────────────────────────────
  const addPoint = async (latlng) => {
    if (mode === 'draw_polygon') {
      setDrawingPoints(prev => [...prev, [latlng.lat, latlng.lng]]);
      return;
    }

    if (mode === 'draw_cable') {
      const snap = mapRef.current ? findSnapNode(latlng, turbines, substations, mapRef.current) : null;
      const point = snap ? [snap.lat, snap.lng] : [latlng.lat, latlng.lng];
      setDrawingPoints(prev => [...prev, point]);
      setDrawingSnapNodes(prev => [...prev, snap || null]);
      return;
    }

    if (mode === 'place_substation') {
      const subLayer = layers.find(l => l.type === 'substation');
      if (!subLayer) return;
      const f = createFeature(subLayer.id,
        { type: 'Point', coordinates: [latlng.lng, latlng.lat] },
        {
          name: `Substation ${subLayer.features.length + 1}`,
          transformer_mva: 60,
          capacity_demand_mw: 30,
          capacity_generation_mw: 30,
          notes: '',
        }
      );
      updateLayer(subLayer.id, { features: [...subLayer.features, f] });
      return;
    }

    if (mode === 'place_turbine') {
      // Check exclusion zones first
      const exclusionHit = checkExclusionZones(latlng.lat, latlng.lng, layers);
      if (exclusionHit) {
        setExclusionWarning({ layerName: exclusionHit.layer.name, featureName: exclusionHit.feature.properties?.name || exclusionHit.layer.name });
        setTimeout(() => setExclusionWarning(null), 5000);
        return;
      }

      setLoadingWind(true);
      let elevation = null;
      let wind_speed_ms = null;

      try { elevation = await fetchElevation(latlng.lat, latlng.lng); } catch {}
      try {
        const windData = await fetchWindData(latlng.lat, latlng.lng);
        wind_speed_ms = windData?.mean_speed;
        if (windData) { setWindParams({ k: windData.k, lambda: windData.lambda }); setWindFetched(true); }
      } catch {}

      const tt = selectedTurbineType;
      const hubHeight = tt.hub_height_m;
      const hubSpeed = wind_speed_ms ? windAtHubHeight(wind_speed_ms, 10, hubHeight) : null;
      const turbLayer = layers.find(l => l.type === 'turbine');
      if (!turbLayer) { setLoadingWind(false); return; }

      // Build a custom power curve based on turbine type specs
      const pc = DEFAULT_POWER_CURVE.map(pt => ({
        v: pt.v,
        p_kw: pt.v >= tt.cut_in_ms && pt.v <= tt.cut_out_ms
          ? Math.min(tt.rated_power_mw * 1000, pt.p_kw * (tt.rated_power_mw / 3.5))
          : 0,
      }));

      const f = createFeature(turbLayer.id,
        { type: 'Point', coordinates: [latlng.lng, latlng.lat] },
        {
          name: `T${turbLayer.features.length + 1}`,
          turbine_type_id: tt.id,
          hub_height: hubHeight,
          rotor_diameter: tt.rotor_diameter_m,
          rated_power_mw: tt.rated_power_mw,
          elevation_m: elevation,
          wind_speed_ms,
          hub_wind_speed: hubSpeed,
        }
      );

      if (hubSpeed) {
        const aep = calcTurbineAEP(hubSpeed, pc);
        if (aep) f.properties.aep_mwh = aep.aep_mwh;
      }

      updateLayer(turbLayer.id, {
        features: [...turbLayer.features, f],
        color: selectedTurbineType.color,
      });
      setLoadingWind(false);
      setRightTab('turbines');
    }
  };

  const finishPolygon = () => {
    if (drawingPoints.length < 3) return;
    // Use selectedLayerId if it's a polygon layer, otherwise fall back to first polygon layer
    const polyLayers = layers.filter(l => !['turbine', 'cable', 'wind_resource', 'substation'].includes(l.type));
    const targetLayer = polyLayers.find(l => l.id === selectedLayerId) || polyLayers[0];
    if (!targetLayer) return;
    const closed = [...drawingPoints, drawingPoints[0]]; // close ring
    const f = createFeature(targetLayer.id,
      { type: 'Polygon', coordinates: [closed.map(([lat, lng]) => [lng, lat])] },
      { name: targetLayer.name || 'Polygon' }
    );
    updateLayer(targetLayer.id, { features: [...targetLayer.features, f] });
    setDrawingPoints([]);
    setMode('select');
  };

  const finishCable = () => {
    if (drawingPoints.length < 2) return;
    const cLayer = layers.find(l => l.type === 'cable');
    if (!cLayer) return;
    let totalLen = 0;
    for (let i = 0; i < drawingPoints.length - 1; i++) {
      totalLen += haversineM(drawingPoints[i][0], drawingPoints[i][1], drawingPoints[i+1][0], drawingPoints[i+1][1]);
    }
    const startNode = drawingSnapNodes[0] || null;
    const endNode = drawingSnapNodes[drawingSnapNodes.length - 1] || null;
    const f = createFeature(cLayer.id,
      { type: 'LineString', coordinates: drawingPoints.map(([lat, lng]) => [lng, lat]) },
      {
        name: `Cable ${cLayer.features.length + 1}`,
        cable_type_id: selectedCableTypeId,
        length_m: +totalLen.toFixed(0),
        start_node: startNode ? { type: startNode.type, id: startNode.id } : null,
        end_node: endNode ? { type: endNode.type, id: endNode.id } : null,
      }
    );
    updateLayer(cLayer.id, { features: [...cLayer.features, f] });
    setDrawingPoints([]);
    setDrawingSnapNodes([]);
    setSnapPreview(null);
  };

  const deleteFeature = (layerId, featureId) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;
    updateLayer(layerId, { features: layer.features.filter(f => f.id !== featureId) });
  };

  const updateTurbineProps = (featureId, props) => {
    if (!turbineLayer) return;
    updateLayer(turbineLayer.id, {
      features: turbineLayer.features.map(f => f.id === featureId ? { ...f, properties: props } : f)
    });
  };

  const applyPolygonMenu = ({ name, color, fillOpacity, notes, no_turbines }) => {
    if (!polygonMenuFeature || !polygonMenuLayerId) return;
    const layer = layers.find(l => l.id === polygonMenuLayerId);
    if (!layer) return;
    // Update feature properties + layer-level no_turbines flag
    updateLayer(polygonMenuLayerId, {
      color,
      fillOpacity,
      no_turbines: no_turbines ?? layer.no_turbines ?? false,
      features: layer.features.map(f =>
        f.id === polygonMenuFeature.id
          ? { ...f, properties: { ...f.properties, name, notes } }
          : f
      ),
    });
    setPolygonMenuFeature(null);
    setPolygonMenuLayerId(null);
  };

  const openPolygonMenu = (feature, layerId) => {
    setPolygonMenuFeature(feature);
    setPolygonMenuLayerId(layerId);
    setTurbineMenuFeature(null); // close turbine menu
    setEditingPolygonId(null);
  };

  const updatePolygonVertices = (featureId, layerId, newLatLngs) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;
    const coords = [...newLatLngs, newLatLngs[0]].map(([lat, lng]) => [lng, lat]);
    updateLayer(layerId, {
      features: layer.features.map(f =>
        f.id === featureId
          ? { ...f, geometry: { ...f.geometry, coordinates: [coords] } }
          : f
      ),
    });
  };

  // Insert a new vertex into the polygon at the closest edge
  const insertPolygonVertex = (featureId, layerId, clickLat, clickLng) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;
    const f = layer.features.find(ft => ft.id === featureId);
    if (!f) return;
    const ring = f.geometry.coordinates[0];
    const pts = ring.slice(0, -1); // exclude closing duplicate
    // Find the edge (i → i+1) closest to the click point
    let bestIdx = 0, bestDist = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];          // [lng, lat]
      const [bx, by] = pts[(i + 1) % pts.length];
      // Project click onto segment, get closest point distance
      const dx = bx - ax, dy = by - ay;
      const t = Math.max(0, Math.min(1, ((clickLng - ax) * dx + (clickLat - ay) * dy) / (dx * dx + dy * dy)));
      const px = ax + t * dx, py = ay + t * dy;
      const d = (clickLng - px) ** 2 + (clickLat - py) ** 2;
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    // Insert after bestIdx
    const newPts = [...pts];
    newPts.splice(bestIdx + 1, 0, [clickLng, clickLat]);
    const newCoords = [...newPts, newPts[0]];
    updateLayer(layerId, {
      features: layer.features.map(ft =>
        ft.id === featureId
          ? { ...ft, geometry: { ...ft.geometry, coordinates: [newCoords] } }
          : ft
      ),
    });
  };

  const openTurbineMenu = (f) => {
    setTurbineMenuFeature(f);
    setTurbineMenuTypeId(f.properties.turbine_type_id || turbineTypes[0]?.id);
    setTurbineMenuName(f.properties.name || '');
    const existing = turbineRadii[f.id];
    setTurbineMenuRadius(existing?.radius || 500);
    setTurbineMenuShowRadius(existing?.show || false);
    setTurbineMenuCustomFields(f.properties.custom_fields || {});
    setTurbineMenuPolygonId(f.properties.assigned_polygon_id || '');
  };

  const applyTurbineMenu = () => {
    if (!turbineMenuFeature) return;
    const tt = turbineTypes.find(t => t.id === turbineMenuTypeId) || turbineTypes[0];
    updateTurbineProps(turbineMenuFeature.id, {
      ...turbineMenuFeature.properties,
      name: turbineMenuName || turbineMenuFeature.properties.name,
      turbine_type_id: tt.id,
      rated_power_mw: tt.rated_power_mw,
      rotor_diameter: tt.rotor_diameter_m,
      hub_height: tt.hub_height_m,
      custom_fields: turbineMenuCustomFields,
      assigned_polygon_id: turbineMenuPolygonId || null,
    });
    setTurbineRadii(prev => ({
      ...prev,
      [turbineMenuFeature.id]: { radius: turbineMenuRadius, show: turbineMenuShowRadius },
    }));
    setTurbineMenuFeature(null);
  };

  // ── Fly map to a feature ───────────────────────────────────────────────────
  const flyToFeature = useCallback((feature) => {
    if (!mapRef.current || !feature) return;
    const geo = feature.geometry;
    if (geo.type === 'Point') {
      const [lng, lat] = geo.coordinates;
      mapRef.current.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), 14), { animate: true, duration: 0.8 });
    } else if (geo.type === 'LineString') {
      const latlngs = geo.coordinates.map(([lng, lat]) => [lat, lng]);
      mapRef.current.flyToBounds(L.latLngBounds(latlngs), { padding: [60, 60], animate: true, duration: 0.8 });
    } else if (geo.type === 'Polygon') {
      const latlngs = geo.coordinates[0].map(([lng, lat]) => [lat, lng]);
      mapRef.current.flyToBounds(L.latLngBounds(latlngs), { padding: [60, 60], animate: true, duration: 0.8 });
    }
  }, []);

  const handleLoadDemo = () => {
    if (!window.confirm('Load the Ballycraggan Wind Farm demo? This will replace your current project.')) return;
    const demo = buildDemoProject();
    setLayers(demo.layers);
    setProjectName(demo.projectName);
    setWindParams(demo.windParams);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ layers: demo.layers, turbineTypes, cableTypes }));
    // Fly map to demo site
    setTimeout(() => {
      if (mapRef.current) mapRef.current.setView(demo.center, demo.zoom, { animate: true });
    }, 100);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,.geojson';
    input.onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          const layer = geoJSONToLayer(data, file.name.replace(/\.[^.]+$/, ''));
          setLayers(prev => [...prev, layer]);
        } catch { alert('Invalid file'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // ── Computed stats ─────────────────────────────────────────────────────────
  const totalCapacity_mw = turbines.reduce((s, t) => s + (t.properties.rated_power_mw || selectedTurbineType?.rated_power_mw || 3.5), 0);
  // Stored AEP (used for map KPIs — fixed at placement time)
  const totalAEP_stored = turbines.reduce((s, t) => s + (t.properties.aep_mwh || 0), 0);
  // Live Weibull-integrated AEP (used in Analysis tab — responds to k/λ sliders)
  const totalAEP_live = turbines.reduce((s, t) => {
    const hubSpd = t.properties.hub_wind_speed;
    if (!hubSpd) return s + (t.properties.aep_mwh || 0);
    const tt = turbineTypes.find(ty => ty.id === t.properties.turbine_type_id) || selectedTurbineType;
    const pc = DEFAULT_POWER_CURVE.map(pt => ({
      v: pt.v,
      p_kw: pt.v >= (tt?.cut_in_ms || 3) && pt.v <= (tt?.cut_out_ms || 25)
        ? Math.min((tt?.rated_power_mw || 3.5) * 1000, pt.p_kw * ((tt?.rated_power_mw || 3.5) / 3.5))
        : 0,
    }));
    const res = calcWeibullAEP(hubSpd, pc, windParams.k, windParams.lambda);
    return s + (res?.aep_mwh || t.properties.aep_mwh || 0);
  }, 0);
  // Both map overlay and analysis tab now use live Weibull AEP so sliders update everything
  const totalAEP = totalAEP_live;
  const avgCapFactor = totalCapacity_mw > 0 ? ((totalAEP_live / (totalCapacity_mw * 8760)) * 100).toFixed(1) : 0;
  const liveCapFactor = avgCapFactor;
  const avgWindSpeed = turbines.length > 0
    ? (turbines.reduce((s, t) => s + (t.properties.hub_wind_speed || 0), 0) / turbines.length).toFixed(1)
    : null;
  const totalCableLength = cables.reduce((s, c) => s + (c.properties.length_m || 0), 0);
  const totalCableCost = cables.reduce((s, c) => {
    const ct = cableTypes.find(t => t.id === c.properties.cable_type_id) || selectedCableType;
    return s + (c.properties.length_m || 0) * (ct?.cost_per_m || 0);
  }, 0);

  const monthlyFactors = [1.25, 1.15, 1.1, 0.95, 0.8, 0.7, 0.72, 0.75, 0.9, 1.05, 1.15, 1.28];
  const monthlyData = useMemo(() => ['J','F','M','A','M','J','J','A','S','O','N','D'].map((m, i) => ({
    m, e: totalAEP_live > 0 ? +((totalAEP_live / 12) * monthlyFactors[i]).toFixed(0) : 0,
  })), [totalAEP_live]);

  const weibullData = useMemo(() => Array.from({ length: 25 }, (_, i) => i + 0.5).map(v => {
    const { k, lambda } = windParams;
    const pdf = k > 0 && lambda > 0 ? (k / lambda) * Math.pow(v / lambda, k - 1) * Math.exp(-Math.pow(v / lambda, k)) : 0;
    return { v: v.toFixed(0), f: +(pdf * 100).toFixed(2) };
  }), [windParams]);

  const cursorStyle = { select: 'default', draw_polygon: 'crosshair', place_turbine: 'cell', draw_cable: 'crosshair' }[mode] || 'default';

  const TOOLBAR_MODES = [
    { id: 'select', label: 'Select', icon: MousePointer },
    { id: 'draw_polygon', label: 'Polygon', icon: Pentagon },
    { id: 'place_turbine', label: 'Place Turbine', icon: Wind },
    { id: 'draw_cable', label: 'Draw Cable', icon: Zap },
    { id: 'place_substation', label: 'Substation', icon: Target },
  ];

  const RIGHT_TABS = [
    { id: 'turbines', label: 'Turbines', icon: Wind },
    { id: 'cables', label: 'Cables', icon: Zap },
    { id: 'analysis', label: 'Analysis', icon: BarChart2 },
    { id: 'layers', label: 'Layers', icon: Layers },
    { id: 'types', label: 'Types', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border-b border-slate-800 flex-wrap shrink-0">
        <Map className="w-4 h-4 text-emerald-400 shrink-0" />
        <ProjectFileButtons
          currentProjectId={currentProjectId}
          currentProjectName={projectName}
          currentData={{ id: currentProjectId, name: projectName, layers, turbineTypes, cableTypes, windParams }}
          onSwitchProject={handleSwitchProject}
          onNewProject={handleNewProject}
          onSaved={(name) => setProjectName(name)}
        />
        <input
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          className="bg-transparent text-sm font-medium text-white border-none outline-none w-36"
          placeholder="Project name"
        />
        <div className="h-4 w-px bg-slate-700 mx-1" />

        {TOOLBAR_MODES.map(({ id, label, icon: TbIcon }) => (
          <button key={id} onClick={() => {
            setMode(id);
            setDrawingPoints([]);
            setDrawingSnapNodes([]);
            setSnapPreview(null);
            setTurbineMenuFeature(null);
            setPolygonMenuFeature(null);
            setEditingPolygonId(null);
            // Auto-select first polygon layer when entering draw_polygon mode
            if (id === 'draw_polygon') {
              const first = layers.find(l => !['turbine','cable','wind_resource','substation'].includes(l.type));
              if (first) setSelectedLayerId(first.id);
            }
          }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border",
              mode === id ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "bg-slate-800 text-slate-400 hover:text-white border-slate-700"
            )}
          >
            <TbIcon className="w-3 h-3" /> {label}
          </button>
        ))}

        {mode === 'draw_polygon' && drawingPoints.length >= 2 && (
          <button onClick={finishPolygon}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-cyan-600/20 text-cyan-400 border border-cyan-500/40">
            Finish ({drawingPoints.length} pts)
          </button>
        )}
        {mode === 'draw_cable' && drawingPoints.length >= 2 && (
          <button onClick={finishCable}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-orange-600/20 text-orange-400 border border-orange-500/40">
            Finish Cable ({drawingPoints.length} pts)
          </button>
        )}

        {loadingWind && (
          <span className="flex items-center gap-1.5 text-xs text-amber-400">
            <RefreshCw className="w-3 h-3 animate-spin" /> Fetching real data...
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleLoadDemo}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 hover:bg-emerald-800/50 font-medium">
            <Wind className="w-3 h-3" /> Load Demo
          </button>
          <button onClick={() => {
            if (!window.confirm('Clear all features from this project?')) return;
            const empty = [
              createLayer({ name: 'Site Boundary', type: 'polygon', color: '#06b6d4', fillOpacity: 0.1 }),
              createLayer({ name: 'Turbines', type: 'turbine', color: '#10b981', fillOpacity: 0.8 }),
              createLayer({ name: 'Cables', type: 'cable', color: '#f97316', fillOpacity: 0.8 }),
              createLayer({ name: 'Substations', type: 'substation', color: '#facc15', fillOpacity: 1 }),
            ];
            setLayers(empty);
            setWindParams({ k: 2.0, lambda: 7.0 });
          }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-slate-700/60 border border-slate-600 text-slate-400 hover:text-red-400 hover:border-red-500/40">
            <Trash2 className="w-3 h-3" /> Clear
          </button>
          <button onClick={handleImport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-400 hover:text-white">
            <Upload className="w-3 h-3" /> Import
          </button>
          <ExportMenu
            onExportGeoJSON={() => downloadJSON(layersToGeoJSON(layers), `${projectName}.geojson`)}
            onExportKML={() => exportKML(layers, turbineTypes, cableTypes, substations, showSubstations, projectName)}
            onExportCSV={() => {
              const rows = [['layer','feature_id','name','geometry_type','lat','lng','notes'].join(',')];
              for (const layer of layers) {
                for (const f of layer.features) {
                  const g = f.geometry;
                  let lat = '', lng = '';
                  if (g.type === 'Point') { [lng, lat] = g.coordinates; }
                  else if (g.type === 'Polygon') { [lng, lat] = g.coordinates[0][0]; }
                  else if (g.type === 'LineString') { [lng, lat] = g.coordinates[0]; }
                  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
                  rows.push([esc(layer.name),esc(f.id),esc(f.properties?.name||''),esc(g.type),esc(lat),esc(lng),esc(f.properties?.notes||'')].join(','));
                }
              }
              const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `${projectName}.csv`; a.click(); URL.revokeObjectURL(url);
            }}
            onExportPDF={() => exportProjectPDF({ projectName, turbines, turbineTypes, cables, cableTypes, substations, totalCapacity_mw, totalAEP, avgCapFactor, avgWindSpeed, totalCableLength, totalCableCost, windParams, monthlyData, layers, mapEl: mapRef.current?.getContainer ? mapRef.current.getContainer() : null })}
          />

        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        {/* Map */}
        <div className="flex-1 relative min-w-0" style={{ cursor: cursorStyle }}>
          <MapContainer
            center={[53.5, -8.0]} zoom={7}
            minZoom={6} maxZoom={19}
            maxBounds={IRELAND_BOUNDS}
            maxBoundsViscosity={1.0}
            style={{ height: '100%', width: '100%' }}
            zoomControl
            ref={mapRef}
            whenReady={(map) => {
              if (!map.target.getPane('cablePane')) {
                map.target.createPane('cablePane');
                map.target.getPane('cablePane').style.zIndex = 450;
              }
              if (!map.target.getPane('windPane')) {
                map.target.createPane('windPane');
                map.target.getPane('windPane').style.zIndex = 420;
                map.target.getPane('windPane').style.pointerEvents = 'none';
              }
              setPanesReady(true);
            }}
          >
            <MapBoundsEnforcer />
            {satelliteView ? (
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Tiles &copy; Esri"
                maxZoom={19}
              />
            ) : roadsView ? (
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                maxZoom={19}
              />
            ) : (
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
            )}
            {/* Satellite + road labels overlay */}
            {satelliteView && (
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
                attribution=""
                opacity={0.7}
              />
            )}
            <MapClickHandler mode={mode} onAddPoint={addPoint} onFinishPolygon={finishPolygon} onFinishCable={finishCable} />
            <MapMouseHandler mode={mode} turbines={turbines} substations={substations} onSnapPreview={setSnapPreview} />

            {layers.map(layer => {
              if (!layer.visible) return null;
              if (layer.type === 'wind_resource') return <WindResourceRenderer key={layer.id} layer={layer} />;
              if (layer.type === 'substation') return null; // rendered separately below

              return layer.features.map(f => {
                const pathOpts = { color: layer.color, fillColor: layer.color, fillOpacity: layer.fillOpacity, weight: layer.strokeWeight || 2, opacity: layer.strokeOpacity || 0.9 };

                if (f.geometry.type === 'Polygon') {
                  // Don't render inner closing vertex (last == first)
                  const ring = f.geometry.coordinates[0];
                  const positions = ring.slice(0, -1).map(([lng, lat]) => [lat, lng]);
                  const isEditing = editingPolygonId === f.id;
                  const polyColor = layer.type === 'polygon' ? (layer.color || '#06b6d4') : pathOpts.color;
                  const polyOpts = { ...pathOpts, color: polyColor, fillColor: polyColor,
                    weight: isEditing ? 2.5 : pathOpts.weight,
                    dashArray: isEditing ? '6 4' : undefined };
                  // In non-select modes, let clicks bubble through to the map handler
                  const nonSelectMode = ['place_turbine', 'draw_cable', 'draw_polygon', 'place_substation'].includes(mode);
                  return (
                    <React.Fragment key={f.id}>
                      <Polygon positions={positions} pathOptions={polyOpts}
                        bubblingMouseEvents={nonSelectMode}
                        eventHandlers={{
                          click: (e) => {
                            if (nonSelectMode) return; // let it bubble
                            L.DomEvent.stopPropagation(e);
                            if (isEditing) {
                              insertPolygonVertex(f.id, layer.id, e.latlng.lat, e.latlng.lng);
                            } else {
                              openPolygonMenu(f, layer.id);
                            }
                          },
                          mousemove: (e) => {
                            if (nonSelectMode) return;
                            const container = e.target._map?.getContainer();
                            const rect = container?.getBoundingClientRect();
                            if (!rect) return;
                            setLayerTooltip({
                              x: e.originalEvent.clientX - rect.left,
                              y: e.originalEvent.clientY - rect.top,
                              layerName: layer.name,
                              featureName: f.properties?.name || '',
                              description: f.properties?.designation || f.properties?.reason || f.properties?.zone || f.properties?.type || f.properties?.notes || '',
                            });
                          },
                          mouseout: () => setLayerTooltip(null),
                        }}
                      />
                      {/* Vertex edit handles */}
                      {isEditing && positions.map(([lat, lng], vi) => {
                        const vIcon = L.divIcon({
                          html: `<div style="width:10px;height:10px;background:#fff;border:2px solid ${polyColor};border-radius:50%;cursor:move"></div>`,
                          className: '', iconSize: [10, 10], iconAnchor: [5, 5],
                        });
                        return (
                          <Marker key={`v-${f.id}-${vi}`} position={[lat, lng]} icon={vIcon} draggable
                            eventHandlers={{
                              dragend: (e) => {
                                const newPts = positions.map(([la, ln], i) =>
                                  i === vi ? [e.target.getLatLng().lat, e.target.getLatLng().lng] : [la, ln]
                                );
                                updatePolygonVertices(f.id, layer.id, newPts);
                              }
                            }}
                          />
                        );
                      })}
                    </React.Fragment>
                  );
                }

                if (f.geometry.type === 'LineString') {
                  const ct = cableTypes.find(t => t.id === f.properties.cable_type_id) || cableTypes[0];
                  const positions = f.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
                  const usedMw = calcCableLoad(f.id, cables, turbines);
                  const usedA = ct ? +(usedMw * 1000 / (Math.sqrt(3) * ct.voltage_kv)).toFixed(0) : 0;
                  const overloaded = usedMw > 0 && usedA > (ct?.ampacity_a || 0);
                  const isSelected = cableMenuFeature?.id === f.id;
                  const nonSelectMode = ['place_turbine', 'draw_cable', 'draw_polygon', 'place_substation'].includes(mode);
                  // Capture a stable snapshot of the feature for the click handler
                  const fSnapshot = f;
                  const visWeight = isSelected ? 5 : overloaded ? 4 : 3;
                  return (
                    <React.Fragment key={f.id}>
                      {/* Visible cable line */}
                      <Polyline positions={positions}
                        pane="cablePane"
                        pathOptions={{ color: isSelected ? '#38bdf8' : overloaded ? '#ef4444' : (ct?.color || '#f97316'), weight: visWeight, opacity: 0.9, dashArray: overloaded ? '8 4' : undefined }}
                        bubblingMouseEvents={false}
                        eventHandlers={{
                          click: (e) => {
                            if (nonSelectMode) return;
                            L.DomEvent.stop(e);
                            setCableMenuFeature(fSnapshot);
                            setTurbineMenuFeature(null);
                            setSubstationMenuFeature(null);
                            setPolygonMenuFeature(null);
                            setRightTab('cables');
                          }
                        }}
                      />
                      {/* Wide transparent hit-area in same elevated pane */}
                      <Polyline positions={positions}
                        pane="cablePane"
                        pathOptions={{ color: 'transparent', weight: 20, opacity: 0.001 }}
                        bubblingMouseEvents={false}
                        eventHandlers={{
                          click: (e) => {
                            if (nonSelectMode) return;
                            L.DomEvent.stop(e);
                            setCableMenuFeature(fSnapshot);
                            setTurbineMenuFeature(null);
                            setSubstationMenuFeature(null);
                            setPolygonMenuFeature(null);
                            setRightTab('cables');
                          }
                        }}
                      />
                    </React.Fragment>
                  );
                }

                if (f.geometry.type === 'Point' && layer.type === 'turbine') {
                  const [lng, lat] = f.geometry.coordinates;
                  const isSelected = f.id === selectedFeatureId;
                  const tt = turbineTypes.find(t => t.id === f.properties.turbine_type_id) || selectedTurbineType;
                  const icon = turbineIcon(tt?.color || layer.color, isSelected);
                  const radiusConfig = turbineRadii[f.id];
                  return (
                    <React.Fragment key={f.id}>
                      <Marker position={[lat, lng]} icon={icon}
                        eventHandlers={{
                          click: (e) => {
                            if (mode === 'select') {
                              L.DomEvent.stopPropagation(e);
                              setSelectedFeatureId(f.id);
                              openTurbineMenu(f);
                            }
                          }
                        }} />
                      {turbineRadii[f.id]?.show === true && (
                        <Circle center={[lat, lng]} radius={turbineRadii[f.id].radius || 500}
                          pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.06, weight: 1.5, dashArray: '5 4', opacity: 0.7, interactive: false }} />
                      )}
                    </React.Fragment>
                  );
                }
                return null;
              });
            })}

            {/* Drawing preview */}
            {drawingPoints.length > 0 && (
              <>
                <Polyline positions={drawingPoints}
                  pathOptions={{ color: mode === 'draw_cable' ? '#f97316' : '#06b6d4', weight: 2, dashArray: '5 5' }} />
                {drawingPoints.map((pt, i) => {
                  const snap = drawingSnapNodes[i];
                  const color = mode === 'draw_cable' ? (snap ? '#facc15' : '#f97316') : '#06b6d4';
                  return (
                    <Circle key={i} center={pt} radius={snap ? 80 : 40}
                      pathOptions={{ color, fillColor: color, fillOpacity: 0.9, weight: snap ? 2 : 0 }} />
                  );
                })}
              </>
            )}
            {/* Snap preview ring */}
            {snapPreview && mode === 'draw_cable' && (
              <Circle
                center={[snapPreview.lat, snapPreview.lng]}
                radius={120}
                pathOptions={{ color: '#facc15', fillColor: '#facc15', fillOpacity: 0.25, weight: 2, dashArray: '4 3' }}
              />
            )}

            {/* Wind speed heatmap — rendered in dedicated windPane above polygons */}
            {showWindLayer && panesReady && turbines.map(t => {
              const spd = t.properties.hub_wind_speed;
              if (!spd) return null;
              const [lng, lat] = t.geometry.coordinates;
              const color = spd >= 10 ? '#ef4444' : spd >= 9 ? '#f97316' : spd >= 8 ? '#f59e0b' : spd >= 7 ? '#10b981' : spd >= 6 ? '#06b6d4' : '#3b82f6';
              return (
                <React.Fragment key={`wind-${t.id}`}>
                  <Circle center={[lat, lng]} radius={600} pane="windPane"
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.65, weight: 2, opacity: 1, interactive: false }} />
                  <Circle center={[lat, lng]} radius={1200} pane="windPane"
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.30, weight: 0, opacity: 0, interactive: false }} />
                  <Circle center={[lat, lng]} radius={2000} pane="windPane"
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.12, weight: 0, opacity: 0, interactive: false }} />
                </React.Fragment>
              );
            })}

            {/* Placeable Substations */}
            {showSubstations && substations.map(s => {
              const [lng, lat] = s.geometry.coordinates;
              const substIcon = L.divIcon({
                html: `<div style="width:14px;height:14px;background:#facc15;border:2px solid #fff;border-radius:3px;box-shadow:0 0 6px #facc1599;display:flex;align-items:center;justify-content:center;">
                  <div style="width:6px;height:6px;background:#000;border-radius:1px;opacity:0.5"></div>
                </div>`,
                className: '', iconSize: [14, 14], iconAnchor: [7, 7],
              });
              const subTotalMw = calcSubstationLoad(s.id, cables, turbines);
              const subCapMw = s.properties.capacity_generation_mw || 0;
              const subOverloaded = subTotalMw > 0 && subTotalMw > subCapMw + 0.01;
              const subIcon = L.divIcon({
                html: `<div style="width:16px;height:16px;background:${subOverloaded ? '#ef4444' : '#facc15'};border:2px solid #fff;border-radius:3px;box-shadow:0 0 6px ${subOverloaded ? '#ef444499' : '#facc1599'};display:flex;align-items:center;justify-content:center;">
                  <div style="width:6px;height:6px;background:#000;border-radius:1px;opacity:0.5"></div>
                </div>`,
                className: '', iconSize: [16, 16], iconAnchor: [8, 8],
              });
              return (
                <Marker key={`sub-${s.id}`} position={[lat, lng]} icon={subIcon}
                  eventHandlers={{
                    click: (e) => {
                      if (mode === 'select') { L.DomEvent.stopPropagation(e); setSubstationMenuFeature(s); setTurbineMenuFeature(null); setPolygonMenuFeature(null); }
                    }
                  }}>
                  <Popup>
                    <div className="text-xs min-w-36">
                      <p className="font-bold">{s.properties.name}</p>
                      <p className="text-slate-500">{s.properties.transformer_mva} MVA transformer</p>
                      <p className="text-slate-500">Gen capacity: {subCapMw} MW</p>
                      {subTotalMw > 0 && <p style={{ color: subOverloaded ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                        Connected load: {subTotalMw.toFixed(1)} MW{subOverloaded ? ' ⚠ OVER CAPACITY' : ' ✓ OK'}
                      </p>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Map layer toggles */}
          <div className="absolute top-3 right-3 z-[1100] flex flex-col gap-1.5">
            {/* Base map picker */}
            <div className="relative">
              <button
                onClick={() => setShowBaseMapMenu(v => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all shadow-lg bg-slate-900 border-slate-700 text-slate-300 hover:text-white w-full"
              >
                {baseMap === 'satellite' ? <Satellite className="w-3 h-3 text-blue-400" /> : baseMap === 'roads' ? <Navigation className="w-3 h-3 text-green-400" /> : <Map className="w-3 h-3 text-slate-400" />}

                <span className="flex-1 text-left">{baseMap === 'satellite' ? 'Satellite' : baseMap === 'roads' ? 'Roads' : 'Dark'}</span>
                <ChevronDown className={cn("w-3 h-3 text-slate-500 transition-transform", showBaseMapMenu && "rotate-180")} />
              </button>
              {showBaseMapMenu && (
                <div className="absolute top-full right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden min-w-[110px] z-[1200]">
                  {[
                    { id: 'dark', label: 'Dark', icon: Map },
                    { id: 'satellite', label: 'Satellite', icon: Satellite },
                    { id: 'roads', label: 'Roads', icon: Navigation },
                  ].map(({ id, label, icon: BmIcon }) => (
                    <button key={id} onClick={() => { setBaseMap(id); setShowBaseMapMenu(false); }}
                      className={cn("flex items-center gap-2 w-full px-3 py-2 text-[10px] font-medium transition-colors",
                        baseMap === id ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      )}>
                      <BmIcon className="w-3 h-3" /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setShowWindLayer(v => !v)}
              className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all shadow-lg",
                showWindLayer ? "bg-cyan-600 text-white border-cyan-500" : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
              )}>
              <Wind className="w-3 h-3" /> Wind Heat Map
            </button>
            <button onClick={() => setShowSubstations(v => !v)}
              className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all shadow-lg",
                showSubstations ? "bg-yellow-500 text-slate-900 border-yellow-400 font-semibold" : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
              )}>
              <Zap className="w-3 h-3" />
              {`Substations${substations.length > 0 ? ` (${substations.length})` : ''}`}
            </button>
          </div>

          {/* Wind heat map legend */}
          {showWindLayer && turbines.some(t => t.properties.hub_wind_speed) && (
            <div className="absolute bottom-6 right-3 z-[1100] bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2.5 shadow-xl">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-1.5 font-semibold">Hub Wind Speed (m/s)</p>
              <div className="space-y-1">
                {[
                  { color: '#ef4444', label: '≥ 10.0 m/s', desc: 'Excellent' },
                  { color: '#f97316', label: '9–10 m/s', desc: 'Very good' },
                  { color: '#f59e0b', label: '8–9 m/s', desc: 'Good' },
                  { color: '#10b981', label: '7–8 m/s', desc: 'Moderate' },
                  { color: '#06b6d4', label: '6–7 m/s', desc: 'Poor' },
                  { color: '#3b82f6', label: '< 6.0 m/s', desc: 'Very poor' },
                ].map(({ color, label, desc }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0 opacity-80" style={{ background: color }} />
                    <span className="text-[10px] text-slate-300 font-medium">{label}</span>
                    <span className="text-[9px] text-slate-500">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mode hint */}
          {mode !== 'select' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 backdrop-blur-sm text-white text-xs font-medium px-4 py-2 rounded-full border border-slate-700 pointer-events-none">
              {mode === 'draw_polygon' && `Click to add vertices • Double-click to finish`}
              {mode === 'place_turbine' && `Placing: ${selectedTurbineType?.manufacturer} ${selectedTurbineType?.model} — click map`}
              {mode === 'draw_cable' && `Click to add waypoints • Hover near turbine/substation to snap • Double-click to finish (${selectedCableType?.name})`}
              {mode === 'place_substation' && `Click map to place a substation — then click it to edit attributes`}
            </div>
          )}

          {/* Turbine popup menu */}
          {turbineMenuFeature && (() => {
            const [lng, lat] = turbineMenuFeature.geometry.coordinates;
            const props = turbineMenuFeature.properties;
            const menuTt = turbineTypes.find(t => t.id === turbineMenuTypeId) || turbineTypes[0];
            return (
              <div className="absolute top-14 left-4 z-[1200] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 w-72">
                <div className="flex items-center justify-between mb-3">
                  <input
                    value={turbineMenuName}
                    onChange={e => setTurbineMenuName(e.target.value)}
                    className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-sm font-bold text-white outline-none flex-1 mr-2"
                    placeholder="Turbine name"
                  />
                  <button onClick={() => setTurbineMenuFeature(null)} className="text-slate-500 hover:text-white shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Info row */}
                <div className="grid grid-cols-2 gap-1.5 mb-3 text-[10px]">
                  {props.elevation_m != null && <div className="bg-slate-800 rounded px-2 py-1"><span className="text-slate-500">Elevation</span><br /><span className="text-white font-medium">{props.elevation_m}m</span></div>}
                  {props.hub_wind_speed && <div className="bg-slate-800 rounded px-2 py-1"><span className="text-slate-500">Hub wind</span><br /><span className="text-cyan-400 font-medium">{props.hub_wind_speed} m/s</span></div>}
                  {props.aep_mwh && <div className="bg-slate-800 rounded px-2 py-1"><span className="text-slate-500">AEP</span><br /><span className="text-emerald-400 font-medium">{(props.aep_mwh/1000).toFixed(2)} GWh</span></div>}
                  <div className="bg-slate-800 rounded px-2 py-1"><span className="text-slate-500">Position</span><br /><span className="text-white font-medium">{lat.toFixed(4)}, {lng.toFixed(4)}</span></div>
                </div>

                {/* Turbine type selector */}
                <div className="mb-3">
                  <label className="text-[10px] text-slate-400 block mb-1">Turbine Type</label>
                  <select
                    value={turbineMenuTypeId}
                    onChange={e => setTurbineMenuTypeId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 outline-none"
                  >
                    {turbineTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.manufacturer} {t.model} ({t.rated_power_mw} MW)</option>
                    ))}
                  </select>
                  {menuTt && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Ø{menuTt.rotor_diameter_m}m · {menuTt.hub_height_m}m hub · {menuTt.cut_in_ms}–{menuTt.cut_out_ms} m/s
                    </p>
                  )}
                </div>

                {/* Custom fields */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-slate-400">Custom Fields</label>
                    <button
                      onClick={() => {
                        const label = `Field ${Object.keys(turbineMenuCustomFields).length + 1}`;
                        setTurbineMenuCustomFields(prev => ({ ...prev, [label]: '' }));
                      }}
                      className="flex items-center gap-0.5 text-[10px] text-slate-500 hover:text-emerald-400">
                      <PlusCircle className="w-3 h-3" /> Add
                    </button>
                  </div>
                  {Object.entries(turbineMenuCustomFields).map(([label, val]) => (
                    <div key={label} className="flex items-center gap-1 mb-1">
                      <input
                        value={label}
                        onChange={e => {
                          const newKey = e.target.value;
                          setTurbineMenuCustomFields(prev => {
                            const entries = Object.entries(prev).map(([k, v]) => k === label ? [newKey, v] : [k, v]);
                            return Object.fromEntries(entries);
                          });
                        }}
                        className="w-24 bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-[10px] text-slate-300 outline-none"
                        placeholder="Label"
                      />
                      <input
                        value={val}
                        onChange={e => setTurbineMenuCustomFields(prev => ({ ...prev, [label]: e.target.value }))}
                        className="flex-1 bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-[10px] text-white outline-none"
                        placeholder="Value"
                      />
                      <button onClick={() => setTurbineMenuCustomFields(prev => { const n = { ...prev }; delete n[label]; return n; })}
                        className="text-slate-600 hover:text-red-400 shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {/* Assign to polygon */}
                  <div className="mt-2">
                    <label className="text-[10px] text-slate-400 block mb-1">Assign to Zone / Polygon</label>
                    <select
                      value={turbineMenuPolygonId}
                      onChange={e => setTurbineMenuPolygonId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white text-[10px] rounded px-2 py-1 outline-none"
                    >
                      <option value="">— None —</option>
                      {layers.filter(l => !['turbine','cable','substation','wind_resource'].includes(l.type)).flatMap(l =>
                        l.features.filter(f => f.geometry.type === 'Polygon').map(f => (
                          <option key={f.id} value={f.id}>{l.name} › {f.properties.name || f.id.slice(0,8)}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Setback radius */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-slate-400">Setback / Assessment Radius</label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={turbineMenuShowRadius} onChange={e => setTurbineMenuShowRadius(e.target.checked)} className="accent-orange-500 w-3 h-3" />
                      <span className="text-[10px] text-slate-400">Show on map</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="range" min={100} max={5000} step={50} value={turbineMenuRadius}
                      onChange={e => setTurbineMenuRadius(+e.target.value)}
                      className="flex-1 accent-orange-500 h-1" />
                    <span className="text-[10px] text-orange-400 font-medium w-14 text-right">{turbineMenuRadius}m</span>
                  </div>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {[500, 1000, 2000, 3000].map(r => (
                      <button key={r} onClick={() => setTurbineMenuRadius(r)}
                        className={cn("px-2 py-0.5 rounded text-[10px] border transition-colors",
                          turbineMenuRadius === r ? "bg-orange-500/20 border-orange-500/40 text-orange-400" : "bg-slate-800 border-slate-700 text-slate-500 hover:text-white"
                        )}>
                        {r >= 1000 ? `${r/1000}km` : `${r}m`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={applyTurbineMenu}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors">
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      turbineLayer && deleteFeature(turbineLayer.id, turbineMenuFeature.id);
                      setTurbineRadii(prev => { const n = { ...prev }; delete n[turbineMenuFeature.id]; return n; });
                      setTurbineMenuFeature(null);
                    }}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Polygon menu */}
          {polygonMenuFeature && (
            <PolygonMenu
              feature={polygonMenuFeature}
              layer={layers.find(l => l.id === polygonMenuLayerId)}
              onApply={applyPolygonMenu}
              onDelete={() => {
                deleteFeature(polygonMenuLayerId, polygonMenuFeature.id);
                setPolygonMenuFeature(null);
                setPolygonMenuLayerId(null);
              }}
              onClose={() => { setPolygonMenuFeature(null); setPolygonMenuLayerId(null); }}
              onEditVertices={() => {
                setEditingPolygonId(polygonMenuFeature.id);
                setPolygonMenuFeature(null);
                setPolygonMenuLayerId(null);
              }}
            />
          )}

          {/* Cable popup menu */}
          {cableMenuFeature && (() => {
            const cf = cables.find(c => c.id === cableMenuFeature.id) || cableMenuFeature;
            const ct = cableTypes.find(t => t.id === cf.properties.cable_type_id) || cableTypes[0];
            const usedMw = calcCableLoad(cf.id, cables, turbines);
            const capacityMVA = ct ? +(Math.sqrt(3) * ct.voltage_kv * ct.ampacity_a / 1000).toFixed(1) : 0;
            const usedA = ct ? +(usedMw * 1000 / (Math.sqrt(3) * ct.voltage_kv)).toFixed(0) : 0;
            const remainingA = Math.max(0, (ct?.ampacity_a || 0) - usedA);
            const remainingMW = ct ? +(remainingA * Math.sqrt(3) * ct.voltage_kv / 1000).toFixed(1) : 0;
            const loadPct = ct?.ampacity_a > 0 ? Math.min(100, (usedA / ct.ampacity_a) * 100) : 0;
            const overloaded = usedMw > 0 && usedA > (ct?.ampacity_a || 0);
            const nodeLabel = (n) => {
              if (!n) return 'Free end';
              if (n.type === 'turbine') return turbines.find(t => t.id === n.id)?.properties?.name || 'Turbine';
              if (n.type === 'substation') return substations.find(s => s.id === n.id)?.properties?.name || 'Substation';
              return '—';
            };
            return (
              <div className="absolute top-14 left-4 z-[1200] bg-slate-900 border border-orange-500/40 rounded-xl shadow-2xl p-4 w-72">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-orange-400 uppercase tracking-wider font-medium">⚡ Cable</span>
                  <button onClick={() => setCableMenuFeature(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <p className="text-sm font-bold text-white mb-2 truncate">{cf.properties.name}</p>
                {/* Cable type selector */}
                <div className="mb-3">
                  <label className="text-[10px] text-slate-400 block mb-1">Cable Type</label>
                  <select
                    value={cf.properties.cable_type_id || cableTypes[0]?.id}
                    onChange={e => {
                      if (!cableLayer) return;
                      updateLayer(cableLayer.id, {
                        features: cableLayer.features.map(f =>
                          f.id === cf.id ? { ...f, properties: { ...f.properties, cable_type_id: e.target.value } } : f
                        )
                      });
                      setCableMenuFeature(prev => ({ ...prev, properties: { ...prev.properties, cable_type_id: e.target.value } }));
                    }}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 outline-none"
                  >
                    {cableTypes.map(ct => (
                      <option key={ct.id} value={ct.id}>{ct.name} — {ct.voltage_kv}kV / {ct.ampacity_a}A</option>
                    ))}
                  </select>
                </div>
                {/* Load bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-500">Load utilisation</span>
                    <span className={cn("font-bold", overloaded ? "text-red-400" : loadPct > 80 ? "text-amber-400" : "text-emerald-400")}>
                      {loadPct.toFixed(0)}%{overloaded ? ' ⚠ OVERLOADED' : ''}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", overloaded ? "bg-red-500" : loadPct > 80 ? "bg-amber-400" : "bg-emerald-500")}
                      style={{ width: `${Math.min(100, loadPct)}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] mb-3">
                  <div className="bg-slate-800 rounded px-2 py-1.5"><p className="text-slate-500">Type</p><p className="text-white font-medium truncate">{ct?.name || '—'}</p></div>
                  <div className="bg-slate-800 rounded px-2 py-1.5"><p className="text-slate-500">Length</p><p className="text-orange-400 font-medium">{((cf.properties.length_m || 0) / 1000).toFixed(2)} km</p></div>
                  <div className="bg-slate-800 rounded px-2 py-1.5"><p className="text-slate-500">Capacity</p><p className="text-cyan-400 font-medium">{ct?.ampacity_a}A / {capacityMVA} MVA</p></div>
                  <div className="bg-slate-800 rounded px-2 py-1.5"><p className="text-slate-500">Load</p><p className={cn("font-medium", overloaded ? "text-red-400" : "text-emerald-400")}>{usedA}A ({usedMw.toFixed(1)} MW)</p></div>
                  <div className="bg-slate-800 rounded px-2 py-1.5 col-span-2"><p className="text-slate-500">Remaining capacity</p><p className={cn("font-bold", overloaded ? "text-red-400" : "text-emerald-400")}>{overloaded ? 'OVERLOADED' : `${remainingA}A / ${remainingMW} MW spare`}</p></div>
                  <div className="bg-slate-800 rounded px-2 py-1.5"><p className="text-slate-500">From</p><p className="text-slate-300 font-medium truncate">{nodeLabel(cf.properties.start_node)}</p></div>
                  <div className="bg-slate-800 rounded px-2 py-1.5"><p className="text-slate-500">To</p><p className="text-slate-300 font-medium truncate">{nodeLabel(cf.properties.end_node)}</p></div>
                  <div className="bg-slate-800 rounded px-2 py-1.5"><p className="text-slate-500">Cost</p><p className="text-yellow-400 font-medium">£{((cf.properties.length_m || 0) * (ct?.cost_per_m || 0)).toFixed(0)}</p></div>
                  <div className="bg-slate-800 rounded px-2 py-1.5"><p className="text-slate-500">Voltage</p><p className="text-purple-400 font-medium">{ct?.voltage_kv} kV</p></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCableMenuFeature(null)}
                    className="flex-1 py-1.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 text-xs font-medium rounded-lg border border-orange-600/30 transition-colors">
                    Done
                  </button>
                  <button onClick={() => { cableLayer && deleteFeature(cableLayer.id, cf.id); setCableMenuFeature(null); }}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Substation popup menu */}
          {substationMenuFeature && (() => {
            const [lng, lat] = substationMenuFeature.geometry.coordinates;
            const p = substationMenuFeature.properties;
            const subLayer = layers.find(l => l.type === 'substation');
            const connectedMw = calcSubstationLoad(substationMenuFeature.id, cables, turbines);
            const capMw = p.capacity_generation_mw || 0;
            const subOver = connectedMw > 0 && connectedMw > capMw + 0.01;
            const connectedCables = cables.filter(c =>
              c.properties.start_node?.id === substationMenuFeature.id ||
              c.properties.end_node?.id === substationMenuFeature.id
            );
            const updateSubProps = (newProps) => {
              if (!subLayer) return;
              updateLayer(subLayer.id, {
                features: subLayer.features.map(f =>
                  f.id === substationMenuFeature.id ? { ...f, properties: { ...f.properties, ...newProps } } : f
                )
              });
            };
            return (
              <div className="absolute top-14 left-4 z-[1200] bg-slate-900 border border-yellow-500/40 rounded-xl shadow-2xl p-4 w-72">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-yellow-400 uppercase tracking-wider font-medium">⚡ Substation</span>
                  <button onClick={() => setSubstationMenuFeature(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                {/* Live load summary */}
                {connectedCables.length > 0 && (
                  <div className={cn("rounded-lg px-3 py-2 mb-3 text-[10px]", subOver ? "bg-red-500/10 border border-red-500/30" : "bg-emerald-500/10 border border-emerald-500/20")}>
                    <p className={cn("font-bold", subOver ? "text-red-400" : "text-emerald-400")}>
                      {subOver ? '⚠ OVER CAPACITY' : '✓ Within capacity'}
                    </p>
                    <p className="text-slate-400">{connectedCables.length} cable{connectedCables.length !== 1 ? 's' : ''} connected · {connectedMw.toFixed(1)} / {capMw} MW</p>
                  </div>
                )}
                <div className="space-y-2 mb-3">
                  {[
                    { label: 'Name', key: 'name', type: 'text' },
                    { label: 'Transformer (MVA)', key: 'transformer_mva', type: 'number' },
                    { label: 'Available Gen Capacity (MW)', key: 'capacity_generation_mw', type: 'number' },
                    { label: 'Available Demand Capacity (MW)', key: 'capacity_demand_mw', type: 'number' },
                    { label: 'Notes', key: 'notes', type: 'text' },
                  ].map(({ label, key, type }) => (
                    <div key={key}>
                      <label className="text-[10px] text-slate-500 block mb-0.5">{label}</label>
                      <input
                        type={type}
                        defaultValue={p[key] ?? ''}
                        onBlur={e => updateSubProps({ [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-yellow-500/60"
                      />
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-slate-600 mb-3">{lat.toFixed(5)}, {lng.toFixed(5)}</div>
                <div className="flex gap-2">
                  <button onClick={() => setSubstationMenuFeature(null)}
                    className="flex-1 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 text-xs font-medium rounded-lg border border-yellow-600/30 transition-colors">
                    Done
                  </button>
                  <button
                    onClick={() => {
                      if (subLayer) updateLayer(subLayer.id, { features: subLayer.features.filter(f => f.id !== substationMenuFeature.id) });
                      setSubstationMenuFeature(null);
                    }}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Edit vertices hint */}
          {editingPolygonId && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 backdrop-blur-sm text-white text-xs font-medium px-4 py-2 rounded-full border border-slate-600 flex items-center gap-3">
              <span>Drag vertices to reshape • Click edge to add vertex • Click polygon to finish</span>
              <button onClick={() => setEditingPolygonId(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
          )}

          {/* Exclusion zone warning */}
          {exclusionWarning && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[1600] pointer-events-none">
              <div className="flex items-start gap-3 bg-red-900/95 border border-red-500/70 rounded-xl px-4 py-3 shadow-2xl max-w-sm">
                <div className="text-red-400 text-lg shrink-0 mt-0.5">⛔</div>
                <div>
                  <p className="text-sm font-bold text-red-300">Turbine Placement Blocked</p>
                  <p className="text-xs text-red-400 mt-0.5">
                    <span className="font-semibold text-white">{exclusionWarning.featureName}</span> is marked as a no-turbine zone
                    <span className="text-red-500"> ({exclusionWarning.layerName})</span>.
                  </p>
                  <p className="text-[10px] text-red-500 mt-1">Move the turbine outside this constraint zone to place it.</p>
                </div>
              </div>
            </div>
          )}

          {/* Layer hover tooltip */}
          {layerTooltip && (
            <div
              className="absolute z-[1500] pointer-events-none"
              style={{ left: layerTooltip.x + 14, top: layerTooltip.y - 10 }}
            >
              <div className="bg-slate-900/95 border border-slate-600 rounded-lg px-3 py-2 shadow-xl max-w-[220px]">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{layerTooltip.layerName}</p>
                {layerTooltip.featureName && <p className="text-xs font-bold text-white leading-snug">{layerTooltip.featureName}</p>}
                {layerTooltip.description && <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{layerTooltip.description}</p>}
              </div>
            </div>
          )}

          {/* Exercise Guide overlay */}
          {activeExercise && (
            <ExerciseGuide
              exercise={activeExercise}
              onComplete={() => {}}
              onClose={() => navigate('/learn', { state: { moduleId: exerciseId, exerciseCompleted: true } })}
            />
          )}


        </div>

        {/* Right panel */}
        <div className="w-80 shrink-0 flex flex-col bg-slate-900 border-l border-slate-800 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 shrink-0 overflow-x-auto">
            {RIGHT_TABS.map(({ id, label, icon: TabIcon }) => (
              <button key={id} onClick={() => setRightTab(id)}
                className={cn("flex-1 flex items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors whitespace-nowrap px-1 shrink-0",
                  rightTab === id ? "text-white border-b-2 border-emerald-500" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <TabIcon className="w-3 h-3 shrink-0" /> {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {/* TURBINES TAB */}
            {rightTab === 'turbines' && (
              <TurbineDataTable
                turbines={turbines}
                turbineTypes={turbineTypes}
                selectedTypeId={selectedTurbineTypeId}
                onSelectType={setSelectedTurbineTypeId}
                onDeleteTurbine={(id) => turbineLayer && deleteFeature(turbineLayer.id, id)}
                onUpdateTurbine={updateTurbineProps}
                turbineLayer={turbineLayer}
                onFlyTo={flyToFeature}
              />
            )}

            {/* CABLES TAB */}
            {rightTab === 'cables' && (
              <CableDataTable
                cables={cables}
                cableTypes={cableTypes}
                selectedCableTypeId={selectedCableTypeId}
                onSelectCableType={setSelectedCableTypeId}
                onDeleteCable={(id) => cableLayer && deleteFeature(cableLayer.id, id)}
                onUpdateCableType={(id, vals) => setCableTypes(prev => prev.map(ct => ct.id === id ? vals : ct))}
                onUpdateCable={(id, props) => {
                  if (!cableLayer) return;
                  updateLayer(cableLayer.id, {
                    features: cableLayer.features.map(f => f.id === id ? { ...f, properties: props } : f)
                  });
                }}
                onOptimiseCables={() => {
                  if (!cableLayer) return;
                  // For each cable, pick the cheapest cable type (same voltage family) that can carry its load
                  const currentVoltageKv = (cableTypes.find(ct => ct.id === selectedCableTypeId) || cableTypes[0])?.voltage_kv || 33;
                  const optimisedFeatures = cableLayer.features.map(f => {
                    const requiredMw = calcCableLoad(f.id, cables, turbines);
                    // Find cheapest type that can carry the load at the same voltage
                    const sorted = [...cableTypes]
                      .filter(ct => ct.voltage_kv === currentVoltageKv)
                      .sort((a, b) => a.cost_per_m - b.cost_per_m);
                    const capacityMw = (ct) => +(Math.sqrt(3) * ct.voltage_kv * ct.ampacity_a / 1000);
                    const best = sorted.find(ct => capacityMw(ct) >= requiredMw) || sorted[sorted.length - 1];
                    return best ? { ...f, properties: { ...f.properties, cable_type_id: best.id } } : f;
                  });
                  updateLayer(cableLayer.id, { features: optimisedFeatures });
                }}
                turbines={turbines}
                substations={substations}
                onFlyTo={flyToFeature}
              />
            )}

            {/* ANALYSIS TAB */}
            {rightTab === 'analysis' && (
              <div className="space-y-4">
                <div className="bg-slate-800/60 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300">Wind Distribution</span>
                    {windFetched && <span className="text-[10px] text-emerald-400">✓ Real data</span>}
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Shape k', key: 'k', min: 1, max: 4, step: 0.1 },
                      { label: 'Scale λ (m/s)', key: 'lambda', min: 3, max: 15, step: 0.5 },
                    ].map(({ label, key, min, max, step }) => (
                      <div key={key}>
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="text-slate-500">{label}</span>
                          <span className="text-cyan-400 font-medium">{windParams[key]}</span>
                        </div>
                        <input type="range" min={min} max={max} step={step} value={windParams[key]}
                          onChange={e => setWindParams(p => ({ ...p, [key]: parseFloat(e.target.value) }))}
                          className="w-full accent-cyan-500 h-1" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-slate-500 mb-1.5">Wind Speed Distribution</p>
                  <ResponsiveContainer width="100%" height={90}>
                    <AreaChart data={weibullData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="v" tick={{ fill: '#64748b', fontSize: 8 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 8 }} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '6px', fontSize: 10 }} formatter={v => [`${v}%`]} />
                      <Area type="monotone" dataKey="f" stroke="#06b6d4" strokeWidth={1.5} fill="url(#wg)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {totalAEP_live > 0 ? (
                  <>
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1.5">Monthly Energy Profile</p>
                      <ResponsiveContainer width="100%" height={80}>
                        <BarChart data={monthlyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                          <XAxis dataKey="m" tick={{ fill: '#64748b', fontSize: 8 }} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 8 }} />
                          <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '6px', fontSize: 10 }} formatter={v => [`${v} MWh`]} />
                          <Bar dataKey="e" fill="#10b981" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { l: 'Gross AEP', v: `${(totalAEP_live * 1.1 / 1000).toFixed(1)} GWh`, c: 'text-cyan-400' },
                        { l: 'Net AEP', v: `${(totalAEP_live / 1000).toFixed(1)} GWh`, c: 'text-emerald-400' },
                        { l: 'Cap. Factor', v: `${liveCapFactor}%`, c: 'text-purple-400' },
                        { l: 'Avg Hub Wind', v: avgWindSpeed ? `${avgWindSpeed} m/s` : '—', c: 'text-orange-400' },
                        { l: 'Cable Length', v: `${(totalCableLength / 1000).toFixed(2)} km`, c: 'text-yellow-400' },
                        { l: 'Cable Cost', v: `€${(totalCableCost / 1000).toFixed(0)}k`, c: 'text-red-400' },
                      ].map(({ l, v, c }) => (
                        <div key={l} className="bg-slate-800/60 rounded-lg p-2 text-center">
                          <p className={cn("text-sm font-bold", c)}>{v}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">{l}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 text-slate-600 text-xs">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Place turbines to see analysis
                  </div>
                )}
              </div>
            )}

            {/* LAYERS TAB */}
            {rightTab === 'layers' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-300">Map Layers</span>
                  <button onClick={() => {
                    const l = createLayer({ name: 'New Zone', type: 'polygon', color: '#8b5cf6' });
                    setLayers(prev => [...prev, l]);
                  }} className="p-1 text-slate-500 hover:text-white text-[10px] flex items-center gap-0.5">
                    <Plus className="w-3 h-3" /> Add Zone
                  </button>
                </div>
                <p className="text-[9px] text-slate-600">Higher layers render on top. Use ↑↓ to reorder.</p>
                <LayerImportExport
                  layers={layers}
                  onAddLayer={(layer) => setLayers(prev => [...prev, layer])}
                  projectName={projectName}
                />
                {layers.map((layer, idx) => (
                  <div key={layer.id} onClick={() => {
                    setSelectedLayerId(layer.id);
                    // Fly to the bounds of all features in this layer
                    if (mapRef.current && layer.features.length > 0) {
                      const allPts = layer.features.flatMap(f => {
                        const g = f.geometry;
                        if (g.type === 'Point') return [[g.coordinates[1], g.coordinates[0]]];
                        if (g.type === 'LineString') return g.coordinates.map(([lng, lat]) => [lat, lng]);
                        if (g.type === 'Polygon') return g.coordinates[0].map(([lng, lat]) => [lat, lng]);
                        return [];
                      });
                      if (allPts.length > 0) mapRef.current.flyToBounds(L.latLngBounds(allPts), { padding: [60, 60], animate: true, duration: 0.8 });
                    }
                  }}
                    className={cn("flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer transition-all",
                      layer.id === selectedLayerId ? "bg-slate-700 border-slate-600" : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                    )}>
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: layer.color }} />
                    <span className="flex-1 text-xs text-slate-300 truncate">{layer.name}</span>
                    {layer.no_turbines && <span className="text-[9px] text-red-400 shrink-0" title="No turbines allowed">⛔</span>}
                    <span className="text-[10px] text-slate-600 shrink-0">{layer.features.length}</span>
                    {/* Z-order controls */}
                    <div className="flex flex-col gap-0 shrink-0">
                      <button
                        disabled={idx === 0}
                        onClick={e => {
                          e.stopPropagation();
                          setLayers(prev => {
                            const a = [...prev];
                            [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]];
                            return a;
                          });
                        }}
                        className="p-0.5 text-slate-600 hover:text-white disabled:opacity-20">
                        <ArrowUp className="w-2.5 h-2.5" />
                      </button>
                      <button
                        disabled={idx === layers.length - 1}
                        onClick={e => {
                          e.stopPropagation();
                          setLayers(prev => {
                            const a = [...prev];
                            [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]];
                            return a;
                          });
                        }}
                        className="p-0.5 text-slate-600 hover:text-white disabled:opacity-20">
                        <ArrowDown className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <button onClick={e => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                      className="text-slate-500 hover:text-white p-0.5 shrink-0">
                      {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                    {!['turbine','cable','substation'].includes(layer.type) && (
                      <button onClick={e => { e.stopPropagation(); setLayers(prev => prev.filter(l => l.id !== layer.id)); }}
                        className="text-slate-600 hover:text-red-400 p-0.5 shrink-0">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* TYPES TAB */}
            {rightTab === 'types' && (
              <TurbineTypeEditor
                turbineTypes={turbineTypes}
                onUpdate={(id, vals) => setTurbineTypes(prev => prev.map(t => t.id === id ? { ...t, ...vals } : t))}
                onAdd={(tt) => setTurbineTypes(prev => [...prev, tt])}
                onDelete={(id) => setTurbineTypes(prev => prev.filter(t => t.id !== id))}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}