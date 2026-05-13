import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const CUSTOM_TURBINES_KEY = 'custom_turbine_types';

function generateId() {
  return `turbine_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function loadCustomTurbines() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_TURBINES_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCustomTurbines(turbines) {
  localStorage.setItem(CUSTOM_TURBINES_KEY, JSON.stringify(turbines));
}

export function addCustomTurbine(turbine) {
  const turbines = loadCustomTurbines();
  const newTurbine = {
    id: generateId(),
    ...turbine,
    isCustom: true,
  };
  turbines.push(newTurbine);
  saveCustomTurbines(turbines);
  return newTurbine;
}

export default function TurbineWizard({ onClose, onAdd }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    manufacturer: '',
    model: '',
    rated_power_mw: 3.5,
    rotor_diameter_m: 120,
    hub_height_m: 90,
    cut_in_ms: 3,
    cut_out_ms: 25,
    color: '#10b981',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    const newTurbine = addCustomTurbine(formData);
    onAdd(newTurbine);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[3100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[500px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0">
          <span className="text-sm font-semibold text-white">Add Turbine Type — Step {step}/3</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Basic Information</h3>
              {[
                { label: 'Manufacturer', key: 'manufacturer', type: 'text' },
                { label: 'Model', key: 'model', type: 'text' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-xs text-slate-400 block mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={formData[key]}
                    onChange={e => handleChange(key, e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                    placeholder={label}
                  />
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Specifications</h3>
              {[
                { label: 'Rated Power (MW)', key: 'rated_power_mw', type: 'number', step: 0.1 },
                { label: 'Rotor Diameter (m)', key: 'rotor_diameter_m', type: 'number', step: 1 },
                { label: 'Hub Height (m)', key: 'hub_height_m', type: 'number', step: 1 },
                { label: 'Cut-in Wind Speed (m/s)', key: 'cut_in_ms', type: 'number', step: 0.1 },
                { label: 'Cut-out Wind Speed (m/s)', key: 'cut_out_ms', type: 'number', step: 0.1 },
              ].map(({ label, key, type, step: stepVal }) => (
                <div key={key}>
                  <label className="text-xs text-slate-400 block mb-1.5">{label}</label>
                  <input
                    type={type}
                    step={stepVal}
                    value={formData[key]}
                    onChange={e => handleChange(key, parseFloat(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                  />
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Appearance</h3>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Icon Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={e => handleChange('color', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer border border-slate-600"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={e => handleChange('color', e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-3">Preview</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white"
                    style={{ backgroundColor: formData.color }}
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{formData.manufacturer} {formData.model}</p>
                    <p className="text-xs text-slate-500">{formData.rated_power_mw} MW · Ø{formData.rotor_diameter_m}m</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 shrink-0">
          <button
            onClick={handlePrev}
            disabled={step === 1}
            className="flex items-center gap-1 px-3 py-2 text-xs text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          {step < 3 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded transition-colors"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded transition-colors"
            >
              Add Turbine
            </button>
          )}
        </div>
      </div>
    </div>
  );
}