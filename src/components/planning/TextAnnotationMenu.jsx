import React, { useState, useEffect } from 'react';
import { X, Trash2, Type } from 'lucide-react';
import { cn } from '@/lib/utils';

const FONT_OPTIONS = ['sans-serif', 'serif', 'monospace', 'Arial', 'Georgia', 'Verdana'];
const COLOR_PRESETS = ['#ffffff', '#facc15', '#10b981', '#06b6d4', '#f97316', '#ef4444', '#a855f7', '#64748b', '#000000'];

export default function TextAnnotationMenu({ feature, layers, onApply, onDelete, onClose }) {
  const p = feature?.properties || {};
  const [text, setText] = useState(p.text || '');
  const [color, setColor] = useState(p.color || '#ffffff');
  const [fontSize, setFontSize] = useState(p.fontSize || 14);
  const [fontFamily, setFontFamily] = useState(p.fontFamily || 'sans-serif');
  const [layerId, setLayerId] = useState(p.layerId || layers[0]?.id || '');

  useEffect(() => {
    if (feature) {
      setText(p.text || '');
      setColor(p.color || '#ffffff');
      setFontSize(p.fontSize || 14);
      setFontFamily(p.fontFamily || 'sans-serif');
      setLayerId(p.layerId || layers[0]?.id || '');
    }
  }, [feature?.id]);

  const eligibleLayers = layers.filter(l => !['cable'].includes(l.type));

  return (
    <div className="absolute top-14 left-4 z-[1200] bg-slate-900 border border-purple-500/40 rounded-xl shadow-2xl p-4 w-72">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-purple-400 uppercase tracking-wider font-medium flex items-center gap-1">
          <Type className="w-3 h-3" /> Text Annotation
        </span>
        <button onClick={onClose} className="text-slate-500 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Text content */}
      <div className="mb-3">
        <label className="text-[10px] text-slate-400 block mb-1">Text</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={2}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-white outline-none focus:border-purple-500/60 resize-none"
          placeholder="Enter annotation text…"
        />
      </div>

      {/* Color */}
      <div className="mb-3">
        <label className="text-[10px] text-slate-400 block mb-1">Text Colour</label>
        <div className="flex items-center gap-2 flex-wrap">
          {COLOR_PRESETS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn('w-5 h-5 rounded-full border-2 transition-all', color === c ? 'border-white scale-110' : 'border-slate-600')}
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
            title="Custom colour"
          />
        </div>
      </div>

      {/* Font family */}
      <div className="mb-3">
        <label className="text-[10px] text-slate-400 block mb-1">Font</label>
        <select
          value={fontFamily}
          onChange={e => setFontFamily(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 outline-none"
        >
          {FONT_OPTIONS.map(f => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
          ))}
        </select>
      </div>

      {/* Font size */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] mb-1">
          <label className="text-slate-400">Font Size</label>
          <span className="text-purple-400 font-medium">{fontSize}px</span>
        </div>
        <input
          type="range" min={10} max={48} value={fontSize}
          onChange={e => setFontSize(+e.target.value)}
          className="w-full accent-purple-500 h-1"
        />
      </div>

      {/* Layer assignment */}
      <div className="mb-4">
        <label className="text-[10px] text-slate-400 block mb-1">Assign to Layer (for visibility toggle)</label>
        <select
          value={layerId}
          onChange={e => setLayerId(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 outline-none"
        >
          {eligibleLayers.map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      {/* Preview */}
      <div className="mb-3 bg-slate-800 rounded-lg p-3 text-center min-h-[36px]">
        <span style={{ color, fontFamily, fontSize: Math.min(fontSize, 24) + 'px', fontWeight: 600 }}>
          {text || 'Preview text'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onApply({ text, color, fontSize, fontFamily, layerId })}
          disabled={!text.trim()}
          className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
        >
          Apply
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}