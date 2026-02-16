import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, FileText, Loader2, AlertCircle, Sparkles } from "lucide-react";

// API Integration
import { extractComplaintInformation, ComplaintInformation } from "@/integrations/gemini/client";

// Discovery Components
import DashboardLayout from "@/components/layout/DashboardLayout";
import ComplaintDocumentSection from "@/components/discovery/ComplaintDocumentSection";
import UploadComplaintSection from "@/components/discovery/UploadComplaintSection";
import InitialScreen from "@/components/discovery/InitialScreen";
import HelpSection from "@/components/discovery/HelpSection";
import ExtractedDataDialog from "@/components/discovery/ExtractedDataDialog";
import DocumentViewer from "@/components/discovery/DocumentViewer";
import RequestForProductionPreview from "@/components/discovery/RequestForProductionPreview";
import { AIEditModal } from "@/components/discovery/AIEditModal";

// Hooks
import { useRFPSupabasePersistence } from "@/hooks/use-rfp-supabase-persistence";

// Types
import { CaseData, Document } from "@/components/discovery/types";

const RequestForProductionPage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State for document upload
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ComplaintInformation | null>(null);
  const [showExtractedDataDialog, setShowExtractedDataDialog] = useState(false);
  
  // State for complaint document
  const [complaintDocument, setComplaintDocument] = useState<Document | null>(null);
  const [isViewingComplaint, setIsViewingComplaint] = useState(false);
  const [replacingComplaint, setReplacingComplaint] = useState(false);
  const [oldComplaintPath, setOldComplaintPath] = useState<string | null>(null);
  const [showDocumentSection, setShowDocumentSection] = useState(false);

  // RFP persistence hooks
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

  // AI Edit state
  const [isAIEditModalOpen, setIsAIEditModalOpen] = useState(false);
  const [isAIEditAllModalOpen, setIsAIEditAllModalOpen] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [currentType, setCurrentType] = useState<'production' | 'definition' | 'productions' | 'definitions'>('production');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch case details
  const { data: caseData, isLoading: isLoadingCase } = useQuery<CaseData>({
    queryKey: ['case', caseId],
    queryFn: async () => {
      if (!user || !caseId) return null;
      
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!caseId
  });

  // Fetch complaint document if exists
  const { data: complaintData, isLoading: isLoadingComplaint } = useQuery<Document | null>({
    queryKey: ['complaint', caseId],
    queryFn: async () => {
      if (!user || !caseId) return null;
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('case_id', caseId)
        .eq('type', 'complaint')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      
      return data;
    },
    enabled: !!user && !!caseId
  });

  // Update the check if complaint exists effect
  useEffect(() => {
    if (!isLoadingCase && !isLoadingComplaint) {
      if (complaintData) {
        setComplaintDocument(complaintData);
        
        if (caseData?.complaint_processed && caseData?.complaint_data) {
          setExtractedData(caseData.complaint_data);
          setShowDocumentSection(true);
        }
      }
    }
  }, [caseData, complaintData, isLoadingCase, isLoadingComplaint]);

  // Handler for file upload
  const handleFileUploaded = async (fileUrl: string, fileText: string, fileName: string) => {
    setUploadedFileUrl(fileUrl);
    setIsExtracting(true);
    
    try {
      if (replacingComplaint && oldComplaintPath && user) {
        const { error: deleteStorageError } = await supabase.storage
          .from('doculaw')
          .remove([oldComplaintPath]);

        if (deleteStorageError) {
          console.error('Error deleting old complaint from storage:', deleteStorageError);
        }

        if (complaintDocument) {
            await supabase.from('documents').delete().eq('id', complaintDocument.id);
        }
        setOldComplaintPath(null);
      }

      const extractedInfo = await extractComplaintInformation(fileText);
      
      setExtractedData(extractedInfo);
      setIsExtracting(false);
      setShowExtractedDataDialog(true);
      
      if (replacingComplaint) {
        toast({
          title: "Complaint Replaced",
          description: "The complaint document has been successfully replaced.",
        });
      }
    } catch (error) {
      console.error("Error extracting information from document:", error);
      toast({
        title: "Information Extraction Limited",
        description: "We couldn't fully extract information from your document.",
        variant: "destructive"
      });
    }
  };

  const handleConfirmExtractedData = () => {
    setShowExtractedDataDialog(false);
    setShowDocumentSection(true);
    
    if (replacingComplaint) {
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
    
    setReplacingComplaint(false);
  };

  const handleViewComplaint = () => {
    if (complaintDocument) {
      setIsViewingComplaint(true);
    } else {
      toast({
        title: "No Complaint Document",
        description: "There is no complaint document uploaded for this case.",
        variant: "destructive"
      });
    }
  };

  const handleReplaceComplaint = () => {
    if (complaintDocument) {
      setOldComplaintPath(complaintDocument.path);
    }
    setReplacingComplaint(true);
  };

  // AI Edit handlers
  const handleAIEditClick = (text: string, type: 'production' | 'definition', index: number) => {
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
    const updatedContent = await editWithAI(prompt, currentText, currentType, currentIndex);
    if (updatedContent) {
      toast({ title: 'Content Updated', description: 'Updated with AI suggestions.' });
    }
    setIsAIEditModalOpen(false);
  };

  const handleAIEditAll = async (prompt: string) => {
    if (currentType !== 'productions' && currentType !== 'definitions') return;
    await editAllWithAI(prompt, currentType);
    toast({ title: 'Content Updated', description: `All ${currentType} updated with AI.` });
    setIsAIEditAllModalOpen(false);
  };

  const handleSave = (editedProductions: string[], editedDefinitions: string[]) => {
    saveData(editedProductions, editedDefinitions, true);
    toast({ title: 'Saved!', description: 'Your changes have been saved.' });
  };

  if (isLoadingCase || isLoadingComplaint) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 gap-6">
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-4"
            onClick={() => navigate(`/case/${caseId}`)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Case
          </Button>
          
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Request for Production
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Request for opposing party to produce documents or other items for{" "}
            <Link to={`/case/${caseId}`} className="text-blue-600 hover:underline">
              {caseData?.name || "this case"}
            </Link>
          </p>
        </div>

        <Separator />

        {/* Uploaded Complaint Section */}
        {complaintDocument && !replacingComplaint && (
          <ComplaintDocumentSection 
            complaintDocument={complaintDocument}
            onViewComplaint={handleViewComplaint}
            onReplaceComplaint={handleReplaceComplaint}
          />
        )}

        {/* Main Content Area */}
        {!showDocumentSection && !replacingComplaint && !isExtracting && !uploadedFileUrl && (
          <InitialScreen 
            complaintDocument={complaintDocument}
            complaintInformation={extractedData}
            caseDetails={caseData ?? null}
            onViewComplaint={handleViewComplaint}
            onReplaceComplaint={handleReplaceComplaint}
            onUploadNew={() => setReplacingComplaint(true)}
          />
        )}
        
        {/* Show upload UI */}
        {(replacingComplaint || isExtracting || uploadedFileUrl) && !showDocumentSection && (
          <UploadComplaintSection 
            onFileUploaded={handleFileUploaded}
            caseId={caseId}
            isReplacing={replacingComplaint}
            isExtracting={isExtracting}
          />
        )}

        {/* Request for Production Section */}
        {showDocumentSection && extractedData && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading Request for Production...</span>
              </div>
            ) : error ? (
              <div className="flex items-center text-red-500 p-4">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span>Error: {error}</span>
              </div>
            ) : productions && definitions && productions.length > 0 && definitions.length > 0 ? (
              <>
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
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 md:p-8 border-2 border-dashed border-gray-300 rounded-lg">
                <FileText className="h-12 w-12 text-gray-400 mb-3" />
                <h3 className="text-lg font-semibold mb-2">Request for Production</h3>
                <p className="text-sm text-gray-500 mb-4 max-w-md">
                  Generate AI-powered production requests and definitions tailored to your case. 
                  Our AI will analyze your complaint and create relevant document requests.
                </p>
                <Button 
                  onClick={generateAndSaveRFP}
                  className="flex items-center gap-2"
                  size="lg"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate with AI
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Help section */}
        <HelpSection />
      </div>
      
      {/* Dialog to confirm extracted data */}
      <ExtractedDataDialog 
        open={showExtractedDataDialog}
        onOpenChange={setShowExtractedDataDialog}
        extractedData={extractedData}
        onUpdateExtractedData={setExtractedData}
        onConfirm={handleConfirmExtractedData}
      />
      
      {/* Document Viewer */}
      {complaintDocument && (
        <DocumentViewer
          documentId={complaintDocument.id}
          caseId={caseId}
          open={isViewingComplaint}
          onClose={() => setIsViewingComplaint(false)}
        />
      )}
    </DashboardLayout>
  );
};

export default RequestForProductionPage;



