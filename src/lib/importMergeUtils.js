/**
 * Merge imported layers into existing app layers.
 * Typed layers (turbine, cable, substation) are merged into existing matching layers.
 * Non-typed layers are added as new layers.
 */
export function mergeImportedLayers(currentLayers, importedLayers) {
  let next = [...currentLayers];
  
  for (const imp of importedLayers) {
    const existingTypedLayer = next.find(
      l => l.type === imp.type && ['turbine', 'cable', 'substation'].includes(l.type)
    );
    
    if (existingTypedLayer) {
      // Merge features into existing typed layer
      existingTypedLayer.features = [...existingTypedLayer.features, ...imp.features];
    } else {
      // Add as new layer if no matching typed layer exists
      next = [...next, imp];
    }
  }
  
  return next;
}