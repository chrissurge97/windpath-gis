/**
 * Renders turbine separation radii circles on the Leaflet map.
 * Each radius is a multiple of the rotor diameter (D).
 * Radii with `blockPlacement` set will prevent turbines/substations being placed inside them.
 */
import React from 'react';
import { Circle } from 'react-leaflet';

// Default radius presets (D multiples)
export const DEFAULT_TURBINE_RADII = [
  { id: 'r3d',  dMultiple: 3,  label: '3D',  color: '#facc15', enabled: false, blockPlacement: false },
  { id: 'r5d',  dMultiple: 5,  label: '5D',  color: '#f97316', enabled: false, blockPlacement: false },
  { id: 'r7d',  dMultiple: 7,  label: '7D',  color: '#ef4444', enabled: false, blockPlacement: false },
];

export function getRadiusMetres(rotorDiameterM, dMultiple) {
  return (rotorDiameterM * dMultiple) / 2;
}

/**
 * Check if a lat/lng falls inside any blocking turbine radius of any placed turbine.
 * Returns { turbineName, radiusLabel, radiusM } or null.
 */
export function checkTurbineRadii(lat, lng, turbines, turbineTypes, allRadii) {
  if (!allRadii || allRadii.length === 0) return null;

  for (const turbine of turbines) {
    const [tLng, tLat] = turbine.geometry.coordinates;
    const tt = turbineTypes.find(t => t.id === turbine.properties.turbine_type_id) || turbineTypes[0];
    const rotorD = tt?.rotor_diameter_m || 130;

    const radii = turbine.properties.radii || allRadii;

    for (const r of radii) {
      if (!r.enabled || !r.blockPlacement) continue;
      const radiusM = getRadiusMetres(rotorD, r.dMultiple);
      const distM = haversineM(tLat, tLng, lat, lng);
      if (distM < radiusM) {
        return {
          turbineName: turbine.properties.name || 'Turbine',
          radiusLabel: r.label,
          radiusM: Math.round(radiusM),
        };
      }
    }
  }
  return null;
}

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function TurbineRadiiOverlay({ turbines, turbineTypes, globalRadii, visible = true }) {
  if (!visible || !turbines || turbines.length === 0) return null;

  return (
    <>
      {turbines.map(turbine => {
        const [lng, lat] = turbine.geometry.coordinates;
        const tt = turbineTypes.find(t => t.id === turbine.properties.turbine_type_id) || turbineTypes[0];
        const rotorD = tt?.rotor_diameter_m || 130;
        const radii = turbine.properties.radii || globalRadii || [];

        return radii
          .filter(r => r.enabled)
          .map(r => {
            const radiusM = getRadiusMetres(rotorD, r.dMultiple);
            return (
              <Circle
                key={`${turbine.id}-${r.id}`}
                center={[lat, lng]}
                radius={radiusM}
                pathOptions={{
                  color: r.color,
                  fillColor: r.color,
                  fillOpacity: 0,
                  weight: 2,
                  dashArray: r.blockPlacement ? '6 3' : '4 6',
                  opacity: 0.8,
                }}
              />
            );
          });
      })}
    </>
  );
}