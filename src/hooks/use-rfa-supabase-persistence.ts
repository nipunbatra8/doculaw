import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';
import { genAI, safetySettings, geminiModel } from '@/integrations/gemini/client';

interface RFAPersistedData {
  id?: string;
  case_id: string;
  admissions: string[];
  definitions: string[];
  is_generated: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ComplaintInformation {
  plaintiff?: string;
  defendant?: string;
  caseType?: string;
  chargeDescription?: string;
  filingDate?: string;
  courtName?: string;
  caseNumber?: string;
  attorney?: {
    name?: string;
    firm?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
    phone?: string;
    fax?: string;
    email?: string;
    attorneyFor?: string;
  };
  court?: {
    county?: string;
  };
}

interface UseRFASupabasePersistenceProps {
  caseId?: string;
  extractedData: ComplaintInformation | null;
}

export const useRFASupabasePersistence = ({ caseId, extractedData }: UseRFASupabasePersistenceProps) => {
  const { toast } = useToast();
  const [admissions, setAdmissions] = useState<string[]>([]);
  const [definitions, setDefinitions] = useState<string[]>([]);
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [hasPersistedData, setHasPersistedData] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(0);

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!caseId) {
      console.log('No caseId provided, skipping load');
      setLoading(false);
      return;
    }

    // Skip if not forcing refresh and we just refreshed recently (within 1 second)
    const now = Date.now();
    if (!forceRefresh && now - lastRefresh < 1000) {
      console.log('Skipping refresh, too recent');
      setLoading(false); // Ensure loading is false if we skip
      return;
    }

