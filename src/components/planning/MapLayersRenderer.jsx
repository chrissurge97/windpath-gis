import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { Marker, Circle, Polygon, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import WindResourceRenderer from '@/components/gis/WindResourceLayer';
import TurbineRadiiOverlay from '@/components/planning/TurbineRadiiOverlay';
import TextOverlay from '@/components/planning/TextOverlay';
import SubstationMarker from '@/components/planning/SubstationMarker';
import { calcCableLoad, calcSubstationLoad } from '@/lib/cableLoadUtils';

// ── Icon caches ───────────────────────────────────────────────────────────────
const turbineIconCache = new Map();
function turbineIcon(color = '#10b981', selected = false) {
  const key = `${color}_${selected}`;
  if (turbineIconCache.has(key)) return turbineIconCache.get(key);
  const size = selected ? 26 : 20;
  const icon = L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:${selected ? '3px' : '2px'} solid ${selected ? 'white' : 'rgba(255,255,255,0.5)'};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 8px ${color}99">
      <div style="width:2px;height:${selected ? 14 : 10}px;background:white;position:absolute;"></div>
      <div style="width:${selected ? 12 : 9}px;height:2px;background:white;position:absolute;transform:rotate(60deg);transform-origin:left center;left:50%;margin-top:-4px;"></div>
      <div style="width:${selected ? 12 : 9}px;height:2px;background:white;position:absolute;transform:rotate(-60deg);transform-origin:left center;left:50%;margin-top:4px;"></div>
    </div>`,
    className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
  });
  turbineIconCache.set(key, icon);
  return icon;
}

// ── Native Leaflet point layer (bypasses React reconciler for perf) ───────────
// Renders all non-turbine point features as L.circleMarker via a single LayerGroup
function NativePointLayer({ layers, mode, setPointMenuFeature, setPointMenuLayerId,
  setTurbineMenuFeature, setPolygonMenuFeature, setCableMenuFeature, setSubstationMenuFeature, updateLayer }) {
  const map = useMap();
  const groupRef = useRef(null);

  // Keep callbacks in refs so the Leaflet event handlers always call the latest version
  const setPointMenuFeatureRef = useRef(setPointMenuFeature);
  const setPointMenuLayerIdRef = useRef(setPointMenuLayerId);
  const setTurbineMenuFeatureRef = useRef(setTurbineMenuFeature);
  const setPolygonMenuFeatureRef = useRef(setPolygonMenuFeature);
  const setCableMenuFeatureRef = useRef(setCableMenuFeature);
  const setSubstationMenuFeatureRef = useRef(setSubstationMenuFeature);
  const updateLayerRef = useRef(updateLayer);
  useEffect(() => {
    setPointMenuFeatureRef.current = setPointMenuFeature;
    setPointMenuLayerIdRef.current = setPointMenuLayerId;
    setTurbineMenuFeatureRef.current = setTurbineMenuFeature;
    setPolygonMenuFeatureRef.current = setPolygonMenuFeature;
    setCableMenuFeatureRef.current = setCableMenuFeature;
    setSubstationMenuFeatureRef.current = setSubstationMenuFeature;
    updateLayerRef.current = updateLayer;
  });

  // Flatten all point features with their layer
  const pointFeatures = useMemo(() => {
    const result = [];
    for (const layer of layers) {
      if (!layer.visible) continue;
      if (['turbine', 'cable', 'substation', 'wind_resource'].includes(layer.type)) continue;
      for (const f of layer.features) {
        if (f.geometry?.type !== 'Point') continue;
        if (f.properties?._featureType === 'text') continue;
        result.push({ f, layer });
      }
    }
    return result;
  }, [layers]);

  useEffect(() => {
    // Create group once
    if (!groupRef.current) {
      groupRef.current = L.layerGroup().addTo(map);
    }
    const group = groupRef.current;
    group.clearLayers();

    for (const { f, layer } of pointFeatures) {
      const [lng, lat] = f.geometry.coordinates;
      const color = layer.color || '#8b5cf6';

      // Main dot
      const marker = L.circleMarker([lat, lng], {
        radius: 5,
        color: 'rgba(255,255,255,0.7)',
        weight: 1.5,
        fillColor: color,
        fillOpacity: 1,
      });

      // Click handled via mousedown/mouseup below to avoid conflict with drag
      // In pan mode (no drag), use a plain click handler
      if (mode === 'pan') {
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setPointMenuFeatureRef.current(f);
          setPointMenuLayerIdRef.current(layer.id);
          setTurbineMenuFeatureRef.current(null);
          setPolygonMenuFeatureRef.current(null);
          setCableMenuFeatureRef.current(null);
          setSubstationMenuFeatureRef.current(null);
        });
      }

      // Make draggable in select mode — only start drag after mouse moves to avoid blocking click
      if (mode === 'select') {
        let dragStarted = false;
        let mouseDownLatLng = null;

        // Tooltip on hover
      const tooltipContent = [f.properties?.name, f.properties?.notes].filter(Boolean).join('\n');
      if (tooltipContent) {
        marker.bindTooltip(tooltipContent, {
          permanent: false,
          direction: 'top',
          offset: [0, -8],
          className: 'leaflet-point-tooltip',
        });
      }

      marker.on('mousedown', (e) => {
          mouseDownLatLng = e.latlng;
          dragStarted = false;
          L.DomEvent.stopPropagation(e);

          const onMouseMove = (e2) => {
            if (!dragStarted) {
              // Only start drag if mouse moved more than a few pixels
              const moved = map.latLngToContainerPoint(e2.latlng);
              const origin = map.latLngToContainerPoint(mouseDownLatLng);
              if (Math.hypot(moved.x - origin.x, moved.y - origin.y) < 5) return;
              dragStarted = true;
              map.dragging.disable();
            }
            marker.setLatLng(e2.latlng);
          };

          const onMouseUp = (e2) => {
            map.off('mousemove', onMouseMove);
            map.off('mouseup', onMouseUp);
            if (!dragStarted) {
              // It was a click, not a drag — open the menu
              map.dragging.enable();
              setPointMenuFeatureRef.current(f);
              setPointMenuLayerIdRef.current(layer.id);
              setTurbineMenuFeatureRef.current(null);
              setPolygonMenuFeatureRef.current(null);
              setCableMenuFeatureRef.current(null);
              setSubstationMenuFeatureRef.current(null);
              return;
            }
            dragStarted = false;
            map.dragging.enable();
            const { lat: newLat, lng: newLng } = marker.getLatLng();
            updateLayerRef.current(layer.id, {
              features: layer.features.map(ft =>
                ft.id === f.id ? { ...ft, geometry: { ...ft.geometry, coordinates: [newLng, newLat] } } : ft
              )
            });
          };

          map.on('mousemove', onMouseMove);
          map.on('mouseup', onMouseUp);
        });
      }

      group.addLayer(marker);

      // Radius circles (no fill, thick stroke)
      const radii = f.properties?.radii;
      const legacySetback = f.properties?.setback_m;
      if (radii && radii.length > 0) {
        for (const r of radii) {
          if (r.radiusM > 0) {
            group.addLayer(L.circle([lat, lng], {
              radius: r.radiusM,
              color: r.color || color,
              weight: 3,
              opacity: 0.9,
              fillOpacity: 0,
              dashArray: r.blockPlacement ? '8 4' : '6 8',
              interactive: false,
            }));
          }
        }
      } else if (legacySetback > 0) {
        group.addLayer(L.circle([lat, lng], {
          radius: legacySetback,
          color,
          weight: 3,
          opacity: 0.9,
          fillOpacity: 0,
          dashArray: '6 8',
          interactive: false,
        }));
      }
    }

    return () => { group.clearLayers(); };
  }, [pointFeatures, mode, map]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (groupRef.current) { groupRef.current.remove(); groupRef.current = null; } };
  }, []);

  return null;
}

// ── Native Leaflet turbine layer ──────────────────────────────────────────────
// All turbines as a single native LayerGroup — fast even at 200+
function NativeTurbineLayer({ layers, turbineTypes, selectedTurbineType, mode, selectedFeatureId,
  openTurbineMenu, setSelectedFeatureId, updateLayer, setExclusionWarning,
  turbines, cables, cableLayer, cableTypes, globalRadii,
  checkExclusionZones, checkTurbineRadii, haversineM, calcCableLoad, isZooming }) {
  const map = useMap();
  const groupRef = useRef(null);

  const turbineLayer = useMemo(() => layers.find(l => l.type === 'turbine'), [layers]);

  useEffect(() => {
    if (!groupRef.current) {
      groupRef.current = L.layerGroup().addTo(map);
    }
    const group = groupRef.current;
    group.clearLayers();

    if (!turbineLayer?.visible) return;

    for (const f of turbineLayer.features) {
      if (f.geometry?.type !== 'Point') continue;
      const [lng, lat] = f.geometry.coordinates;
      const tt = turbineTypes.find(t => t.id === f.properties.turbine_type_id) || selectedTurbineType;
      const isSelected = f.id === selectedFeatureId;
      const icon = turbineIcon(tt?.color || turbineLayer.color, isSelected);
      const marker = L.marker([lat, lng], { icon, draggable: mode === 'select' });

      marker.on('click', (e) => {
        if (mode === 'select') {
          L.DomEvent.stopPropagation(e);
          setSelectedFeatureId(f.id);
          openTurbineMenu(f);
        }
      });

      marker.on('dragend', (e) => {
        window.__trainingEvent__ = { type: 'turbine_moved', payload: { id: f.id }, ts: Date.now() };
        const newLatLng = e.target.getLatLng();
        const newCoords = [newLatLng.lng, newLatLng.lat];
        const exclusionHit = checkExclusionZones(newLatLng.lat, newLatLng.lng, layers);
        if (exclusionHit) {
          setExclusionWarning({ layerName: exclusionHit.layer.name, featureName: exclusionHit.feature.properties?.name || exclusionHit.layer.name });
          setTimeout(() => setExclusionWarning(null), 5000);
          const [origLng, origLat] = f.geometry.coordinates;
          marker.setLatLng([origLat, origLng]);
          return;
        }
        const otherTurbines = turbines.filter(t => t.id !== f.id);
        const radiiHit = checkTurbineRadii(newLatLng.lat, newLatLng.lng, otherTurbines, turbineTypes, globalRadii);
        if (radiiHit) {
          setExclusionWarning({ layerName: `${radiiHit.radiusLabel} separation zone`, featureName: radiiHit.turbineName, isRadii: true, radiusM: radiiHit.radiusM });
          setTimeout(() => setExclusionWarning(null), 5000);
          const [origLng, origLat] = f.geometry.coordinates;
          marker.setLatLng([origLat, origLng]);
          return;
        }
        updateLayer(turbineLayer.id, { features: turbineLayer.features.map(ft => ft.id === f.id ? { ...ft, geometry: { ...ft.geometry, coordinates: newCoords } } : ft) });
        if (cableLayer) {
          const updatedCables = cableLayer.features.map(cable => {
            const start = cable.properties.start_node, end = cable.properties.end_node;
            if (!start?.id && !end?.id) return cable;
            const isStart = start?.id === f.id, isEnd = end?.id === f.id;
            if (!isStart && !isEnd) return cable;
            const coords = cable.geometry.coordinates.map(([ln, la]) => [ln, la]);
            if (isStart) coords[0] = newCoords;
            if (isEnd) coords[coords.length - 1] = newCoords;
            let totalLen = 0;
            for (let i = 0; i < coords.length - 1; i++) totalLen += haversineM(coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
            const usedMw = calcCableLoad(cable.id, cables, turbines);
            const ct = cableTypes.find(t => t.id === cable.properties.cable_type_id) || cableTypes[0];
            const voltage = ct?.voltage_kv || 33;
            const usedA = ct ? +(usedMw * 1000 / (Math.sqrt(3) * voltage)).toFixed(0) : 0;
            let newCableTypeId = cable.properties.cable_type_id;
            if (usedMw > 0 && usedA > (ct?.ampacity_a || 0)) {
              const sorted = cableTypes.filter(c => c.voltage_kv === voltage).sort((a, b) => a.ampacity_a - b.ampacity_a);
              const suitable = sorted.find(c => Math.sqrt(3) * c.voltage_kv * c.ampacity_a / 1000 >= usedMw);
              if (suitable) newCableTypeId = suitable.id;
            }
            return { ...cable, geometry: { ...cable.geometry, coordinates: coords }, properties: { ...cable.properties, length_m: +totalLen.toFixed(0), cable_type_id: newCableTypeId } };
          });
          updateLayer(cableLayer.id, { features: updatedCables });
        }
      });

      group.addLayer(marker);
    }

    return () => { group.clearLayers(); };
  }, [turbines, selectedFeatureId, mode, turbineLayer, isZooming]);

  useEffect(() => {
    return () => { if (groupRef.current) { groupRef.current.remove(); groupRef.current = null; } };
  }, []);

  return null;
}

// ── Zoom tracker ──────────────────────────────────────────────────────────────
function ZoomTracker({ onZooming, onZoomed }) {
  useMapEvents({
    zoomstart() { onZooming(); },
    zoomend()   { onZoomed(); },
  });
  return null;
}

// ── Memoized polygon renderers (unchanged, these are fine) ────────────────────
const PolygonFeature = memo(function PolygonFeature({ f, layer, mode, editingPolygonId, setLayerTooltip, openPolygonMenu, insertPolygonVertex, updatePolygonVertices, polygonDragRef, onFinishPolygon, onFinishCable }) {
  const ring = f.geometry.coordinates[0];
  const positions = ring.slice(0, -1).map(([lng, lat]) => [lat, lng]);
  const isEditing = editingPolygonId === f.id;
  const polyColor = layer.color || '#06b6d4';
  const drawMode = ['place_turbine', 'draw_cable', 'draw_polygon', 'place_substation', 'place_point', 'place_text'].includes(mode);
  // Developable area / display-only layers should never intercept clicks
  const isDisplayOnly = !!layer._isDevelopableArea;
  const polyOpts = {
    color: polyColor, fillColor: polyColor,
    // In draw mode: keep polygon interactive so dblclick can fire, but use fillOpacity 0 so fill doesn't block clicks visually
    fillOpacity: drawMode ? 0 : layer.fillOpacity,
    weight: isEditing ? 2.5 : (layer.strokeWeight || 2),
    opacity: drawMode ? 0 : (layer.strokeOpacity || 0.9),
    dashArray: isEditing ? '6 4' : undefined,
    interactive: !isDisplayOnly,
  };
  const nonSelectMode = drawMode;

  const vIconCache = React.useRef({});
  const getVIcon = (color) => {
    if (!vIconCache.current[color]) {
      vIconCache.current[color] = L.divIcon({
        html: `<div style="width:10px;height:10px;background:#fff;border:2px solid ${color};border-radius:50%;cursor:move"></div>`,
        className: '', iconSize: [10, 10], iconAnchor: [5, 5],
      });
    }
    return vIconCache.current[color];
  };

  return (
    <React.Fragment>
      <Polygon positions={positions} pathOptions={polyOpts} bubblingMouseEvents={true}
        eventHandlers={{
          click: (e) => {
            if (drawMode) {
              // Let the click bubble up to the map's click handler
              return;
            }
            L.DomEvent.stopPropagation(e);
            if (isEditing) insertPolygonVertex(f.id, layer.id, e.latlng.lat, e.latlng.lng);
            else if (mode === 'select' || mode === 'pan') openPolygonMenu(f, layer.id);
          },
          dblclick: (e) => {
            if (drawMode) {
              L.DomEvent.stopPropagation(e);
              L.DomEvent.preventDefault(e);
              if (mode === 'draw_polygon') onFinishPolygon && onFinishPolygon();
              else if (mode === 'draw_cable') onFinishCable && onFinishCable();
            }
          },
          mousedown: (e) => {
            if (mode === 'select' && !isEditing) {
              L.DomEvent.stopPropagation(e);
              polygonDragRef.current = { id: f.id, lastLatlng: e.latlng };
            }
          },
          mousemove: (e) => {
            if (nonSelectMode) return;
            const container = e.target._map?.getContainer();
            const rect = container?.getBoundingClientRect();
            if (!rect) return;
            setLayerTooltip({ x: e.originalEvent.clientX - rect.left, y: e.originalEvent.clientY - rect.top, layerName: layer.name, featureName: f.properties?.name || '', description: f.properties?.designation || f.properties?.reason || f.properties?.zone || f.properties?.type || f.properties?.notes || '' });
          },
          mouseout: () => setLayerTooltip(null),
        }} />
      {isEditing && positions.map(([lat, lng], vi) => (
        <Marker key={`v-${f.id}-${vi}`} position={[lat, lng]} icon={getVIcon(polyColor)} draggable
          eventHandlers={{ dragend: (e) => { const np = positions.map(([la, ln], i) => i === vi ? [e.target.getLatLng().lat, e.target.getLatLng().lng] : [la, ln]); updatePolygonVertices(f.id, layer.id, np); } }} />
      ))}
    </React.Fragment>
  );
});

const MultiPolygonFeature = memo(function MultiPolygonFeature({ f, layer, mode, setLayerTooltip, openPolygonMenu }) {
  const polyColor = layer.color || '#06b6d4';
  const drawMode = ['place_turbine', 'draw_cable', 'draw_polygon', 'place_substation', 'place_point', 'place_text'].includes(mode);
  const isDisplayOnly = !!layer._isDevelopableArea;
  const po = { color: polyColor, fillColor: polyColor, fillOpacity: drawMode ? 0 : layer.fillOpacity, weight: layer.strokeWeight || 2, opacity: drawMode ? 0 : (layer.strokeOpacity || 0.9), interactive: !isDisplayOnly };
  return (
    <React.Fragment>
      {f.geometry.coordinates.map((poly, pi) => {
        const pos = poly.map(ring => ring.slice(0, -1).map(([x, y]) => [y, x]));
        return <Polygon key={`${f.id}-${pi}`} positions={pos} pathOptions={po} bubblingMouseEvents={true}
          eventHandlers={{
            click: (e) => { if (drawMode) return; L.DomEvent.stopPropagation(e); if (mode === 'select' || mode === 'pan') openPolygonMenu(f, layer.id); },
            mousemove: (e) => { if (drawMode) return; const c = e.target._map?.getContainer(); const r = c?.getBoundingClientRect(); if (!r) return; setLayerTooltip({ x: e.originalEvent.clientX - r.left, y: e.originalEvent.clientY - r.top, layerName: layer.name, featureName: f.properties?.name || '', description: f.properties?.designation || f.properties?.reason || '' }); },
            mouseout: () => setLayerTooltip(null),
          }} />;
      })}
    </React.Fragment>
  );
});

const CableFeature = memo(function CableFeature({ f, layer, mode, cableTypes, cables, turbines, setCableMenuFeature, setTurbineMenuFeature, setSubstationMenuFeature, setPolygonMenuFeature, setRightTab, isSelected }) {
  const ct = cableTypes.find((t) => t.id === f.properties.cable_type_id) || cableTypes[0];
  const positions = f.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  const usedMw = calcCableLoad(f.id, cables, turbines);
  const usedA = ct ? +(usedMw * 1000 / (Math.sqrt(3) * ct.voltage_kv)).toFixed(0) : 0;
  const overloaded = usedMw > 0 && usedA > (ct?.ampacity_a || 0);
  const nonSelectMode = ['place_turbine', 'draw_cable', 'draw_polygon', 'place_substation'].includes(mode);
  const visWeight = isSelected ? 5 : overloaded ? 4 : 3;
  const onClick = (e) => {
    if (nonSelectMode) return;
    L.DomEvent.stop(e);
    setCableMenuFeature(f);
    setTurbineMenuFeature(null);
    setSubstationMenuFeature(null);
    setPolygonMenuFeature(null);
    setRightTab('cables');
  };
  return (
    <React.Fragment>
      <Polyline positions={positions} pane="cablePane"
        pathOptions={{ color: isSelected ? '#38bdf8' : overloaded ? '#ef4444' : ct?.color || '#f97316', weight: visWeight, opacity: 0.9, dashArray: overloaded ? '8 4' : undefined }}
        bubblingMouseEvents={false} eventHandlers={{ click: onClick }} />
      <Polyline positions={positions} pane="cablePane"
        pathOptions={{ color: 'transparent', weight: 20, opacity: 0.001 }}
        bubblingMouseEvents={false} eventHandlers={{ click: onClick }} />
    </React.Fragment>
  );
});

// ── Main renderer ─────────────────────────────────────────────────────────────
export default function MapLayersRenderer({
  layers, mode, editingPolygonId, selectedFeatureId, cableMenuFeature,
  turbineTypes, selectedTurbineType, cableTypes,
  turbines, cables, substations, substationLayer, cableLayer,
  globalRadii, showRadii, showSubstations, drawingPoints, drawingSnapNodes, snapPreview,
  polygonDragRef, mapRef,
  setLayerTooltip, openPolygonMenu, insertPolygonVertex, updatePolygonVertices,
  setCableMenuFeature, setTurbineMenuFeature, setSubstationMenuFeature, setPolygonMenuFeature,
  setRightTab, openTurbineMenu, setSelectedFeatureId, updateLayer, setExclusionWarning,
  setPointMenuFeature, setPointMenuLayerId, setTextAnnotationMenu,
  haversineM, checkExclusionZones, checkTurbineRadii,
  onFinishPolygon, onFinishCable,
}) {
  const [isZooming, setIsZooming] = useState(false);

  return (
    <>
      <ZoomTracker onZooming={() => setIsZooming(true)} onZoomed={() => setIsZooming(false)} />

      {/* Native fast layers — always rendered, manage themselves */}
      <NativeTurbineLayer
        layers={layers} turbineTypes={turbineTypes} selectedTurbineType={selectedTurbineType}
        mode={mode} selectedFeatureId={selectedFeatureId} openTurbineMenu={openTurbineMenu}
        setSelectedFeatureId={setSelectedFeatureId} updateLayer={updateLayer}
        setExclusionWarning={setExclusionWarning} turbines={turbines} cables={cables}
        cableLayer={cableLayer} cableTypes={cableTypes} globalRadii={globalRadii}
        checkExclusionZones={checkExclusionZones} checkTurbineRadii={checkTurbineRadii}
        haversineM={haversineM} calcCableLoad={calcCableLoad} isZooming={isZooming} />

      <NativePointLayer
        layers={layers} mode={mode}
        setPointMenuFeature={setPointMenuFeature} setPointMenuLayerId={setPointMenuLayerId}
        setTurbineMenuFeature={setTurbineMenuFeature} setPolygonMenuFeature={setPolygonMenuFeature}
        setCableMenuFeature={setCableMenuFeature} setSubstationMenuFeature={setSubstationMenuFeature}
        updateLayer={updateLayer} />

      {/* React-Leaflet for polygons & cables (fewer features, fine to keep) */}
      {!isZooming && layers.map((layer) => {
        if (!layer.visible) return null;
        if (layer.type === 'wind_resource') return <WindResourceRenderer key={layer.id} layer={layer} />;
        if (['substation', 'turbine'].includes(layer.type)) return null;

        return layer.features.map((f) => {
          if (f.geometry.type === 'Polygon') {
            return (
              <PolygonFeature key={f.id} f={f} layer={layer} mode={mode}
                editingPolygonId={editingPolygonId} setLayerTooltip={setLayerTooltip}
                openPolygonMenu={openPolygonMenu} insertPolygonVertex={insertPolygonVertex}
                updatePolygonVertices={updatePolygonVertices} polygonDragRef={polygonDragRef}
                onFinishPolygon={onFinishPolygon} onFinishCable={onFinishCable} />
            );
          }
          if (f.geometry.type === 'MultiPolygon') {
            return <MultiPolygonFeature key={f.id} f={f} layer={layer} mode={mode} setLayerTooltip={setLayerTooltip} openPolygonMenu={openPolygonMenu} />;
          }
          if (f.geometry.type === 'LineString') {
            return (
              <CableFeature key={f.id} f={f} layer={layer} mode={mode}
                cableTypes={cableTypes} cables={cables} turbines={turbines}
                setCableMenuFeature={setCableMenuFeature} setTurbineMenuFeature={setTurbineMenuFeature}
                setSubstationMenuFeature={setSubstationMenuFeature} setPolygonMenuFeature={setPolygonMenuFeature}
                setRightTab={setRightTab} isSelected={cableMenuFeature?.id === f.id} />
            );
          }
          // Points handled by NativePointLayer above
          return null;
        });
      })}

      {/* Drawing preview */}
      {drawingPoints.length > 0 && (
        <>
          <Polyline positions={drawingPoints} pathOptions={{ color: mode === 'draw_cable' ? '#f97316' : '#06b6d4', weight: 2, dashArray: '5 5' }} />
          {drawingPoints.map((pt, i) => {
            const snap = drawingSnapNodes[i];
            const color = mode === 'draw_cable' ? (snap ? '#facc15' : '#f97316') : '#06b6d4';
            return <Circle key={i} center={pt} radius={snap ? 80 : 40} pathOptions={{ color, fillColor: color, fillOpacity: 0.9, weight: snap ? 2 : 0 }} />;
          })}
        </>
      )}
      {snapPreview && mode === 'draw_cable' && (
        <Circle center={[snapPreview.lat, snapPreview.lng]} radius={120}
          pathOptions={{ color: '#facc15', fillColor: '#facc15', fillOpacity: 0.25, weight: 2, dashArray: '4 3' }} />
      )}

      {/* Radii overlay */}
      <TurbineRadiiOverlay turbines={turbines} turbineTypes={turbineTypes} globalRadii={globalRadii} visible={showRadii} />

      {/* Text annotations */}
      <TextOverlay
        layers={layers} mode={mode}
        onSelect={(f, layerId) => {
          setTextAnnotationMenu({ feature: f, layerId });
          setTurbineMenuFeature(null); setPolygonMenuFeature(null);
          setCableMenuFeature(null); setSubstationMenuFeature(null);
        }}
        onDragEnd={(featureId, layerId, newLng, newLat) => {
          const layer = layers.find((l) => l.id === layerId);
          if (!layer) return;
          updateLayer(layerId, { features: layer.features.map((ft) => ft.id === featureId ? { ...ft, geometry: { ...ft.geometry, coordinates: [newLng, newLat] } } : ft) });
        }} />

      {/* Substations */}
      {showSubstations && substations.map((s) => (
        <SubstationMarker key={`sub-${s.id}`} s={s} mode={mode} cableLayer={cableLayer}
          cables={cables} turbines={turbines} substationLayer={substationLayer}
          cableTypes={cableTypes} haversineM={haversineM} calcCableLoad={calcCableLoad}
          calcSubstationLoad={calcSubstationLoad} updateLayer={updateLayer}
          setSubstationMenuFeature={setSubstationMenuFeature} setTurbineMenuFeature={setTurbineMenuFeature}
          setPolygonMenuFeature={setPolygonMenuFeature} layers={layers} />
      ))}
    </>
  );
}