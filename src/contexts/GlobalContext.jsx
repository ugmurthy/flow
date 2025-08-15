import React, { createContext, useContext, useState } from 'react';

// Create the GlobalContext
const GlobalContext = createContext();

// Custom hook to use the GlobalContext
export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobal must be used within a GlobalProvider');
  }
  return context;
};

// GlobalProvider component
export const GlobalProvider = ({ children }) => {
  const [executeWorkflow, setExecuteWorkflow] = useState(true);

  const toggleExecuteWorkflow = () => {
    setExecuteWorkflow(prev => !prev);
  };

  const value = {
    executeWorkflow,
    setExecuteWorkflow,
    toggleExecuteWorkflow
  };

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalContext;