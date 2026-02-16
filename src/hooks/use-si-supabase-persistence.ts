import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ComplaintInformation, generateSIWithAI, genAI, safetySettings, geminiModel } from '@/integrations/gemini/client';

interface UseSISupabasePersistenceProps {
  caseId: string | undefined;
  extractedData: ComplaintInformation | null;
}

export function useSISupabasePersistence({ caseId, extractedData }: UseSISupabasePersistenceProps) {
  const { toast } = useToast();
  const [interrogatories, setInterrogatories] = useState<string[] | null>(null);
  const [definitions, setDefinitions] = useState<string[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!caseId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('special_interrogatories')
        .select('interrogatories, definitions')
        .eq('case_id', caseId)
        .single();

      if (error && error.code !== 'PGRST116') throw new Error(error.message);
      if (data) {
        setInterrogatories(data.interrogatories || []);
        setDefinitions(data.definitions || []);
      } else {
        setInterrogatories(null);
        setDefinitions(null);
      }
    } catch (err) {
      setError((err as Error).message);
      toast({ title: 'Error', description: 'Failed to fetch Special Interrogatories.', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [caseId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveData = async (newInterrogs: string[], newDefs: string[], showToast = false) => {
    if (!caseId) return;
    try {
      const { data: user_data, error: user_error } = await supabase.auth.getUser();
      if (user_error) throw new Error(user_error.message);

      // upsert by case_id and stamp created_by
      const { error } = await supabase
        .from('special_interrogatories')
        .upsert({
          case_id: caseId,
          interrogatories: newInterrogs,
          definitions: newDefs,
          created_by: user_data.user.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'case_id' });

      if (error) throw new Error(error.message);
      setInterrogatories(newInterrogs);
      setDefinitions(newDefs);
      if (showToast) toast({ title: 'Success', description: 'Special Interrogatories saved.' });
    } catch (err) {
      setError((err as Error).message);
      toast({ title: 'Error', description: 'Failed to save Special Interrogatories.', variant: 'destructive' });
    }
  };

  const generateAndSaveSI = async () => {
    if (!extractedData) { toast({ title: 'Error', description: 'Complaint data not available.', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      toast({ title: 'Generating Special Interrogatories...', description: 'Please wait.' });
      const result = await generateSIWithAI(extractedData);
      if (result.vectorBasedInterrogatories && result.vectorBasedDefinitions) {
        await saveData(result.vectorBasedInterrogatories, result.vectorBasedDefinitions);
        toast({ title: 'Generated!', description: 'Special Interrogatories have been generated and saved.' });
      } else {
        throw new Error('AI generation failed to return valid data.');
      }
    } catch (err) {
      setError((err as Error).message);
      toast({ title: 'Error', description: `Failed to generate: ${(err as Error).message}`, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const editWithAI = async (prompt: string, originalText: string, type: 'interrogatory' | 'definition', index: number) => {
    if (!genAI) { toast({ title: 'AI Edit Failed', description: 'Gemini API key is not configured.', variant: 'destructive' }); return null; }
    setLoading(true);
    try {
      const aiPrompt = `You are a legal assistant. The user wants to edit a single ${type} based on their prompt.\n\nOriginal ${type}: "${originalText}"\nUser's instruction: "${prompt}"\n\nPlease provide the updated ${type} as a single string.\n\nIMPORTANT: Return ONLY the revised string, with no markdown, no quotes, and no additional text or explanation.`;
      const model = genAI.getGenerativeModel({ model: geminiModel, safetySettings });
      const result = await model.generateContent(aiPrompt);
      const response = await result.response;
      const updatedText = response.text().trim();
      if (!updatedText) throw new Error('AI returned an empty response.');

      if (type === 'interrogatory') {
        const updated = [...(interrogatories || [])];
        updated[index] = updatedText;
        setInterrogatories(updated);
        await saveData(updated, (definitions || []), false);
      } else {
        const updated = [...(definitions || [])];
        updated[index] = updatedText;
        setDefinitions(updated);
        await saveData((interrogatories || []), updated, false);
      }
      toast({ title: 'AI Edit Complete', description: `Successfully updated the ${type}.` });
      return updatedText;
    } catch (err) {
      toast({ title: 'AI Edit Failed', description: `Failed to edit content with AI: ${(err as Error).message}.`, variant: 'destructive' });
      return null;
    } finally { setLoading(false); }
  };

  const editAllWithAI = async (prompt: string, type: 'interrogatories' | 'definitions') => {
    if (!genAI) { toast({ title: 'AI Edit Failed', description: 'Gemini API key is not configured.', variant: 'destructive' }); return [] as string[]; }
    setLoading(true);
    try {
      const currentData = type === 'interrogatories' ? (interrogatories || []) : (definitions || []);
      const isDefinitions = type === 'definitions';
    const currentList = currentData.map((item, idx) => `${idx + 1}. ${item}`).join('\n');
    const defsNote = isDefinitions ? 'IMPORTANT FOR DEFINITIONS: Do not include numbers or bullet points in the definition text itself. Each definition should be a complete sentence starting with "The term" or similar.' : '';
    const aiPrompt = `You are a legal assistant. The user wants to edit the following list of ${type} based on their prompt: "${prompt}".\n\nCurrent ${type}:\n${currentList}\n\nPlease provide the updated list of ${type} in the same format.\n\n${defsNote}\n\nIMPORTANT: Return ONLY a valid JSON array of strings, with no markdown, no code blocks, and no additional text or explanation. The response should start with [ and end with ].\n\nExample format: ["First item", "Second item", "Third item"]`;
      const model = genAI.getGenerativeModel({ model: geminiModel, safetySettings });
      const result = await model.generateContent(aiPrompt);
      const response = await result.response;
      const text = response.text();

      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }
      const updatedItems = JSON.parse(jsonText);
      if (!Array.isArray(updatedItems)) throw new Error('AI response is not an array');

      if (type === 'interrogatories') {
        setInterrogatories(updatedItems);
        await saveData(updatedItems, (definitions || []), false);
      } else {
        setDefinitions(updatedItems);
        await saveData((interrogatories || []), updatedItems, false);
      }
      toast({ title: 'AI Edit Complete', description: `Successfully updated all ${type}.` });
      return updatedItems;
    } catch (err) {
      toast({ title: 'AI Edit Failed', description: `Failed to edit content with AI: ${(err as Error).message}.`, variant: 'destructive' });
      return [] as string[];
    } finally { setLoading(false); }
  };

  return { interrogatories, definitions, loading, error, fetchData, saveData, generateAndSaveSI, editWithAI, editAllWithAI };
}
