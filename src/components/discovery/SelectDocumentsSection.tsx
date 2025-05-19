import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Eye, ArrowRight, ExternalLink } from "lucide-react";
import { ComplaintInformation } from "@/integrations/gemini/client";
import FormInterrogatoriesPdfButton from "./FormInterrogatoriesPdfButton";
import RequestForAdmissionsPdfButton from "./RequestForAdmissionsPdfButton";
import RFAPdfPreviewButton from "./RFAPdfPreviewButton";

interface Document {
  id: string;
  user_id: string;
  case_id: string | null;
  name: string;
  path: string;
  url: string;
  type: string;
  size: number;
  created_at: string;
}

interface DiscoveryType {
  id: string;
  title: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  pdfUrl: string | null;
}

interface SelectDocumentsSectionProps {
  complaintDocument: Document | null;
  extractedData: ComplaintInformation | null;
  selectedDocumentTypes: string[];
  discoveryTypes: DiscoveryType[];
  onToggleDocumentType: (typeId: string) => void;
  onGenerateDocuments: () => void;
  onReplaceComplaint: () => void;
  onViewComplaint: () => void;
  onEditExtractedData: () => void;
  caseId?: string;
}

const SelectDocumentsSection = ({
  complaintDocument,
  extractedData,
  selectedDocumentTypes,
  discoveryTypes,
  onToggleDocumentType,
  onGenerateDocuments,
  onReplaceComplaint,
  onViewComplaint,
  onEditExtractedData,
  caseId
}: SelectDocumentsSectionProps) => {
  // Find the form interrogatories document type
  const formInterrogatoriesType = discoveryTypes.find(type => type.id === "form-interrogatories");
  
  // Find the request for admissions document type
  const requestForAdmissionsType = discoveryTypes.find(type => type.id === "request-for-admissions");
  
  // Filter out document types with dedicated buttons
  const otherDocumentTypes = discoveryTypes.filter(type => 
    type.id !== "form-interrogatories" && type.id !== "request-for-admissions"
  );
  
  // Check if any other document types are selected
  const hasOtherSelectedTypes = selectedDocumentTypes.some(
    typeId => typeId !== "form-interrogatories" && typeId !== "request-for-admissions"
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        {complaintDocument 
          ? "Generate Discovery Documents" 
          : "Step 2: Select Discovery Documents"}
      </h2>
      <p className="text-gray-600">
        Choose which discovery documents you want to generate based on the uploaded complaint.
      </p>
      
      {/* Form Interrogatories Card */}
      {formInterrogatoriesType && (
        <Card className="mt-4 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center">
              <formInterrogatoriesType.icon className="h-5 w-5 mr-2 text-primary" />
              {formInterrogatoriesType.title}
            </CardTitle>
            <CardDescription>
              {formInterrogatoriesType.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm">
                Form Interrogatories (DISC-001) is an official Judicial Council form that will be 
                downloaded directly from the California Courts website with your case information pre-filled.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <FormInterrogatoriesPdfButton 
                  extractedData={extractedData} 
                  caseId={caseId}
                  onEditExtractedData={onEditExtractedData}
                />
                
                {formInterrogatoriesType.pdfUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href={formInterrogatoriesType.pdfUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center"
                    >
                      View Original Form
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request for Admissions Card */}
      {requestForAdmissionsType && (
        <Card className="mt-4 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center">
              <requestForAdmissionsType.icon className="h-5 w-5 mr-2 text-primary" />
              {requestForAdmissionsType.title}
            </CardTitle>
            <CardDescription>
              {requestForAdmissionsType.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm">
                Request for Admissions is a formal request for the opposing party to admit or deny 
                specific facts related to your case, streamlining the issues that need to be proven at trial.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <RequestForAdmissionsPdfButton 
                    extractedData={extractedData} 
                    caseId={caseId}
                    onEditExtractedData={onEditExtractedData}
                  />
                </div>
                
                <div className="flex-1">
                  <RFAPdfPreviewButton
                    extractedData={extractedData}
                    caseId={caseId}
                  />
                </div>
                
                {requestForAdmissionsType.pdfUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href={requestForAdmissionsType.pdfUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center"
                    >
                      View Original Form
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Other Document Types Card */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Other Discovery Document Types</CardTitle>
          <CardDescription>
            Select the types of discovery documents you want to generate:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {otherDocumentTypes.map(type => (
              <div key={type.id} className="flex items-start space-x-3 p-2 rounded-md hover:bg-gray-50">
                <Checkbox 
                  id={type.id} 
                  className="mt-1"
                  checked={selectedDocumentTypes.includes(type.id)}
                  onCheckedChange={() => onToggleDocumentType(type.id)}
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
        <CardFooter className="flex justify-end space-x-3">
          {complaintDocument && (
            <Button variant="outline" onClick={onReplaceComplaint}>
              Replace Complaint
            </Button>
          )}
          <Button 
            onClick={onGenerateDocuments} 
            disabled={!hasOtherSelectedTypes}
          >
            Generate Selected Documents
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SelectDocumentsSection; 