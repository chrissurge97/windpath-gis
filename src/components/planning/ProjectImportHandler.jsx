import { importProjectGeoJSON } from '@/lib/projectExport';

/**
 * Handle project file imports (GeoJSON, etc)
 */
export function setupProjectImport(onProjectLoaded) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.geojson,.json,.kml,.kmz';
  
  input.onchange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        
        // Check if it's a Base44 project file
        if (data.properties?.format === 'base44-wind-farm-project') {
          const project = importProjectGeoJSON(data);
          onProjectLoaded(project);
          return;
        }

        alert('Invalid project file. Ensure you exported it using the "Project (GeoJSON)" export option.');
      } catch (err) {
        console.error('Import error:', err);
        alert('Failed to import file. Must be a valid JSON/GeoJSON project file.');
      }
    };
    reader.readAsText(file);
  };

  return input;
}