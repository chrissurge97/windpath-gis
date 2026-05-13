import React, { useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Trash2, X } from 'lucide-react';
import { checkExclusionZones } from '@/lib/geoUtils';

export default function SubstationMarker({
  s,
  mode,
  cableLayer,
  cables,
  turbines,
  substationLayer,
  layers,
  cableTypes,
  haversineM,
  calcCableLoad,
  calcSubstationLoad,
  updateLayer,
  setSubstationMenuFeature,
  setTurbineMenuFeature,
  setPolygonMenuFeature,
}) {
  const [exclusionWarning, setExclusionWarning] = useState(null);
  const [lng, lat] = s.geometry.coordinates;
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
      draggable={mode === 'select'}
      eventHandlers={{
        click: (e) => {
          if (mode === 'select') { 
            L.DomEvent.stopPropagation(e); 
            setSubstationMenuFeature(s); 
            setTurbineMenuFeature(null); 
            setPolygonMenuFeature(null); 
          }
        },
        dragend: (e) => {
          const newLatLng = e.target.getLatLng();
          const newCoords = [newLatLng.lng, newLatLng.lat];
          if (!substationLayer) return;
          // Check exclusion zones
          const exclusionHit = checkExclusionZones(newLatLng.lat, newLatLng.lng, layers);
          if (exclusionHit) {
            setExclusionWarning({ layerName: exclusionHit.layer.name, featureName: exclusionHit.feature.properties?.name || exclusionHit.layer.name });
            setTimeout(() => setExclusionWarning(null), 5000);
            return; // Don't allow the move
          }
          // Update substation
          updateLayer(substationLayer.id, {
            features: substationLayer.features.map(f =>
              f.id === s.id ? { ...f, geometry: { ...f.geometry, coordinates: newCoords } } : f
            )
          });
          // Update connected cables endpoints and lengths
          if (cableLayer) {
            updateLayer(cableLayer.id, {
              features: cableLayer.features.map(cable => {
                const start = cable.properties.start_node;
                const end = cable.properties.end_node;
                if (!start?.id && !end?.id) return cable;
                const isStart = start?.id === s.id;
                const isEnd = end?.id === s.id;
                if (!isStart && !isEnd) return cable;
                const coords = cable.geometry.coordinates.map(([l,t]) => [l,t]);
                if (isStart) coords[0] = newCoords;
                if (isEnd) coords[coords.length - 1] = newCoords;
                let totalLen = 0;
                for (let i = 0; i < coords.length - 1; i++) {
                  totalLen += haversineM(coords[i][1], coords[i][0], coords[i+1][1], coords[i+1][0]);
                }
                return { ...cable, geometry: { ...cable.geometry, coordinates: coords }, properties: { ...cable.properties, length_m: +totalLen.toFixed(0) } };
              })
            });
          }
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
      {exclusionWarning && (
        <div style={{
          position: 'fixed',
          top: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1600,
          pointerEvents: 'none'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'start',
            gap: '12px',
            backgroundColor: 'rgba(127, 29, 29, 0.95)',
            border: '1px solid rgba(239, 68, 68, 0.7)',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            maxWidth: '400px'
          }}>
            <div style={{ color: '#f87171', fontSize: '18px', marginTop: '2px' }}>⛔</div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#fca5a5', marginBottom: '4px' }}>Substation Cannot Be Moved</p>
              <p style={{ fontSize: '12px', color: '#f87171', marginBottom: '4px' }}>
                <span style={{ fontWeight: 'bold', color: '#fef2f2' }}>{exclusionWarning.featureName}</span> is in a restricted zone <span style={{ color: '#dc2626' }}>({exclusionWarning.layerName})</span>.
              </p>
              <p style={{ fontSize: '11px', color: '#dc2626' }}>Move the substation outside this constraint zone.</p>
            </div>
          </div>
        </div>
      )}
    </Marker>
  );
}