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
import { FileText, Eye, ArrowRight } from "lucide-react";
import { ComplaintInformation } from "@/integrations/gemini/client";

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
  onEditExtractedData
}: SelectDocumentsSectionProps) => {
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
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Selected Complaint</CardTitle>
          <CardDescription>
            The following complaint information will be used for document generation:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-md mb-4">
            <FileText className="h-8 w-8 text-primary" />
            <div className="flex-1">
              <p className="font-medium">
                {complaintDocument?.name || "Criminal Complaint"}
              </p>
              <p className="text-sm text-gray-500">
                {extractedData?.caseNumber} - {extractedData?.defendant}
              </p>
            </div>
            
            {complaintDocument && (
              <Button variant="ghost" size="sm" onClick={onViewComplaint}>
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
            )}
          </div>
          
          {/* Show some key extracted information */}
          {extractedData && (
            <div className="bg-blue-50 p-3 rounded-md mb-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Extracted Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Defendant:</span>
                  <span className="font-medium">{extractedData.defendant}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Plaintiff:</span>
                  <span className="font-medium">{extractedData.plaintiff}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Case #:</span>
                  <span className="font-medium">{extractedData.caseNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Filed:</span>
                  <span className="font-medium">{extractedData.filingDate}</span>
                </div>
              </div>
              <Button 
                variant="link" 
                size="sm" 
                className="mt-1 h-auto p-0 text-blue-700"
                onClick={onEditExtractedData}
              >
                Edit Information
              </Button>
            </div>
          )}
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
          <Button onClick={onGenerateDocuments} disabled={selectedDocumentTypes.length === 0}>
            Generate Selected Documents
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SelectDocumentsSection; 