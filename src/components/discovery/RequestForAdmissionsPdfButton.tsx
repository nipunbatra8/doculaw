import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRFASupabasePersistence } from '@/hooks/use-rfa-supabase-persistence';
import { AIEditModal } from './AIEditModal';
import RequestForAdmissionsPreview from './RequestForAdmissionsPreview';
import { ComplaintInformation } from '@/integrations/openai/client';

interface RequestForAdmissionsPdfButtonProps {
  extractedData: ComplaintInformation | null;
  caseId: string | undefined;
}

export default function RequestForAdmissionsPdfButton({
  extractedData,
  caseId,
}: RequestForAdmissionsPdfButtonProps) {
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
  hasPersistedData,
  } = useRFASupabasePersistence({ caseId, extractedData });

  const [isAIEditModalOpen, setIsAIEditModalOpen] = useState(false);
  const [isAIEditAllModalOpen, setIsAIEditAllModalOpen] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [currentType, setCurrentType] = useState<'admission' | 'definition' | 'admissions' | 'definitions'>('admission');
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleAIEditClick = (
    text: string,
    type: 'admission' | 'definition',
    index: number
  ) => {
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

    const updatedContent = await editWithAI(
      prompt,
      currentText,
      currentType,
      currentIndex
    );

    if (updatedContent) {
      toast({
        title: 'Content Updated',
        description: 'The content has been updated with AI suggestions.',
      });
    }
    setIsAIEditModalOpen(false);
  };

  const handleAIEditAll = async (prompt: string) => {
    if (currentType !== 'admissions' && currentType !== 'definitions') return;

    await editAllWithAI(prompt, currentType);
    
    toast({
      title: 'Content Updated',
      description: `All ${currentType} have been updated with AI suggestions.`,
    });
    setIsAIEditAllModalOpen(false);
  };

  const handleSave = (
    editedAdmissions: string[],
    editedDefinitions: string[]
  ) => {
    saveData(editedAdmissions, editedDefinitions, true);
    toast({
      title: 'Saved!',
      description: 'Your changes have been saved successfully.',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading RFA Data...</span>
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

  if (hasPersistedData) {
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
        <AIEditModal
          isOpen={isAIEditModalOpen}
          onClose={() => setIsAIEditModalOpen(false)}
          onConfirm={handleAIEdit}
          originalText={currentText}
        />
        <AIEditModal
          isOpen={isAIEditAllModalOpen}
          onClose={() => setIsAIEditAllModalOpen(false)}
          onConfirm={handleAIEditAll}
          originalText={`Editing all ${currentType}`}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
      <FileText className="h-12 w-12 text-gray-400 mb-2" />
      <h3 className="text-lg font-semibold mb-1">Request for Admissions</h3>
      <p className="text-sm text-gray-500 mb-4">
        No Request for Admissions document has been generated for this case yet.
      </p>
      <Button onClick={generateAndSaveRFA} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Document
          </>
        )}
      </Button>
    </div>
  );
}