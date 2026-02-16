import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRFPSupabasePersistence } from '@/hooks/use-rfp-supabase-persistence';
import { AIEditModal } from './AIEditModal';
import RequestForProductionPreview from './RequestForProductionPreview';
import { ComplaintInformation } from '@/integrations/gemini/client';

interface RequestForProductionPdfButtonProps {
  extractedData: ComplaintInformation | null;
  caseId: string | undefined;
}

export default function RequestForProductionPdfButton({
  extractedData,
  caseId,
}: RequestForProductionPdfButtonProps) {
  const { toast } = useToast();
  const {
    productions,
    definitions,
    loading,
    error,
    generateAndSaveRFP,
    saveData,
    editWithAI,
    editAllWithAI,
  } = useRFPSupabasePersistence({ caseId, extractedData });

  const [isAIEditModalOpen, setIsAIEditModalOpen] = useState(false);
  const [isAIEditAllModalOpen, setIsAIEditAllModalOpen] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [currentType, setCurrentType] = useState<'production' | 'definition' | 'productions' | 'definitions'>('production');
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleAIEditClick = (
    text: string,
    type: 'production' | 'definition',
    index: number
  ) => {
    setCurrentText(text);
    setCurrentType(type);
    setCurrentIndex(index);
    setIsAIEditModalOpen(true);
  };

  const handleAIEditAllClick = (type: 'productions' | 'definitions') => {
    setCurrentType(type);
    setIsAIEditAllModalOpen(true);
  };

  const handleAIEdit = async (prompt: string) => {
    if (currentType !== 'production' && currentType !== 'definition') return;

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
    if (currentType !== 'productions' && currentType !== 'definitions') return;

    await editAllWithAI(prompt, currentType);
    
    toast({
      title: 'Content Updated',
      description: `All ${currentType} have been updated with AI suggestions.`,
    });
    setIsAIEditAllModalOpen(false);
  };

  const handleSave = (
    editedProductions: string[],
    editedDefinitions: string[]
  ) => {
    saveData(editedProductions, editedDefinitions, true);
    toast({
      title: 'Saved!',
      description: 'Your changes have been saved successfully.',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading RFP Data...</span>
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

  if (productions && definitions) {
    return (
      <div>
        <RequestForProductionPreview
          productions={productions}
          definitions={definitions}
          onSave={handleSave}
          onAIEditClick={handleAIEditClick}
          onAIEditAllClick={handleAIEditAllClick}
          onRegenerate={generateAndSaveRFP}
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
      <h3 className="text-lg font-semibold mb-1">Request for Production</h3>
      <p className="text-sm text-gray-500 mb-4">
        No Request for Production document has been generated for this case yet.
      </p>
      <Button onClick={generateAndSaveRFP}>
        Generate RFP Document
      </Button>
    </div>
  );
}