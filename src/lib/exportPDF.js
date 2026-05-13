import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ── Colour helpers ──────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function setFill(doc, hex) { const [r, g, b] = hexToRgb(hex || '#000000'); doc.setFillColor(r, g, b); }
function setTextColor(doc, hex) { const [r, g, b] = hexToRgb(hex || '#000000'); doc.setTextColor(r, g, b); }
function setDrawColor(doc, hex) { const [r, g, b] = hexToRgb(hex || '#000000'); doc.setDrawColor(r, g, b); }

// ── Mini bar chart ───────────────────────────────────────────────────────────
function drawBarChart(doc, x, y, w, h, data, label) {
  const max = Math.max(...data.map(d => d.e), 1);
  const barW = (w - 2) / data.length;
  setTextColor(doc, '#94a3b8');
  doc.setFontSize(7);
  doc.text(label, x, y - 1);
  setDrawColor(doc, '#334155');
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h);
  data.forEach((d, i) => {
    const bh = (d.e / max) * (h - 2);
    const bx = x + 1 + i * barW;
    const by = y + h - 1 - bh;
    setFill(doc, '#10b981');
    doc.rect(bx, by, barW - 0.5, bh, 'F');
    if (i % 2 === 0) {
      setTextColor(doc, '#64748b');
      doc.setFontSize(5.5);
      doc.text(d.m, bx + barW / 2, y + h + 2.5, { align: 'center' });
    }
  });
}

