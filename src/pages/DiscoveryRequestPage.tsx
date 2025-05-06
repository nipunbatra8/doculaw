import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { 
  ChevronLeft, 
  FileText, 
  Link as LinkIcon,
  ExternalLink,
  MessageSquare,
  HelpCircle,
  Upload,
  Check,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import DocumentUploader from "@/components/discovery/DocumentUploader";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { extractComplaintInformation, generateDiscoveryDocument, ComplaintInformation } from "@/integrations/gemini/client";
import { Textarea } from "@/components/ui/textarea";

// Define the CaseData type for our query result
type CaseData = {
  id: string;
  name: string;
  client: string | null;
  case_type: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  archived_at: string | null;
};

// Using ComplaintInformation from the Gemini client instead
// interface ExtractedComplaintData {
//   defendant: string;
//   plaintiff: string;
//   caseNumber: string;
//   filingDate: string;
//   chargeDescription: string;
//   courtName: string;
// }

const discoveryTypes = [
  {
    id: "form-interrogatories",
    title: "Form Interrogatories",
    description: "Standard set of questions approved for use in specific types of cases.",
    icon: FileText,
    pdfUrl: "https://courts.ca.gov/sites/default/files/courts/default/2024-11/disc001.pdf"
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
    pdfUrl: null
  }
];

// Define the steps in our workflow
const STEPS = {
  UPLOAD_COMPLAINT: 0,
  SELECT_DOCUMENTS: 1,
  REVIEW_EXTRACTED_INFO: 2,
  GENERATING_DOCUMENTS: 3,
  VIEW_DOCUMENTS: 4
};

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

  // Fetch case details
  const { data: caseData, isLoading } = useQuery<CaseData>({
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
  };

  const handleSelectDocuments = async () => {
    if (!extractedData) return;
    
    // Move to generating documents
    setCurrentStep(STEPS.GENERATING_DOCUMENTS);
    setIsGenerating(true);
    
    try {
      // Generate selected documents using Gemini API
      const generationPromises = selectedDocumentTypes.map(async (typeId) => {
        const docType = discoveryTypes.find(d => d.id === typeId);
        if (!docType) return null;
        
        // Call Gemini API to generate document content
        const docContent = await generateDiscoveryDocument(docType.title, extractedData);
        
        // Return both the document title and its content
        return {
          title: docType.title,
          content: docContent,
          id: typeId
        };
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
      const fallbackDocs = selectedDocumentTypes.map(typeId => {
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

  const handleReset = () => {
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
  };

  // Loading state
  if (isLoading) {
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

  // Render case information section
  const renderCaseInfo = () => {
    // Format case number directly from id and created_at
    const caseNumber = `CV-${new Date(caseData?.created_at || new Date()).getFullYear()}-${caseData?.id?.substring(0, 5) || "00000"}`;
      
    // Format filing date directly from created_at
    const filingDate = caseData?.created_at 
      ? format(parseISO(caseData.created_at), 'MMM d, yyyy') 
      : format(new Date(), 'MMM d, yyyy');
    
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Case Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Case Name:</span>
                <span className="font-medium">{caseData?.name || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Case Number:</span>
                <span className="font-medium">{caseNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Filing Date:</span>
                <span>{filingDate}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <Badge variant={
                  caseData?.status === "Active" ? "default" : 
                  caseData?.status === "Pending" ? "secondary" : 
                  "outline"
                }>
                  {caseData?.status || "Active"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type:</span>
                <span>{caseData?.case_type || "Criminal"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Client:</span>
                <span className="font-medium">{caseData?.client || "No client assigned"}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
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
        
        {/* Case Information Card */}
        {renderCaseInfo()}

        {/* Main Content Area */}
        {currentStep === STEPS.GENERATING_DOCUMENTS && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-lg text-gray-700 font-medium">Generating discovery documents...</p>
            <p className="text-gray-500 mt-2">This may take a moment as we analyze the complaint document.</p>
          </div>
        )}
        
        {currentStep === STEPS.VIEW_DOCUMENTS && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Generated Discovery Documents</h2>
            <p className="text-gray-600">
              The following discovery documents have been generated based on the uploaded complaint. 
              Select a document to view, edit, save, or download.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {generatedDocuments.map((doc, index) => (
                <Card 
                  key={index}
                  className="cursor-pointer hover:border-blue-500 transition-colors"
                >
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{doc}</CardTitle>
                      <CardDescription>
                        Generated from complaint document
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" onClick={() => handleViewDocument(doc)}>
                      View & Edit
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="mt-8">
              <Button 
                variant="outline" 
                onClick={handleReset}
                className="mr-2"
              >
                Start Over
              </Button>
              <Button onClick={() => navigate(`/case/${caseId}`)}>
                Return to Case
              </Button>
            </div>
          </div>
        )}
        
        {currentStep === STEPS.UPLOAD_COMPLAINT && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Step 1: Upload Criminal Complaint</h2>
            <p className="text-gray-600">
              Upload the criminal complaint document to generate appropriate discovery requests.
            </p>
            
            <Card className="mt-6">
              <CardContent className="pt-6 pb-6">
                <DocumentUploader 
                  onFileUploaded={handleFileUploaded} 
                  caseId={caseId}
                  documentType="Complaint"
                />
              </CardContent>
            </Card>
            
            {isExtracting && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-700">Extracting information from document...</p>
              </div>
            )}
          </div>
        )}
        
        {currentStep === STEPS.SELECT_DOCUMENTS && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Step 2: Select Discovery Documents</h2>
            <p className="text-gray-600">
              Choose which discovery documents you want to generate based on the uploaded complaint.
            </p>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Selected Complaint</CardTitle>
                <CardDescription>
                  The following complaint has been analyzed:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-md">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">Criminal Complaint</p>
                    <p className="text-sm text-gray-500">
                      {extractedData?.caseNumber} - {extractedData?.defendant}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Discovery Document Types</CardTitle>
                <CardDescription>
                  Select the types of discovery documents you want to generate:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {discoveryTypes.map(type => (
                    <div key={type.id} className="flex items-start space-x-3 p-2 rounded-md hover:bg-gray-50">
                      <Checkbox 
                        id={type.id} 
                        className="mt-1"
                        checked={selectedDocumentTypes.includes(type.id)}
                        onCheckedChange={() => toggleDocumentType(type.id)}
                      />
                      <div className="flex-1">
                        <label htmlFor={type.id} className="font-medium flex items-center cursor-pointer">
                          <type.icon className="h-5 w-5 mr-2 text-primary" />
                          {type.title}
                        </label>
                        <p className="text-sm text-gray-500 ml-7">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={handleSelectDocuments} disabled={selectedDocumentTypes.length === 0}>
                  Generate Selected Documents
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* Help section */}
        <div className="bg-blue-50 p-4 rounded-md mt-8">
          <div className="flex items-start">
            <div className="bg-blue-100 p-2 rounded-full mr-4">
              <HelpCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-800 mb-1">Discovery Help</h3>
              <p className="text-sm text-blue-700">
                Need assistance with discovery requests? Our platform can help you create proper discovery 
                documents that comply with court rules. For more information, check out our 
                <a href="#" className="text-blue-600 font-medium hover:underline mx-1">
                  Discovery Guide
                  <ExternalLink className="h-3 w-3 inline ml-1" />
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dialog to confirm extracted data */}
      <Dialog open={showExtractedDataDialog} onOpenChange={setShowExtractedDataDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Extracted Information</DialogTitle>
            <DialogDescription>
              We've extracted the following information from the uploaded complaint. Please verify or edit it.
            </DialogDescription>
          </DialogHeader>
          
          {extractedData && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Defendant
                  </label>
                  <Input
                    value={extractedData.defendant}
                    onChange={(e) => setExtractedData({
                      ...extractedData,
                      defendant: e.target.value
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plaintiff
                  </label>
                  <Input
                    value={extractedData.plaintiff}
                    onChange={(e) => setExtractedData({
                      ...extractedData,
                      plaintiff: e.target.value
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Case Number
                  </label>
                  <Input
                    value={extractedData.caseNumber}
                    onChange={(e) => setExtractedData({
                      ...extractedData,
                      caseNumber: e.target.value
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filing Date
                  </label>
                  <Input
                    value={extractedData.filingDate}
                    onChange={(e) => setExtractedData({
                      ...extractedData,
                      filingDate: e.target.value
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Court
                  </label>
                  <Input
                    value={extractedData.courtName}
                    onChange={(e) => setExtractedData({
                      ...extractedData,
                      courtName: e.target.value
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Charge Description
                  </label>
                  <Textarea
                    value={extractedData.chargeDescription}
                    onChange={(e) => setExtractedData({
                      ...extractedData,
                      chargeDescription: e.target.value
                    })}
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex space-x-2 pt-4">
            <Button className="flex-1" onClick={handleConfirmExtractedData}>
              Confirm & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog to view generated document */}
      {viewingDocument && (
        <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="text-xl">{viewingDocument.title}</DialogTitle>
            </DialogHeader>
            
            <div className="overflow-y-auto mt-4 max-h-[50vh]">
              <div className="bg-white p-6 border rounded-md">
                {/* Split content by newlines and render each paragraph */}
                {viewingDocument.content.split('\n').map((paragraph, idx) => (
                  paragraph.trim() ? (
                    <p key={idx} className="my-2">
                      {paragraph}
                    </p>
                  ) : (
                    <div key={idx} className="h-4" /> // Empty space for blank lines
                  )
                ))}
              </div>
            </div>
            
            <DialogFooter className="flex space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowDocumentDialog(false)}>
                Close
              </Button>
              <Button 
                onClick={() => {
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
                }}
              >
                Download Document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
};

export default DiscoveryRequestPage;
