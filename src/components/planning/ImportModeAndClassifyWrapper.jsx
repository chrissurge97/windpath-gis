import React, { useState } from 'react';
import ImportClassificationModeModal from './ImportClassificationModeModal';
import ImportClassifyModal from './ImportClassifyModal';

/**
 * Wrapper that handles the classification flow:
 * - If onAuto is provided, show mode choice first
 * - Otherwise, go straight to manual classification
 */
export default function ImportModeAndClassifyWrapper({
  layers,
  onConfirm,
  onClose,
  showModeChoice = true,
}) {
  const [step, setStep] = useState(showModeChoice ? 'mode' : 'classify'); // 'mode' | 'classify'

  if (step === 'mode' && showModeChoice) {
    return (
      <ImportClassificationModeModal
        onAuto={() => {
          // Auto mode: use geometry-based auto-classification and confirm
          const autoClassified = layers.map(layer => ({
            layer,
            classification: getAutoClassification(layer),
          }));
          onConfirm(autoClassified);
          onClose();
        }}
        onManual={() => {
          // Manual mode: proceed to classification modal
          setStep('classify');
        }}
        onClose={onClose}
      />
    );
  }

  // Always show classification modal when explicitly triggered
  return (
    <ImportClassifyModal
      layers={layers}
      onConfirm={onConfirm}
      onClose={() => {
        if (showModeChoice) {
          setStep('mode'); // Go back to mode selection
        } else {
          onClose();
        }
      }}
    />
  );
}

/**
 * Auto-classify layers based on feature geometry
 */
function getAutoClassification(layer) {
  if (layer.type === 'turbine' || layer.type === 'cable' || layer.type === 'substation') {
    return layer.type;
  }
  // Check feature geometry
  const features = layer.features || [];
  if (features.length === 0) return 'keep';
  const firstType = features[0].geometry?.type;
  if (firstType === 'Point') return 'turbine';
  if (firstType === 'LineString' || firstType === 'MultiLineString') return 'cable';
  if (firstType === 'Polygon' || firstType === 'MultiPolygon') return 'polygon';
  return 'keep';
}