import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ComplaintInformation, generateDemandLetterWithAI, genAI, safetySettings, geminiModel } from '@/integrations/gemini/client';

interface DemandLetterSections {
  header: string;
  re_line: string;
  salutation: string;
  opening_paragraph: string;
  medical_providers: string;
  injuries: string;
  damages_summary: string;
  settlement_demand: string;
  closing: string;
  tone?: string;
}

interface UseDemandLetterProps {
  caseId?: string;
  extractedData: ComplaintInformation | null;
}

export function useDemandLetterSupabasePersistence({ caseId, extractedData }: UseDemandLetterProps) {
  const { toast } = useToast();
  const [sections, setSections] = useState<DemandLetterSections | null>(null);
  const [bodyText, setBodyText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPersistedData, setHasPersistedData] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [docxUrl, setDocxUrl] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('demand_letters')
        .select('*')
        .eq('case_id', caseId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSections(data.sections || null);
        setBodyText(data.body_text || '');
        setPdfUrl(data.pdf_url || null);
        setDocxUrl(data.docx_url || null);
        setHasPersistedData(true);
      } else {
        setSections(null);
        setBodyText('');
        setPdfUrl(null);
        setDocxUrl(null);
        setHasPersistedData(false);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error loading demand letter';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveData = useCallback(async (s: DemandLetterSections, body: string) => {
    if (!caseId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('demand_letters')
        .upsert({
          case_id: caseId,
          sections: s,
          body_text: body,
          is_generated: true,
          created_by: user.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'case_id' });

      if (error) throw error;
      setSections(s);
      setBodyText(body);
      setHasPersistedData(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error saving demand letter';
      toast({ title: 'Save Failed', description: msg, variant: 'destructive' });
    }
  }, [caseId, toast]);

  const composeBody = (s: DemandLetterSections): string => {
    return [
      s.header,
      '\n\n' + s.re_line,
      '\n\n' + s.salutation,
      '\n\n' + s.opening_paragraph,
      '\n\nMEDICAL PROVIDERS\n' + s.medical_providers,
      '\n\nINJURIES SUSTAINED\n' + s.injuries,
      '\n\nDAMAGES\n' + s.damages_summary,
      '\n\nSETTLEMENT DEMAND\n' + s.settlement_demand,
      '\n\n' + s.closing,
    ].join('\n');
  };

  const generate = useCallback(async (contextDocs: string[] = [], instructions?: string) => {
    if (!caseId) {
      toast({ title: 'Cannot Generate', description: 'Case ID missing', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    try {
      // If no extracted data, fetch case information to use as basis
      let dataToUse = extractedData;
      
      if (!dataToUse) {
        const { data: caseData, error: caseError } = await supabase
          .from('cases')
          .select('*')
          .eq('id', caseId)
          .single();
        
        if (caseError) throw caseError;
        
        // Create a minimal ComplaintInformation object from case data
        dataToUse = {
          plaintiff: caseData.client_name || 'Plaintiff',
          defendant: 'Defendant',
          incidentDate: caseData.incident_date || '',
          incidentLocation: '',
          parties: [],
          allegations: [],
          injuries: [],
          damages: { medical: 0, property: 0, lostWages: 0, painAndSuffering: 0 },
          causeOfAction: []
        } as ComplaintInformation;
      }
      
      toast({ title: 'Generating Demand Letter', description: 'Using AI + context...' });
      const dl = await generateDemandLetterWithAI(dataToUse, contextDocs, instructions);
      const body = composeBody(dl);
      await saveData(dl, body);
      toast({ title: 'Generated', description: 'Demand letter created.' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error during generation';
      toast({ title: 'Generation Failed', description: msg, variant: 'destructive' });
    } finally { setLoading(false); }
  }, [caseId, extractedData, saveData, toast]);

  const updateSection = (key: keyof DemandLetterSections, value: string) => {
    if (!sections) return;
    const updated = { ...sections, [key]: value };
    setSections(updated);
    setBodyText(composeBody(updated));
  };

  // Auto-save debounce
  useEffect(() => {
    if (!sections || !caseId) return;
    const handle = setTimeout(() => {
      // silent save
      saveData(sections, bodyText);
    }, 1200); // 1.2s debounce
    return () => clearTimeout(handle);
  }, [sections, bodyText, caseId, saveData]);

  const persistEdits = async () => {
    if (sections) await saveData(sections, bodyText);
    toast({ title: 'Saved', description: 'Edits saved.' });
  };

  const aiEditSection = async (key: keyof DemandLetterSections, instruction: string) => {
    if (!sections) return;
    if (!genAI) {
      toast({ title: 'AI Unavailable', description: 'Gemini key missing', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const original = sections[key];
      const model = genAI.getGenerativeModel({ model: geminiModel, safetySettings });
      const prompt = `You are revising a demand letter section. Instruction: ${instruction}\nOriginal Section (${key}):\n${original}\nReturn ONLY the improved revised text.`;
      const result = await model.generateContent(prompt);
      const updated = result.response.text().trim();
      updateSection(key, updated);
    } catch (e) {
      toast({ title: 'AI Edit Failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const aiEditAll = async (instruction: string) => {
    if (!sections) return;
    if (!genAI) {
      toast({ title: 'AI Unavailable', description: 'Gemini key missing', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: geminiModel, safetySettings });
      const prompt = `You are improving an entire demand letter. Instruction: ${instruction}\nCurrent JSON:\n${JSON.stringify(sections)}\nReturn ONLY JSON with the same keys.`;
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      if (text.startsWith('```')) text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/,'');
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
      setSections(parsed);
      setBodyText(composeBody(parsed));
    } catch (e) {
      toast({ title: 'AI Bulk Edit Failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return {
    sections,
    bodyText,
    loading,
    error,
    hasPersistedData,
    pdfUrl,
    docxUrl,
    generate,
    updateSection,
    persistEdits,
  aiEditSection,
  aiEditAll,
    reload: loadData,
  };
}
