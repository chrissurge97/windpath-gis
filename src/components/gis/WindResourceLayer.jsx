import React from 'react';
import { Circle, Polygon } from 'react-leaflet';

// Renders a wind resource layer as a grid of colored circles
// Each feature in a wind_resource layer has:
//   geometry: { type: 'Point', center: [lat, lng], coordinates: [lng, lat] }
//   properties: { wind_speed_ms: number }
function speedToColor(speed) {
  // 4 m/s = blue, 8 m/s = green, 12 m/s = yellow, 16+ m/s = red
  if (speed < 5) return '#1d4ed8';
  if (speed < 7) return '#06b6d4';
  if (speed < 9) return '#10b981';
  if (speed < 11) return '#f59e0b';
  if (speed < 13) return '#f97316';
  return '#ef4444';
}

export default function WindResourceRenderer({ layer }) {
  if (!layer.visible) return null;

  return layer.features.map((f, i) => {
    if (f.geometry.type === 'Point') {
      const [lng, lat] = f.geometry.coordinates;
      const speed = f.properties?.wind_speed_ms || 7;
      const color = speedToColor(speed);
      return (
        <Circle
          key={f.id || i}
          center={[lat, lng]}
          radius={f.properties?.cell_radius_m || 5000}
          pathOptions={{ color, fillColor: color, fillOpacity: layer.fillOpacity, weight: 0, opacity: 0 }}
        />
      );
    }
    if (f.geometry.type === 'Polygon') {
      const speed = f.properties?.wind_speed_ms || 7;
      const color = speedToColor(speed);
      const positions = f.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
      return (
        <Polygon
          key={f.id || i}
          positions={positions}
          pathOptions={{ color, fillColor: color, fillOpacity: layer.fillOpacity, weight: 0 }}
        />
      );
    }
    return null;
  });
}