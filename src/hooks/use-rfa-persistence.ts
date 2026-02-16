import { useState, useEffect, useCallback } from 'react';

interface RFAData {
  admissions: string[];
  definitions: string[];
  isGenerated: boolean;
  lastUpdated: number;
}

interface RFAPersistenceHook {
  admissions: string[];
  definitions: string[];
  isGenerated: boolean;
  saveAdmissions: (admissions: string[]) => void;
  saveDefinitions: (definitions: string[]) => void;
  setGenerated: (generated: boolean) => void;
  clearData: () => void;
  hasPersistedData: boolean;
}

export const useRFAPersistence = (caseId?: string): RFAPersistenceHook => {
  const [admissions, setAdmissions] = useState<string[]>([]);
  const [definitions, setDefinitions] = useState<string[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);
  const [hasPersistedData, setHasPersistedData] = useState(false);

  // Create a unique key for this case
  const storageKey = caseId ? `rfa_data_${caseId}` : 'rfa_data_default';

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsed: RFAData = JSON.parse(savedData);
        
        // Check if data is not too old (24 hours)
        const isExpired = Date.now() - parsed.lastUpdated > 24 * 60 * 60 * 1000;
        
        if (!isExpired) {
          setAdmissions(parsed.admissions || []);
          setDefinitions(parsed.definitions || []);
          setIsGenerated(parsed.isGenerated || false);
          setHasPersistedData(true);
          console.log('Restored RFA data from localStorage:', parsed);
        } else {
          // Clear expired data
          localStorage.removeItem(storageKey);
          console.log('Cleared expired RFA data');
        }
      }
    } catch (error) {
      console.error('Error loading RFA data from localStorage:', error);
      // Clear corrupted data
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  // Save data to localStorage
  const saveToStorage = useCallback((data: Partial<RFAData>) => {
    try {
      const currentData: RFAData = {
        admissions,
        definitions,
        isGenerated,
        lastUpdated: Date.now(),
        ...data
      };
      
      localStorage.setItem(storageKey, JSON.stringify(currentData));
      console.log('Saved RFA data to localStorage:', currentData);
    } catch (error) {
      console.error('Error saving RFA data to localStorage:', error);
    }
  }, [storageKey, admissions, definitions, isGenerated]);

  // Save admissions and persist
  const saveAdmissions = useCallback((newAdmissions: string[]) => {
    setAdmissions(newAdmissions);
    saveToStorage({ 
      admissions: newAdmissions,
      definitions,
      isGenerated,
      lastUpdated: Date.now()
    });
  }, [saveToStorage, definitions, isGenerated]);

  // Save definitions and persist
  const saveDefinitions = useCallback((newDefinitions: string[]) => {
    setDefinitions(newDefinitions);
    saveToStorage({ 
      admissions,
      definitions: newDefinitions,
      isGenerated,
      lastUpdated: Date.now()
    });
  }, [saveToStorage, admissions, isGenerated]);

  // Set generated status and persist
  const setGenerated = useCallback((generated: boolean) => {
    setIsGenerated(generated);
    saveToStorage({ 
      admissions,
      definitions,
      isGenerated: generated,
      lastUpdated: Date.now()
    });
  }, [saveToStorage, admissions, definitions]);

  // Clear all data
  const clearData = useCallback(() => {
    setAdmissions([]);
    setDefinitions([]);
    setIsGenerated(false);
    setHasPersistedData(false);
    localStorage.removeItem(storageKey);
    console.log('Cleared RFA data');
  }, [storageKey]);

  return {
    admissions,
    definitions,
    isGenerated,
    saveAdmissions,
    saveDefinitions,
    setGenerated,
    clearData,
    hasPersistedData
  };
};


