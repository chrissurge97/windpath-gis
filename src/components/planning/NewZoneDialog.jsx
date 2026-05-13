import React, { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = ['#06b6d4', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#10b981', '#06b6d4', '#3b82f6'];

export default function NewZoneDialog({ onClose, onCreate }) {
  const [name, setName] = useState('New Zone');
  const [color, setColor] = useState('#8b5cf6');

  const handleCreate = () => {
    if (name.trim()) {
      onCreate({ name: name.trim(), color });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-96">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Create New Zone</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Zone Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate();
              }}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/60"
              placeholder="Enter zone name"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-2">Zone Color</label>
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-full h-10 rounded-lg border-2 transition-all",
                    color === c ? "border-white shadow-lg" : "border-slate-600 hover:border-slate-500"
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Create Zone
          </button>
        </div>
      </div>
    </div>
  );
}