    console.log('Loading RFA data from Supabase for caseId:', caseId, forceRefresh ? '(forced)' : '');
    setLoading(true);
    setError(null);
    setLastRefresh(now);
    
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('User not authenticated, skipping load');
        setLoading(false);
        return;
      }

      console.log('User authenticated:', user.id);

      const { data, error } = await supabase
        .from('request_for_admissions')
        .select('*')
        .eq('case_id', caseId)
        .single();

      console.log('Load result:', { data, error });

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error loading RFA data from Supabase:', error);
        setError(`Failed to load previous content: ${error.message}.`);
        toast({
          title: "Error Loading Data",
          description: `Failed to load previous content: ${error.message}. Starting fresh.`,
          variant: "destructive"
        });
        return;
      }

      if (data) {
        console.log('Loaded data:', data);
        setAdmissions(data.admissions || []);
        setDefinitions(data.definitions || []);
        setIsGenerated(data.is_generated || false);
        setHasPersistedData(true);
        // Removed toast notification for successful data loading to avoid spam
      } else {
        console.log('No data found for caseId:', caseId);
        // Clear state when no data is found
        setAdmissions([]);
        setDefinitions([]);
        setIsGenerated(false);
        setHasPersistedData(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Failed to load RFA data from Supabase:', errorMessage);
      setError(`Failed to load previous content: ${errorMessage}.`);
      setHasPersistedData(false);
      toast({
        title: "Error Loading Data",
        description: `Failed to load previous content: ${errorMessage}. Starting fresh.`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [caseId, toast, lastRefresh]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveData = useCallback(async (newAdmissions: string[], newDefinitions: string[], generatedStatus: boolean) => {
    if (!caseId) {
      console.log('No caseId provided, skipping save');
      return;
    }

    console.log('Saving RFA data to Supabase:', { caseId, newAdmissions, newDefinitions, generatedStatus });

    try {
      const dataToStore: {
        case_id: string;
        admissions: string[];
        definitions: string[];
        is_generated: boolean;
        updated_at: string;
        created_by?: string;
        created_at?: string;
      } = {
        case_id: caseId,
        admissions: newAdmissions,
        definitions: newDefinitions,
        is_generated: generatedStatus,
        updated_at: new Date().toISOString(),
      };

      console.log('Data to store:', dataToStore);

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if record exists first
      const { data: existingData, error: checkError } = await supabase
        .from('request_for_admissions')
        .select('*')
        .eq('case_id', caseId)
        .single();

      console.log('Existing data check:', { existingData, checkError });

      // If there's an error and it's not "not found", log it
      if (checkError && checkError.code !== 'PGRST116') {
        console.log('Error checking existing data:', checkError);
      }

      // If we have existing data, update it; otherwise insert new
      if (existingData && !checkError) {
        // Record exists, update it
        console.log('Updating existing record:', existingData.id);
        const { data: updateData, error: updateError } = await supabase
          .from('request_for_admissions')
          .update({ ...dataToStore, created_by: user.id })
          .eq('case_id', caseId)
          .select();

        console.log('Update result:', { updateData, updateError });

        if (updateError) {
          throw updateError;
        }
      } else {
        // Record doesn't exist or there was an error, insert it
        console.log('Inserting new record (existingData:', existingData, 'checkError:', checkError?.code, ')');
        const { data: insertData, error: insertError } = await supabase
          .from('request_for_admissions')
          .insert({ ...dataToStore, created_by: user.id, created_at: new Date().toISOString() })
          .select();

        console.log('Insert result:', { insertData, insertError });

        if (insertError) {
          throw insertError;
        }
      }

      setHasPersistedData(true);
      console.log('Successfully saved RFA data to Supabase');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Failed to save RFA data to Supabase:', errorMessage);
      toast({
        title: "Error Saving Data",
        description: `Failed to save content: ${errorMessage}. Changes might not persist.`,
        variant: "destructive"
      });
    }
  }, [caseId, toast]);

  const saveAdmissions = useCallback((newAdmissions: string[]) => {
    console.log('saveAdmissions called with:', newAdmissions);
    setAdmissions(newAdmissions);
    saveData(newAdmissions, definitions, isGenerated);
  }, [definitions, isGenerated, saveData]);

  const saveDefinitions = useCallback((newDefinitions: string[]) => {
    // Strip any leading numbering like "1. " from definitions before saving
    const cleanedDefinitions = newDefinitions.map((d) => d.replace(/^\d+\.\s*/, ''));
    console.log('saveDefinitions called with (cleaned):', cleanedDefinitions);
    setDefinitions(cleanedDefinitions);
    saveData(admissions, cleanedDefinitions, isGenerated);
  }, [admissions, isGenerated, saveData]);

  const setGenerated = useCallback((status: boolean) => {
    console.log('setGenerated called with:', status);
    setIsGenerated(status);
  }, []);

  const clearData = useCallback(async () => {
    if (!caseId) return;

    try {
      const { error } = await supabase
        .from('request_for_admissions')
        .delete()
        .eq('case_id', caseId);

      if (error) {
        throw error;
      }

      setAdmissions([]);
      setDefinitions([]);
      setIsGenerated(false);
      setHasPersistedData(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Failed to clear RFA data from Supabase:', errorMessage);
      toast({
        title: "Error Clearing Data",
        description: "Failed to clear content.",
        variant: "destructive"
      });
    }
  }, [caseId, toast]);

  const generateAndSaveRFA = useCallback(async () => {
    if (!extractedData) {
      toast({
        title: "Cannot Generate Document",
        description: "Complaint data is not available.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const generationPrompt = `Based on the following complaint information, generate a set of "definitions" and "admissions" for a Request for Admissions document in a civil litigation case.

Complaint Information:
- Plaintiff: ${extractedData.plaintiff}
- Defendant: ${extractedData.defendant}
- Case Type: ${extractedData.caseType}
- Filing Date: ${extractedData.filingDate}
- Core Allegations: ${extractedData.chargeDescription}

Generate 5 relevant definitions and 10 relevant admissions.

IMPORTANT: Return ONLY a valid JSON object with two keys: "definitions" and "admissions". Both keys should have a value of a string array. Do not include markdown, code blocks, or any other text.
Example:
{
  "definitions": ["The term 'AGREEMENT' means...", "The term 'INCIDENT' means..."],
  "admissions": ["Admit that you signed the agreement.", "Admit that the incident occurred on the specified date."]
}`;

      const model = genAI.getGenerativeModel({ model: geminiModel, safetySettings });
      const result = await model.generateContent(generationPrompt);
      const response = await result.response;
      const text = response.text();

      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(jsonText);
      const { definitions: newDefinitions, admissions: newAdmissions } = parsed;

      if (!newDefinitions || !newAdmissions || !Array.isArray(newDefinitions) || !Array.isArray(newAdmissions)) {
        throw new Error("AI response was not in the expected format.");
      }

      await saveData(newAdmissions, newDefinitions, true);
      setAdmissions(newAdmissions);
      setDefinitions(newDefinitions);
      setIsGenerated(true);

      toast({
        title: "Document Generated",
        description: "Request for Admissions has been created and saved.",
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Failed to generate RFA:", errorMessage);
      toast({
        title: "Generation Failed",
        description: `An error occurred while generating the document: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [extractedData, saveData, toast]);

  const editWithAI = useCallback(async (
    prompt: string,
    originalText: string,
    type: 'admission' | 'definition',
    index: number
  ): Promise<string | null> => {
    if (!genAI) {
      toast({
        title: "AI Edit Failed",
        description: "Gemini API key is not configured.",
        variant: "destructive"
      });
      return null;
    }

    setLoading(true);
    try {
      const aiPrompt = `You are a legal assistant. The user wants to edit a single ${type} based on their prompt.

Original ${type}: "${originalText}"
User's instruction: "${prompt}"

Please provide the updated ${type} as a single string.

IMPORTANT: Return ONLY the revised string, with no markdown, no quotes, and no additional text or explanation.`;

      const model = genAI.getGenerativeModel({ model: geminiModel, safetySettings });
      const result = await model.generateContent(aiPrompt);
      const response = await result.response;
      const updatedText = response.text().trim();

      if (!updatedText) {
        throw new Error("AI returned an empty response.");
      }

      if (type === 'admission') {
        const updatedAdmissions = [...admissions];
        updatedAdmissions[index] = updatedText;
        setAdmissions(updatedAdmissions);
        await saveData(updatedAdmissions, definitions, isGenerated);
      } else {
        const updatedDefinitions = [...definitions];
        updatedDefinitions[index] = updatedText;
        setDefinitions(updatedDefinitions);
        await saveData(admissions, updatedDefinitions, isGenerated);
      }

      toast({
        title: "AI Edit Complete",
        description: `Successfully updated the ${type}.`,
      });

      return updatedText;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Failed to edit with AI:', errorMessage);
      toast({
        title: "AI Edit Failed",
        description: `Failed to edit content with AI: ${errorMessage}. Please try again.`,
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [admissions, definitions, saveData, toast, isGenerated]);

  const editAllWithAI = useCallback(async (prompt: string, type: 'admissions' | 'definitions'): Promise<string[]> => {
    if (!genAI) {
      toast({
        title: "AI Edit Failed",
        description: "Gemini API key is not configured.",
        variant: "destructive"
      });
      return [];
    }

    setLoading(true);
    try {
      const currentData = type === 'admissions' ? admissions : definitions;
      const isDefinitions = type === 'definitions';

      const aiPrompt = `You are a legal assistant. The user wants to edit the following list of ${type} based on their prompt: "${prompt}".

Current ${type}:
${currentData.map((item, index) => `${index + 1}. ${item}`).join('\n')}

Please provide the updated list of ${type} in the same format.

${isDefinitions ? 'IMPORTANT FOR DEFINITIONS: Do not include numbers or bullet points in the definition text itself. Each definition should be a complete sentence starting with "The term" or similar.' : ''}

IMPORTANT: Return ONLY a valid JSON array of strings, with no markdown, no code blocks, and no additional text or explanation. The response should start with [ and end with ].

Example format: ["First item", "Second item", "Third item"]`;

      const model = genAI.getGenerativeModel({ model: geminiModel, safetySettings });
      const result = await model.generateContent(aiPrompt);
      const response = await result.response;
      const text = response.text();

      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }

      const updatedItems = JSON.parse(jsonText);

      if (!Array.isArray(updatedItems)) {
        throw new Error('AI response is not an array');
      }

      if (type === 'admissions') {
        setAdmissions(updatedItems);
        await saveData(updatedItems, definitions, isGenerated);
      } else {
        setDefinitions(updatedItems);
        await saveData(admissions, updatedItems, isGenerated);
      }

      toast({
        title: "AI Edit Complete",
        description: `Successfully updated all ${type}.`,
      });

      return updatedItems;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Failed to edit all with AI:', errorMessage);
      toast({
        title: "AI Edit Failed",
        description: `Failed to edit content with AI: ${errorMessage}. Please try again.`,
        variant: "destructive"
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [admissions, definitions, saveData, toast, isGenerated]);

  const forceRefresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  return {
    admissions,
    definitions,
    isGenerated,
    saveData: saveData,
    saveAdmissions,
    saveDefinitions,
    setGenerated,
    clearData,
    hasPersistedData,
    loading,
    error,
    editWithAI,
    editAllWithAI,
    generateAndSaveRFA,
    refreshData: loadData, // Expose loadData as refreshData for manual refresh
    forceRefresh, // Force refresh ignoring recent refresh throttling
  };
};
