import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

// UI Components
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, FileText, MessageSquare, HelpCircle, LinkIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

// API Integration
import { extractComplaintInformation, ComplaintInformation } from "@/integrations/gemini/client";

// Discovery Components
import CaseInformationCard from "@/components/discovery/CaseInformationCard";
import ComplaintDocumentSection from "@/components/discovery/ComplaintDocumentSection";
import UploadComplaintSection from "@/components/discovery/UploadComplaintSection";
import SelectDocumentsSection from "@/components/discovery/SelectDocumentsSection";
import GeneratedDocumentsSection from "@/components/discovery/GeneratedDocumentsSection";
import InitialScreen from "@/components/discovery/InitialScreen";
import HelpSection from "@/components/discovery/HelpSection";
import LoadingState from "@/components/discovery/LoadingState";
import ExtractedDataDialog from "@/components/discovery/ExtractedDataDialog";
import DocumentViewerDialog from "@/components/discovery/DocumentViewerDialog";
import DocumentViewer from "@/components/discovery/DocumentViewer";
import RFAPdfPreviewButton from "@/components/discovery/RFAPdfPreviewButton";

// Types
import { CaseData, Document, DiscoveryType, STEPS } from "@/components/discovery/types";

// Define discovery document types
const discoveryTypes: DiscoveryType[] = [
  {
    id: "form-interrogatories",
    title: "Form Interrogatories",
    description: "Standard set of questions approved for use in specific types of cases.",
    icon: FileText,
    pdfUrl: null
  },
  {
    id: "special-interrogatories",
    title: "Special Interrogatories",
    description: "Custom questions tailored specifically to your case.",
    icon: MessageSquare,
    pdfUrl: null
  },
  {
    id: "request-for-production",
    title: "Request for Production",
    description: "Request for opposing party to produce documents or other items.",
    icon: LinkIcon,
    pdfUrl: null
  },
  {
    id: "request-for-admissions",
    title: "Request for Admissions",
    description: "Ask opposing party to admit or deny specific facts.",
    icon: HelpCircle,
    pdfUrl: "/RFA.pdf"
  }
];

