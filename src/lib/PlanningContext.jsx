import React, { createContext, useState, useContext, useRef, useCallback } from 'react';
import { saveProject } from '@/components/planning/ProjectManager';

const PlanningContext = createContext();

/**
 * PlanningContext keeps the FULL live project state in memory.
 * Any page can read currentProject and get up-to-date data without
 * re-reading localStorage. Planning.jsx calls updateProjectState()
 * whenever layers / turbineTypes / cableTypes / windParams change,
 * which also debounces a localStorage write.
 */
export function PlanningProvider({ children }) {
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const saveTimer = useRef(null);

  // Debounced persist – avoids hammering localStorage on every keystroke
  const persistProject = useCallback((id, data) => {
    if (!id || id === '__demo__') return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveProject(id, data);
    }, 600);
  }, []);

  const switchProject = useCallback((id, projectData) => {
    setCurrentProjectId(id);
    setCurrentProject(projectData);
  }, []);

  /**
   * Called by Planning.jsx on every meaningful state change.
   * Keeps the in-memory snapshot fresh AND persists to localStorage.
   */
  const updateProjectState = useCallback((patch) => {
    setCurrentProject(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      persistProject(patch._id || prev.id, next);
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