import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { FileText } from "lucide-react";

interface GeneratedDocumentsSectionProps {
  generatedDocuments: string[];
  onViewDocument: (documentTitle: string) => void;
  onStartOver: () => void;
  onReturnToCase: () => void;
}

const GeneratedDocumentsSection = ({
  generatedDocuments,
  onViewDocument,
  onStartOver,
  onReturnToCase
}: GeneratedDocumentsSectionProps) => {
  return (
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
              <Button className="w-full" onClick={() => onViewDocument(doc)}>
                View & Edit
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="mt-8">
        <Button 
          variant="outline" 
          onClick={onStartOver}
          className="mr-2"
        >
          Start Over
        </Button>
        <Button onClick={onReturnToCase}>
          Return to Case
        </Button>
      </div>
    </div>
  );
};

export default GeneratedDocumentsSection; 