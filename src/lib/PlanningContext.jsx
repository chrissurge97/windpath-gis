import React, { createContext, useState, useContext, useRef, useCallback } from 'react';
import { saveProject } from '@/components/planning/ProjectManager';

const PlanningContext = createContext();

/**
 * PlanningContext keeps the FULL live project state in memory.
 * Planning.jsx calls updateProjectState() on every meaningful change,
 * which debounces a server-side save via the Base44 entities SDK.
 */
export function PlanningProvider({ children }) {
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const saveTimer = useRef(null);

  // Debounced server persist — handles temp IDs by creating and promoting to real ID
  const persistProject = useCallback((id, data) => {
    if (!id || id === '__demo__') return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        // For temp IDs (imported projects not yet saved), always create new
        const isTemp = typeof id === 'string' && id.startsWith('__imported_');
        const savedId = await saveProject(isTemp ? null : id, data);
        // If a new record was created (temp or first save), promote to the real ID
        if (savedId && savedId !== id) {
          setCurrentProjectId(savedId);
          setCurrentProject(prev => prev ? { ...prev, id: savedId } : prev);
        }
      } catch (err) {
        console.warn('Auto-save failed:', err);
      }
    }, 1500);
  }, []);

  const switchProject = useCallback((id, projectData) => {
    setCurrentProjectId(id);
    setCurrentProject(projectData);
  }, []);

  /**
   * Called by Planning.jsx on every meaningful state change.
   * Keeps the in-memory snapshot fresh AND debounces a server save.
   */
  const updateProjectState = useCallback((patch) => {
    setCurrentProject(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      persistProject(patch._id || prev.id || patch.id, next);
      return next;
    });
  }, [persistProject]);

  const clearProject = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setCurrentProjectId(null);
    setCurrentProject(null);
  }, []);

  return (
    <PlanningContext.Provider value={{
      currentProjectId,
      currentProject,
      switchProject,
      updateProjectState,
      clearProject,
    }}>
      {children}
    </PlanningContext.Provider>
  );
}

export function usePlanningProject() {
  const context = useContext(PlanningContext);
  if (!context) throw new Error('usePlanningProject must be used within PlanningProvider');
  return context;
}