import { Button } from '@/components/ui/button';
import { FileText, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRFASupabasePersistence } from '@/hooks/use-rfa-supabase-persistence';
import { AIEditModal } from './AIEditModal';
import RequestForAdmissionsPreview from './RequestForAdmissionsPreview';
import { ComplaintInformation } from '@/integrations/gemini/client';

interface Props {
  extractedData: ComplaintInformation | null;
  caseId: string | undefined;
}

export default function RequestForAdmissionsEditor({ extractedData, caseId }: Props) {
  const { toast } = useToast();
  const { 
    admissions, 
    definitions, 
    loading, 
    error, 
    generateAndSaveRFA, 
    saveData, 
    editWithAI, 
    editAllWithAI,
    hasPersistedData 
  } = useRFASupabasePersistence({ caseId, extractedData });

  const [isAIEditModalOpen, setIsAIEditModalOpen] = useState(false);
  const [isAIEditAllModalOpen, setIsAIEditAllModalOpen] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [currentType, setCurrentType] = useState<'admission' | 'definition' | 'admissions' | 'definitions'>('admission');
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleAIEditClick = (text: string, type: 'admission' | 'definition', index: number) => {
    setCurrentText(text);
    setCurrentType(type);
    setCurrentIndex(index);
    setIsAIEditModalOpen(true);
  };

  const handleAIEditAllClick = (type: 'admissions' | 'definitions') => {
    setCurrentType(type);
    setIsAIEditAllModalOpen(true);
  };

  const handleAIEdit = async (prompt: string) => {
    if (currentType !== 'admission' && currentType !== 'definition') return;
    const updated = await editWithAI(prompt, currentText, currentType, currentIndex);
    if (updated) {
      toast({ title: 'Content Updated', description: 'Updated with AI suggestions.' });
    }
    setIsAIEditModalOpen(false);
  };

  const handleAIEditAll = async (prompt: string) => {
    if (currentType !== 'admissions' && currentType !== 'definitions') return;
    await editAllWithAI(prompt, currentType);
    toast({ title: 'Content Updated', description: `All ${currentType} updated with AI.` });
    setIsAIEditAllModalOpen(false);
  };

  const handleSave = (editedAdmissions: string[], editedDefinitions: string[]) => {
    saveData(editedAdmissions, editedDefinitions, true);
    toast({ title: 'Saved!', description: 'Your changes have been saved.' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading Request for Admissions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center text-red-500">
        <AlertCircle className="h-4 w-4 mr-2" />
        <span>Error: {error}</span>
      </div>
    );
  }

  // Show preview only if we have actual content (non-empty arrays)
  if (admissions && definitions && admissions.length > 0 && definitions.length > 0) {
    return (
      <div>
        <RequestForAdmissionsPreview
          admissions={admissions}
          definitions={definitions}
          onSave={handleSave}
          onAIEditClick={handleAIEditClick}
          onAIEditAllClick={handleAIEditAllClick}
          onRegenerate={generateAndSaveRFA}
          extractedData={extractedData}
          caseId={caseId}
        />
        <AIEditModal isOpen={isAIEditModalOpen} onClose={() => setIsAIEditModalOpen(false)} onConfirm={handleAIEdit} originalText={currentText} />
        <AIEditModal isOpen={isAIEditAllModalOpen} onClose={() => setIsAIEditAllModalOpen(false)} onConfirm={handleAIEditAll} originalText={`Editing all ${currentType}`} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center p-6 md:p-8 border-2 border-dashed border-gray-300 rounded-lg">
      <FileText className="h-12 w-12 text-gray-400 mb-3" />
      <h3 className="text-lg font-semibold mb-2">Request for Admissions</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-md">
        Generate AI-powered admissions and definitions tailored to your case. 
        Our AI will analyze your complaint and create relevant content.
      </p>
      <Button 
        onClick={generateAndSaveRFA}
        className="flex items-center gap-2"
        size="lg"
      >
        <Sparkles className="h-4 w-4" />
        Generate with AI
      </Button>
    </div>
  );
}