// ── Map page (A0 landscape) ──────────────────────────────────────────────────
async function addMapPage(doc, mapEl, layers, projectName) {
  // A0 landscape: 1189 x 841 mm
  doc.addPage('a0', 'landscape');
  const PW = 1189;
  const PH = 841;
  const MARGIN = 20;
  const LEGEND_W = 120;

  // Dark background
  setFill(doc, '#0f172a');
  doc.rect(0, 0, PW, PH, 'F');

  // Header band
  setFill(doc, '#1e293b');
  doc.rect(0, 0, PW, 28, 'F');
  setFill(doc, '#10b981');
  doc.rect(0, 26, PW, 2, 'F');

  setTextColor(doc, '#ffffff');
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(projectName || 'Wind Farm Project', MARGIN, 17);

  setTextColor(doc, '#64748b');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Site Drawing — Planning Layout', MARGIN, 24);

  setTextColor(doc, '#10b981');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('EagleView Academy', PW - MARGIN, 17, { align: 'right' });

  // Map image area
  const mapX = MARGIN;
  const mapY = 34;
  const mapW = PW - MARGIN * 2 - LEGEND_W - 8;
  const mapH = PH - mapY - MARGIN;

  // Capture map using html2canvas
  if (mapEl) {
    try {
      // Scroll the map container to top-left before capture to avoid offset issues
      const rect = mapEl.getBoundingClientRect();
      const canvas = await html2canvas(mapEl, {
        useCORS: true,
        allowTaint: true,
        scale: 3.5,
        backgroundColor: '#0f172a',
        logging: false,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        width: mapEl.offsetWidth,
        height: mapEl.offsetHeight,
      });
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', mapX, mapY, mapW, mapH);
    } catch (e) {
      // fallback: grey placeholder
      setFill(doc, '#1e293b');
      doc.rect(mapX, mapY, mapW, mapH, 'F');
      setTextColor(doc, '#475569');
      doc.setFontSize(12);
      doc.text('Map capture unavailable', mapX + mapW / 2, mapY + mapH / 2, { align: 'center' });
    }
  }

  // Map border
  setDrawColor(doc, '#334155');
  doc.setLineWidth(0.5);
  doc.rect(mapX, mapY, mapW, mapH);

  // ── Legend panel ────────────────────────────────────────────────────────────
  const legX = PW - MARGIN - LEGEND_W;
  const legY = mapY;
  const legH = mapH;

  setFill(doc, '#1e293b');
  doc.roundedRect(legX, legY, LEGEND_W, legH, 3, 3, 'F');
  setDrawColor(doc, '#334155');
  doc.setLineWidth(0.3);
  doc.roundedRect(legX, legY, LEGEND_W, legH, 3, 3);

  setFill(doc, '#10b981');
  doc.rect(legX, legY, LEGEND_W, 10, 'F');
  setTextColor(doc, '#ffffff');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('MAP LEGEND', legX + LEGEND_W / 2, legY + 7, { align: 'center' });

  let ly = legY + 16;

  const legLine = (label, color, symbol = 'rect') => {
    if (ly > legY + legH - 10) return;
    setFill(doc, color);
    if (symbol === 'circle') {
      doc.circle(legX + 8, ly - 1.5, 3, 'F');
    } else if (symbol === 'line') {
      setDrawColor(doc, color);
      doc.setLineWidth(1.2);
      doc.line(legX + 5, ly - 1.5, legX + 13, ly - 1.5);
    } else {
      doc.rect(legX + 5, ly - 4, 8, 5, 'F');
    }
    setTextColor(doc, '#cbd5e1');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(label, LEGEND_W - 20);
    doc.text(lines, legX + 16, ly);
    ly += Math.max(8, lines.length * 5);
  };

  // Fixed infrastructure items — only if those layer types exist and are visible
  const visibleTypes = new Set((layers || []).filter(l => l.visible).map(l => l.type));
  if (visibleTypes.has('turbine')) legLine('Turbine', '#10b981', 'circle');
  if (visibleTypes.has('cable')) {
    const cableLayer = (layers || []).find(l => l.type === 'cable' && l.visible);
    legLine('Cable', cableLayer?.color || '#f97316', 'line');
  }
  if (visibleTypes.has('substation')) legLine('Substation', '#facc15', 'rect');

  // Visible polygon layers only — one entry per layer (not per feature)
  const polyLayers = (layers || []).filter(l =>
    l.visible &&
    !['turbine', 'cable', 'substation', 'wind_resource'].includes(l.type) &&
    l.features?.some(f => f.geometry?.type === 'Polygon')
  );

  if (polyLayers.length > 0) {
    ly += 3;
    setDrawColor(doc, '#334155');
    doc.setLineWidth(0.3);
    doc.line(legX + 4, ly - 1, legX + LEGEND_W - 4, ly - 1);
    setTextColor(doc, '#64748b');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('ZONES / POLYGONS', legX + LEGEND_W / 2, ly + 3, { align: 'center' });
    ly += 8;

    for (const layer of polyLayers) {
      legLine(layer.name, layer.color || '#06b6d4', 'rect');
    }
  }

  // North arrow (simple)
  const naX = mapX + mapW - 14;
  const naY = mapY + mapH - 22;
  setFill(doc, '#ffffff');
  doc.circle(naX, naY, 8, 'F');
  setFill(doc, '#0f172a');
  doc.circle(naX, naY, 7, 'F');
  setTextColor(doc, '#ffffff');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('N', naX, naY - 1, { align: 'center' });
  setFill(doc, '#ffffff');
  doc.triangle(naX, naY - 5, naX - 2.5, naY + 1, naX + 2.5, naY + 1, 'F');

  // Scale note
  setTextColor(doc, '#64748b');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Scale: Not to scale — indicative planning layout only', mapX + 4, mapY + mapH - 3);

  // Footer
  const footerY = PH - 5;
  setTextColor(doc, '#475569');
  doc.setFontSize(7);
  doc.text(`Drawing produced: ${new Date().toLocaleDateString('en-IE', { dateStyle: 'long' })}   |   EagleView Academy Wind Farm Planning Tool   |   For indicative purposes only`, PW / 2, footerY, { align: 'center' });
}

// ── Compute wind farm bounding box from turbines + substations ───────────────
function getWindFarmBounds(turbines, substations) {
  const points = [
    ...turbines.map(t => ({ lat: t.geometry.coordinates[1], lng: t.geometry.coordinates[0] })),
    ...substations.map(s => ({ lat: s.geometry.coordinates[1], lng: s.geometry.coordinates[0] })),
  ];
  if (points.length === 0) return null;
  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  return {
    minLat: Math.min(...lats), maxLat: Math.max(...lats),
    minLng: Math.min(...lngs), maxLng: Math.max(...lngs),
  };
}

