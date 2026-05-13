import React from 'react';
import ConfigMenu from './ConfigMenu';

export default function ConfigMenuWrapper({ isOpen, onClose, features, onFeatureToggle, onTurbineAdded, onCableAdded }) {
  return (
    <ConfigMenu
      isOpen={isOpen}
      onClose={onClose}
      features={features}
      onFeatureToggle={onFeatureToggle}
      onTurbineAdded={onTurbineAdded}
      onCableAdded={onCableAdded}
    />
  );
}