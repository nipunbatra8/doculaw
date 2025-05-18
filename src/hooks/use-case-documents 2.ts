import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export const useCaseDocuments = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Retrieves the full text content of the most recent complaint document for a case
   * @param caseId The ID of the case
   * @returns The text content of the complaint document
   */
  const getComplaintText = async (caseId: string): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      // Find the most recent complaint document for this case
      const { data: documentData, error: documentError } = await supabase
        .from('documents')
        .select('*')
        .eq('case_id', caseId)
        .eq('type', 'complaint')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (documentError) {
        throw new Error(`Failed to fetch complaint document: ${documentError.message}`);
      }

      if (!documentData) {
        throw new Error('No complaint document found for this case');
      }

      // Check if we have the complaint text stored in 'extracted_text'
      if (documentData.extracted_text) {
        setIsLoading(false);
        return documentData.extracted_text;
      }

      // If we don't have the text stored, try to fetch the document file
      const { data: fileData, error: fileError } = await supabase.storage
        .from('documents')
        .download(documentData.path);

      if (fileError) {
        throw new Error(`Failed to download complaint document: ${fileError.message}`);
      }

      // Convert the file to text
      const text = await fileData.text();
      setIsLoading(false);
      return text;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching complaint text';
      setError(new Error(errorMessage));
      setIsLoading(false);
      throw new Error(errorMessage);
    }
  };

  return {
    getComplaintText,
    isLoading,
    error
  };
}; 