// ── Main export function ─────────────────────────────────────────────────────
export async function exportProjectPDF({
  projectName,
  turbines,
  turbineTypes,
  cables,
  cableTypes,
  substations,
  totalCapacity_mw,
  totalAEP,
  avgCapFactor,
  avgWindSpeed,
  totalCableLength,
  totalCableCost,
  windParams,
  monthlyData,
  layers,
  mapEl,
  mapRef,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = 210; // page width
  const PH = 297; // page height
  const ML = 15;  // margin left
  const MR = 15;  // margin right
  const CW = PW - ML - MR; // content width
  let y = 0;

  // ── Header band ────────────────────────────────────────────────────────────
  setFill(doc, '#0f172a');
  doc.rect(0, 0, PW, 42, 'F');

  // Accent stripe
  setFill(doc, '#10b981');
  doc.rect(0, 38, PW, 4, 'F');

  // Title
  setTextColor(doc, '#ffffff');
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(projectName || 'Wind Farm Project', ML, 18);

  setTextColor(doc, '#94a3b8');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Wind Farm Planning Summary Report', ML, 26);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IE', { dateStyle: 'long' })}`, ML, 32);

  // EagleView badge top-right
  setTextColor(doc, '#10b981');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('EagleView Academy', PW - MR, 20, { align: 'right' });
  setTextColor(doc, '#64748b');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Wind Farm Planning Tool', PW - MR, 26, { align: 'right' });

  y = 52;

  // ── KPI tiles ──────────────────────────────────────────────────────────────
  const kpis = [
    { label: 'Turbines', value: String(turbines.length), color: '#10b981' },
    { label: 'Installed Capacity', value: `${totalCapacity_mw.toFixed(1)} MW`, color: '#06b6d4' },
    { label: 'Est. Net AEP', value: totalAEP > 0 ? `${(totalAEP / 1000).toFixed(2)} GWh/yr` : '—', color: '#8b5cf6' },
    { label: 'Capacity Factor', value: totalAEP > 0 ? `${avgCapFactor}%` : '—', color: '#f97316' },
    { label: 'Avg Hub Wind', value: avgWindSpeed ? `${avgWindSpeed} m/s` : '—', color: '#f59e0b' },
    { label: 'Cable Cost Est.', value: totalCableCost > 0 ? `£${(totalCableCost / 1000).toFixed(0)}k` : '—', color: '#ef4444' },
  ];

  const tileW = CW / 3;
  const tileH = 20;
  kpis.forEach((k, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const tx = ML + col * tileW;
    const ty = y + row * (tileH + 2);

    setFill(doc, '#1e293b');
    doc.roundedRect(tx, ty, tileW - 2, tileH, 2, 2, 'F');

    // Accent left bar
    setFill(doc, k.color);
    doc.rect(tx, ty, 2, tileH, 'F');

    setTextColor(doc, k.color);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(k.value, tx + 6, ty + 9);

    setTextColor(doc, '#64748b');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(k.label, tx + 6, ty + 16);
  });

  y += 2 * (tileH + 2) + 8;

  // ── Section: Wind Parameters ───────────────────────────────────────────────
  const sectionHeader = (title) => {
    setFill(doc, '#1e293b');
    doc.rect(ML, y, CW, 7, 'F');
    setFill(doc, '#10b981');
    doc.rect(ML, y, 2, 7, 'F');
    setTextColor(doc, '#e2e8f0');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(title, ML + 5, y + 4.8);
    y += 10;
  };

  sectionHeader('WIND RESOURCE PARAMETERS');

  const windRows = [
    ['Weibull Shape (k)', windParams.k.toFixed(1), 'Distribution shape factor'],
    ['Weibull Scale (λ)', `${windParams.lambda.toFixed(1)} m/s`, 'Scale parameter'],
    ['Mean Hub Wind Speed', avgWindSpeed ? `${avgWindSpeed} m/s` : '—', 'Average across all turbines'],
  ];

  windRows.forEach(([label, value, note], i) => {
    if (i % 2 === 0) { setFill(doc, '#0f172a'); doc.rect(ML, y, CW, 6, 'F'); }
    setTextColor(doc, '#94a3b8');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(label, ML + 3, y + 4.2);
    setTextColor(doc, '#e2e8f0');
    doc.setFont('helvetica', 'bold');
    doc.text(value, ML + 65, y + 4.2);
    setTextColor(doc, '#475569');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(note, ML + 100, y + 4.2);
    y += 6;
  });

  y += 4;

  // ── Monthly bar chart ──────────────────────────────────────────────────────
  if (monthlyData && monthlyData.some(d => d.e > 0)) {
    sectionHeader('MONTHLY ENERGY PROFILE');
    drawBarChart(doc, ML, y, CW, 28, monthlyData, '');
    y += 38;
  }

  // ── Section: Turbine Schedule ──────────────────────────────────────────────
  sectionHeader('TURBINE SCHEDULE');

  // Table header
  const cols = [
    { label: 'Name', x: ML + 2, w: 20 },
    { label: 'Type', x: ML + 24, w: 45 },
    { label: 'Rated MW', x: ML + 71, w: 20 },
    { label: 'Hub Wind', x: ML + 93, w: 22 },
    { label: 'Est. AEP (MWh)', x: ML + 117, w: 32 },
    { label: 'Elev (m)', x: ML + 151, w: 20 },
  ];

  setFill(doc, '#0f172a');
  doc.rect(ML, y, CW, 6, 'F');
  cols.forEach(c => {
    setTextColor(doc, '#64748b');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(c.label, c.x, y + 4.2);
  });
  y += 6;

  const maxRows = Math.min(turbines.length, 20); // cap at 20 turbines to fit page
  turbines.slice(0, maxRows).forEach((t, i) => {
    const p = t.properties;
    const tt = turbineTypes.find(ty => ty.id === p.turbine_type_id);
    if (i % 2 === 1) { setFill(doc, '#1a2332'); doc.rect(ML, y, CW, 6, 'F'); }
    const rowData = [
      { c: cols[0], v: p.name || `T${i + 1}`, color: '#e2e8f0' },
      { c: cols[1], v: tt ? `${tt.manufacturer} ${tt.model}` : '—', color: '#94a3b8' },
      { c: cols[2], v: `${p.rated_power_mw || tt?.rated_power_mw || '—'}`, color: '#06b6d4' },
      { c: cols[3], v: p.hub_wind_speed ? `${p.hub_wind_speed} m/s` : '—', color: '#10b981' },
      { c: cols[4], v: p.aep_mwh ? p.aep_mwh.toLocaleString() : '—', color: '#8b5cf6' },
      { c: cols[5], v: p.elevation_m != null ? String(p.elevation_m) : '—', color: '#94a3b8' },
    ];
    rowData.forEach(({ c, v, color }) => {
      setTextColor(doc, color);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(String(v), c.x, y + 4.2);
    });
    y += 6;
  });

  if (turbines.length > maxRows) {
    setTextColor(doc, '#64748b');
    doc.setFontSize(7);
    doc.text(`… and ${turbines.length - maxRows} more turbines`, ML + 3, y + 4);
    y += 7;
  }

  y += 5;

  // ── Section: Cable Summary ─────────────────────────────────────────────────
  if (cables.length > 0) {
    // Check if we need a new page
    if (y > PH - 60) { doc.addPage(); y = 20; }

    sectionHeader('CABLE SUMMARY');

    const cableCols = [
      { label: 'Name', x: ML + 2, w: 28 },
      { label: 'Type', x: ML + 32, w: 40 },
      { label: 'Length (km)', x: ML + 74, w: 28 },
      { label: 'Voltage (kV)', x: ML + 104, w: 28 },
      { label: 'Cost (£)', x: ML + 134, w: 28 },
    ];

    setFill(doc, '#0f172a');
    doc.rect(ML, y, CW, 6, 'F');
    cableCols.forEach(c => {
      setTextColor(doc, '#64748b');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(c.label, c.x, y + 4.2);
    });
    y += 6;

    const maxCables = Math.min(cables.length, 15);
    cables.slice(0, maxCables).forEach((c, i) => {
      const p = c.properties;
      const ct = cableTypes.find(t => t.id === p.cable_type_id) || cableTypes[0];
      const cost = (p.length_m || 0) * (ct?.cost_per_m || 0);
      if (i % 2 === 1) { setFill(doc, '#1a2332'); doc.rect(ML, y, CW, 6, 'F'); }
      const rowData = [
        { c: cableCols[0], v: p.name || `Cable ${i + 1}`, color: '#e2e8f0' },
        { c: cableCols[1], v: ct?.name || '—', color: '#94a3b8' },
        { c: cableCols[2], v: ((p.length_m || 0) / 1000).toFixed(2), color: '#f97316' },
        { c: cableCols[3], v: String(ct?.voltage_kv || '—'), color: '#8b5cf6' },
        { c: cableCols[4], v: `£${cost.toFixed(0)}`, color: '#f59e0b' },
      ];
      rowData.forEach(({ c: col, v, color }) => {
        setTextColor(doc, color);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text(String(v), col.x, y + 4.2);
      });
      y += 6;
    });

    if (cables.length > maxCables) {
      setTextColor(doc, '#64748b');
      doc.setFontSize(7);
      doc.text(`… and ${cables.length - maxCables} more cables`, ML + 3, y + 4);
      y += 7;
    }

    // Totals row
    y += 2;
    setFill(doc, '#1e293b');
    doc.rect(ML, y, CW, 7, 'F');
    setTextColor(doc, '#94a3b8');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${cables.length} cables`, ML + 3, y + 4.8);
    setTextColor(doc, '#f97316');
    doc.text(`${(totalCableLength / 1000).toFixed(2)} km`, ML + 74, y + 4.8);
    setTextColor(doc, '#f59e0b');
    doc.text(`£${(totalCableCost / 1000).toFixed(0)}k`, ML + 134, y + 4.8);
    y += 10;
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const footerY = PH - 12;
  setFill(doc, '#0f172a');
  doc.rect(0, footerY - 4, PW, 16, 'F');
  setFill(doc, '#10b981');
  doc.rect(0, footerY - 4, PW, 1, 'F');
  setTextColor(doc, '#475569');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('EagleView Academy — Wind Farm Planning Tool', ML, footerY + 2);
  doc.text('Estimates only. Not for use in formal planning submissions.', PW - MR, footerY + 2, { align: 'right' });

  // ── Map drawing page: zoom map to wind farm area first ─────────────────────
  const map = mapRef?.current;
  let originalCenter = null;
  let originalZoom = null;

  if (map && turbines.length > 0) {
    originalCenter = map.getCenter();
    originalZoom = map.getZoom();

    const bounds = getWindFarmBounds(turbines, substations);
    if (bounds) {
      // Add ~15% buffer around the wind farm
      const latBuf = (bounds.maxLat - bounds.minLat) * 0.20 + 0.003;
      const lngBuf = (bounds.maxLng - bounds.minLng) * 0.20 + 0.004;
      const L = await import('leaflet').then(m => m.default || m);
      const fitBounds = L.latLngBounds(
        [bounds.minLat - latBuf, bounds.minLng - lngBuf],
        [bounds.maxLat + latBuf, bounds.maxLng + lngBuf]
      );
      map.fitBounds(fitBounds, { animate: false, padding: [0, 0] });
      // Wait for tiles to settle
      await new Promise(r => setTimeout(r, 900));
    }
  }

  await addMapPage(doc, mapEl, layers, projectName);

  // Restore original map view
  if (map && originalCenter !== null) {
    map.setView(originalCenter, originalZoom, { animate: false });
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  const safeName = (projectName || 'wind-farm').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  doc.save(`${safeName}-report.pdf`);
}