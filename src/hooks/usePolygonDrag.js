import { useEffect, useRef } from 'react';

export function usePolygonDrag(draggingPolygonId, dragStartLatlng, setDraggingPolygonId, setDragStartLatlng, layers, updateLayer, mapRef) {
  const layersRef = useRef(layers);
  const updateLayerRef = useRef(updateLayer);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    updateLayerRef.current = updateLayer;
  }, [updateLayer]);

  useEffect(() => {
    if (!draggingPolygonId || !dragStartLatlng || !mapRef.current) return;

    const map = mapRef.current;
    const onMouseMove = (e) => {
      if (!draggingPolygonId || !dragStartLatlng) return;
      
      let foundLayer = null;
      let foundFeature = null;
      for (const layer of layersRef.current) {
        const feature = layer.features.find(f => f.id === draggingPolygonId);
        if (feature) {
          foundLayer = layer;
          foundFeature = feature;
          break;
        }
      }
      if (!foundLayer || !foundFeature || foundFeature.geometry.type !== 'Polygon') return;

      const currentLatlng = map.mouseEventToLatLng(e.originalEvent);
      const deltaLat = currentLatlng.lat - dragStartLatlng.lat;
      const deltaLng = currentLatlng.lng - dragStartLatlng.lng;

      const ring = foundFeature.geometry.coordinates[0];
      const newRing = ring.map(([lng, lat]) => [lng + deltaLng, lat + deltaLat]);
      updateLayerRef.current(foundLayer.id, {
        features: foundLayer.features.map(f =>
          f.id === draggingPolygonId
            ? { ...f, geometry: { ...f.geometry, coordinates: [newRing] } }
            : f
        )
      });

      setDragStartLatlng(currentLatlng);
    };

    const onMouseUp = () => {
      setDraggingPolygonId(null);
      setDragStartLatlng(null);
    };

    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);

    return () => {
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
    };
  }, [draggingPolygonId, dragStartLatlng, mapRef, setDraggingPolygonId, setDragStartLatlng]);
}