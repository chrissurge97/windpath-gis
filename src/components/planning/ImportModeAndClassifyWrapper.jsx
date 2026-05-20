import React, { useState } from 'react';
import ImportClassificationModeModal from './ImportClassificationModeModal';
import ImportClassifyModal from './ImportClassifyModal';

/**
 * Wrapper that handles the two-step import flow:
 * 1. Show mode choice (auto vs manual)
 * 2. Show classification modal (if manual mode chosen)
 */
export default function ImportModeAndClassifyWrapper({
  layers,
  onConfirm,
  onClose,
}) {
  const [step, setStep] = useState('mode'); // 'mode' | 'classify'

  if (step === 'mode') {
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

  if (step === 'classify') {
    return (
      <ImportClassifyModal
        layers={layers}
        onConfirm={onConfirm}
        onClose={() => {
          setStep('mode'); // Go back to mode selection
        }}
      />
    );
  }

  return null;
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