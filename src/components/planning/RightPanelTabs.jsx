import React, { useEffect } from 'react';
import { Wind, Zap, BarChart2, Layers, Settings, Table } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RightPanelTabs({ 
  rightTab, 
  setRightTab, 
  features, 
  highlights,
  rightPanelOpen,
  onDataTables,
}) {
  // Reset tab if Analysis is disabled but selected
  useEffect(() => {
    if (!features.windAnalysis && rightTab === 'analysis') {
      setRightTab('turbines');
    }
  }, [features.windAnalysis, rightTab, setRightTab]);

  const RIGHT_TABS = [
    { id: 'turbines', label: 'Turbines', icon: Wind },
    { id: 'cables', label: 'Cables', icon: Zap },
    ...(features.windAnalysis ? [{ id: 'analysis', label: 'Analysis', icon: BarChart2 }] : []),
    { id: 'layers', label: 'Layers', icon: Layers },
  ];

  if (!rightPanelOpen) return null;

  return (
    <div className="flex border-b border-slate-800 shrink-0 overflow-x-auto">
      {RIGHT_TABS.map(({ id, label, icon: TabIcon }) => (
        <button key={id} onClick={() => setRightTab(id)}
          className={cn("flex-1 flex items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors whitespace-nowrap px-1 shrink-0",
            rightTab === id ? "text-white border-b-2 border-emerald-500" : "text-slate-500 hover:text-slate-300",
            highlights.includes(`tab-${id}`) && "ring-1 ring-amber-400 ring-inset animate-pulse bg-amber-500/10"
          )}
        >
          <TabIcon className="w-3 h-3 shrink-0" /> {label}
        </button>
      ))}
      {onDataTables && (
        <button onClick={onDataTables}
          className="flex items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors whitespace-nowrap px-1.5 shrink-0 text-slate-500 hover:text-slate-300 border-l border-slate-800"
          title="Data Tables"
        >
          <Table className="w-3 h-3 shrink-0" />
        </button>
      )}
    </div>
  );
}