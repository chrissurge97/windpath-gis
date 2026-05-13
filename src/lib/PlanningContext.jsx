import React, { createContext, useState, useContext } from 'react';

const PlanningContext = createContext();

export function PlanningProvider({ children }) {
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);

  const switchProject = (id, projectData) => {
    setCurrentProjectId(id);
    setCurrentProject(projectData);
  };

  const clearProject = () => {
    setCurrentProjectId(null);
    setCurrentProject(null);
  };

  return (
    <PlanningContext.Provider value={{ currentProjectId, currentProject, switchProject, clearProject }}>
      {children}
    </PlanningContext.Provider>
  );
}

export function usePlanningProject() {
  const context = useContext(PlanningContext);
  if (!context) {
    throw new Error('usePlanningProject must be used within PlanningProvider');
  }
  return context;
}