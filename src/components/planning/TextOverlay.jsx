import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMap, useMapEvents } from 'react-leaflet';

// Renders text annotations as fixed-pixel-size CSS divs positioned over the map.
// Uses a portal into a custom overlay div so text size never scales with zoom.
export default function TextOverlay({ layers, mode, onSelect, onDragEnd }) {
  const map = useMap();
  const [, setTick] = useState(0);
  const containerRef = useRef(null);

  // Create a full-size overlay div inside the map container (above map, pointer-events passthrough by default)
  useEffect(() => {
    const mapContainer = map.getContainer();
    const div = document.createElement('div');
    div.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:600;overflow:hidden;';
    div.className = 'text-overlay-root';
    mapContainer.appendChild(div);
    containerRef.current = div;
    return () => { mapContainer.removeChild(div); };
  }, [map]);

  // Re-render whenever the map moves/zooms
  useMapEvents({
    move: () => setTick(t => t + 1),
    zoom: () => setTick(t => t + 1),
  });

  if (!containerRef.current) return null;

  const textFeatures = [];
  for (const layer of layers) {
    if (!layer.visible) continue;
    for (const f of layer.features) {
      if (f.geometry.type === 'Point' && f.properties._featureType === 'text') {
        textFeatures.push({ f, layer });
      }
    }
  }

  return createPortal(
    <>
      {textFeatures.map(({ f, layer }) => {
        const [lng, lat] = f.geometry.coordinates;
        const pt = map.latLngToContainerPoint([lat, lng]);
        return (
          <TextLabel
            key={f.id}
            f={f}
            layer={layer}
            x={pt.x}
            y={pt.y}
            mode={mode}
            map={map}
            onSelect={onSelect}
            onDragEnd={onDragEnd}
          />
        );
      })}
    </>,
    containerRef.current
  );
}

function TextLabel({ f, layer, x, y, mode, map, onSelect, onDragEnd }) {
  const dragging = useRef(false);
  const dragStart = useRef(null);
  const divRef = useRef(null);
  const { text = '', color = '#fff', fontSize = 14, fontFamily = 'sans-serif' } = f.properties;
  const isSelect = mode === 'select';

  const handleMouseDown = (e) => {
    if (!isSelect) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, origX: x, origY: y };
    map.dragging.disable();

    const onMove = (me) => {
      if (!dragging.current || !divRef.current) return;
      const dx = me.clientX - dragStart.current.x;
      const dy = me.clientY - dragStart.current.y;
      divRef.current.style.transform = `translate(${dragStart.current.origX + dx}px, ${dragStart.current.origY + dy}px)`;
    };
    const onUp = (me) => {
      if (!dragging.current) return;
      dragging.current = false;
      map.dragging.enable();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      const dx = me.clientX - dragStart.current.x;
      const dy = me.clientY - dragStart.current.y;
      const newPt = map.containerPointToLatLng([dragStart.current.origX + dx, dragStart.current.origY + dy]);
      onDragEnd(f.id, layer.id, newPt.lng, newPt.lat);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleClick = (e) => {
    if (!isSelect || dragging.current) return;
    e.stopPropagation();
    onSelect(f, layer.id);
  };

  return (
    <div
      ref={divRef}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: `translate(${x}px, ${y}px)`,
        whiteSpace: 'nowrap',
        fontFamily,
        fontSize: `${fontSize}px`,
        color,
        fontWeight: 600,
        lineHeight: 1,
        textShadow: '0 1px 4px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.8)',
        cursor: isSelect ? 'move' : 'default',
        pointerEvents: 'auto',
        userSelect: 'none',
        transformOrigin: 'left center',
        padding: '2px 0',
      }}
    >
      {text}
    </div>
  );
}