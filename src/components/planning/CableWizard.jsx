import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

const CUSTOM_CABLES_KEY = 'custom_cable_types';

function generateId() {
  return `cable_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function loadCustomCables() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_CABLES_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCustomCables(cables) {
  localStorage.setItem(CUSTOM_CABLES_KEY, JSON.stringify(cables));
}

export function addCustomCable(cable) {
  const cables = loadCustomCables();
  const newCable = {
    id: generateId(),
    ...cable,
    isCustom: true,
  };
  cables.push(newCable);
  saveCustomCables(cables);
  return newCable;
}

export default function CableWizard({ onClose, onAdd }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    voltage_kv: 33,
    ampacity_a: 300,
    cost_per_m: 150,
    color: '#f97316',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step < 2) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    const newCable = addCustomCable(formData);
    onAdd(newCable);
    onClose();
  };

  const capacityMva = Math.sqrt(3) * formData.voltage_kv * formData.ampacity_a / 1000;

  return (
    <div className="fixed inset-0 z-[3100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[500px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0">
          <span className="text-sm font-semibold text-white">Add Cable Type — Step {step}/2</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Cable Specifications</h3>
              {[
                { label: 'Cable Name', key: 'name', type: 'text' },
                { label: 'Voltage (kV)', key: 'voltage_kv', type: 'number', step: 1 },
                { label: 'Ampacity (A)', key: 'ampacity_a', type: 'number', step: 10 },
                { label: 'Cost per Meter (€)', key: 'cost_per_m', type: 'number', step: 1 },
              ].map(({ label, key, type, step: stepVal }) => (
                <div key={key}>
                  <label className="text-xs text-slate-400 block mb-1.5">{label}</label>
                  <input
                    type={type}
                    step={stepVal}
                    value={formData[key]}
                    onChange={e => handleChange(key, type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                    placeholder={label}
                  />
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Appearance</h3>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Cable Color</label>
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

              {/* Preview */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 space-y-2">
                <p className="text-xs text-slate-400 mb-3">Preview</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Name:</span>
                    <span className="text-sm text-white font-medium">{formData.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Voltage:</span>
                    <span className="text-sm text-cyan-400 font-medium">{formData.voltage_kv} kV</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Capacity:</span>
                    <span className="text-sm text-emerald-400 font-medium">{formData.ampacity_a}A / {capacityMva.toFixed(1)} MVA</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Cost:</span>
                    <span className="text-sm text-yellow-400 font-medium">€{formData.cost_per_m}/m</span>
                  </div>
                  <div className="pt-2 border-t border-slate-700 flex items-center gap-2">
                    <div className="h-2 w-6 rounded" style={{ backgroundColor: formData.color }} />
                    <span className="text-xs text-slate-400">{formData.color}</span>
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
          {step < 2 ? (
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
              Add Cable
            </button>
          )}
        </div>
      </div>
    </div>
  );
}