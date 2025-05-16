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
        if (documentError.code === 'PGRST116') {
          // No complaint document found
          throw new Error('No complaint document found for this case');
        }
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

  /**
   * Retrieves the complaint document file as a base64 string for the given case
   * @param caseId The ID of the case
   * @returns The complaint document as a base64 string and document metadata
   */
  const getComplaintFileAsBase64 = async (caseId: string): Promise<{
    base64: string;
    fileName: string;
    fileType: string;
    documentData: {
      id: string;
      user_id: string;
      case_id: string;
      name: string;
      path: string;
      url: string;
      type: string;
      size: number;
      created_at: string;
      extracted_text?: string;
      [key: string]: unknown;
    };
  }> => {
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
        if (documentError.code === 'PGRST116') {
          throw new Error('No complaint document found for this case');
        }
        throw new Error(`Failed to fetch complaint document: ${documentError.message}`);
      }

      if (!documentData) {
        throw new Error('No complaint document found for this case');
      }

      // Download the document file
      const { data: fileData, error: fileError } = await supabase.storage
        .from('documents')
        .download(documentData.path);

      if (fileError) {
        throw new Error(`Failed to download complaint document: ${fileError.message}`);
      }

      // Convert file to base64
      const base64 = await convertFileToBase64(fileData);
      
      // Determine file type from name or MIME type
      const fileName = documentData.name;
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
      let fileType = 'application/octet-stream';
      
      if (fileExtension === 'pdf') {
        fileType = 'application/pdf';
      } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
        fileType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;
      } else if (['doc', 'docx'].includes(fileExtension)) {
        fileType = 'application/msword';
      }

      setIsLoading(false);
      return {
        base64,
        fileName,
        fileType,
        documentData
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching complaint file';
      setError(new Error(errorMessage));
      setIsLoading(false);
      throw new Error(errorMessage);
    }
  };

  /**
   * Converts a file to base64 string
   * @param file The file to convert
   * @returns The file as base64 string
   */
  const convertFileToBase64 = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64String = reader.result as string;
        const base64 = base64String.split(',')[1] || base64String;
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  return {
    getComplaintText,
    getComplaintFileAsBase64,
    isLoading,
    error
  };
}; 