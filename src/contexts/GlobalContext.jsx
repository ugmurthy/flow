import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

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
  const callbacksRef = useRef(new Set());

  // Register callback for executeWorkflow state changes
  const registerExecuteWorkflowCallback = useCallback((callback) => {
    console.log(`<core> GlobalContext: registerExecuteWorkflowCallback called, total callbacks will be: ${callbacksRef.current.size + 1}`);
    callbacksRef.current.add(callback);
    console.log(`<core> GlobalContext: Callback registered successfully, total callbacks: ${callbacksRef.current.size}`);
    
    return () => {
      console.log(`<core> GlobalContext: Unregistering callback, total callbacks will be: ${callbacksRef.current.size - 1}`);
      callbacksRef.current.delete(callback);
    };
  }, []);

  // Enhanced setExecuteWorkflow with callback notifications
  const setExecuteWorkflowEnhanced = useCallback((newValue) => {
    // Handle functional updates
    const resolvedNewValue = typeof newValue === 'function' ? newValue(executeWorkflow) : newValue;
    const prevValue = executeWorkflow;
    
    console.log(`<core> GlobalContext: setExecuteWorkflowEnhanced called: ${prevValue} → ${resolvedNewValue} (type: ${typeof newValue})`);
    console.log(`<core> GlobalContext: Number of registered callbacks: ${callbacksRef.current.size}`);
    
    setExecuteWorkflow(resolvedNewValue);

    // Notify all registered callbacks of state change
    if (prevValue !== resolvedNewValue) {
      console.log(`<core> GlobalContext: executeWorkflow changed: ${prevValue} → ${resolvedNewValue}`);
      console.log(`<core> GlobalContext: Notifying ${callbacksRef.current.size} callbacks...`);
      
      callbacksRef.current.forEach((callback, index) => {
        try {
          console.log(`<core> GlobalContext: Calling callback ${Array.from(callbacksRef.current).indexOf(callback) + 1}...`);
          callback(resolvedNewValue, prevValue);
          console.log(`<core> GlobalContext: Callback ${Array.from(callbacksRef.current).indexOf(callback) + 1} completed successfully`);
        } catch (error) {
          console.error(`<core> GlobalContext: Callback ${Array.from(callbacksRef.current).indexOf(callback) + 1} error:`, error);
        }
      });
      
      console.log(`<core> GlobalContext: All callbacks notified`);
    } else {
      console.log(`<core> GlobalContext: No change in executeWorkflow value, skipping callbacks`);
    }
  }, [executeWorkflow]);

  const toggleExecuteWorkflow = useCallback(() => {
    console.log(`<core> GlobalContext: toggleExecuteWorkflow called, current value: ${executeWorkflow}`);
    const newValue = !executeWorkflow;
    console.log(`<core> GlobalContext: toggle - prev value: ${executeWorkflow}, new value: ${newValue}`);
    setExecuteWorkflowEnhanced(newValue);
  }, [setExecuteWorkflowEnhanced, executeWorkflow]);

  const value = {
    executeWorkflow,
    setExecuteWorkflow: setExecuteWorkflowEnhanced,
    toggleExecuteWorkflow,
    registerExecuteWorkflowCallback,
  };

  return (
    <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>
  );
};

export default GlobalContext;