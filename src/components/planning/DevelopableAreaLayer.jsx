/**
 * DevelopableAreaLayer
 *
 * Renders the computed developable area as a semi-transparent polygon on the Leaflet map.
 * The area is Ireland's bounding box minus all blocking exclusion zones and turbine radii.
 */
import React, { useMemo } from 'react';
import { Polygon } from 'react-leaflet';
import { computeDevelopableArea } from '@/lib/developableArea';

export default function DevelopableAreaLayer({ layers, turbineTypes, globalRadii, color = '#22d3ee', fillOpacity = 0.12 }) {
  // Build a lightweight fingerprint so we only recompute when relevant things change
  const fingerprint = layers.map(l =>
    `${l.id}:${l.visible}:${l.no_turbines}:${l.features.length}:` +
    l.features.map(f => {
      const p = f.properties || {};
      return `${f.id}:${f.geometry?.type}:${JSON.stringify(f.geometry?.coordinates)}:${p.no_turbines}:${p.setback_m}:${JSON.stringify(p.radii)}`;
    }).join('|')
  ).join(';;') + '::' + JSON.stringify(globalRadii);

  const geometry = useMemo(
    () => computeDevelopableArea(layers, turbineTypes, globalRadii),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fingerprint, turbineTypes]
  );

  if (!geometry) return null;

  const pathOptions = {
    color,
    fillColor: color,
    fillOpacity,
    weight: 1.5,
    opacity: 0.6,
    dashArray: '6 4',
  };

  // Convert GeoJSON [lng,lat] coordinates to Leaflet [lat,lng]
  function toLeaflet(ring) {
    return ring.map(([lng, lat]) => [lat, lng]);
  }

  if (geometry.type === 'Polygon') {
    const positions = geometry.coordinates.map(toLeaflet);
    return <Polygon positions={positions} pathOptions={pathOptions} interactive={false} />;
  }

  if (geometry.type === 'MultiPolygon') {
    return (
      <>
        {geometry.coordinates.map((poly, i) => {
          const positions = poly.map(toLeaflet);
          return <Polygon key={i} positions={positions} pathOptions={pathOptions} interactive={false} />;
        })}
      </>
    );
  }

  return null;
}