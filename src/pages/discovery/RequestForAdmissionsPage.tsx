import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

// UI Components
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft } from "lucide-react";

// API Integration
import { extractComplaintInformation, ComplaintInformation } from "@/integrations/gemini/client";

// Discovery Components
import ComplaintDocumentSection from "@/components/discovery/ComplaintDocumentSection";
import UploadComplaintSection from "@/components/discovery/UploadComplaintSection";
import InitialScreen from "@/components/discovery/InitialScreen";
import HelpSection from "@/components/discovery/HelpSection";
import ExtractedDataDialog from "@/components/discovery/ExtractedDataDialog";
import DocumentViewer from "@/components/discovery/DocumentViewer";
import RequestForAdmissionsEditor from "@/components/discovery/RequestForAdmissionsEditor";

// Types
import { CaseData, Document } from "@/components/discovery/types";

const RequestForAdmissionsPage = () => {
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
          toast({
            title: "Warning",
            description: "Could not remove the old complaint file from storage.",
            variant: "default",
          });
        }

        if (complaintDocument) {
            const { error: deleteDbError } = await supabase
                .from('documents')
                .delete()
                .eq('id', complaintDocument.id);
            if (deleteDbError) {
                console.error('Error deleting old complaint from database:', deleteDbError);
            }
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
            Request for Admissions
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Ask opposing party to admit or deny specific facts for{" "}
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

        {/* Request for Admissions Section */}
        {showDocumentSection && extractedData && (
          <div className="space-y-4">
            <RequestForAdmissionsEditor
              extractedData={extractedData}
              caseId={caseId}
            />
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

export default RequestForAdmissionsPage;








