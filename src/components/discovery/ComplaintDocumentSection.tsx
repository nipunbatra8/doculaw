import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { FileText, Eye, RefreshCw } from "lucide-react";

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

interface ComplaintDocumentSectionProps {
  complaintDocument: Document;
  onViewComplaint: () => void;
  onReplaceComplaint: () => void;
}

const ComplaintDocumentSection = ({ 
  complaintDocument, 
  onViewComplaint, 
  onReplaceComplaint
}: ComplaintDocumentSectionProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Uploaded Complaint</CardTitle>
        <CardDescription>
          A complaint document has already been uploaded for this case.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-md mb-4">
          <FileText className="h-8 w-8 text-primary" />
          <div className="flex-1">
            <h3 className="font-medium">{complaintDocument.name}</h3>
            <p className="text-sm text-gray-500">
              Uploaded on {format(new Date(complaintDocument.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
          <Button 
            variant="outline" 
            onClick={onViewComplaint}
            className="flex items-center"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Complaint
          </Button>
          <Button 
            variant="outline" 
            onClick={onReplaceComplaint}
            className="flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Replace Complaint
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ComplaintDocumentSection; 