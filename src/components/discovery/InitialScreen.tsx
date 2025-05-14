import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { FileText, Eye, RefreshCw, FileUp } from "lucide-react";

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

interface InitialScreenProps {
  complaintDocument: Document | null;
  onSkipToSelection: () => void;
  onViewComplaint: () => void;
  onReplaceComplaint: () => void;
  onStartUpload: () => void;
}

const InitialScreen = ({
  complaintDocument,
  onSkipToSelection,
  onViewComplaint,
  onReplaceComplaint,
  onStartUpload
}: InitialScreenProps) => {
  if (complaintDocument) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Discovery Documents</h2>
        <p className="text-gray-600">
          You can generate discovery documents based on the uploaded complaint.
          Choose an option below to continue:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card className="hover:border-blue-500 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Generate Discovery Documents
              </CardTitle>
              <CardDescription>
                Create interrogatories, requests for production, and other discovery documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={onSkipToSelection}>
                Generate Documents
              </Button>
            </CardContent>
          </Card>
          
          <Card className="hover:border-blue-500 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                View Complaint
              </CardTitle>
              <CardDescription>
                Review the uploaded complaint document
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={onViewComplaint}>
                View Document
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-4">
          <Button variant="link" className="h-auto p-0" onClick={onReplaceComplaint}>
            Replace complaint document
            <RefreshCw className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>
    );
  } else {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Upload Complaint</h2>
        <p className="text-gray-600">
          To begin generating discovery documents, please upload the criminal complaint document.
        </p>
        
        <Button className="mt-4" onClick={onStartUpload}>
          <FileUp className="h-4 w-4 mr-2" />
          Upload Complaint
        </Button>
      </div>
    );
  }
};

export default InitialScreen; 