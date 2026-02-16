import { Button } from '@/components/ui/button';
import { FileText, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSISupabasePersistence } from '@/hooks/use-si-supabase-persistence';
import { AIEditModal } from './AIEditModal';
import SpecialInterrogatoriesPreview from './SpecialInterrogatoriesPreview';
import { ComplaintInformation } from '@/integrations/gemini/client';
import SpecialInterrogatoriesDocxButton from './SpecialInterrogatoriesDocxButton';

interface Props {
  extractedData: ComplaintInformation | null;
  caseId: string | undefined;
}

export default function SpecialInterrogatoriesController({ extractedData, caseId }: Props) {
  const { toast } = useToast();
  const { interrogatories, definitions, loading, error, generateAndSaveSI, saveData, editWithAI, editAllWithAI } = useSISupabasePersistence({ caseId, extractedData });

  const [isAIEditModalOpen, setIsAIEditModalOpen] = useState(false);
  const [isAIEditAllModalOpen, setIsAIEditAllModalOpen] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [currentType, setCurrentType] = useState<'interrogatory' | 'definition' | 'interrogatories' | 'definitions'>('interrogatory');
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleAIEditClick = (text: string, type: 'interrogatory' | 'definition', index: number) => {
    setCurrentText(text);
    setCurrentType(type);
    setCurrentIndex(index);
    setIsAIEditModalOpen(true);
  };

  const handleAIEditAllClick = (type: 'interrogatories' | 'definitions') => {
    setCurrentType(type);
    setIsAIEditAllModalOpen(true);
  };

  const handleAIEdit = async (prompt: string) => {
    if (currentType !== 'interrogatory' && currentType !== 'definition') return;
    const updated = await editWithAI(prompt, currentText, currentType, currentIndex);
    if (updated) {
      toast({ title: 'Content Updated', description: 'Updated with AI suggestions.' });
    }
    setIsAIEditModalOpen(false);
  };

  const handleAIEditAll = async (prompt: string) => {
    if (currentType !== 'interrogatories' && currentType !== 'definitions') return;
    await editAllWithAI(prompt, currentType);
    toast({ title: 'Content Updated', description: `All ${currentType} updated with AI.` });
    setIsAIEditAllModalOpen(false);
  };

  const handleSave = (editedInterrogatories: string[], editedDefinitions: string[]) => {
    saveData(editedInterrogatories, editedDefinitions, true);
    toast({ title: 'Saved!', description: 'Your changes have been saved.' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading Special Interrogatories...</span>
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
  if (interrogatories && definitions && interrogatories.length > 0 && definitions.length > 0) {
    return (
      <div>
        <SpecialInterrogatoriesPreview
          interrogatories={interrogatories}
          definitions={definitions}
          onSave={handleSave}
          onAIEditClick={handleAIEditClick}
          onAIEditAllClick={handleAIEditAllClick}
          onRegenerate={generateAndSaveSI}
          extractedData={extractedData}
          caseId={caseId}
        />
        {extractedData && (
          <SpecialInterrogatoriesDocxButton
            extractedData={extractedData}
            interrogatories={interrogatories}
            definitions={definitions}
            caseId={caseId}
          />
        )}
        <AIEditModal isOpen={isAIEditModalOpen} onClose={() => setIsAIEditModalOpen(false)} onConfirm={handleAIEdit} originalText={currentText} />
        <AIEditModal isOpen={isAIEditAllModalOpen} onClose={() => setIsAIEditAllModalOpen(false)} onConfirm={handleAIEditAll} originalText={`Editing all ${currentType}`} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center p-6 md:p-8 border-2 border-dashed border-gray-300 rounded-lg">
      <FileText className="h-12 w-12 text-gray-400 mb-3" />
      <h3 className="text-lg font-semibold mb-2">Special Interrogatories</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-md">
        Generate AI-powered custom interrogatories and definitions tailored to your case. 
        Our AI will analyze your complaint and create relevant questions.
      </p>
      <Button 
        onClick={generateAndSaveSI}
        className="flex items-center gap-2"
        size="lg"
      >
        <Sparkles className="h-4 w-4" />
        Generate with AI
      </Button>
    </div>
  );
}