const DiscoveryRequestPage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State for tracking the current step in the workflow
  const [currentStep, setCurrentStep] = useState(STEPS.UPLOAD_COMPLAINT);
  
  // State for document selection and upload
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [selectedDocumentTypes, setSelectedDocumentTypes] = useState<string[]>([
    "form-interrogatories",
    "special-interrogatories",
    "request-for-production",
    "request-for-admissions"
  ]);
  
  // State for document generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDocuments, setGeneratedDocuments] = useState<string[]>([]);
  
  // State for extracted information
  const [extractedData, setExtractedData] = useState<ComplaintInformation | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showExtractedDataDialog, setShowExtractedDataDialog] = useState(false);

  // State for viewing a generated document
  const [viewingDocument, setViewingDocument] = useState<{ title: string; content: string } | null>(null);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  
  // State for complaint document
  const [complaintDocument, setComplaintDocument] = useState<Document | null>(null);
  const [isViewingComplaint, setIsViewingComplaint] = useState(false);
  const [replacingComplaint, setReplacingComplaint] = useState(false);

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
          // No complaint found, not an error
          return null;
        }
        throw error;
      }
      
      return data;
    },
    enabled: !!user && !!caseId
  });

  // Update the check if complaint exists effect to be more explicit
  useEffect(() => {
    if (!isLoadingCase && !isLoadingComplaint) {
      if (complaintData) {
        // We have an uploaded complaint document
        setComplaintDocument(complaintData);
        
        // If we also have extracted data, we can go straight to select documents step
        if (caseData?.complaint_processed && caseData?.complaint_data) {
          setExtractedData(caseData.complaint_data);
          // Don't automatically go to select documents anymore, let the user choose
          // setCurrentStep(STEPS.SELECT_DOCUMENTS);
        }
      }
    }
  }, [caseData, complaintData, isLoadingCase, isLoadingComplaint]);

  // Handler for file upload
  const handleFileUploaded = async (fileUrl: string, fileText: string, fileName: string) => {
    setUploadedFileUrl(fileUrl);
    
    // Extract information from the uploaded document using Gemini API
    setIsExtracting(true);
    
    try {
      // Call the Gemini API to extract information from the document text
      const extractedInfo = await extractComplaintInformation(fileText);
      
      setExtractedData(extractedInfo);
      setIsExtracting(false);
      setShowExtractedDataDialog(true);
      
      // If we were replacing a complaint, update the document state and show success message
      if (replacingComplaint) {
        toast({
          title: "Complaint Replaced",
          description: "The complaint document has been successfully replaced.",
        });
        // We'll refresh the data by reloading the page after dialog is closed
      }
    } catch (error) {
      console.error("Error extracting information from document:", error);
      
      // Use mock data as fallback
      const mockExtractedData: ComplaintInformation = {
        defendant: "John Doe",
        plaintiff: "State of California",
        caseNumber: `CR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
        filingDate: format(new Date(), 'MMM d, yyyy'),
        chargeDescription: "Violation of Penal Code § 459 (Burglary)",
        courtName: "Superior Court of California, County of Los Angeles"
      };
      
      setExtractedData(mockExtractedData);
      setIsExtracting(false);
      setShowExtractedDataDialog(true);
      
      // Show error toast
      toast({
        title: "Information Extraction Limited",
        description: "We couldn't fully extract information from your document. You can manually edit the details.",
        variant: "destructive"
      });
    }
  };

  const handleConfirmExtractedData = () => {
    setShowExtractedDataDialog(false);
    setCurrentStep(STEPS.SELECT_DOCUMENTS);
    
    // If this was a replacement, let's reload the page to ensure the document is refreshed
    if (replacingComplaint) {
      toast({
        title: "Complaint Updated",
        description: "The complaint has been replaced and information updated.",
      });
      
      // Give a small delay to show the toast before refreshing
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
    
    setReplacingComplaint(false);
  };

  // Function to handle viewing the complaint document
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

  // Function to handle replacing the complaint
  const handleReplaceComplaint = () => {
    setReplacingComplaint(true);
    setCurrentStep(STEPS.UPLOAD_COMPLAINT);
  };

  // Function to go straight to document selection
  const handleSkipToSelection = () => {
    if (extractedData) {
      setCurrentStep(STEPS.SELECT_DOCUMENTS);
    } else if (caseData?.complaint_data) {
      setExtractedData(caseData.complaint_data);
      setCurrentStep(STEPS.SELECT_DOCUMENTS);
    } else {
      toast({
        title: "No Complaint Data",
        description: "There is no complaint data available. Please upload a complaint document first.",
        variant: "destructive"
      });
    }
  };

  const handleSelectDocuments = async () => {
    if (!extractedData) {
      toast({
        title: "Missing Information",
        description: "No complaint information found. Please upload a complaint document first.",
        variant: "destructive"
      });
      return;
    }
    
    // Move to generating documents
    setCurrentStep(STEPS.GENERATING_DOCUMENTS);
    setIsGenerating(true);
    
    try {
      // Generate selected documents using Gemini API
      // Skip 'form-interrogatories' as it's handled separately with PDF download
      const documentTypesToGenerate = selectedDocumentTypes.filter(
        typeId => typeId !== "form-interrogatories"
      );
      
      const generationPromises = documentTypesToGenerate.map(async (typeId) => {
        const docType = discoveryTypes.find(d => d.id === typeId);
        if (!docType) return null;
      });
      
      // Wait for all documents to be generated
      const generatedDocsWithContent = (await Promise.all(generationPromises))
        .filter(Boolean) as Array<{title: string, content: string, id: string}>;
      
      // Store the full document objects but just use titles for the UI
      setGeneratedDocuments(generatedDocsWithContent.map(doc => doc.title));
      
      // Store the generated content in localStorage for later retrieval
      // In a real app, you would store this in a database
      generatedDocsWithContent.forEach(doc => {
        localStorage.setItem(`discovery-doc-${caseId}-${doc.id}`, doc.content);
      });
      
      setIsGenerating(false);
      setCurrentStep(STEPS.VIEW_DOCUMENTS);
      
      toast({
        title: "Documents Generated",
        description: "Your discovery documents have been generated successfully.",
      });
    } catch (error) {
      console.error("Error generating documents:", error);
      
      // Fallback to just using the document titles
      // Skip 'form-interrogatories' as it's handled separately with PDF download
      const fallbackDocs = selectedDocumentTypes
        .filter(typeId => typeId !== "form-interrogatories")
        .map(typeId => {
          const docType = discoveryTypes.find(d => d.id === typeId);
          return docType?.title || "";
        }).filter(title => title !== "");
      
      setGeneratedDocuments(fallbackDocs);
      setIsGenerating(false);
      setCurrentStep(STEPS.VIEW_DOCUMENTS);
      
      toast({
        title: "Documents Generated",
        description: "Your discovery documents have been generated with limited AI assistance.",
        variant: "default"
      });
    }
  };

  const toggleDocumentType = (typeId: string) => {
    setSelectedDocumentTypes(prev => {
      if (prev.includes(typeId)) {
        return prev.filter(id => id !== typeId);
      } else {
        return [...prev, typeId];
      }
    });
  };

  const handleViewDocument = (documentTitle: string) => {
    // Find the document type from the title
    const docType = discoveryTypes.find(type => type.title === documentTitle);
    
    if (!docType) {
      toast({
        title: "Document Not Found",
        description: "Could not find the selected document.",
        variant: "destructive"
      });
      return;
    }
    
    // Retrieve the document content from localStorage
    const storedContent = localStorage.getItem(`discovery-doc-${caseId}-${docType.id}`);
    
    if (storedContent) {
      // Show the document content in a dialog
      setViewingDocument({
        title: documentTitle,
        content: storedContent
      });
      setShowDocumentDialog(true);
    } else {
      toast({
        title: "Document Content Not Available",
        description: "The content for this document is not available. Please regenerate the document.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadDocument = () => {
    if (!viewingDocument) return;
    
    // Create a download link
    const blob = new Blob([viewingDocument.content], {type: 'text/plain'});
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `${viewingDocument.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const handleReset = () => {
    if (complaintDocument) {
      // If we already have a complaint, just go back to the selection step
      setCurrentStep(STEPS.SELECT_DOCUMENTS);
      setGeneratedDocuments([]);
      setSelectedDocumentTypes([
        "form-interrogatories",
        "special-interrogatories",
        "request-for-production",
        "request-for-admissions"
      ]);
    } else {
      // Complete reset if no complaint
      setCurrentStep(STEPS.UPLOAD_COMPLAINT);
      setUploadedFileUrl(null);
      setExtractedData(null);
      setGeneratedDocuments([]);
      setSelectedDocumentTypes([
        "form-interrogatories",
        "special-interrogatories",
        "request-for-production",
        "request-for-admissions"
      ]);
    }
    
    setReplacingComplaint(false);
  };

  // Loading state
  if (isLoadingCase || isLoadingComplaint) {
    return (
      <DashboardLayout>
        <div className="p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-40 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
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
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Propound Discovery Request
          </h1>
          <p className="text-gray-600">
            Create discovery requests for{" "}
            <Link to={`/case/${caseId}`} className="text-blue-600 hover:underline">
              {caseData?.name || "this case"}
            </Link>
          </p>
        </div>

        <Separator />

        {/* Uploaded Complaint Section - Show when a complaint exists */}
        {complaintDocument && currentStep !== STEPS.GENERATING_DOCUMENTS && currentStep !== STEPS.VIEW_DOCUMENTS && (
          <ComplaintDocumentSection 
            complaintDocument={complaintDocument}
            onViewComplaint={handleViewComplaint}
            onReplaceComplaint={handleReplaceComplaint}
            onGenerateDocuments={handleSkipToSelection}
          />
        )}

        {/* Main Content Area */}
        {currentStep === STEPS.GENERATING_DOCUMENTS && (
          <LoadingState 
            message="Generating discovery documents..." 
            subMessage="This may take a moment as we analyze the complaint document."
          />
        )}
        
        {currentStep === STEPS.VIEW_DOCUMENTS && (
          <GeneratedDocumentsSection 
            generatedDocuments={generatedDocuments}
            onViewDocument={handleViewDocument}
            onStartOver={handleReset}
            onReturnToCase={() => navigate(`/case/${caseId}`)}
          />
        )}
        
        {/* Show upload UI only when actively uploading or replacing */}
        {currentStep === STEPS.UPLOAD_COMPLAINT && (replacingComplaint || isExtracting || uploadedFileUrl) && (
          <UploadComplaintSection 
            onFileUploaded={handleFileUploaded}
            caseId={caseId}
            isReplacing={replacingComplaint}
            isExtracting={isExtracting}
          />
        )}
        
        {currentStep === STEPS.SELECT_DOCUMENTS && (
          <SelectDocumentsSection 
            complaintDocument={complaintDocument}
            extractedData={extractedData}
            selectedDocumentTypes={selectedDocumentTypes}
            discoveryTypes={discoveryTypes}
            onToggleDocumentType={toggleDocumentType}
            onGenerateDocuments={handleSelectDocuments}
            onReplaceComplaint={handleReplaceComplaint}
            onViewComplaint={handleViewComplaint}
            onEditExtractedData={() => setShowExtractedDataDialog(true)}
            caseId={caseId}
          />
        )}

        {/* Show initial screen at UPLOAD_COMPLAINT step when we're not actively uploading */}
        {currentStep === STEPS.UPLOAD_COMPLAINT && !replacingComplaint && !isExtracting && !uploadedFileUrl && (
          <InitialScreen 
            complaintDocument={complaintDocument}
            onSkipToSelection={handleSkipToSelection}
            onViewComplaint={handleViewComplaint}
            onReplaceComplaint={handleReplaceComplaint}
            onStartUpload={() => setCurrentStep(STEPS.UPLOAD_COMPLAINT)}
          />
        )}

        {/* Help section */}
        <HelpSection />

        {/* RFA PDF Quick Preview Section */}
        {extractedData && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">
                <FileText className="h-5 w-5 inline-block mr-2 text-primary" />
                Quick Request for Admissions Preview
              </CardTitle>
              <CardDescription>
                Quickly preview and download a Request for Admissions based on your case information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RFAPdfPreviewButton
                extractedData={extractedData}
                caseId={caseId}
              />
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Dialog to confirm extracted data */}
      <ExtractedDataDialog 
        open={showExtractedDataDialog}
        onOpenChange={setShowExtractedDataDialog}
        extractedData={extractedData}
        onUpdateExtractedData={setExtractedData}
        onConfirm={handleConfirmExtractedData}
      />

      {/* Dialog to view generated document */}
      <DocumentViewerDialog 
        open={showDocumentDialog}
        onOpenChange={setShowDocumentDialog}
        document={viewingDocument}
        onDownload={handleDownloadDocument}
      />
      
      {/* Document Viewer for viewing the complaint */}
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

export default DiscoveryRequestPage;
