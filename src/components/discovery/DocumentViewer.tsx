import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { FileText, Download, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";

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
  const { user } = useAuth();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isFromStorage, setIsFromStorage] = useState<boolean>(false);

  useEffect(() => {
    if (documentId && open) {
      fetchDocument();
    } else {
      setDocument(null);
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
    if (!documentId || !user) return;
    
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
        .list(`${user.id}/cases/${effectiveCaseId}`);
      
      if (error) throw error;
      
      // Find the file with the matching ID
      const file = files?.find(f => f.id === documentId);
      
      if (!file) throw new Error("File not found in storage");
      
      // Get the file path
      const filePath = `${user.id}/cases/${effectiveCaseId}/${file.name}`;
      
      // Create a signed URL with 1 hour expiry
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('doculaw')
        .createSignedUrl(filePath, 3600);
      
      if (signedUrlError) throw signedUrlError;
      
      // Create a document object
      const storageDocument: Document = {
        id: documentId,
        user_id: user.id,
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
      setIsFromStorage(true);
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

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="shrink-0 px-6 pt-6">
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
            View the PDF document
          </DialogDescription>
        </DialogHeader>
        
        {/* PDF viewer container that fills the available space */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : document ? (
            <iframe 
              src={document.url}
              className="w-full h-full"
              title="Document Preview"
              style={{ height: "100%", border: "none" }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No document selected</p>
            </div>
          )}
        </div>
        
        <DialogFooter className="shrink-0 px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          
          {document && (
            <Button
              variant="outline"
              onClick={() => window.open(document.url, '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentViewer; 