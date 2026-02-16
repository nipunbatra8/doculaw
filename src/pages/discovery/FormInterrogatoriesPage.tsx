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
import { ChevronLeft, FileText, Sparkles, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

// API Integration
import { extractComplaintInformation, ComplaintInformation, analyzeCheckboxesForFormInterrogatories } from "@/integrations/gemini/client";
import { useCaseDocuments } from "@/hooks/use-case-documents";

// Discovery Components
import CaseInformationCard from "@/components/discovery/CaseInformationCard";
import ComplaintDocumentSection from "@/components/discovery/ComplaintDocumentSection";
import UploadComplaintSection from "@/components/discovery/UploadComplaintSection";
import InitialScreen from "@/components/discovery/InitialScreen";
import HelpSection from "@/components/discovery/HelpSection";
import ExtractedDataDialog from "@/components/discovery/ExtractedDataDialog";
import DocumentViewer from "@/components/discovery/DocumentViewer";
import FormInterrogatoriesPreview from "@/components/discovery/FormInterrogatoriesPreview";

// Types
import { CaseData, Document, STEPS } from "@/components/discovery/types";

const FormInterrogatoriesPage = () => {
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
  
  // State for form generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [enhancedData, setEnhancedData] = useState<ComplaintInformation | null>(null);
  const [checkingStorage, setCheckingStorage] = useState(false);
  const [storedPdfPath, setStoredPdfPath] = useState<string | null>(null);
  
  const { getComplaintFileAsBase64 } = useCaseDocuments();

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

  // Check if form has been previously generated and stored
  useEffect(() => {
    const checkStored = async () => {
      if (!caseId) return;
      setCheckingStorage(true);
      try {
        const folder = `cases/${caseId}/forms`;
        const { data, error } = await supabase.storage.from('doculaw').list(folder, { search: 'Form_Interrogatories.pdf' });
        if (error) console.warn('Storage list error:', error.message);
        const file = data?.find(f => f.name === 'Form_Interrogatories.pdf');
        if (file) {
          const fullPath = `${folder}/Form_Interrogatories.pdf`;
          setStoredPdfPath(fullPath);
          setIsGenerated(true);
        }
      } catch (e) {
        console.warn('Error checking stored PDF:', e);
      } finally {
        setCheckingStorage(false);
      }
    };
    checkStored();
  }, [caseId]);

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
    
    // Extract information from the uploaded document using Gemini API
    setIsExtracting(true);
    
    try {
      // If we were replacing a complaint, and we have the old path, delete it from storage
      if (replacingComplaint && oldComplaintPath && user) {
        const { error: deleteStorageError } = await supabase.storage
          .from('doculaw')
          .remove([oldComplaintPath]);

        if (deleteStorageError) {
          console.error('Error deleting old complaint from storage:', deleteStorageError);
          toast({
            title: "Warning",
            description: "Could not remove the old complaint file from storage. Please check manually.",
            variant: "default",
          });
        }

        // Also delete the old complaint document record from the 'documents' table
        if (complaintDocument) {
            const { error: deleteDbError } = await supabase
                .from('documents')
                .delete()
                .eq('id', complaintDocument.id);
            if (deleteDbError) {
                console.error('Error deleting old complaint from database:', deleteDbError);
                toast({
                    title: "Warning",
                    description: "Could not remove the old complaint record from the database.",
                    variant: "default",
                });
            }
        }
        setOldComplaintPath(null);
      }

      // Call the Gemini API to extract information from the document text
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
    setShowDocumentSection(true);
    
    if (replacingComplaint) {
      toast({
        title: "Complaint Updated",
        description: "The complaint has been replaced and information updated.",
      });
      
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
    if (complaintDocument) {
      setOldComplaintPath(complaintDocument.path);
    }
    setReplacingComplaint(true);
  };

  // Function to generate form with AI checkbox analysis
  const handleGenerateForm = async () => {
    if (!extractedData || !caseId) {
      toast({
        title: "Missing Data",
        description: "Please upload a complaint document first.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      let dataForForm = { ...extractedData };
      
      // Try to get the full complaint text for better analysis
      try {
        const complaintFileData = await getComplaintFileAsBase64(caseId);
        
        if (complaintFileData) {
          // Try to get text from extracted_text field, or use the base64 for processing
          const complaintText = complaintFileData.documentData.extracted_text || '';
          
          toast({
            title: "Analyzing Complaint",
            description: "AI is analyzing your complaint to determine relevant sections...",
          });
          
          // Use Gemini to analyze which checkboxes should be selected
          const enhancedDataWithCheckboxes = await analyzeCheckboxesForFormInterrogatories(
            dataForForm,
            complaintText || undefined
          );
          
          dataForForm = enhancedDataWithCheckboxes;
          
          // Show what was selected
          if (dataForForm.relevantCheckboxes) {
            const checkedSections = [];
            if (dataForForm.relevantCheckboxes.section301) checkedSections.push("General (301-309)");
            if (dataForForm.relevantCheckboxes.section310) checkedSections.push("Personal Injury (310-318)");
            if (dataForForm.relevantCheckboxes.section320) checkedSections.push("Motor Vehicles (320-323)");
            if (dataForForm.relevantCheckboxes.section330) checkedSections.push("Pedestrian/Bicycle (330-332)");
            if (dataForForm.relevantCheckboxes.section340) checkedSections.push("Premises Liability (340-340.7)");
            if (dataForForm.relevantCheckboxes.section350) checkedSections.push("Business/Contract (350-355)");
            if (dataForForm.relevantCheckboxes.section360) checkedSections.push("Employment - Discrimination (360-360.7)");
            if (dataForForm.relevantCheckboxes.section370) checkedSections.push("Employment - Wage/Hour (370-376)");
            
            if (checkedSections.length > 0) {
              toast({
                title: "Form Generated",
                description: `Selected sections: ${checkedSections.join(", ")}`,
              });
            }
          }
        }
      } catch (analysisError) {
        console.warn('Error analyzing form with Gemini:', analysisError);
        toast({
          title: 'Checkbox Analysis Limited',
          description: 'Could not fully analyze which checkboxes should be selected. Default sections will be used.',
          variant: 'default',
        });
        dataForForm = {
          ...dataForForm,
          relevantCheckboxes: {
            ...(dataForForm.relevantCheckboxes || {}),
            section301: true
          }
        };
      }
      
      setEnhancedData(dataForForm);
      setExtractedData(dataForForm);
      setIsGenerated(true);
      
      toast({
        title: 'Form Ready',
        description: 'Form Interrogatories has been analyzed and is ready to preview.',
      });
    } catch (error) {
      console.error('Error generating form:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Generation Failed',
        description: `Failed to generate the form: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Loading state
  if (isLoadingCase || isLoadingComplaint) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6 animate-pulse">
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
            Form Interrogatories
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Standard set of questions approved for use in{" "}
            <Link to={`/case/${caseId}`} className="text-blue-600 hover:underline">
              {caseData?.name || "this case"}
            </Link>
          </p>
        </div>

        <Separator />

        {/* Uploaded Complaint Section - Show when a complaint exists */}
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
        
        {/* Show upload UI when actively uploading or replacing */}
        {(replacingComplaint || isExtracting || uploadedFileUrl) && !showDocumentSection && (
          <UploadComplaintSection 
            onFileUploaded={handleFileUploaded}
            caseId={caseId}
            isReplacing={replacingComplaint}
            isExtracting={isExtracting}
          />
        )}

        {/* Form Interrogatories Section */}
        {showDocumentSection && extractedData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg md:text-xl">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                Form Interrogatories
              </CardTitle>
              <CardDescription className="text-sm">
                {!isGenerated 
                  ? "Generate form interrogatories with AI-selected sections relevant to your case."
                  : "Preview and download standard form interrogatories filled with your case information."
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {checkingStorage ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-gray-600">Checking for existing form...</span>
                </div>
              ) : !isGenerated ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Our AI will analyze your complaint document and automatically select the most relevant
                    form interrogatory sections and checkboxes for your case.
                  </p>
                  <Button
                    onClick={handleGenerateForm}
                    disabled={isGenerating || !extractedData}
                    className="flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing Complaint...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <FormInterrogatoriesPreview
                  extractedData={enhancedData || extractedData}
                  onEditData={() => setShowExtractedDataDialog(true)}
                  caseId={caseId}
                />
              )}
            </CardContent>
          </Card>
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

export default FormInterrogatoriesPage;



