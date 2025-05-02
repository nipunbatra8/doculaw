
import { useState } from "react";
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
  CardTitle 
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
  Check
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import DocumentUploader from "@/components/discovery/DocumentUploader";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

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

const DiscoveryRequestPage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDocumentSelectionDialog, setShowDocumentSelectionDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDocuments, setGeneratedDocuments] = useState<string[]>([]);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [selectedDocumentTypes, setSelectedDocumentTypes] = useState<string[]>([
    "form-interrogatories",
    "special-interrogatories",
    "request-for-production",
    "request-for-admissions"
  ]);

  // Fetch case details
  const { data: caseData, isLoading } = useQuery({
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

  const handleSelectDiscoveryType = (discoveryType: typeof discoveryTypes[0]) => {
    if (discoveryType.id === "form-interrogatories") {
      // Navigate to case page with state to show PDF editor
      navigate(`/case/${caseId}`, { 
        state: { 
          showPdfEditor: true,
          formType: discoveryType.id,
          pdfUrl: discoveryType.pdfUrl
        }
      });
    } else {
      // For other types, show upload complaint dialog
      setShowUploadDialog(true);
    }
  };

  const handleFileUploaded = async (fileUrl: string) => {
    setUploadedFileUrl(fileUrl);
    setShowUploadDialog(false);
    setShowDocumentSelectionDialog(true);
  };

  const handleGenerateDocuments = async () => {
    setShowDocumentSelectionDialog(false);
    setIsGenerating(true);
    
    // In a real app, this would call an API to process the document and generate the discovery documents
    // Simulate document generation with a delay
    setTimeout(() => {
      // Only include the selected document types
      const docs = selectedDocumentTypes.map(type => {
        const doc = discoveryTypes.find(d => d.id === type);
        return doc?.title || "";
      }).filter(title => title !== "");
      
      setGeneratedDocuments(docs);
      setIsGenerating(false);
      
      toast({
        title: "Documents Generated",
        description: "Your discovery documents have been generated successfully.",
      });
    }, 3000);
  };

  const handleViewDocument = (documentType: string) => {
    const type = documentType.toLowerCase().replace(/\s/g, "-");
    navigate(`/discovery-request/${caseId}/${type}`, {
      state: { 
        showPdfEditor: true,
        formType: type,
        pdfUrl: type === "form-interrogatories" 
          ? "https://courts.ca.gov/sites/default/files/courts/default/2024-11/disc001.pdf"
          : null
      }
    });
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

        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-doculaw-500 mb-4"></div>
            <p className="text-lg text-gray-700 font-medium">Generating discovery documents...</p>
            <p className="text-gray-500 mt-2">This may take a moment as we analyze the complaint document.</p>
          </div>
        ) : generatedDocuments.length > 0 ? (
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
                onClick={() => {
                  setGeneratedDocuments([]);
                  setUploadedFileUrl(null);
                  setSelectedDocumentTypes([
                    "form-interrogatories",
                    "special-interrogatories",
                    "request-for-production",
                    "request-for-admissions"
                  ]);
                }}
                className="mr-2"
              >
                Start Over
              </Button>
              <Button onClick={() => navigate(`/case/${caseId}`)}>
                Return to Case
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Step 1: Select Discovery Type</h2>
            <p className="text-gray-600">
              Choose the type of discovery request you would like to propound in this case.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {discoveryTypes.map(type => (
                <Card 
                  key={type.id}
                  className="cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => handleSelectDiscoveryType(type)}
                >
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <type.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{type.title}</CardTitle>
                      <CardDescription>
                        {type.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">
                      {type.id === 'form-interrogatories' ? 'Edit Form PDF' : 'Create Request'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

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
      
      {/* Upload dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Complaint Document</DialogTitle>
            <DialogDescription>
              Upload the criminal complaint document to generate appropriate discovery requests.
            </DialogDescription>
          </DialogHeader>
          
          <DocumentUploader onFileUploaded={handleFileUploaded} />
        </DialogContent>
      </Dialog>

      {/* Document selection dialog */}
      <Dialog open={showDocumentSelectionDialog} onOpenChange={setShowDocumentSelectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Documents to Generate</DialogTitle>
            <DialogDescription>
              Choose which discovery documents you would like to generate from the uploaded complaint.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {discoveryTypes.map(type => (
              <div key={type.id} className="flex items-start space-x-3">
                <Checkbox 
                  id={type.id} 
                  checked={selectedDocumentTypes.includes(type.id)}
                  onCheckedChange={() => toggleDocumentType(type.id)}
                />
                <div>
                  <label
                    htmlFor={type.id}
                    className="font-medium text-sm flex items-center cursor-pointer"
                  >
                    <type.icon className="h-4 w-4 mr-2" />
                    {type.title}
                  </label>
                  <p className="text-xs text-gray-500 ml-6">
                    {type.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDocumentSelectionDialog(false);
                setUploadedFileUrl(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateDocuments}
              disabled={selectedDocumentTypes.length === 0}
            >
              Generate Documents
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DiscoveryRequestPage;
