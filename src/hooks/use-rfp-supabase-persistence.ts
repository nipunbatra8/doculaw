import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateRFPWithAI, ComplaintInformation, genAI, safetySettings, geminiModel } from '@/integrations/gemini/client';

interface UseRFPSupabasePersistenceProps {
  caseId: string | undefined;
  extractedData: ComplaintInformation | null;
}

export function useRFPSupabasePersistence({ caseId, extractedData }: UseRFPSupabasePersistenceProps) {
  const { toast } = useToast();
  const [productions, setProductions] = useState<string[] | null>(null);
  const [definitions, setDefinitions] = useState<string[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!caseId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('request_for_productions')
        .select('productions, definitions')
        .eq('case_id', caseId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116: "Not a single row was found"
        throw new Error(error.message);
      }

      if (data) {
        setProductions(data.productions || []);
        setDefinitions(data.definitions || []);
      } else {
        setProductions(null);
        setDefinitions(null);
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      toast({
        title: 'Error',
        description: 'Failed to fetch RFP data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [caseId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveData = async (
    newProductions: string[],
    newDefinitions: string[],
    showToast = false
  ) => {
    if (!caseId) return;

    try {
      const { data: user_data, error: user_error } = await supabase.auth.getUser();
      if (user_error) throw new Error(user_error.message);

      const { error } = await supabase
        .from('request_for_productions')
        .upsert({
          case_id: caseId,
          productions: newProductions,
          definitions: newDefinitions,
          created_by: user_data.user.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'case_id' });

      if (error) throw new Error(error.message);

      setProductions(newProductions);
      setDefinitions(newDefinitions);

      if (showToast) {
        toast({
          title: 'Success',
          description: 'RFP data saved successfully.',
        });
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      toast({
        title: 'Error',
        description: 'Failed to save RFP data.',
        variant: 'destructive',
      });
    }
  };

  const generateAndSaveRFP = async () => {
    if (!extractedData) {
      toast({
        title: 'Error',
        description: 'Complaint data not available to generate RFP.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      toast({
        title: 'Generating RFP...',
        description: 'Please wait while we generate the Request for Production.',
      });

      const result = await generateRFPWithAI(extractedData);
      
      if (result.vectorBasedProductions && result.vectorBasedDefinitions) {
        await saveData(result.vectorBasedProductions, result.vectorBasedDefinitions);
        toast({
          title: 'RFP Generated!',
          description: 'The Request for Production has been generated and saved.',
        });
      } else {
        throw new Error('AI generation failed to return valid data.');
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      toast({
        title: 'Error',
        description: `Failed to generate RFP: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const editWithAI = async (
    prompt: string,
    originalText: string,
    type: 'production' | 'definition',
    index: number
  ): Promise<string | null> => {
    if (!genAI) {
      toast({
        title: 'AI Edit Failed',
        description: 'Gemini API key is not configured.',
        variant: 'destructive',
      });
      return null;
    }

    setLoading(true);
    try {
      const aiPrompt = `You are a legal assistant. The user wants to edit a single ${type} based on their prompt.\n\nOriginal ${type}: "${originalText}"\nUser's instruction: "${prompt}"\n\nPlease provide the updated ${type} as a single string.\n\nIMPORTANT: Return ONLY the revised string, with no markdown, no quotes, and no additional text or explanation.`;

      const model = genAI.getGenerativeModel({ model: geminiModel, safetySettings });
      const result = await model.generateContent(aiPrompt);
      const response = await result.response;
      const updatedText = response.text().trim();

      if (!updatedText) {
        throw new Error('AI returned an empty response.');
      }

      if (type === 'production') {
        const updatedProductions = [...(productions || [])];
        updatedProductions[index] = updatedText;
        setProductions(updatedProductions);
        await saveData(updatedProductions, (definitions || []), false);
      } else {
        const updatedDefinitions = [...(definitions || [])];
        updatedDefinitions[index] = updatedText;
        setDefinitions(updatedDefinitions);
        await saveData((productions || []), updatedDefinitions, false);
      }

      toast({
        title: 'AI Edit Complete',
        description: `Successfully updated the ${type}.`,
      });

      return updatedText;
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'AI Edit Failed',
        description: `Failed to edit content with AI: ${error.message}. Please try again.`,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const editAllWithAI = async (
    prompt: string,
    type: 'productions' | 'definitions'
  ) => {
    if (!genAI) {
      toast({
        title: 'AI Edit Failed',
        description: 'Gemini API key is not configured.',
        variant: 'destructive',
      });
      return [] as string[];
    }

    setLoading(true);
    try {
      const currentData = type === 'productions' ? (productions || []) : (definitions || []);
      const isDefinitions = type === 'definitions';

      const aiPrompt = `You are a legal assistant. The user wants to edit the following list of ${type} based on their prompt: "${prompt}".\n\nCurrent ${type}:\n${currentData.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\nPlease provide the updated list of ${type} in the same format.\n\n${isDefinitions ? 'IMPORTANT FOR DEFINITIONS: Do not include numbers or bullet points in the definition text itself. Each definition should be a complete sentence starting with "The term" or similar.' : ''}\n\nIMPORTANT: Return ONLY a valid JSON array of strings, with no markdown, no code blocks, and no additional text or explanation. The response should start with [ and end with ].\n\nExample format: ["First item", "Second item", "Third item"]`;

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

      if (type === 'productions') {
        setProductions(updatedItems);
        await saveData(updatedItems, (definitions || []), false);
      } else {
        setDefinitions(updatedItems);
        await saveData((productions || []), updatedItems, false);
      }

      toast({
        title: 'AI Edit Complete',
        description: `Successfully updated all ${type}.`,
      });

      return updatedItems;
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'AI Edit Failed',
        description: `Failed to edit content with AI: ${error.message}. Please try again.`,
        variant: 'destructive',
      });
      return [] as string[];
    } finally {
      setLoading(false);
    }
  };

  return {
    productions,
    definitions,
    loading,
    error,
    generateAndSaveRFP,
    saveData,
    editWithAI,
    editAllWithAI,
    fetchData,
  };
}
