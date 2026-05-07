import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, BookOpen, Map, Wind, Trophy, Table2,
  Menu, X, ChevronRight, ChevronLeft, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/learn', label: 'Learn', icon: BookOpen },
  { path: '/planning', label: 'Planning Tool', icon: Map },
  { path: '/progress', label: 'Progress', icon: Trophy },
  { path: '/data', label: 'Data Tables', icon: Table2 },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: progressList } = useQuery({
    queryKey: ['userProgress'],
    queryFn: () => base44.entities.UserProgress.list(),
    initialData: [],
  });

  const progress = progressList[0] || { xp: 0, level: 1 };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[25] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-30 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        sidebarCollapsed ? "lg:w-14" : "w-64"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-4 border-b border-slate-800 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
            <Wind className="w-4 h-4 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-tight">GIS Wind Trainer</p>
              <p className="text-[10px] text-slate-500">Renewable Energy Training</p>
            </div>
          )}
          <button
            className="lg:hidden text-slate-400 hover:text-white ml-auto"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
          <button
            className="hidden lg:flex text-slate-500 hover:text-white ml-auto shrink-0"
            onClick={() => setSidebarCollapsed(v => !v)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* XP Bar */}
        {!sidebarCollapsed && (
          <div className="px-4 py-3 border-b border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400">Level {progress.level}</span>
              <span className="text-emerald-400 font-medium">{progress.xp} XP</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, ((progress.xp % 200) / 200) * 100)}%` }}
              />
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="px-2 py-3 border-b border-slate-800 flex justify-center">
            <span className="text-[10px] text-emerald-400 font-bold">L{progress.level}</span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={() => setSidebarOpen(false)}
              title={sidebarCollapsed ? label : undefined}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm transition-all group",
                sidebarCollapsed ? "justify-center" : "",
                isActive
                  ? "bg-emerald-500/15 text-emerald-400 font-medium"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1">{label}</span>
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        {user && (
          <div className="px-3 py-3 border-t border-slate-800">
            {sidebarCollapsed ? (
              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-xs font-bold text-white">
                  {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.full_name || 'Learner'}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800 relative z-10">
          <button
            onClick={(e) => { e.stopPropagation(); setSidebarOpen(true); }}
            className="text-slate-400 hover:text-white p-1"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-sm">GIS Wind Trainer</span>
          </div>
          <div className="ml-auto text-xs text-emerald-400 font-medium">Lv.{progress.level}</div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}