import { exportProjectGeoJSON, exportProjectKMZ, downloadFile } from '@/lib/projectExport';
import { layersToGeoJSON, downloadJSON } from '@/lib/gisUtils';

export function createExportHandlers(projectName, layers, turbineTypes, cableTypes, windParams, mapRef) {
  return {
    onExportProject: () => {
      const geojson = exportProjectGeoJSON({ name: projectName, description: '', layers, turbineTypes, cableTypes, windParams });
      downloadFile(JSON.stringify(geojson, null, 2), `${projectName}-project.geojson`, 'application/json');
    },

    onExportGeoJSON: () => {
      downloadJSON(layersToGeoJSON(layers), `${projectName}.geojson`);
    },

    onExportKML: async () => {
      const kml = await exportProjectKMZ({ name: projectName, layers });
      downloadFile(kml, `${projectName}.kml`, 'application/vnd.google-earth.kml+xml');
    },

    onExportCSV: () => {
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
      const a = document.createElement('a'); 
      a.href = url; 
      a.download = `${projectName}.csv`; 
      a.click(); 
      URL.revokeObjectURL(url);
    },
  };
}