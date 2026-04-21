import React, { useState } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';

const FIELD_TYPES = ['string', 'number', 'boolean'];

export default function SchemaEditor({ layer, onUpdate }) {
  const [newKey, setNewKey] = useState('');
  const [newType, setNewType] = useState('string');

  if (!layer) return null;

  const addField = () => {
    const key = newKey.trim().replace(/\s+/g, '_').toLowerCase();
    if (!key || layer.schema.find(s => s.key === key)) return;
    onUpdate(layer.id, {
      schema: [...layer.schema, { key, label: newKey.trim(), type: newType }]
    });
    setNewKey('');
  };

  const removeField = (key) => {
    onUpdate(layer.id, { schema: layer.schema.filter(s => s.key !== key) });
  };

  const updateField = (key, field, value) => {
    onUpdate(layer.id, {
      schema: layer.schema.map(s => s.key === key ? { ...s, [field]: value } : s)
    });
  };

  return (
    <div className="space-y-2 p-3 border-t border-slate-800">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <Tag className="w-3 h-3" /> Attributes
      </p>

      {layer.schema.map(field => (
        <div key={field.key} className="flex items-center gap-1.5">
          <input
            value={field.label}
            onChange={e => updateField(field.key, 'label', e.target.value)}
            className="flex-1 text-[11px] bg-slate-800 text-white rounded px-2 py-1 outline-none border border-slate-700 focus:border-slate-500"
          />
          <select
            value={field.type}
            onChange={e => updateField(field.key, 'type', e.target.value)}
            className="text-[11px] bg-slate-800 text-slate-300 rounded px-1 py-1 border border-slate-700 outline-none"
          >
            {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => removeField(field.key)} className="text-slate-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}

      <div className="flex gap-1.5">
        <input
          value={newKey}
          onChange={e => setNewKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addField()}
          placeholder="field name"
          className="flex-1 text-[11px] bg-slate-800 text-white rounded px-2 py-1 outline-none border border-slate-700 focus:border-slate-500 placeholder:text-slate-600"
        />
        <select
          value={newType}
          onChange={e => setNewType(e.target.value)}
          className="text-[11px] bg-slate-800 text-slate-300 rounded px-1 py-1 border border-slate-700 outline-none"
        >
          {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={addField} className="p-1 text-emerald-400 hover:text-emerald-300">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}