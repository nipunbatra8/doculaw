import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Save, Download, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Define Document type
interface Document {
  id: string;
  user_id: string;
  case_id: string | null;
  name: string;
  path: string;
  url: string;
  type: string;
  size: number;
  extracted_text: string | null;
  created_at: string;
  updated_at: string | null;
}

interface DocumentViewerProps {
  documentId: string | null;
  caseId?: string;
  open: boolean;
  onClose: () => void;
}

const DocumentViewer = ({ documentId, caseId, open, onClose }: DocumentViewerProps) => {
  const { toast } = useToast();
  const [document, setDocument] = useState<Document | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [isFromStorage, setIsFromStorage] = useState<boolean>(false);

  useEffect(() => {
    if (documentId && open) {
      fetchDocument();
    } else {
      setDocument(null);
      setExtractedText("");
      setIsFromStorage(false);
    }
  }, [documentId, open]);

  const fetchDocument = async () => {
    if (!documentId) return;
    
    setLoading(true);
    
    try {
      // First try to fetch from the documents table
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();
      
      if (error) {
        // If not found in database, check if it's a storage object
        if (error.code === 'PGRST116') {
          // Get the file from storage
          await fetchFromStorage();
        } else {
          throw error;
        }
      } else {
        // Document found in database
        setDocument(data);
        setExtractedText(data.extracted_text || "");
        setIsFromStorage(false);
        
        // Get a signed URL for the document
        await updateDocumentWithSignedUrl(data);
      }
    } catch (error) {
      console.error("Error fetching document:", error);
      toast({
        title: "Error",
        description: "Failed to load the document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get a signed URL for a document
  const updateDocumentWithSignedUrl = async (doc: Document) => {
    try {
      // Create a signed URL with 1 hour expiry
      const { data, error } = await supabase.storage
        .from('doculaw')
        .createSignedUrl(doc.path, 3600);
      
      if (error) throw error;
      
      if (data) {
        // Update document with signed URL
        setDocument({
          ...doc,
          url: data.signedUrl
        });
      }
    } catch (e) {
      console.error("Error getting signed URL:", e);
      // Continue with the existing URL if there's an error
    }
  };

  const fetchFromStorage = async () => {
    if (!documentId) return;
    
    try {
      // Use the provided caseId or try to get it from the URL
      const effectiveCaseId = caseId || (() => {
        const pathParts = window.location.pathname.split('/');
        return pathParts[pathParts.indexOf('case') + 1];
      })();
      
      // If we don't have a caseId, we can't fetch from storage properly
      if (!effectiveCaseId) throw new Error("Case ID not available");
      
      // List files in the case directory
      const { data: files, error } = await supabase.storage
        .from('doculaw')
        .list(`cases/${effectiveCaseId}`);
      
      if (error) throw error;
      
      // Find the file with the matching ID
      const file = files?.find(f => f.id === documentId);
      
      if (!file) throw new Error("File not found in storage");
      
      // Get the file path
      const filePath = `cases/${effectiveCaseId}/${file.name}`;
      
      // Create a signed URL with 1 hour expiry
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('doculaw')
        .createSignedUrl(filePath, 3600);
      
      if (signedUrlError) throw signedUrlError;
      
      // Create a document object
      const storageDocument: Document = {
        id: documentId,
        user_id: '', // We don't know the user ID from storage
        case_id: effectiveCaseId,
        name: file.name,
        path: filePath,
        url: signedUrlData.signedUrl,
        type: getFileTypeFromName(file.name),
        size: file.metadata?.size || 0,
        extracted_text: null,
        created_at: file.created_at || new Date().toISOString(),
        updated_at: null
      };
      
      setDocument(storageDocument);
      setExtractedText("");
      setIsFromStorage(true);
      
      // Try to extract text
      try {
        const { data, error } = await supabase.storage
          .from('doculaw')
          .download(filePath);
          
        if (error) throw error;
        
        if (data) {
          // Use pdf-to-text to extract text
          const fileObj = new File([data], file.name, { type: 'application/pdf' });
          const pdfToText = (await import('react-pdftotext')).default;
          const text = await pdfToText(fileObj);
          setExtractedText(text);
        }
      } catch (extractError) {
        console.error("Error extracting text:", extractError);
        // Continue even if extraction fails
      }
    } catch (error) {
      console.error("Error fetching from storage:", error);
      throw error;
    }
  };

  // Helper function to determine file type from filename
  const getFileTypeFromName = (fileName: string) => {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('complaint')) {
      return 'complaint';
    } else if (lowerName.includes('interrogator')) {
      return 'interrogatories';
    } else if (lowerName.includes('admission')) {
      return 'admissions';
    } else if (lowerName.includes('production')) {
      return 'production';
    } else {
      return 'document';
    }
  };

  const handleSaveText = async () => {
    if (!document) return;
    
    setSaving(true);
    
    try {
      if (isFromStorage) {
        // Store in the database first
        const { data, error } = await supabase
          .from('documents')
          .insert({
            user_id: document.user_id || '',
            case_id: document.case_id,
            name: document.name,
            path: document.path,
            url: document.url,
            type: document.type,
            size: document.size,
            extracted_text: extractedText,
            created_at: document.created_at
          })
          .select()
          .single();
        
        if (error) throw error;
        
        setDocument(data);
        setIsFromStorage(false);
        
        toast({
          title: "Document Saved",
          description: "The document has been imported to your database."
        });
      } else {
        // Update existing database record
        const { error } = await supabase
          .from('documents')
          .update({
            extracted_text: extractedText,
            updated_at: new Date().toISOString()
          })
          .eq('id', document.id);
        
        if (error) throw error;
        
        toast({
          title: "Document Saved",
          description: "The document text has been updated successfully."
        });
      }
    } catch (error) {
      console.error("Error saving document:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save the document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            {document?.name || "Document Viewer"}
            {isFromStorage && (
              <span className="ml-2 text-xs bg-amber-100 text-amber-800 py-1 px-2 rounded-full">
                Storage Only
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {isFromStorage 
              ? "This file exists in storage but not in the database. Save to import it." 
              : "View and edit the extracted text from this document."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row gap-4 h-full flex-grow overflow-hidden">
          {/* PDF Preview */}
          <div className="flex-1 h-full max-h-[50vh] md:max-h-[60vh] overflow-auto border rounded">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : document ? (
              <iframe 
                src={document.url}
                className="w-full h-full border-0"
                title="Document Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No document selected</p>
              </div>
            )}
          </div>
          
          {/* Extracted Text Editor */}
          <div className="flex-1 h-full flex flex-col">
            <h3 className="font-medium text-gray-700 mb-2">Extracted Text</h3>
            <Textarea
              className="flex-grow resize-none min-h-[50vh] md:min-h-[60vh]"
              placeholder={isFromStorage 
                ? "Click Save to extract text and import this document..." 
                : "No text extracted from this document"}
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              disabled={loading || !document}
            />
          </div>
        </div>
        
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={onClose}
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          
          {document && (
            <>
              <Button
                variant="outline"
                onClick={() => window.open(document.url, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              
              <Button
                onClick={handleSaveText}
                disabled={saving || !document}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : isFromStorage ? "Import Document" : "Save Text"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentViewer; 