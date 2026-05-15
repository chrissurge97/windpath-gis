import React, { useState } from 'react';
import { X, Settings, Sliders, Wind, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import TurbineWizard from './TurbineWizard';
import CableWizard from './CableWizard';

export default function ConfigMenu({ 
  isOpen, 
  onClose, 
  features, 
  onFeatureToggle, 
  onTurbineAdded, 
  onCableAdded 
}) {
  const [tab, setTab] = useState('features');
  const [showTurbineWizard, setShowTurbineWizard] = useState(false);
  const [showCableWizard, setShowCableWizard] = useState(false);

  if (!isOpen) return null;

  const FEATURE_LIST = [
    { id: 'windAnalysis', label: 'Wind Analysis', description: 'Enable wind speed distribution and Weibull parameters' },
    { id: 'irelandMapLock', label: 'Ireland Map Lock', description: 'Restrict map boundaries to Ireland' },
    { id: 'importClassifier', label: 'Import Classifier', description: 'Show classification modal when importing files with point or line features (classify as turbines or cables)', beta: true },
  ];

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-white">App Configuration</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 shrink-0 px-2">
          {[
            { id: 'features', label: 'Features', icon: Sliders },
            { id: 'turbines', label: 'Turbine Library', icon: Wind },
            { id: 'cables', label: 'Cable Library', icon: Zap },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2',
                tab === id
                  ? 'text-white border-purple-500'
                  : 'text-slate-500 hover:text-slate-300 border-transparent'
              )}
            >
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Features Tab */}
          {tab === 'features' && (
            <div className="space-y-3">
              {FEATURE_LIST.map(({ id, label, description, beta }) => (
                <div
                  key={id}
                  className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{label}</p>
                      {beta && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">BETA</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{description}</p>
                  </div>
                  <button
                    onClick={() => onFeatureToggle(id)}
                    className={cn(
                      'relative w-10 h-6 rounded-full transition-colors',
                      features[id]
                        ? 'bg-purple-600'
                        : 'bg-slate-600'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform',
                        features[id] && 'translate-x-4'
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Turbines Tab */}
          {tab === 'turbines' && (
            <div className="space-y-3">
              <button
                onClick={() => setShowTurbineWizard(true)}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                + Add Custom Turbine Type
              </button>
              {showTurbineWizard && (
                <TurbineWizard
                  onClose={() => setShowTurbineWizard(false)}
                  onAdd={onTurbineAdded}
                />
              )}
              <p className="text-xs text-slate-500">
                Add custom turbine models to your project library. They'll be saved and available in all projects.
              </p>
            </div>
          )}

          {/* Cables Tab */}
          {tab === 'cables' && (
            <div className="space-y-3">
              <button
                onClick={() => setShowCableWizard(true)}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                + Add Custom Cable Type
              </button>
              {showCableWizard && (
                <CableWizard
                  onClose={() => setShowCableWizard(false)}
                  onAdd={onCableAdded}
                />
              )}
              <p className="text-xs text-slate-500">
                Add custom cable specifications to your library. They'll be available in all projects.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3.5 border-t border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}